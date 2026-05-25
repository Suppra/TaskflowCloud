import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(500).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
