import { PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDB } from '../config/aws';
import { User } from '../types';

const TABLE = 'taskflow-users';

export const userRepository = {
  async create(user: User): Promise<User> {
    await dynamoDB.send(new PutCommand({ TableName: TABLE, Item: user }));
    return user;
  },

  async findById(userId: string): Promise<User | null> {
    const result = await dynamoDB.send(
      new GetCommand({ TableName: TABLE, Key: { userId } })
    );
    return (result.Item as User) ?? null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const result = await dynamoDB.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email },
      })
    );
    return result.Items?.[0] as User ?? null;
  },

  async update(userId: string, updates: Partial<User>): Promise<User | null> {
    const entries = Object.entries(updates).filter(([k]) => k !== 'userId');
    if (entries.length === 0) return this.findById(userId);

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
        Key: { userId },
        UpdateExpression: updateExp,
        ExpressionAttributeNames: nameMap,
        ExpressionAttributeValues: valueMap,
        ReturnValues: 'ALL_NEW',
      })
    );
    return result.Attributes as User ?? null;
  },

  async delete(userId: string): Promise<void> {
    await dynamoDB.send(new DeleteCommand({ TableName: TABLE, Key: { userId } }));
  },
};
