/**
 * Lambda 2 — Detección de tareas vencidas
 * Trigger: EventBridge (cron hourly)
 * Responsabilidad: escanea tareas con dueDate pasado y publica eventos SQS.
 * Solo procesa tareas que NO han sido notificadas previamente (overdueNotifiedAt ausente).
 */
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);
const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

const TASKS_TABLE = process.env.TASKS_TABLE ?? 'taskflow-tasks';
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;

export const handler = async () => {
  if (!SQS_QUEUE_URL) {
    console.error('SQS_QUEUE_URL no está configurado — abortando');
    return { error: 'SQS_QUEUE_URL not configured' };
  }

  console.log('Buscando tareas vencidas sin notificar...');
  const now = new Date().toISOString();

  // FIX: Excluir tareas que ya fueron notificadas (attribute_not_exists(overdueNotifiedAt))
  // FIX: Paginación completa con LastEvaluatedKey para no truncar resultados
  const overdueTasks: Record<string, unknown>[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await dynamoDB.send(
      new ScanCommand({
        TableName: TASKS_TABLE,
        FilterExpression:
          'dueDate < :now AND attribute_not_exists(completedAt) AND attribute_not_exists(overdueNotifiedAt)',
        ExpressionAttributeValues: { ':now': now },
        ExclusiveStartKey: lastKey,
      })
    );
    overdueTasks.push(...(result.Items ?? []));
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  console.log(`Encontradas ${overdueTasks.length} tareas vencidas sin notificar`);

  let processed = 0;
  for (const task of overdueTasks) {
    try {
      await sqs.send(
        new SendMessageCommand({
          QueueUrl: SQS_QUEUE_URL,
          MessageBody: JSON.stringify({
            type: 'TASK_OVERDUE',
            payload: {
              taskId: task.taskId,
              projectId: task.projectId,
              assigneeId: task.assigneeId,
              reporterId: task.reporterId,
              dueDate: task.dueDate,
            },
            timestamp: now,
          }),
          MessageAttributes: {
            eventType: { DataType: 'String', StringValue: 'TASK_OVERDUE' },
          },
        })
      );

      // Marcar como notificada DESPUÉS de publicar el evento exitosamente
      await dynamoDB.send(
        new UpdateCommand({
          TableName: TASKS_TABLE,
          Key: { taskId: task.taskId },
          UpdateExpression: 'SET overdueNotifiedAt = :now',
          ConditionExpression: 'attribute_not_exists(overdueNotifiedAt)', // idempotencia
          ExpressionAttributeValues: { ':now': now },
        })
      );

      processed++;
    } catch (err) {
      console.error(`Error procesando tarea vencida ${task.taskId}:`, err);
      // Continuar con las demás tareas aunque una falle
    }
  }

  console.log(`Procesadas ${processed}/${overdueTasks.length} tareas`);
  return { total: overdueTasks.length, processed };
};
