import { PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDB } from '../config/aws';
import { Board } from '../types';

const TABLE = 'taskflow-boards';

export const boardRepository = {
  async create(board: Board): Promise<Board> {
    await dynamoDB.send(new PutCommand({ TableName: TABLE, Item: board }));
    return board;
  },

  async findById(boardId: string): Promise<Board | null> {
    const result = await dynamoDB.send(
      new GetCommand({ TableName: TABLE, Key: { boardId } })
    );
    return (result.Item as Board) ?? null;
  },

  async findByProject(projectId: string): Promise<Board[]> {
    const items: Board[] = [];
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
      items.push(...((result.Items ?? []) as Board[]));
      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);
    return items;
  },

  async update(boardId: string, updates: Partial<Board>): Promise<Board | null> {
    const entries = Object.entries(updates).filter(([k]) => k !== 'boardId');
    if (entries.length === 0) return this.findById(boardId);

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
        Key: { boardId },
        UpdateExpression: updateExp,
        ExpressionAttributeNames: nameMap,
        ExpressionAttributeValues: valueMap,
        ReturnValues: 'ALL_NEW',
      })
    );
    return (result.Attributes as Board) ?? null;
  },

  async delete(boardId: string): Promise<void> {
    await dynamoDB.send(new DeleteCommand({ TableName: TABLE, Key: { boardId } }));
  },
};
