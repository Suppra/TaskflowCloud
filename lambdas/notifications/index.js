/**
 * Lambda: notifications
 * ──────────────────────────────────────────────────────────────────────────
 * Trigger : Amazon SQS (event source mapping)
 * Función : Consume eventos TASK_CREATED, COMMENT_CREATED, INVITATION_SENT
 *           → envía email via SES
 *           → crea registro en taskflow-notifications (DynamoDB)
 * ──────────────────────────────────────────────────────────────────────────
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { randomUUID } = require('crypto');

const region  = process.env.AWS_REGION  ?? 'us-east-1';
const fromEmail = process.env.SES_FROM_EMAIL ?? 'noreply@taskflow.dev';
const sesEnabled = (process.env.SES_ENABLED ?? 'true').toLowerCase() === 'true';
const userNotificationsTopicArn = process.env.USER_NOTIFICATIONS_TOPIC_ARN ?? '';
const frontendUrl = process.env.FRONTEND_URL ?? 'https://taskflow.dev';
const notificationsTable = 'taskflow-notifications';
const usersTable = 'taskflow-users';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
const ses = new SESClient({ region });
const sns = new SNSClient({ region });

// ── Helpers ────────────────────────────────────────────────────────────────

async function getUserById(userId) {
  if (!userId) return null;
  const result = await dynamo.send(new GetCommand({ TableName: usersTable, Key: { userId } }));
  return result.Item ?? null;
}

async function saveNotification(userId, type, title, message, data = {}) {
  const notification = {
    notificationId: randomUUID(),
    userId,
    type,
    title,
    message,
    read: false,
    data,
    createdAt: new Date().toISOString(),
  };
  await dynamo.send(new PutCommand({ TableName: notificationsTable, Item: notification }));
  return notification;
}

async function sendEmail(toEmail, subject, htmlBody) {
  if (!sesEnabled) {
    if (!userNotificationsTopicArn) {
      console.log('[notifications] SES disabled and no USER_NOTIFICATIONS_TOPIC_ARN, skipping email');
      return;
    }

    const plainText = htmlBody.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    await sns.send(new PublishCommand({
      TopicArn: userNotificationsTopicArn,
      Subject: subject.slice(0, 100),
      Message: plainText,
      MessageAttributes: {
        recipient: { DataType: 'String', StringValue: toEmail },
      },
    }));
    console.log('[notifications] Email published via SNS to recipient filter');
    return;
  }

  try {
    await ses.send(new SendEmailCommand({
      Source: `TaskFlow Cloud <${fromEmail}>`,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: htmlBody, Charset: 'UTF-8' },
          Text: { Data: htmlBody.replace(/<[^>]+>/g, ''), Charset: 'UTF-8' },
        },
      },
    }));
  } catch (err) {
    // SES puede fallar en local/dev — loguear y continuar
    console.error('[notifications] SES error:', err.message);
  }
}

// ── Plantillas de email ────────────────────────────────────────────────────

function emailWrapper(content) {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"><style>
    body { font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 20px; }
    .card { background: #1e293b; border-radius: 12px; padding: 24px; max-width: 560px; margin: auto; }
    .logo { color: #3b82f6; font-size: 22px; font-weight: bold; margin-bottom: 16px; }
    .btn { display: inline-block; background: #2563eb; color: #fff; padding: 10px 22px;
           border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px; }
    .footer { text-align: center; color: #475569; font-size: 12px; margin-top: 24px; }
  </style></head>
  <body><div class="card"><div class="logo">🚀 TaskFlow Cloud</div>${content}</div>
  <div class="footer">TaskFlow Cloud — Plataforma Kanban AWS</div></body>
  </html>`;
}

// ── Handlers por tipo de evento ────────────────────────────────────────────

async function handleTaskCreated(payload) {
  const { taskId, projectId, assigneeId, reporterId, taskTitle = 'Nueva tarea' } = payload;
  if (!assigneeId || assigneeId === reporterId) return; // sin asignación o auto-asignado

  const [assignee, reporter] = await Promise.all([
    getUserById(assigneeId),
    getUserById(reporterId),
  ]);
  if (!assignee) return;

  await saveNotification(
    assigneeId,
    'task_assigned',
    'Te asignaron una tarea',
    `${reporter?.name ?? 'Alguien'} te asignó la tarea: "${taskTitle}"`,
    { taskId, projectId }
  );

  const html = emailWrapper(`
    <h2 style="color:#e2e8f0">Te asignaron una tarea 📋</h2>
    <p><strong>${reporter?.name ?? 'Un compañero'}</strong> te asignó la tarea:</p>
    <p style="background:#0f172a;padding:12px;border-radius:8px;font-size:16px">
      <strong>${taskTitle}</strong>
    </p>
    <a href="${frontendUrl}" class="btn">Ver tarea →</a>
  `);

  await sendEmail(assignee.email, `[TaskFlow] Te asignaron: ${taskTitle}`, html);
}

async function handleCommentCreated(payload) {
  const { commentId, taskId, authorId, taskTitle = 'una tarea', taskOwnerId } = payload;
  if (!taskOwnerId || taskOwnerId === authorId) return;

  const [author, owner] = await Promise.all([
    getUserById(authorId),
    getUserById(taskOwnerId),
  ]);
  if (!owner) return;

  await saveNotification(
    taskOwnerId,
    'comment_added',
    'Nuevo comentario en tu tarea',
    `${author?.name ?? 'Alguien'} comentó en "${taskTitle}"`,
    { commentId, taskId }
  );

  const html = emailWrapper(`
    <h2 style="color:#e2e8f0">Nuevo comentario 💬</h2>
    <p><strong>${author?.name ?? 'Un compañero'}</strong> comentó en tu tarea:</p>
    <p style="background:#0f172a;padding:12px;border-radius:8px"><strong>${taskTitle}</strong></p>
    <a href="${frontendUrl}" class="btn">Ver comentario →</a>
  `);

  await sendEmail(owner.email, `[TaskFlow] Comentario en: ${taskTitle}`, html);
}

async function handleInvitationSent(payload) {
  const { projectId, projectName, invitedUserId, invitedEmail, invitedName, role, invitedBy, pending } = payload;

  const inviter = await getUserById(invitedBy);

  // Invitación a un email AÚN NO registrado: solo email con link de registro
  // (no se crea notificación en DynamoDB porque todavía no existe el usuario).
  if (pending || !invitedUserId) {
    const html = emailWrapper(`
      <h2 style="color:#e2e8f0">¡Te invitaron a TaskFlow Cloud! 🎉</h2>
      <p><strong>${inviter?.name ?? 'Un administrador'}</strong> te invitó a colaborar como
         <strong>${role}</strong> en el proyecto:</p>
      <p style="background:#0f172a;padding:12px;border-radius:8px;font-size:18px">
        📁 <strong>${projectName}</strong>
      </p>
      <p>Crea tu cuenta con este mismo email y entrarás automáticamente al proyecto.</p>
      <a href="${frontendUrl}/register" class="btn">Crear cuenta →</a>
    `);
    await sendEmail(invitedEmail, `[TaskFlow] Te invitaron a "${projectName}"`, html);
    return;
  }

  await saveNotification(
    invitedUserId,
    'project_invite',
    `Te invitaron al proyecto "${projectName}"`,
    `${inviter?.name ?? 'Alguien'} te invitó como ${role} al proyecto "${projectName}"`,
    { projectId }
  );

  const html = emailWrapper(`
    <h2 style="color:#e2e8f0">¡Invitación al proyecto! 🎉</h2>
    <p>Hola <strong>${invitedName}</strong>,</p>
    <p><strong>${inviter?.name ?? 'Un administrador'}</strong> te invitó a colaborar en:</p>
    <p style="background:#0f172a;padding:12px;border-radius:8px;font-size:18px">
      📁 <strong>${projectName}</strong>
    </p>
    <p>Tu rol: <strong>${role}</strong></p>
    <a href="${frontendUrl}/projects/${projectId}" class="btn">Ir al proyecto →</a>
  `);

  await sendEmail(invitedEmail, `[TaskFlow] Invitación: ${projectName}`, html);
}

// ── Handler principal ──────────────────────────────────────────────────────

// Tipos de evento que esta Lambda sabe manejar.
const HANDLED_TYPES = new Set(['TASK_CREATED', 'COMMENT_CREATED', 'INVITATION_SENT']);

exports.handler = async (event) => {
  // Partial batch response: reportamos SOLO los mensajes que fallaron de forma
  // transitoria para que SQS los reintente y, tras maxReceiveCount, los envíe a
  // la DLQ. Los errores de datos (JSON inválido / tipo desconocido) se descartan
  // a propósito porque reintentarlos nunca tendría éxito (poison messages).
  const batchItemFailures = [];

  for (const record of event.Records) {
    let parsed;
    try {
      parsed = JSON.parse(record.body);
    } catch (err) {
      // Mensaje corrupto: descartar (no reintentar) para no envenenar la cola.
      console.error('[notifications] Mensaje no parseable, descartado:', record.messageId, err.message);
      continue;
    }

    const { type, payload } = parsed;

    // Tipo no manejado: no es un fallo, simplemente se ignora.
    if (!HANDLED_TYPES.has(type)) {
      console.log('[notifications] Tipo no manejado, ignorado:', type);
      continue;
    }

    try {
      console.log('[notifications] Procesando evento:', type, JSON.stringify(payload));
      switch (type) {
        case 'TASK_CREATED':     await handleTaskCreated(payload); break;
        case 'COMMENT_CREATED':  await handleCommentCreated(payload); break;
        case 'INVITATION_SENT':  await handleInvitationSent(payload); break;
      }
    } catch (err) {
      // Fallo transitorio (SES caído, DynamoDB throttled, etc.): reportar para
      // que SQS reintente este mensaje y eventualmente lo lleve a la DLQ.
      console.error('[notifications] Fallo transitorio, se reintentará:', record.messageId, err.message);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
