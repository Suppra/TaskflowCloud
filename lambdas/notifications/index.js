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

const arrayUnique = (arr) => [...new Set(arr.filter(Boolean))];

function resolveRecipientIds(payload = {}) {
  const fromList = Array.isArray(payload.recipientUserIds) ? payload.recipientUserIds : [];
  const fallback = [payload.assigneeId, payload.userId, payload.taskOwnerId, payload.invitedUserId, payload.reporterId];

  const actorIds = new Set(
    [payload.updatedBy, payload.authorId, payload.invitedBy, payload.reporterId]
      .filter(Boolean)
  );

  return arrayUnique([...fromList, ...fallback]).filter((userId) => !actorIds.has(userId));
}

function templateForEvent(type, payload, recipientName) {
  const taskTitle = payload.taskTitle ?? 'una tarea';
  const projectName = payload.projectName ?? 'tu proyecto';
  const reportType = String(payload.reportType ?? '').toUpperCase() || 'REPORTE';

  if (type === 'TASK_CREATED') {
    return {
      notificationType: 'task_assigned',
      title: 'Nueva actividad en tareas',
      message: `Se creo o asigno la tarea "${taskTitle}".`,
      subject: `[TaskFlow] Nueva tarea: ${taskTitle}`,
      html: emailWrapper(`
        <h2 style="color:#e2e8f0">Nueva actividad de tarea</h2>
        <p>Hola <strong>${recipientName}</strong>, se registro una tarea nueva:</p>
        <p style="background:#0f172a;padding:12px;border-radius:8px"><strong>${taskTitle}</strong></p>
        <a href="${frontendUrl}" class="btn">Ver tarea</a>
      `),
    };
  }

  if (type === 'TASK_UPDATED') {
    const deleted = payload.action === 'deleted';
    return {
      notificationType: 'task_updated',
      title: deleted ? 'Tarea eliminada' : 'Tarea actualizada',
      message: deleted
        ? `Se elimino la tarea "${taskTitle}".`
        : `Se actualizo la tarea "${taskTitle}".`,
      subject: deleted
        ? `[TaskFlow] Tarea eliminada: ${taskTitle}`
        : `[TaskFlow] Tarea actualizada: ${taskTitle}`,
      html: emailWrapper(`
        <h2 style="color:#e2e8f0">${deleted ? 'Tarea eliminada' : 'Tarea actualizada'}</h2>
        <p>Hola <strong>${recipientName}</strong>, hubo cambios en:</p>
        <p style="background:#0f172a;padding:12px;border-radius:8px"><strong>${taskTitle}</strong></p>
        <a href="${frontendUrl}" class="btn">Ver proyecto</a>
      `),
    };
  }

  if (type === 'TASK_OVERDUE') {
    return {
      notificationType: 'task_overdue',
      title: 'Tarea vencida',
      message: `La tarea "${taskTitle}" esta vencida y requiere atencion.`,
      subject: `[TaskFlow] Tarea vencida: ${taskTitle}`,
      html: emailWrapper(`
        <h2 style="color:#e2e8f0">Tarea vencida</h2>
        <p>Hola <strong>${recipientName}</strong>, la tarea vencida es:</p>
        <p style="background:#0f172a;padding:12px;border-radius:8px"><strong>${taskTitle}</strong></p>
        <a href="${frontendUrl}" class="btn">Revisar tarea</a>
      `),
    };
  }

  if (type === 'COMMENT_CREATED') {
    return {
      notificationType: 'comment_added',
      title: 'Nuevo comentario',
      message: `Se agrego un comentario en "${taskTitle}".`,
      subject: `[TaskFlow] Nuevo comentario en: ${taskTitle}`,
      html: emailWrapper(`
        <h2 style="color:#e2e8f0">Nuevo comentario</h2>
        <p>Hola <strong>${recipientName}</strong>, se agrego un comentario en:</p>
        <p style="background:#0f172a;padding:12px;border-radius:8px"><strong>${taskTitle}</strong></p>
        <a href="${frontendUrl}" class="btn">Ver comentarios</a>
      `),
    };
  }

  if (type === 'REPORT_GENERATED') {
    return {
      notificationType: 'report_ready',
      title: 'Reporte disponible',
      message: `Se genero un reporte ${reportType} para "${projectName}".`,
      subject: `[TaskFlow] Reporte ${reportType} disponible: ${projectName}`,
      html: emailWrapper(`
        <h2 style="color:#e2e8f0">Reporte disponible</h2>
        <p>Hola <strong>${recipientName}</strong>, ya esta disponible un reporte ${reportType} del proyecto:</p>
        <p style="background:#0f172a;padding:12px;border-radius:8px"><strong>${projectName}</strong></p>
        <a href="${frontendUrl}" class="btn">Abrir reportes</a>
      `),
    };
  }

  if (type === 'INVITATION_SENT') {
    return {
      notificationType: 'project_invite',
      title: `Invitacion al proyecto "${projectName}"`,
      message: `Fuiste invitado a participar como ${payload.role ?? 'member'}.`,
      subject: `[TaskFlow] Invitacion: ${projectName}`,
      html: emailWrapper(`
        <h2 style="color:#e2e8f0">Invitacion al proyecto</h2>
        <p>Hola <strong>${recipientName}</strong>, fuiste invitado a:</p>
        <p style="background:#0f172a;padding:12px;border-radius:8px"><strong>${projectName}</strong></p>
        <a href="${frontendUrl}/projects/${payload.projectId}" class="btn">Abrir proyecto</a>
      `),
    };
  }

  if (type === 'ALERT_TRIGGERED') {
    return {
      notificationType: 'alert_triggered',
      title: 'Alerta del proyecto',
      message: String(payload.message ?? 'Se detecto una alerta en el proyecto.'),
      subject: `[TaskFlow] Alerta: ${projectName}`,
      html: emailWrapper(`
        <h2 style="color:#e2e8f0">Alerta de proyecto</h2>
        <p>Hola <strong>${recipientName}</strong>, se genero una alerta:</p>
        <p style="background:#0f172a;padding:12px;border-radius:8px">${payload.message ?? 'Revisa tu proyecto para mas detalles.'}</p>
        <a href="${frontendUrl}" class="btn">Ver alertas</a>
      `),
    };
  }

  return null;
}

async function handlePendingInvitation(payload) {
  if (!payload.invitedEmail) return;
  const inviter = await getUserById(payload.invitedBy);
  const html = emailWrapper(`
    <h2 style="color:#e2e8f0">Invitacion a TaskFlow Cloud</h2>
    <p><strong>${inviter?.name ?? 'Un administrador'}</strong> te invito al proyecto:</p>
    <p style="background:#0f172a;padding:12px;border-radius:8px"><strong>${payload.projectName}</strong></p>
    <p>Crea tu cuenta con este email para unirte automaticamente.</p>
    <a href="${frontendUrl}/register" class="btn">Crear cuenta</a>
  `);
  await sendEmail(payload.invitedEmail, `[TaskFlow] Te invitaron a "${payload.projectName}"`, html);
}

async function processEvent(sqsEvent) {
  const { type, payload } = sqsEvent;

  if (type === 'INVITATION_SENT' && (payload.pending || !payload.invitedUserId)) {
    await handlePendingInvitation(payload);
    return;
  }

  const recipientIds = resolveRecipientIds(payload);
  if (recipientIds.length === 0) return;

  const template = templateForEvent(type, payload, '{{name}}');
  if (!template) return;

  for (const userId of recipientIds) {
    const user = await getUserById(userId);
    if (!user || !user.email) continue;

    const personalized = templateForEvent(type, payload, user.name ?? 'colaborador');
    if (!personalized) continue;

    await saveNotification(
      userId,
      personalized.notificationType,
      personalized.title,
      personalized.message,
      payload
    );

    await sendEmail(user.email, personalized.subject, personalized.html);
  }
}

// ── Handler principal ──────────────────────────────────────────────────────

const HANDLED_TYPES = new Set([
  'TASK_CREATED',
  'TASK_UPDATED',
  'TASK_OVERDUE',
  'COMMENT_CREATED',
  'INVITATION_SENT',
  'REPORT_GENERATED',
  'ALERT_TRIGGERED',
]);

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
      await processEvent(parsed);
    } catch (err) {
      // Fallo transitorio (SES caído, DynamoDB throttled, etc.): reportar para
      // que SQS reintente este mensaje y eventualmente lo lleve a la DLQ.
      console.error('[notifications] Fallo transitorio, se reintentará:', record.messageId, err.message);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
