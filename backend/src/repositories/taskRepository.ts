import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { dynamoDB } from '../config/aws';
import { Task } from '../types';

const TABLE = 'taskflow-tasks';

export const taskRepository = {
  async create(task: Task): Promise<Task> {
    await dynamoDB.send(new PutCommand({ TableName: TABLE, Item: task }));
    return task;
  },

  async findById(taskId: string): Promise<Task | null> {
    const result = await dynamoDB.send(
      new GetCommand({ TableName: TABLE, Key: { taskId } })
    );
    return (result.Item as Task) ?? null;
  },

  async findByBoard(
    boardId: string,
    filters?: { priority?: string; assigneeId?: string; label?: string }
  ): Promise<Task[]> {
    const items: Task[] = [];
    let lastKey: Record<string, unknown> | undefined;

    // Construir FilterExpression dinámico para los filtros opcionales
    const filterParts: string[] = [];
    const nameMap: Record<string, string> = {};
    const valueMap: Record<string, unknown> = { ':boardId': boardId };

    if (filters?.priority) {
      filterParts.push('#priority = :priority');
      nameMap['#priority'] = 'priority';
      valueMap[':priority'] = filters.priority;
    }
    if (filters?.assigneeId) {
      filterParts.push('assigneeId = :assigneeId');
      valueMap[':assigneeId'] = filters.assigneeId;
    }
    if (filters?.label) {
      filterParts.push('contains(labels, :label)');
      valueMap[':label'] = filters.label;
    }

    do {
      const result = await dynamoDB.send(
        new QueryCommand({
          TableName: TABLE,
          IndexName: 'boardId-index',
          KeyConditionExpression: 'boardId = :boardId',
          ...(filterParts.length > 0 && {
            FilterExpression: filterParts.join(' AND '),
          }),
          ExpressionAttributeNames: Object.keys(nameMap).length > 0 ? nameMap : undefined,
          ExpressionAttributeValues: valueMap,
          ExclusiveStartKey: lastKey,
        })
      );
      items.push(...((result.Items ?? []) as Task[]));
      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);
    return items;
  },

  async findByProject(projectId: string): Promise<Task[]> {
    const items: Task[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await dynamoDB.send(
        new QueryCommand({
          TableName: TABLE,
          IndexName: 'projectId-index',
          KeyConditionExpression: 'projectId = :projectId',
          ExpressionAttributeValues: { ':projectId': projectId },
          ExclusiveStartKey: lastKey,
        })
      );
      items.push(...((result.Items ?? []) as Task[]));
      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);
    return items;
  },

  /**
   * Tareas abiertas vencidas que aún no fueron notificadas.
   * Usa ScanCommand porque DynamoDB no soporta range queries sobre partition keys.
   * TODO de escala: GSI con PK fija ('OPEN') + SK=dueDate para evitar full scan.
   */
  async findOverdue(): Promise<Task[]> {
    const now = new Date().toISOString();
    const items: Task[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await dynamoDB.send(
        new ScanCommand({
          TableName: TABLE,
          FilterExpression:
            'dueDate < :now ' +
            'AND attribute_not_exists(completedAt) ' +
            'AND attribute_not_exists(overdueNotifiedAt)',
          ExpressionAttributeValues: { ':now': now },
          ExclusiveStartKey: lastKey,
        })
      );
      items.push(...((result.Items ?? []) as Task[]));
      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);
    return items;
  },

  async update(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    const entries = Object.entries(updates).filter(([k]) => k !== 'taskId');
    if (entries.length === 0) return this.findById(taskId);

    const updateExp = 'SET ' + entries.map((_, i) => `#k${i} = :v${i}`).join(', ');
    const nameMap: Record<string, string> = {};
    const valueMap: Record<string, unknown> = {};
    entries.forEach(([k, v], i) => {
      nameMap[`#k${i}`] = k;
      valueMap[`:v${i}`] = v;
    });

    const result = await dynamoDB.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { taskId },
        UpdateExpression: updateExp,
        ExpressionAttributeNames: nameMap,
        ExpressionAttributeValues: valueMap,
        ReturnValues: 'ALL_NEW',
      })
    );
    return (result.Attributes as Task) ?? null;
  },

  async delete(taskId: string): Promise<void> {
    await dynamoDB.send(new DeleteCommand({ TableName: TABLE, Key: { taskId } }));
  },
};
