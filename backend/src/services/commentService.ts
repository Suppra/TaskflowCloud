import { v4 as uuidv4 } from 'uuid';
import { PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDB } from '../config/aws';
import { Comment } from '../types';
import { eventPublisher } from '../events/eventPublisher';

const TABLE = 'taskflow-comments';

export const commentService = {
  async create(taskId: string, authorId: string, content: string): Promise<Comment> {
    const now = new Date().toISOString();
    const comment: Comment = {
      commentId: uuidv4(),
      taskId,
      authorId,
      content,
      createdAt: now,
      updatedAt: now,
    };
    await dynamoDB.send(new PutCommand({ TableName: TABLE, Item: comment }));

    await eventPublisher.publish({
      type: 'COMMENT_CREATED',
      payload: { commentId: comment.commentId, taskId, authorId },
      timestamp: now,
    });

    return comment;
  },

  async findByTask(taskId: string): Promise<Comment[]> {
    const result = await dynamoDB.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: 'taskId-index',
        KeyConditionExpression: 'taskId = :taskId',
        ExpressionAttributeValues: { ':taskId': taskId },
      })
    );
    return (result.Items ?? []) as Comment[];
  },

  async delete(commentId: string): Promise<void> {
    await dynamoDB.send(new DeleteCommand({ TableName: TABLE, Key: { commentId } }));
  },
};
