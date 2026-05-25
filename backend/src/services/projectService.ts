import { v4 as uuidv4 } from 'uuid';
import { projectRepository } from '../repositories/projectRepository';
import { userRepository } from '../repositories/userRepository';
import { Project, ProjectMember } from '../types';
import { CreateProjectInput, UpdateProjectInput } from '../validators/project';

export const projectService = {
  async create(input: CreateProjectInput, ownerId: string): Promise<Project> {
    const now = new Date().toISOString();
    const project: Project = {
      projectId: uuidv4(),
      name: input.name,
      description: input.description,
      ownerId,
      members: [{ userId: ownerId, role: 'admin', joinedAt: now }],
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    return projectRepository.create(project);
  },

  async findById(projectId: string): Promise<Project> {
    const project = await projectRepository.findById(projectId);
    if (!project) throw Object.assign(new Error('Proyecto no encontrado'), { statusCode: 404 });
    return project;
  },

  async findUserProjects(userId: string): Promise<Project[]> {
    return projectRepository.findByOwner(userId);
  },

  async update(projectId: string, input: UpdateProjectInput, userId: string): Promise<Project> {
    const project = await this.findById(projectId);
    assertAdmin(project, userId);

    const updated = await projectRepository.update(projectId, {
      ...input,
      updatedAt: new Date().toISOString(),
    });
    if (!updated) throw new Error('Error al actualizar proyecto');
    return updated;
  },

  async archive(projectId: string, userId: string): Promise<Project> {
    return this.update(projectId, { status: 'archived' }, userId);
  },

  async delete(projectId: string, userId: string): Promise<void> {
    const project = await this.findById(projectId);
    if (project.ownerId !== userId) {
      throw Object.assign(new Error('Solo el propietario puede eliminar el proyecto'), { statusCode: 403 });
    }
    await projectRepository.delete(projectId);
  },

  async inviteMember(projectId: string, email: string, role: ProjectMember['role'], requesterId: string): Promise<Project> {
    const project = await this.findById(projectId);
    assertAdmin(project, requesterId);

    const user = await userRepository.findByEmail(email);
    if (!user) throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });

    const alreadyMember = project.members.some(m => m.userId === user.userId);
    if (alreadyMember) throw Object.assign(new Error('El usuario ya es miembro'), { statusCode: 409 });

    const newMember: ProjectMember = { userId: user.userId, role, joinedAt: new Date().toISOString() };
    const updated = await projectRepository.update(projectId, {
      members: [...project.members, newMember],
      updatedAt: new Date().toISOString(),
    });
    return updated!;
  },
};

const assertAdmin = (project: Project, userId: string) => {
  const member = project.members.find(m => m.userId === userId);
  if (!member || member.role === 'viewer') {
    throw Object.assign(new Error('Permisos insuficientes'), { statusCode: 403 });
  }
};
