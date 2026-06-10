/**
 * Lambda: alerts-engine
 * ──────────────────────────────────────────────────────────────────────────
 * Trigger : Amazon EventBridge — cron(0 9 * * ? *)  → diario 9am UTC
 * Función : Analiza proyectos activos buscando riesgos operativos:
 *           - Si >30% tareas vencidas → alerta HIGH en taskflow-alerts
 *           - Si 100% tareas completadas → alerta INFO (proyecto completado)
 *           Publica ALERT_TRIGGERED en SQS y notifica a administradores.
 * ──────────────────────────────────────────────────────────────────────────
 * HU-19: Ver alertas automáticas cuando más del 30% de tareas están vencidas
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { randomUUID } = require('crypto');

const region    = process.env.AWS_REGION     ?? 'us-east-1';
const queueUrl  = process.env.SQS_QUEUE_URL;
const fromEmail = process.env.SES_FROM_EMAIL ?? 'noreply@taskflow.dev';
const sesEnabled = (process.env.SES_ENABLED ?? 'true').toLowerCase() === 'true';
const userNotificationsTopicArn = process.env.USER_NOTIFICATIONS_TOPIC_ARN ?? '';
const frontendUrl = process.env.FRONTEND_URL ?? 'https://taskflow.dev';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true },
});
const sqs = new SQSClient({ region });
const ses = new SESClient({ region });
const sns = new SNSClient({ region });

// ── Helpers ────────────────────────────────────────────────────────────────

async function getAllActiveProjects() {
  const items = [];
  let lastKey;
  do {
    const result = await dynamo.send(new ScanCommand({
      TableName: 'taskflow-projects',
      FilterExpression: '#status = :active',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':active': 'active' },
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(result.Items ?? []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function getTasksByProject(projectId) {
  const items = [];
  let lastKey;
  do {
    const result = await dynamo.send(new QueryCommand({
      TableName: 'taskflow-tasks',
      IndexName: 'projectId-index',
      KeyConditionExpression: 'projectId = :pid',
      ExpressionAttributeValues: { ':pid': projectId },
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(result.Items ?? []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function getUserById(userId) {
  if (!userId) return null;
  const r = await dynamo.send(new GetCommand({ TableName: 'taskflow-users', Key: { userId } }));
  return r.Item ?? null;
}

async function saveAlert(projectId, type, severity, message) {
  const alert = {
    alertId: randomUUID(),
    projectId,
    type,
    severity,
    message,
    resolved: false,
    createdAt: new Date().toISOString(),
  };
  await dynamo.send(new PutCommand({ TableName: 'taskflow-alerts', Item: alert }));
  return alert;
}

async function publishAlert(alert) {
  if (!queueUrl) return;
  await sqs.send(new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify({
      type: 'ALERT_TRIGGERED',
      payload: { alertId: alert.alertId, projectId: alert.projectId, severity: alert.severity, message: alert.message },
      timestamp: new Date().toISOString(),
    }),
    MessageAttributes: {
      eventType: { DataType: 'String', StringValue: 'ALERT_TRIGGERED' },
    },
  }));
}

async function notifyAdmins(project, alertMessage, severity) {
  const admins = (project.members ?? []).filter(m => m.role === 'admin' || m.role === 'owner');
  const severityColors = { high: '#ef4444', critical: '#dc2626', medium: '#f97316', low: '#22c55e' };
  const color = severityColors[severity] ?? '#6366f1';

  for (const admin of admins) {
    const user = await getUserById(admin.userId);
    if (!user) continue;

    // Notificación en plataforma
    await dynamo.send(new PutCommand({
      TableName: 'taskflow-notifications',
      Item: {
        notificationId: randomUUID(),
        userId: user.userId,
        type: 'alert_triggered',
        title: `⚠️ Alerta: ${project.name}`,
        message: alertMessage,
        read: false,
        data: { projectId: project.projectId, severity },
        createdAt: new Date().toISOString(),
      },
    }));

    // Email
    if (!sesEnabled) {
      if (!userNotificationsTopicArn) {
        console.log('[alerts-engine] SES disabled and no USER_NOTIFICATIONS_TOPIC_ARN, skipping email');
        continue;
      }

      const plain = `Alerta ${severity.toUpperCase()} en ${project.name}: ${alertMessage} Revisar ${frontendUrl}/projects/${project.projectId}`;
      await sns.send(new PublishCommand({
        TopicArn: userNotificationsTopicArn,
        Subject: `[TaskFlow] Alerta ${severity.toUpperCase()}: ${project.name}`.slice(0, 100),
        Message: plain,
        MessageAttributes: {
          recipient: { DataType: 'String', StringValue: user.email },
        },
      }));
      console.log('[alerts-engine] Email published via SNS to recipient filter');
      continue;
    }

    try {
      await ses.send(new SendEmailCommand({
        Source: `TaskFlow Cloud <${fromEmail}>`,
        Destination: { ToAddresses: [user.email] },
        Message: {
          Subject: { Data: `[TaskFlow] ⚠️ Alerta ${severity.toUpperCase()}: ${project.name}`, Charset: 'UTF-8' },
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: `
              <html><body style="font-family:Arial;background:#0f172a;color:#e2e8f0;padding:20px">
              <div style="background:#1e293b;border-radius:12px;padding:24px;max-width:560px;margin:auto">
                <div style="color:#3b82f6;font-size:22px;font-weight:bold;margin-bottom:16px">⚠️ TaskFlow Cloud — Alerta</div>
                <div style="border-left:4px solid ${color};padding:12px;background:#0f172a;border-radius:4px">
                  <strong style="color:${color}">SEVERIDAD: ${severity.toUpperCase()}</strong><br>
                  <strong>Proyecto:</strong> ${project.name}<br><br>
                  ${alertMessage}
                </div>
                <a href="${frontendUrl}/projects/${project.projectId}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">
                  Ver proyecto →
                </a>
              </div></body></html>`,
            },
          },
        },
      }));
    } catch (err) {
      console.error('[alerts-engine] SES error:', err.message);
    }
  }
}

// ── Handler ────────────────────────────────────────────────────────────────

exports.handler = async () => {
  const now = new Date().toISOString();
  console.log('[alerts-engine] Starting daily alert analysis at', now);

  const projects = await getAllActiveProjects();
  console.log(`[alerts-engine] Analyzing ${projects.length} active projects`);

  const alertsCreated = [];

  for (const project of projects) {
    try {
      const tasks = await getTasksByProject(project.projectId);
      if (tasks.length === 0) continue;

      const total     = tasks.length;
      const completed = tasks.filter(t => !!t.completedAt).length;
      const overdue   = tasks.filter(t => t.dueDate && !t.completedAt && new Date(t.dueDate) < new Date()).length;
      const overdueRatio = overdue / total;

      console.log(`[alerts-engine] Project ${project.projectId}: total=${total}, overdue=${overdue}, ratio=${(overdueRatio * 100).toFixed(1)}%`);

      // ── Alerta: >30% tareas vencidas (HU-19) ────────────────────────────
      if (overdueRatio > 0.30) {
        const severity = overdueRatio > 0.6 ? 'critical' : 'high';
        const message = `El ${Math.round(overdueRatio * 100)}% de las tareas del proyecto están vencidas (${overdue}/${total}). Se requiere acción inmediata.`;

        const alert = await saveAlert(project.projectId, 'overdue_tasks', severity, message);
        await publishAlert(alert);
        await notifyAdmins(project, message, severity);

        alertsCreated.push({ projectId: project.projectId, type: 'overdue_tasks', severity, overdueRatio });
        console.log(`[alerts-engine] Alert ${severity} created for project ${project.projectId}`);
      }

      // ── Alerta: deadline approaching (>80% completado pero hay vencidas) ─
      if (completed / total > 0.8 && overdue > 0) {
        const message = `El proyecto está al ${Math.round((completed / total) * 100)}% de completitud, pero quedan ${overdue} tarea(s) vencida(s) pendientes.`;
        const alert = await saveAlert(project.projectId, 'deadline_approaching', 'medium', message);
        await publishAlert(alert);
        console.log(`[alerts-engine] Deadline approaching alert for project ${project.projectId}`);
      }

    } catch (err) {
      console.error(`[alerts-engine] Error analyzing project ${project.projectId}:`, err);
    }
  }

  return { timestamp: now, alertsCreated: alertsCreated.length, details: alertsCreated };
};
