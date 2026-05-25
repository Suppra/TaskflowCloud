import { v4 as uuidv4 } from 'uuid';
import { commentRepository } from '../repositories/commentRepository';
import { Comment } from '../types';
import { eventPublisher } from '../events/eventPublisher';

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

    await commentRepository.create(comment);

    await eventPublisher.publish({
      type: 'COMMENT_CREATED',
      payload: { commentId: comment.commentId, taskId, authorId },
      timestamp: now,
    });

    return comment;
  },

  async findByTask(taskId: string): Promise<Comment[]> {
    return commentRepository.findByTask(taskId);
  },

  async delete(commentId: string, requesterId: string): Promise<void> {
    const comment = await commentRepository.findById(commentId);
    if (!comment) throw Object.assign(new Error('Comentario no encontrado'), { statusCode: 404 });
    if (comment.authorId !== requesterId) {
      throw Object.assign(new Error('Solo el autor puede eliminar el comentario'), { statusCode: 403 });
    }
    await commentRepository.delete(commentId);
  },
};
