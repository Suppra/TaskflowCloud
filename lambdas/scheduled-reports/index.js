/**
 * Lambda: scheduled-reports
 * ──────────────────────────────────────────────────────────────────────────
 * Trigger : Amazon EventBridge — cron(0 8 ? * MON *)  → lunes 8am UTC
 * Función : Genera reporte CSV semanal por cada proyecto activo
 *           → Sube a S3 (bucket taskflow-reports)
 *           → Crea registro en taskflow-reports (DynamoDB)
 *           → Notifica a los miembros del proyecto via SES
 * ──────────────────────────────────────────────────────────────────────────
 * HU-18: Recibir reportes automáticos semanales en CSV
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { randomUUID } = require('crypto');

const region          = process.env.AWS_REGION          ?? 'us-east-1';
const reportsBucket   = process.env.S3_BUCKET_REPORTS   ?? 'taskflow-reports-dev';
const fromEmail       = process.env.SES_FROM_EMAIL      ?? 'noreply@taskflow.dev';
const frontendUrl     = process.env.FRONTEND_URL        ?? 'https://taskflow.dev';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true },
});
const s3  = new S3Client({ region });
const ses = new SESClient({ region });

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

function buildCsv(tasks) {
  const header = 'ID,Título,Prioridad,Estado/Columna,Asignado,Fecha límite,Completado,Etiquetas,Creado\n';
  const rows = tasks.map(t => [
    t.taskId,
    `"${(t.title ?? '').replace(/"/g, '""')}"`,
    t.priority,
    t.columnId,
    t.assigneeId ?? '',
    t.dueDate ?? '',
    t.completedAt ?? '',
    `"${(t.labels ?? []).join('; ')}"`,
    t.createdAt,
  ].join(',')).join('\n');
  return header + rows;
}

async function sendReportEmail(email, userName, projectName, downloadUrl) {
  try {
    await ses.send(new SendEmailCommand({
      Source: `TaskFlow Cloud <${fromEmail}>`,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: `[TaskFlow] 📊 Reporte semanal: ${projectName}`, Charset: 'UTF-8' },
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: `
            <html><body style="font-family:Arial;background:#0f172a;color:#e2e8f0;padding:20px">
            <div style="background:#1e293b;border-radius:12px;padding:24px;max-width:560px;margin:auto">
              <div style="color:#3b82f6;font-size:22px;font-weight:bold;margin-bottom:16px">📊 TaskFlow Cloud</div>
              <h2>Reporte semanal disponible</h2>
              <p>Hola <strong>${userName}</strong>,</p>
              <p>El reporte semanal del proyecto <strong>${projectName}</strong> está listo.</p>
              <a href="${downloadUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">
                📥 Descargar CSV →
              </a>
              <p style="color:#475569;font-size:12px;margin-top:16px">El enlace expira en 24 horas.</p>
            </div></body></html>`,
          },
        },
      },
    }));
  } catch (err) {
    console.error('[scheduled-reports] SES error:', err.message);
  }
}

// ── Handler ────────────────────────────────────────────────────────────────

exports.handler = async () => {
  const now = new Date().toISOString();
  console.log('[scheduled-reports] Starting weekly report generation at', now);

  const projects = await getAllActiveProjects();
  console.log(`[scheduled-reports] Processing ${projects.length} active projects`);

  const results = [];

  for (const project of projects) {
    try {
      const tasks = await getTasksByProject(project.projectId);
      if (tasks.length === 0) {
        console.log(`[scheduled-reports] No tasks for project ${project.projectId}, skipping`);
        continue;
      }

      const csv = buildCsv(tasks);
      const reportId = randomUUID();
      const s3Key = `reports/${project.projectId}/${reportId}.csv`;

      // Subir CSV a S3
      await s3.send(new PutObjectCommand({
        Bucket: reportsBucket,
        Key: s3Key,
        Body: Buffer.from(csv, 'utf-8'),
        ContentType: 'text/csv; charset=utf-8',
        ContentDisposition: `attachment; filename="reporte-${project.name.replace(/[^a-z0-9]/gi, '-')}-${now.slice(0, 10)}.csv"`,
      }));

      // Generar URL de descarga válida 24h
      const downloadUrl = await getSignedUrl(s3, new GetObjectCommand({
        Bucket: reportsBucket,
        Key: s3Key,
      }), { expiresIn: 86400 });

      // Registrar en DynamoDB
      await dynamo.send(new PutCommand({
        TableName: 'taskflow-reports',
        Item: {
          reportId,
          projectId: project.projectId,
          type: 'csv',
          s3Key,
          generatedBy: 'lambda-scheduled',
          createdAt: now,
        },
      }));

      // Notificar a todos los miembros
      const memberNotifications = (project.members ?? []).map(async (member) => {
        const user = await getUserById(member.userId);
        if (!user) return;

        // Notificación en plataforma
        await dynamo.send(new PutCommand({
          TableName: 'taskflow-notifications',
          Item: {
            notificationId: randomUUID(),
            userId: user.userId,
            type: 'report_ready',
            title: `Reporte semanal: ${project.name}`,
            message: `El reporte semanal del proyecto "${project.name}" está listo para descargar.`,
            read: false,
            data: { reportId, projectId: project.projectId },
            createdAt: now,
          },
        }));

        // Email
        await sendReportEmail(user.email, user.name, project.name, downloadUrl);
      });

      await Promise.all(memberNotifications);

      console.log(`[scheduled-reports] Report generated for project ${project.projectId}: ${s3Key}`);
      results.push({ projectId: project.projectId, reportId, s3Key, tasks: tasks.length });
    } catch (err) {
      console.error(`[scheduled-reports] Error for project ${project.projectId}:`, err);
      results.push({ projectId: project.projectId, error: err.message });
    }
  }

  return { timestamp: now, reports: results };
};
