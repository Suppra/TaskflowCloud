/**
 * Lambda: overdue-tasks
 * ──────────────────────────────────────────────────────────────────────────
 * Trigger : Amazon EventBridge — cron(0 * * * ? *)  → cada hora
 * Función : Detecta tareas con dueDate vencida y sin completedAt
 *           → Publica evento TASK_OVERDUE en SQS
 *           → Marca la tarea con overdueNotifiedAt para evitar duplicados
 *           → Registra notificación en DynamoDB
 * ──────────────────────────────────────────────────────────────────────────
 * HU-17: DADO QUE existe una tarea con dueDate pasado y sin completedAt
 *        CUANDO EventBridge dispara la Lambda cada hora
 *        ENTONCES la Lambda detecta la tarea y publica TASK_OVERDUE en SQS
 *        Y se notifica al asignado y al reportero via email
 *        Y la tarea queda marcada con overdueNotifiedAt
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { randomUUID } = require('crypto');

const region   = process.env.AWS_REGION     ?? 'us-east-1';
const queueUrl = process.env.SQS_QUEUE_URL;
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

async function getUserById(userId) {
  if (!userId) return null;
  const r = await dynamo.send(new GetCommand({ TableName: 'taskflow-users', Key: { userId } }));
  return r.Item ?? null;
}

async function markOverdue(taskId) {
  await dynamo.send(new UpdateCommand({
    TableName: 'taskflow-tasks',
    Key: { taskId },
    UpdateExpression: 'SET overdueNotifiedAt = :now',
    ExpressionAttributeValues: { ':now': new Date().toISOString() },
  }));
}

async function saveNotification(userId, taskId, taskTitle) {
  await dynamo.send(new PutCommand({
    TableName: 'taskflow-notifications',
    Item: {
      notificationId: randomUUID(),
      userId,
      type: 'task_overdue',
      title: 'Tarea vencida',
      message: `La tarea "${taskTitle}" venció y aún no está completada`,
      read: false,
      data: { taskId },
      createdAt: new Date().toISOString(),
    },
  }));
}

async function publishToSQS(task) {
  if (!queueUrl) { console.warn('SQS_QUEUE_URL not set, skipping publish'); return; }
  await sqs.send(new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify({
      type: 'TASK_OVERDUE',
      payload: { taskId: task.taskId, projectId: task.projectId, assigneeId: task.assigneeId, reporterId: task.reporterId },
      timestamp: new Date().toISOString(),
    }),
    MessageAttributes: {
      eventType: { DataType: 'String', StringValue: 'TASK_OVERDUE' },
    },
  }));
}

async function sendOverdueEmail(email, userName, taskTitle, taskId) {
  if (!email) return;
  if (!sesEnabled) {
    if (!userNotificationsTopicArn) {
      console.log('[overdue-tasks] SES disabled and no USER_NOTIFICATIONS_TOPIC_ARN, skipping email');
      return;
    }

    const plain = `Hola ${userName}. La tarea vencida "${taskTitle}" requiere atencion. Ingresa a ${frontendUrl}`;
    await sns.send(new PublishCommand({
      TopicArn: userNotificationsTopicArn,
      Subject: `[TaskFlow] Tarea vencida: ${taskTitle}`.slice(0, 100),
      Message: plain,
      MessageAttributes: {
        recipient: { DataType: 'String', StringValue: email },
      },
    }));
    console.log('[overdue-tasks] Email published via SNS to recipient filter');
    return;
  }
  try {
    await ses.send(new SendEmailCommand({
      Source: `TaskFlow Cloud <${fromEmail}>`,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: `[TaskFlow] ⚠️ Tarea vencida: ${taskTitle}`, Charset: 'UTF-8' },
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: `
            <html><body style="font-family:Arial;background:#0f172a;color:#e2e8f0;padding:20px">
            <div style="background:#1e293b;border-radius:12px;padding:24px;max-width:560px;margin:auto">
              <div style="color:#3b82f6;font-size:22px;font-weight:bold;margin-bottom:16px">⚠️ TaskFlow Cloud</div>
              <h2>Tarea vencida</h2>
              <p>Hola <strong>${userName}</strong>,</p>
              <p>La siguiente tarea venció y aún no está completada:</p>
              <div style="background:#0f172a;padding:12px;border-radius:8px;border-left:4px solid #ef4444">
                <strong>${taskTitle}</strong>
              </div>
              <a href="${frontendUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">
                Ver tarea →
              </a>
            </div></body></html>`,
          },
        },
      },
    }));
  } catch (err) {
    console.error('[overdue-tasks] SES error:', err.message);
  }
}

exports.handler = async () => {
  const now = new Date().toISOString();
  console.log('[overdue-tasks] Scanning for overdue tasks at', now);

  // Escanear tareas vencidas no notificadas aún
  let lastKey;
  const overdueTasks = [];

  do {
    const result = await dynamo.send(new ScanCommand({
      TableName: 'taskflow-tasks',
      FilterExpression:
        'dueDate < :now ' +
        'AND attribute_not_exists(completedAt) ' +
        'AND attribute_not_exists(overdueNotifiedAt)',
      ExpressionAttributeValues: { ':now': now },
      ExclusiveStartKey: lastKey,
    }));
    overdueTasks.push(...(result.Items ?? []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  console.log(`[overdue-tasks] Found ${overdueTasks.length} overdue tasks`);

  for (const task of overdueTasks) {
    try {
      const [assignee, reporter] = await Promise.all([
        getUserById(task.assigneeId),
        getUserById(task.reporterId),
      ]);

      // Notificar a asignado y reportero
      const notifyUsers = [
        ...(assignee ? [assignee] : []),
        ...(reporter && reporter.userId !== assignee?.userId ? [reporter] : []),
      ];

      await Promise.all([
        ...notifyUsers.map(u => saveNotification(u.userId, task.taskId, task.title)),
        ...notifyUsers.map(u => sendOverdueEmail(u.email, u.name, task.title, task.taskId)),
        publishToSQS(task),
        markOverdue(task.taskId),
      ]);

      console.log('[overdue-tasks] Processed task:', task.taskId);
    } catch (err) {
      console.error('[overdue-tasks] Error processing task:', task.taskId, err);
    }
  }

  return { processed: overdueTasks.length, timestamp: now };
};
