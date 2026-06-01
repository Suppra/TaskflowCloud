import { PutCommand, QueryCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDB } from '../config/aws';
import { Notification } from '../types';

const TABLE = 'taskflow-notifications';

export const notificationRepository = {
  async create(notification: Notification): Promise<Notification> {
    await dynamoDB.send(new PutCommand({ TableName: TABLE, Item: notification }));
    return notification;
  },

  async findByUser(userId: string): Promise<Notification[]> {
    const items: Notification[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await dynamoDB.send(
        new QueryCommand({
          TableName: TABLE,
          IndexName: 'userId-index',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': userId },
          ScanIndexForward: false, // más recientes primero
          ExclusiveStartKey: lastKey,
        })
      );
      items.push(...((result.Items ?? []) as Notification[]));
      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);
    return items;
  },

  async findById(notificationId: string): Promise<Notification | null> {
    const result = await dynamoDB.send(
      new GetCommand({ TableName: TABLE, Key: { notificationId } })
    );
    return (result.Item as Notification) ?? null;
  },

  async markAsRead(notificationId: string): Promise<Notification | null> {
    const result = await dynamoDB.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { notificationId },
        UpdateExpression: 'SET #r = :true',
        ExpressionAttributeNames: { '#r': 'read' },
        ExpressionAttributeValues: { ':true': true },
        ReturnValues: 'ALL_NEW',
      })
    );
    return (result.Attributes as Notification) ?? null;
  },

  async markAllAsRead(userId: string): Promise<void> {
    const unread = await this.findByUser(userId);
    const pending = unread.filter(n => !n.read);
    await Promise.all(pending.map(n => this.markAsRead(n.notificationId)));
  },

  async countUnread(userId: string): Promise<number> {
    const all = await this.findByUser(userId);
    return all.filter(n => !n.read).length;
  },
};
