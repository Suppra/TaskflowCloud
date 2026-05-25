/**
 * Lambda 4 — Motor de alertas
 * Trigger: EventBridge (cron daily)
 * Responsabilidad: detecta riesgos automáticos y genera alertas en DynamoDB
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);
const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

const TASKS_TABLE = process.env.TASKS_TABLE ?? 'taskflow-tasks';
const PROJECTS_TABLE = process.env.PROJECTS_TABLE ?? 'taskflow-projects';
const ALERTS_TABLE = process.env.ALERTS_TABLE ?? 'taskflow-alerts';
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL!;

interface Alert {
  alertId: string;
  projectId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  resolved: boolean;
  createdAt: string;
}

export const handler = async () => {
  console.log('Running alerts engine...');
  const now = new Date();
  const alerts: Alert[] = [];

  const projectsResult = await dynamoDB.send(new ScanCommand({
    TableName: PROJECTS_TABLE,
    FilterExpression: '#s = :active',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':active': 'active' },
  }));

  for (const project of projectsResult.Items ?? []) {
    const tasksResult = await dynamoDB.send(new QueryCommand({
      TableName: TASKS_TABLE,
      IndexName: 'projectId-index',
      KeyConditionExpression: 'projectId = :pid',
      ExpressionAttributeValues: { ':pid': project.projectId },
    }));
    const tasks = tasksResult.Items ?? [];
    const openTasks = tasks.filter(t => !t.completedAt);
    const overdueTasks = openTasks.filter(t => t.dueDate && new Date(t.dueDate) < now);
    const criticalTasks = openTasks.filter(t => t.priority === 'critical');

    // Regla 1: >30% de tareas vencidas
    if (openTasks.length > 0 && overdueTasks.length / openTasks.length > 0.3) {
      alerts.push({
        alertId: uuidv4(), projectId: project.projectId,
        type: 'overdue_tasks',
        severity: overdueTasks.length / openTasks.length > 0.6 ? 'critical' : 'high',
        message: `${overdueTasks.length} de ${openTasks.length} tareas abiertas están vencidas (${Math.round(overdueTasks.length / openTasks.length * 100)}%)`,
        resolved: false, createdAt: now.toISOString(),
      });
    }

    // Regla 2: tareas críticas sin asignar
    const unassignedCritical = criticalTasks.filter(t => !t.assigneeId);
    if (unassignedCritical.length > 0) {
      alerts.push({
        alertId: uuidv4(), projectId: project.projectId,
        type: 'risk_detected',
        severity: 'high',
        message: `${unassignedCritical.length} tarea(s) crítica(s) sin asignar`,
        resolved: false, createdAt: now.toISOString(),
      });
    }
  }

  // Guardar alertas y publicar eventos
  for (const alert of alerts) {
    await dynamoDB.send(new PutCommand({ TableName: ALERTS_TABLE, Item: alert }));
    await sqs.send(new SendMessageCommand({
      QueueUrl: SQS_QUEUE_URL,
      MessageBody: JSON.stringify({
        type: 'ALERT_TRIGGERED',
        payload: alert,
        timestamp: now.toISOString(),
      }),
    }));
    console.log(`Alert created: ${alert.type} [${alert.severity}] for project ${alert.projectId}`);
  }

  return { alertsGenerated: alerts.length };
};
