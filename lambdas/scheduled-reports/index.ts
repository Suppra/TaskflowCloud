/**
 * Lambda 3 — Reportes automáticos
 * Trigger: EventBridge (cron weekly / on-demand)
 * Responsabilidad: genera reportes PDF/CSV de proyectos y los sube a S3
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);
const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

const TASKS_TABLE = process.env.TASKS_TABLE ?? 'taskflow-tasks';
const PROJECTS_TABLE = process.env.PROJECTS_TABLE ?? 'taskflow-projects';
const S3_BUCKET = process.env.S3_BUCKET_REPORTS ?? 'taskflow-reports-dev';
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL!;

export const handler = async (event: { projectId?: string }) => {
  console.log('Generating reports...', event);

  // Obtener todos los proyectos activos (o solo el indicado)
  const projectsResult = await dynamoDB.send(new ScanCommand({
    TableName: PROJECTS_TABLE,
    FilterExpression: '#s = :active',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':active': 'active' },
  }));

  const projects = event.projectId
    ? projectsResult.Items?.filter(p => p.projectId === event.projectId)
    : projectsResult.Items;

  if (!projects?.length) return { message: 'No active projects found' };

  for (const project of projects) {
    try {
      // Obtener tareas del proyecto
      const tasksResult = await dynamoDB.send(new QueryCommand({
        TableName: TASKS_TABLE,
        IndexName: 'projectId-index',
        KeyConditionExpression: 'projectId = :pid',
        ExpressionAttributeValues: { ':pid': project.projectId },
      }));
      const tasks = tasksResult.Items ?? [];

      // Generar CSV
      const now = new Date().toISOString().split('T')[0];
      const reportId = uuidv4();
      const csvKey = `reports/${project.projectId}/${now}-${reportId}.csv`;

      const headers = 'taskId,title,priority,status,assigneeId,dueDate,createdAt,completedAt';
      const rows = tasks.map(t =>
        [t.taskId, `"${t.title}"`, t.priority, t.columnId, t.assigneeId ?? '', t.dueDate ?? '', t.createdAt, t.completedAt ?? ''].join(',')
      );
      const csv = [headers, ...rows].join('\n');

      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: csvKey,
        Body: csv,
        ContentType: 'text/csv',
        Metadata: { projectId: project.projectId, generatedAt: new Date().toISOString() },
      }));

      console.log(`Report generated: ${csvKey} (${tasks.length} tasks)`);

      // Publicar evento
      await sqs.send(new SendMessageCommand({
        QueueUrl: SQS_QUEUE_URL,
        MessageBody: JSON.stringify({
          type: 'REPORT_GENERATED',
          payload: { projectId: project.projectId, reportKey: csvKey, taskCount: tasks.length },
          timestamp: new Date().toISOString(),
        }),
      }));
    } catch (err) {
      console.error(`Failed to generate report for project ${project.projectId}:`, err);
    }
  }

  return { projects: projects.length };
};
