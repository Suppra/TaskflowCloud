import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { dynamoDB } from '../config/aws';
import { Project } from '../types';

const TABLE = 'taskflow-projects';

export const projectRepository = {
  async create(project: Project): Promise<Project> {
    await dynamoDB.send(new PutCommand({ TableName: TABLE, Item: project }));
    return project;
  },

  async findById(projectId: string): Promise<Project | null> {
    const result = await dynamoDB.send(
      new GetCommand({ TableName: TABLE, Key: { projectId } })
    );
    return (result.Item as Project) ?? null;
  },

  async findByOwner(ownerId: string): Promise<Project[]> {
    const items: Project[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await dynamoDB.send(
        new QueryCommand({
          TableName: TABLE,
          IndexName: 'ownerId-index',
          KeyConditionExpression: 'ownerId = :ownerId',
          ExpressionAttributeValues: { ':ownerId': ownerId },
          ExclusiveStartKey: lastKey,
        })
      );
      items.push(...((result.Items ?? []) as Project[]));
      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);
    return items;
  },

  /**
   * Proyectos donde el usuario es miembro (no propietario).
   * Usa `memberUserIds` (atributo desnormalizado) con FilterExpression.
   * TODO: Reemplazar con tabla separada taskflow-project-members + GSI para escala.
   */
  async findByMember(userId: string): Promise<Project[]> {
    const items: Project[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await dynamoDB.send(
        new ScanCommand({
          TableName: TABLE,
          FilterExpression: 'contains(memberUserIds, :userId) AND ownerId <> :userId',
          ExpressionAttributeValues: { ':userId': userId },
          ExclusiveStartKey: lastKey,
        })
      );
      items.push(...((result.Items ?? []) as Project[]));
      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);
    return items;
  },

  async update(projectId: string, updates: Partial<Project>): Promise<Project | null> {
    const entries = Object.entries(updates).filter(([k]) => k !== 'projectId');
    if (entries.length === 0) return this.findById(projectId);

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
        Key: { projectId },
        UpdateExpression: updateExp,
        ExpressionAttributeNames: nameMap,
        ExpressionAttributeValues: valueMap,
        ReturnValues: 'ALL_NEW',
      })
    );
    return (result.Attributes as Project) ?? null;
  },

  async delete(projectId: string): Promise<void> {
    await dynamoDB.send(new DeleteCommand({ TableName: TABLE, Key: { projectId } }));
  },
};
