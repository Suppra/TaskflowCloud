import { Response } from 'express';
import { projectService } from '../services/projectService';
import { AuthRequest } from '../middleware/auth';
import { createProjectSchema, updateProjectSchema, inviteMemberSchema } from '../validators/project';
import { sendSuccess, sendCreated, sendError } from '../utils/response';

export const projectController = {
  async create(req: AuthRequest, res: Response) {
    const input = createProjectSchema.parse(req.body);
    const project = await projectService.create(input, req.user!.userId);
    return sendCreated(res, project, 'Proyecto creado correctamente');
  },

  async list(req: AuthRequest, res: Response) {
    const projects = await projectService.findUserProjects(req.user!.userId);
    return sendSuccess(res, projects);
  },

  async getById(req: AuthRequest, res: Response) {
    const project = await projectService.findById(req.params.projectId);
    return sendSuccess(res, project);
  },

  async update(req: AuthRequest, res: Response) {
    const input = updateProjectSchema.parse(req.body);
    const project = await projectService.update(req.params.projectId, input, req.user!.userId);
    return sendSuccess(res, project, 'Proyecto actualizado');
  },

  async archive(req: AuthRequest, res: Response) {
    const project = await projectService.archive(req.params.projectId, req.user!.userId);
    return sendSuccess(res, project, 'Proyecto archivado');
  },

  async delete(req: AuthRequest, res: Response) {
    await projectService.delete(req.params.projectId, req.user!.userId);
    return sendSuccess(res, null, 'Proyecto eliminado');
  },

  async inviteMember(req: AuthRequest, res: Response) {
    const { email, role } = inviteMemberSchema.parse(req.body);
    const project = await projectService.inviteMember(
      req.params.projectId, email, role, req.user!.userId
    );
    return sendSuccess(res, project, 'Miembro invitado correctamente');
  },

  async removeMember(req: AuthRequest, res: Response) {
    const { memberId } = req.params;
    const project = await projectService.findById(req.params.projectId);
    if (project.ownerId === memberId) return sendError(res, 'No se puede eliminar al propietario', 400);
    const members = project.members.filter(m => m.userId !== memberId);
    // update via repo directly since projectService.update needs UpdateProjectInput
    const { projectRepository } = await import('../repositories/projectRepository');
    const updated = await projectRepository.update(req.params.projectId, {
      members,
      updatedAt: new Date().toISOString(),
    });
    return sendSuccess(res, updated, 'Miembro eliminado');
  },
};
