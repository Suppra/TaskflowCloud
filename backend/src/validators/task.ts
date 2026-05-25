import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  columnId: z.string().min(1),
  assigneeId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  labels: z.array(z.string()).default([]),
  order: z.number().int().min(0).default(0),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  columnId: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  labels: z.array(z.string()).optional(),
  order: z.number().int().min(0).optional(),
  completedAt: z.string().datetime().optional(),
});

export const addCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const addSubtaskSchema = z.object({
  title: z.string().min(1).max(300),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
