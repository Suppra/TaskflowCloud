import { v4 as uuidv4 } from 'uuid';
import { projectRepository } from '../repositories/projectRepository';
import { userRepository } from '../repositories/userRepository';
import { assignmentService } from './assignmentService';
import { eventPublisher } from '../events/eventPublisher';
import { Project, ProjectMember, PendingInvite, User } from '../types';
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

    // Solo el propietario puede conceder el rol admin; los demás admins
    // solo pueden invitar como member o viewer.
    if (role === 'admin' && project.ownerId !== requesterId) {
      throw Object.assign(
        new Error('Solo el propietario puede invitar colaboradores con rol administrador'),
        { statusCode: 403 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    const user = await userRepository.findByEmail(normalizedEmail);

    // ── Email aún no registrado → guardar invitación pendiente ──────────────
    // Se reclamará automáticamente cuando esa persona se registre.
    if (!user) {
      const already = (project.pendingInviteEmails ?? []).includes(normalizedEmail);
      if (already) {
        throw Object.assign(new Error('Ya existe una invitación pendiente para ese email'), { statusCode: 409 });
      }
      const invite: PendingInvite = {
        email: normalizedEmail,
        role,
        invitedBy: requesterId,
        invitedAt: new Date().toISOString(),
      };
      const updatedPending = await projectRepository.update(projectId, {
        pendingInvites: [...(project.pendingInvites ?? []), invite],
        pendingInviteEmails: [...(project.pendingInviteEmails ?? []), normalizedEmail],
        updatedAt: new Date().toISOString(),
      });

      await eventPublisher.publish({
        type: 'INVITATION_SENT',
        payload: {
          projectId,
          projectName: project.name,
          invitedEmail: normalizedEmail,
          role,
          invitedBy: requesterId,
          pending: true,
        },
        timestamp: new Date().toISOString(),
      });

      return updatedPending!;
    }

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

    await eventPublisher.publish({
      type: 'INVITATION_SENT',
      payload: {
        projectId,
        projectName: project.name,
        invitedUserId: user.userId,
        invitedEmail: user.email,
        invitedName: user.name,
        role,
        invitedBy: requesterId,
      },
      timestamp: new Date().toISOString(),
    });

    return updated!;
  },

  /**
   * Lista los miembros del proyecto con sus datos de usuario (nombre, email, avatar)
   * resueltos. Sirve tanto para la gestión de colaboradores como para los
   * selectores de asignación de tareas en el frontend.
   */
  async listMembersDetailed(projectId: string, requesterId: string) {
    const project = await this.assertMember(projectId, requesterId);

    const detailed = await Promise.all(
      project.members.map(async (m) => {
        const user = await userRepository.findById(m.userId);
        return {
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
          name: user?.name ?? 'Usuario desconocido',
          email: user?.email ?? '',
          avatar: user?.avatar,
          isOwner: project.ownerId === m.userId,
        };
      })
    );

    return detailed;
  },

  async updateMemberRole(
    projectId: string,
    memberId: string,
    role: ProjectMember['role'],
    requesterId: string
  ): Promise<Project> {
    const project = await this.findById(projectId);
    assertAdmin(project, requesterId);

    if (project.ownerId === memberId) {
      throw Object.assign(
        new Error('No se puede cambiar el rol del propietario'),
        { statusCode: 400 }
      );
    }

    // Solo el propietario puede promover a otro miembro a administrador.
    if (role === 'admin' && project.ownerId !== requesterId) {
      throw Object.assign(
        new Error('Solo el propietario puede asignar el rol administrador'),
        { statusCode: 403 }
      );
    }

    const exists = project.members.some(m => m.userId === memberId);
    if (!exists) {
      throw Object.assign(new Error('El miembro no pertenece al proyecto'), { statusCode: 404 });
    }

    const updated = await projectRepository.update(projectId, {
      members: project.members.map(m =>
        m.userId === memberId ? { ...m, role } : m
      ),
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

    // Automatización: las tareas abiertas del miembro removido se reasignan
    // automáticamente al colaborador con menor carga (no quedan huérfanas).
    await assignmentService.reassignOrphanTasks(projectId, memberId);

    return updated!;
  },

  /**
   * Reclama las invitaciones pendientes de un usuario recién registrado:
   * lo agrega como miembro a todos los proyectos que lo invitaron por email.
   * Se llama automáticamente tras el registro (filosofía: el sistema automatiza).
   *
   * @returns número de proyectos a los que se unió.
   */
  async claimPendingInvites(user: Pick<User, 'userId' | 'email'>): Promise<number> {
    const email = user.email.toLowerCase();
    const projects = await projectRepository.findByPendingEmail(email);
    if (projects.length === 0) return 0;

    let joined = 0;
    for (const project of projects) {
      const invite = (project.pendingInvites ?? []).find(p => p.email === email);
      if (!invite) continue;
      if (project.members.some(m => m.userId === user.userId)) continue;

      const newMember: ProjectMember = {
        userId: user.userId,
        role: invite.role,
        joinedAt: new Date().toISOString(),
      };

      await projectRepository.update(project.projectId, {
        members: [...project.members, newMember],
        memberUserIds: [...(project.memberUserIds ?? []), user.userId],
        pendingInvites: (project.pendingInvites ?? []).filter(p => p.email !== email),
        pendingInviteEmails: (project.pendingInviteEmails ?? []).filter(e => e !== email),
        updatedAt: new Date().toISOString(),
      });
      joined++;
    }
    return joined;
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

  /**
   * Verifica membresía Y que el usuario NO sea solo observador (viewer).
   * Usar en todos los endpoints de escritura: crear/editar/eliminar tareas,
   * subtareas, comentarios, adjuntos, tableros y columnas.
   * Los viewers solo tienen acceso de lectura.
   */
  async assertNotViewer(projectId: string, userId: string): Promise<Project> {
    const project = await this.findById(projectId);
    const member = project.members.find(m => m.userId === userId);
    if (!member) {
      throw Object.assign(new Error('Acceso denegado: no eres miembro de este proyecto'), { statusCode: 403 });
    }
    if (member.role === 'viewer') {
      throw Object.assign(
        new Error('Los observadores solo tienen acceso de lectura y no pueden realizar esta acción'),
        { statusCode: 403 }
      );
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
