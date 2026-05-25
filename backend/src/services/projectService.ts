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
      memberUserIds: [ownerId], // campo desnormalizado para queries eficientes
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

  /**
   * Retorna todos los proyectos donde el usuario es propietario O miembro.
   * Combina GSI query (rápido) + scan con filter (OK para escala actual).
   */
  async findUserProjects(userId: string): Promise<Project[]> {
    const [owned, memberOf] = await Promise.all([
      projectRepository.findByOwner(userId),
      projectRepository.findByMember(userId),
    ]);

    // Deduplicar (por si acaso hay solapamiento)
    const seen = new Set(owned.map(p => p.projectId));
    const all = [...owned];
    for (const p of memberOf) {
      if (!seen.has(p.projectId)) all.push(p);
    }
    return all;
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

  async inviteMember(
    projectId: string,
    email: string,
    role: ProjectMember['role'],
    requesterId: string
  ): Promise<Project> {
    const project = await this.findById(projectId);
    assertAdmin(project, requesterId);

    const user = await userRepository.findByEmail(email);
    if (!user) throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });

    const alreadyMember = project.members.some(m => m.userId === user.userId);
    if (alreadyMember) throw Object.assign(new Error('El usuario ya es miembro'), { statusCode: 409 });

    const newMember: ProjectMember = {
      userId: user.userId,
      role,
      joinedAt: new Date().toISOString(),
    };

    const updated = await projectRepository.update(projectId, {
      members: [...project.members, newMember],
      memberUserIds: [...(project.memberUserIds ?? []), user.userId],
      updatedAt: new Date().toISOString(),
    });
    return updated!;
  },

  async removeMember(projectId: string, memberId: string, requesterId: string): Promise<Project> {
    const project = await this.findById(projectId);
    assertAdmin(project, requesterId);

    if (project.ownerId === memberId) {
      throw Object.assign(new Error('No se puede eliminar al propietario'), { statusCode: 400 });
    }

    const updated = await projectRepository.update(projectId, {
      members: project.members.filter(m => m.userId !== memberId),
      memberUserIds: (project.memberUserIds ?? []).filter(id => id !== memberId),
      updatedAt: new Date().toISOString(),
    });
    return updated!;
  },

  /** Verifica que el usuario es miembro del proyecto (cualquier rol). Lanza 403 si no. */
  async assertMember(projectId: string, userId: string): Promise<Project> {
    const project = await this.findById(projectId);
    const isMember = project.members.some(m => m.userId === userId);
    if (!isMember) {
      throw Object.assign(new Error('Acceso denegado: no eres miembro de este proyecto'), { statusCode: 403 });
    }
    return project;
  },
};

/** Solo admins pueden hacer cambios sensibles. Member y viewer no. */
const assertAdmin = (project: Project, userId: string) => {
  const member = project.members.find(m => m.userId === userId);
  if (!member || member.role !== 'admin') {
    throw Object.assign(
      new Error('Solo administradores pueden realizar esta acción'),
      { statusCode: 403 }
    );
  }
};
