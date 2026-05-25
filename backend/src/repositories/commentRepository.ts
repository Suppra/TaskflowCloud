import { PutCommand, QueryCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDB } from '../config/aws';
import { Comment } from '../types';

const TABLE = 'taskflow-comments';

export const commentRepository = {
  async create(comment: Comment): Promise<Comment> {
    await dynamoDB.send(new PutCommand({ TableName: TABLE, Item: comment }));
    return comment;
  },

  async findByTask(taskId: string): Promise<Comment[]> {
    const items: Comment[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await dynamoDB.send(
        new QueryCommand({
          TableName: TABLE,
          IndexName: 'taskId-index',
          KeyConditionExpression: 'taskId = :taskId',
          ExpressionAttributeValues: { ':taskId': taskId },
          ExclusiveStartKey: lastKey,
        })
      );
      items.push(...((result.Items ?? []) as Comment[]));
      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);
    return items;
  },

  async findById(commentId: string): Promise<Comment | null> {
    const result = await dynamoDB.send(
      new GetCommand({ TableName: TABLE, Key: { commentId } })
    );
    return (result.Item as Comment) ?? null;
  },

  async delete(commentId: string): Promise<void> {
    await dynamoDB.send(new DeleteCommand({ TableName: TABLE, Key: { commentId } }));
  },
};
