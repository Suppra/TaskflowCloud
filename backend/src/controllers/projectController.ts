import { Response } from 'express';
import { projectService } from '../services/projectService';
import { AuthRequest } from '../middleware/auth';
import { createProjectSchema, updateProjectSchema, inviteMemberSchema } from '../validators/project';
import { sendSuccess, sendCreated } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

export const projectController = {
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const input = createProjectSchema.parse(req.body);
    const project = await projectService.create(input, req.user!.userId);
    return sendCreated(res, project, 'Proyecto creado correctamente');
  }),

  list: asyncHandler(async (req: AuthRequest, res: Response) => {
    const projects = await projectService.findUserProjects(req.user!.userId);
    return sendSuccess(res, projects);
  }),

  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    // Verifica membresía antes de exponer datos del proyecto
    const project = await projectService.assertMember(req.params.projectId, req.user!.userId);
    return sendSuccess(res, project);
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const input = updateProjectSchema.parse(req.body);
    const project = await projectService.update(req.params.projectId, input, req.user!.userId);
    return sendSuccess(res, project, 'Proyecto actualizado');
  }),

  archive: asyncHandler(async (req: AuthRequest, res: Response) => {
    const project = await projectService.archive(req.params.projectId, req.user!.userId);
    return sendSuccess(res, project, 'Proyecto archivado');
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectService.delete(req.params.projectId, req.user!.userId);
    return sendSuccess(res, null, 'Proyecto eliminado');
  }),

  inviteMember: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, role } = inviteMemberSchema.parse(req.body);
    const project = await projectService.inviteMember(
      req.params.projectId,
      email,
      role,
      req.user!.userId
    );
    return sendSuccess(res, project, 'Miembro invitado correctamente');
  }),

  removeMember: asyncHandler(async (req: AuthRequest, res: Response) => {
    const updated = await projectService.removeMember(
      req.params.projectId,
      req.params.memberId,
      req.user!.userId
    );
    return sendSuccess(res, updated, 'Miembro eliminado');
  }),
};
