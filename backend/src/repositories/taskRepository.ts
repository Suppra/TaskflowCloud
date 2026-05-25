import { PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
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

  async findByBoard(boardId: string): Promise<Task[]> {
    const result = await dynamoDB.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: 'boardId-index',
        KeyConditionExpression: 'boardId = :boardId',
        ExpressionAttributeValues: { ':boardId': boardId },
      })
    );
    return (result.Items ?? []) as Task[];
  },

  async findByProject(projectId: string): Promise<Task[]> {
    const result = await dynamoDB.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: 'projectId-index',
        KeyConditionExpression: 'projectId = :projectId',
        ExpressionAttributeValues: { ':projectId': projectId },
      })
    );
    return (result.Items ?? []) as Task[];
  },

  async findOverdue(): Promise<Task[]> {
    const now = new Date().toISOString();
    const result = await dynamoDB.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: 'dueDate-index',
        KeyConditionExpression: 'dueDate < :now',
        FilterExpression: 'completedAt = :null',
        ExpressionAttributeValues: { ':now': now, ':null': null },
      })
    );
    return (result.Items ?? []) as Task[];
  },

  async update(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    const entries = Object.entries(updates).filter(([k]) => k !== 'taskId');
    if (entries.length === 0) return this.findById(taskId);

    const updateExp = 'SET ' + entries.map(([k], i) => `#k${i} = :v${i}`).join(', ');
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
    return result.Attributes as Task ?? null;
  },

  async delete(taskId: string): Promise<void> {
    await dynamoDB.send(new DeleteCommand({ TableName: TABLE, Key: { taskId } }));
  },
};
