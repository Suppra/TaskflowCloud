/**
 * Lambda 2 — Detección de tareas vencidas
 * Trigger: EventBridge (cron hourly)
 * Responsabilidad: escanea tareas con dueDate pasado y publica eventos SQS
 */
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);
const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

const TASKS_TABLE = process.env.TASKS_TABLE ?? 'taskflow-tasks';
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL!;

export const handler = async () => {
  console.log('Checking for overdue tasks...');
  const now = new Date().toISOString();

  const result = await dynamoDB.send(new ScanCommand({
    TableName: TASKS_TABLE,
    FilterExpression: 'dueDate < :now AND attribute_not_exists(completedAt)',
    ExpressionAttributeValues: { ':now': now },
  }));

  const overdueTasks = result.Items ?? [];
  console.log(`Found ${overdueTasks.length} overdue tasks`);

  for (const task of overdueTasks) {
    try {
      // Publicar evento SQS
      await sqs.send(new SendMessageCommand({
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
      }));

      // Marcar tarea como notificada (evitar duplicados)
      await dynamoDB.send(new UpdateCommand({
        TableName: TASKS_TABLE,
        Key: { taskId: task.taskId },
        UpdateExpression: 'SET overdueNotifiedAt = :now',
        ExpressionAttributeValues: { ':now': now },
      }));
    } catch (err) {
      console.error(`Failed to process overdue task ${task.taskId}:`, err);
    }
  }

  return { processed: overdueTasks.length };
};
