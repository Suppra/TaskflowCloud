/**
 * Lambda 1 — Notificaciones
 * Trigger: SQS (eventos de la aplicación)
 * Responsabilidad: persiste notificaciones en DynamoDB y envía emails vía SES
 */
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDB, PutCommand, QueryCommand } from '../shared/dynamodb';
import type { LambdaSQSEvent, SQSEvent } from '../shared/types';

const ses = new SESClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
const FROM_EMAIL = process.env.SES_FROM_EMAIL ?? 'noreply@taskflow.dev';
const NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE ?? 'taskflow-notifications';
const USERS_TABLE = process.env.USERS_TABLE ?? 'taskflow-users';

const TEMPLATES: Record<string, (payload: Record<string, unknown>) => { title: string; message: string; subject: string; body: string }> = {
  TASK_CREATED: (p) => ({
    title: 'Nueva tarea asignada',
    message: `Se te asignó una nueva tarea en el proyecto.`,
    subject: 'TaskFlow: Nueva tarea asignada',
    body: `<p>Se te ha asignado una nueva tarea. Ingresa a TaskFlow para ver los detalles.</p>`,
  }),
  TASK_OVERDUE: (p) => ({
    title: 'Tarea vencida',
    message: `Una tarea bajo tu responsabilidad está vencida.`,
    subject: 'TaskFlow: Tarea vencida',
    body: `<p>Una tarea bajo tu responsabilidad ha vencido. Por favor revísala en TaskFlow.</p>`,
  }),
  COMMENT_CREATED: (p) => ({
    title: 'Nuevo comentario',
    message: `Alguien comentó en una tarea.`,
    subject: 'TaskFlow: Nuevo comentario',
    body: `<p>Se agregó un comentario en una de tus tareas. Revisa TaskFlow para ver el detalle.</p>`,
  }),
  INVITATION_SENT: (p) => ({
    title: 'Invitación a proyecto',
    message: `Has sido invitado a un proyecto.`,
    subject: 'TaskFlow: Invitación a proyecto',
    body: `<p>Has sido invitado a colaborar en un proyecto de TaskFlow.</p>`,
  }),
};

export const handler = async (event: LambdaSQSEvent) => {
  console.log(`Processing ${event.Records.length} messages`);

  for (const record of event.Records) {
    try {
      const sqsEvent: SQSEvent = JSON.parse(record.body);
      const template = TEMPLATES[sqsEvent.type];
      if (!template) { console.warn(`No template for event type: ${sqsEvent.type}`); continue; }

      const { title, message, subject, body } = template(sqsEvent.payload);
      const targetUserId = (sqsEvent.payload.assigneeId ?? sqsEvent.payload.userId) as string | undefined;
      if (!targetUserId) continue;

      // 1. Guardar notificación en DynamoDB
      await dynamoDB.send(new PutCommand({
        TableName: NOTIFICATIONS_TABLE,
        Item: {
          notificationId: uuidv4(),
          userId: targetUserId,
          type: sqsEvent.type.toLowerCase(),
          title,
          message,
          read: false,
          data: sqsEvent.payload,
          createdAt: new Date().toISOString(),
        },
      }));

      // 2. Obtener email del usuario
      const userResult = await dynamoDB.send(new QueryCommand({
        TableName: USERS_TABLE,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': targetUserId },
      }));
      const user = userResult.Items?.[0];
      if (!user?.email) continue;

      // 3. Enviar email vía SES
      await ses.send(new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: { ToAddresses: [user.email] },
        Message: {
          Subject: { Data: subject },
          Body: {
            Html: { Data: `<html><body style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px">${body}<hr/><p style="font-size:12px;color:#666">TaskFlow Cloud — Sistema de Gestión de Proyectos</p></body></html>` },
          },
        },
      }));

      console.log(`Notification sent to user ${targetUserId} for event ${sqsEvent.type}`);
    } catch (err) {
      console.error('Error processing record:', record.messageId, err);
    }
  }
};
