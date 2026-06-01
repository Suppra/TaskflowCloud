import type { OpenAPIV3 } from 'openapi-types';

// ── Componentes reutilizables ───────────────────────────────────────────────

const bearerAuth: OpenAPIV3.SecurityRequirementObject[] = [{ bearerAuth: [] }];

const schemas: Record<string, OpenAPIV3.SchemaObject> = {
  // ── Respuestas base ──────────────────────────────────────────────────────
  SuccessResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'OK' },
      data: { description: 'Payload de la respuesta' },
    },
  },
  ErrorResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      error: { type: 'string', example: 'Mensaje de error' },
    },
  },

  // ── Auth ─────────────────────────────────────────────────────────────────
  RegisterInput: {
    type: 'object',
    required: ['name', 'email', 'password'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100, example: 'Christian Cañate' },
      email: { type: 'string', format: 'email', example: 'christian@taskflow.dev' },
      password: { type: 'string', minLength: 8, maxLength: 128, example: 'MySecret123!' },
    },
  },
  LoginInput: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'christian@taskflow.dev' },
      password: { type: 'string', example: 'MySecret123!' },
    },
  },
  RefreshInput: {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: { type: 'string', example: 'eyJhbGci...' },
    },
  },
  UpdateProfileInput: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100, example: 'Christian J. Cañate' },
      avatar: { type: 'string', format: 'uri', example: 'https://cdn.example.com/avatar.jpg' },
    },
  },
  User: {
    type: 'object',
    properties: {
      userId: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      avatar: { type: 'string', format: 'uri', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  TokenPair: {
    type: 'object',
    properties: {
      accessToken: { type: 'string', example: 'eyJhbGci...' },
      refreshToken: { type: 'string', example: 'eyJhbGci...' },
    },
  },
  AuthResult: {
    type: 'object',
    properties: {
      user: { $ref: '#/components/schemas/User' },
      accessToken: { type: 'string' },
      refreshToken: { type: 'string' },
    },
  },

  // ── Projects ─────────────────────────────────────────────────────────────
  CreateProjectInput: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 150, example: 'TaskFlow Cloud' },
      description: { type: 'string', maxLength: 500, example: 'Plataforma Kanban AWS' },
    },
  },
  UpdateProjectInput: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 150 },
      description: { type: 'string', maxLength: 500 },
      status: { type: 'string', enum: ['active', 'archived'] },
    },
  },
  InviteMemberInput: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email', example: 'colega@empresa.com' },
      role: {
        type: 'string',
        enum: ['admin', 'member', 'viewer'],
        default: 'member',
      },
    },
  },
  ProjectMember: {
    type: 'object',
    properties: {
      userId: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      avatar: { type: 'string', format: 'uri', nullable: true },
      role: { type: 'string', enum: ['admin', 'member', 'viewer'] },
      joinedAt: { type: 'string', format: 'date-time' },
      isOwner: { type: 'boolean', description: 'true si el miembro es el propietario del proyecto' },
    },
  },
  UpdateMemberRoleInput: {
    type: 'object',
    required: ['role'],
    properties: {
      role: { type: 'string', enum: ['admin', 'member', 'viewer'], example: 'member' },
    },
  },
  Project: {
    type: 'object',
    properties: {
      projectId: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      description: { type: 'string', nullable: true },
      status: { type: 'string', enum: ['active', 'archived'] },
      ownerId: { type: 'string', format: 'uuid' },
      members: {
        type: 'array',
        items: { $ref: '#/components/schemas/ProjectMember' },
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  // ── Boards ───────────────────────────────────────────────────────────────
  CreateBoardInput: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 150, example: 'Sprint 1' },
    },
  },
  BoardColumn: {
    type: 'object',
    properties: {
      columnId: { type: 'string' },
      name: { type: 'string' },
      order: { type: 'integer' },
      color: { type: 'string', example: '#6366f1' },
    },
  },
  AddColumnInput: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', example: 'En revisión' },
      color: { type: 'string', example: '#f59e0b' },
    },
  },
  UpdateColumnInput: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      order: { type: 'integer' },
      color: { type: 'string' },
    },
  },
  Board: {
    type: 'object',
    properties: {
      boardId: { type: 'string', format: 'uuid' },
      projectId: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      columns: {
        type: 'array',
        items: { $ref: '#/components/schemas/BoardColumn' },
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  // ── Tasks ────────────────────────────────────────────────────────────────
  CreateTaskInput: {
    type: 'object',
    required: ['title', 'columnId'],
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 300, example: 'Implementar login OAuth' },
      description: { type: 'string', maxLength: 2000 },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
      },
      columnId: { type: 'string', example: 'col-todo' },
      assigneeId: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        description:
          'Opcional. Si se omite, el sistema asigna automáticamente la tarea al colaborador con menor ' +
          'carga ponderada por prioridad (auto-asignación con tope de capacidad).',
      },
      dueDate: { type: 'string', format: 'date-time', nullable: true },
      labels: { type: 'array', items: { type: 'string' }, default: [] },
      order: { type: 'integer', minimum: 0, default: 0 },
    },
  },
  UpdateTaskInput: {
    type: 'object',
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 300 },
      description: { type: 'string', maxLength: 2000 },
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      columnId: { type: 'string' },
      assigneeId: { type: 'string', nullable: true },
      dueDate: { type: 'string', format: 'date-time', nullable: true },
      labels: { type: 'array', items: { type: 'string' } },
      order: { type: 'integer', minimum: 0 },
      completedAt: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  AddSubtaskInput: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 300, example: 'Configurar Google OAuth app' },
    },
  },
  AddCommentInput: {
    type: 'object',
    required: ['content'],
    properties: {
      content: { type: 'string', minLength: 1, maxLength: 2000, example: 'Revisar documentación de Google Identity.' },
    },
  },
  PresignInput: {
    type: 'object',
    required: ['filename', 'mimeType'],
    properties: {
      filename: { type: 'string', example: 'screenshot.png' },
      mimeType: {
        type: 'string',
        description: 'Debe estar en la allowlist (imágenes, PDF, Office, txt, csv)',
        example: 'image/png',
      },
    },
  },
  Subtask: {
    type: 'object',
    properties: {
      subtaskId: { type: 'string' },
      title: { type: 'string' },
      completed: { type: 'boolean' },
    },
  },
  Attachment: {
    type: 'object',
    properties: {
      attachmentId: { type: 'string', format: 'uuid' },
      filename: { type: 'string', example: 'mockup.png' },
      s3Key: { type: 'string', example: 'tasks/<taskId>/<uuid>.png' },
      fileSize: { type: 'integer', example: 204800 },
      mimeType: { type: 'string', example: 'image/png' },
      uploadedBy: { type: 'string', format: 'uuid' },
      uploadedAt: { type: 'string', format: 'date-time' },
    },
  },
  AddAttachmentInput: {
    type: 'object',
    required: ['filename', 's3Key', 'fileSize', 'mimeType'],
    properties: {
      filename: { type: 'string', maxLength: 255, example: 'mockup.png' },
      s3Key: { type: 'string', description: 'Key devuelta por el endpoint /presign' },
      fileSize: { type: 'integer', maximum: 52428800, example: 204800 },
      mimeType: { type: 'string', example: 'image/png' },
    },
  },
  Task: {
    type: 'object',
    properties: {
      taskId: { type: 'string', format: 'uuid' },
      boardId: { type: 'string', format: 'uuid' },
      projectId: { type: 'string', format: 'uuid' },
      columnId: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string', nullable: true },
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      assigneeId: { type: 'string', nullable: true },
      dueDate: { type: 'string', format: 'date-time', nullable: true },
      completedAt: { type: 'string', format: 'date-time', nullable: true },
      labels: { type: 'array', items: { type: 'string' } },
      subtasks: { type: 'array', items: { $ref: '#/components/schemas/Subtask' } },
      attachments: { type: 'array', items: { $ref: '#/components/schemas/Attachment' } },
      order: { type: 'integer' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  Comment: {
    type: 'object',
    properties: {
      commentId: { type: 'string', format: 'uuid' },
      taskId: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid' },
      content: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },

  // ── Notifications ──────────────────────────────────────────────────────────
  Notification: {
    type: 'object',
    properties: {
      notificationId: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid' },
      type: {
        type: 'string',
        enum: [
          'task_assigned',
          'task_overdue',
          'comment_added',
          'project_invite',
          'report_ready',
          'alert_triggered',
        ],
      },
      title: { type: 'string', example: 'Te asignaron una tarea' },
      message: { type: 'string', example: 'Christian te asignó la tarea: "Implementar login"' },
      read: { type: 'boolean', example: false },
      data: { type: 'object', additionalProperties: true, nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },

  // ── Reports ──────────────────────────────────────────────────────────────
  GenerateReportInput: {
    type: 'object',
    required: ['type'],
    properties: {
      type: { type: 'string', enum: ['pdf', 'csv'], example: 'pdf' },
    },
  },
  Report: {
    type: 'object',
    properties: {
      reportId: { type: 'string', format: 'uuid' },
      projectId: { type: 'string', format: 'uuid' },
      type: { type: 'string', enum: ['pdf', 'csv'] },
      s3Key: { type: 'string' },
      generatedBy: { type: 'string', format: 'uuid' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },

  // ── Metrics ──────────────────────────────────────────────────────────────
  DashboardMetrics: {
    type: 'object',
    properties: {
      totalProjects: { type: 'integer', example: 5 },
      totalTasks: { type: 'integer', example: 42 },
      completedTasks: { type: 'integer', example: 18 },
      overdueTasks: { type: 'integer', example: 3 },
      tasksByPriority: {
        type: 'object',
        properties: {
          low: { type: 'integer' },
          medium: { type: 'integer' },
          high: { type: 'integer' },
          critical: { type: 'integer' },
        },
      },
      recentActivity: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            description: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
};

// ── Paths ───────────────────────────────────────────────────────────────────

const paths: OpenAPIV3.PathsObject = {
  // ── Health ──────────────────────────────────────────────────────────────
  '/health': {
    get: {
      tags: ['System'],
      summary: 'Health check',
      description: 'Verifica la conectividad con DynamoDB. Usado por ECS/ALB.',
      operationId: 'healthCheck',
      responses: {
        '200': {
          description: 'Servicio saludable',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'ok' },
                  dynamodb: { type: 'string', example: 'connected' },
                  timestamp: { type: 'string', format: 'date-time' },
                  service: { type: 'string', example: 'taskflow-backend' },
                },
              },
            },
          },
        },
        '503': {
          description: 'DynamoDB inaccesible',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'unhealthy' },
                  dynamodb: { type: 'string', example: 'unreachable' },
                },
              },
            },
          },
        },
      },
    },
  },

  // ── Auth ────────────────────────────────────────────────────────────────
  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Registrar usuario',
      operationId: 'register',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/RegisterInput' } },
        },
      },
      responses: {
        '201': {
          description: 'Usuario registrado — devuelve tokens + perfil',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { properties: { data: { $ref: '#/components/schemas/AuthResult' } } },
                ],
              },
            },
          },
        },
        '400': { description: 'Validación fallida o email ya en uso' },
      },
    },
  },
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Iniciar sesión',
      operationId: 'login',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } },
        },
      },
      responses: {
        '200': {
          description: 'Sesión iniciada',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { properties: { data: { $ref: '#/components/schemas/AuthResult' } } },
                ],
              },
            },
          },
        },
        '401': { description: 'Credenciales inválidas' },
        '429': { description: 'Rate limit — demasiados intentos (10/15min)' },
      },
    },
  },
  '/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Renovar tokens',
      description: 'Intercambia el `refreshToken` por un nuevo par de tokens (rotation).',
      operationId: 'refresh',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/RefreshInput' } },
        },
      },
      responses: {
        '200': {
          description: 'Tokens renovados',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { properties: { data: { $ref: '#/components/schemas/TokenPair' } } },
                ],
              },
            },
          },
        },
        '401': { description: 'Refresh token inválido o expirado' },
      },
    },
  },
  '/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Cerrar sesión',
      operationId: 'logout',
      security: bearerAuth,
      responses: {
        '200': { description: 'Sesión cerrada (refresh token invalidado en DynamoDB)' },
        '401': { description: 'No autenticado' },
      },
    },
  },
  '/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Obtener perfil propio',
      operationId: 'getMe',
      security: bearerAuth,
      responses: {
        '200': {
          description: 'Datos del usuario autenticado',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { properties: { data: { $ref: '#/components/schemas/User' } } },
                ],
              },
            },
          },
        },
        '401': { description: 'No autenticado' },
        '404': { description: 'Usuario no encontrado' },
      },
    },
    patch: {
      tags: ['Auth'],
      summary: 'Actualizar perfil',
      operationId: 'updateProfile',
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/UpdateProfileInput' } },
        },
      },
      responses: {
        '200': {
          description: 'Perfil actualizado',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { properties: { data: { $ref: '#/components/schemas/User' } } },
                ],
              },
            },
          },
        },
        '401': { description: 'No autenticado' },
      },
    },
  },

  // ── Projects ─────────────────────────────────────────────────────────────
  '/projects': {
    get: {
      tags: ['Projects'],
      summary: 'Listar proyectos del usuario',
      operationId: 'listProjects',
      security: bearerAuth,
      responses: {
        '200': {
          description: 'Lista de proyectos donde el usuario es miembro',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Project' } },
                    },
                  },
                ],
              },
            },
          },
        },
        '401': { description: 'No autenticado' },
      },
    },
    post: {
      tags: ['Projects'],
      summary: 'Crear proyecto',
      operationId: 'createProject',
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateProjectInput' } },
        },
      },
      responses: {
        '201': {
          description: 'Proyecto creado',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { properties: { data: { $ref: '#/components/schemas/Project' } } },
                ],
              },
            },
          },
        },
        '400': { description: 'Datos inválidos' },
        '401': { description: 'No autenticado' },
      },
    },
  },
  '/projects/{projectId}': {
    parameters: [
      { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    get: {
      tags: ['Projects'],
      summary: 'Obtener proyecto por ID',
      operationId: 'getProject',
      security: bearerAuth,
      responses: {
        '200': {
          description: 'Datos del proyecto',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { properties: { data: { $ref: '#/components/schemas/Project' } } },
                ],
              },
            },
          },
        },
        '401': { description: 'No autenticado' },
        '403': { description: 'No es miembro del proyecto' },
        '404': { description: 'Proyecto no encontrado' },
      },
    },
    patch: {
      tags: ['Projects'],
      summary: 'Actualizar proyecto',
      operationId: 'updateProject',
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/UpdateProjectInput' } },
        },
      },
      responses: {
        '200': { description: 'Proyecto actualizado' },
        '401': { description: 'No autenticado' },
        '403': { description: 'Sin permisos de edición' },
      },
    },
    delete: {
      tags: ['Projects'],
      summary: 'Eliminar proyecto',
      operationId: 'deleteProject',
      security: bearerAuth,
      responses: {
        '200': { description: 'Proyecto eliminado' },
        '401': { description: 'No autenticado' },
        '403': { description: 'Solo el owner puede eliminar' },
      },
    },
  },
  '/projects/{projectId}/archive': {
    parameters: [
      { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    patch: {
      tags: ['Projects'],
      summary: 'Archivar proyecto',
      operationId: 'archiveProject',
      security: bearerAuth,
      responses: {
        '200': { description: 'Proyecto archivado' },
        '403': { description: 'Sin permisos' },
      },
    },
  },
  '/projects/{projectId}/members': {
    parameters: [
      { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    get: {
      tags: ['Projects'],
      summary: 'Listar miembros del proyecto (con datos de usuario resueltos)',
      description:
        'Devuelve cada miembro con su nombre, email, avatar, rol, fecha de ingreso e indicador `isOwner`. ' +
        'Usado para la gestión de colaboradores y los selectores de asignación de tareas.',
      operationId: 'listMembers',
      security: bearerAuth,
      responses: {
        '200': {
          description: 'Lista de miembros detallada',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/ProjectMember' } },
                    },
                  },
                ],
              },
            },
          },
        },
        '403': { description: 'No es miembro del proyecto' },
      },
    },
    post: {
      tags: ['Projects'],
      summary: 'Invitar miembro al proyecto',
      description:
        'Invita por email. Si el email ya está registrado, se agrega como miembro de inmediato. ' +
        'Si **no** está registrado, se guarda una invitación pendiente que se reclama automáticamente ' +
        'cuando esa persona cree su cuenta con el mismo email. En ambos casos se publica el evento ' +
        '`INVITATION_SENT` (SQS → Lambda → email SES). Solo administradores.',
      operationId: 'inviteMember',
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/InviteMemberInput' } },
        },
      },
      responses: {
        '200': {
          description: 'Miembro agregado o invitación pendiente registrada',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { properties: { data: { $ref: '#/components/schemas/Project' } } },
                ],
              },
            },
          },
        },
        '403': { description: 'Sin permisos de administrador' },
        '409': { description: 'El usuario ya es miembro o ya existe una invitación pendiente' },
      },
    },
  },
  '/projects/{projectId}/members/{memberId}': {
    parameters: [
      { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'memberId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    patch: {
      tags: ['Projects'],
      summary: 'Cambiar el rol de un miembro',
      description: 'Solo administradores. No se puede cambiar el rol del propietario.',
      operationId: 'updateMemberRole',
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/UpdateMemberRoleInput' } },
        },
      },
      responses: {
        '200': {
          description: 'Rol actualizado',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { properties: { data: { $ref: '#/components/schemas/Project' } } },
                ],
              },
            },
          },
        },
        '400': { description: 'Intento de cambiar el rol del propietario' },
        '403': { description: 'Sin permisos de administrador' },
        '404': { description: 'El miembro no pertenece al proyecto' },
      },
    },
    delete: {
      tags: ['Projects'],
      summary: 'Eliminar miembro del proyecto',
      description:
        'Solo administradores. Las tareas abiertas del miembro removido se **reasignan automáticamente** ' +
        'al colaborador con menor carga (no quedan huérfanas).',
      operationId: 'removeMember',
      security: bearerAuth,
      responses: {
        '200': { description: 'Miembro eliminado (tareas reasignadas automáticamente)' },
        '400': { description: 'Intento de eliminar al propietario' },
        '403': { description: 'Sin permisos de administrador' },
      },
    },
  },

  // ── Boards ──────────────────────────────────────────────────────────────
  '/projects/{projectId}/boards': {
    parameters: [
      { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    get: {
      tags: ['Boards'],
      summary: 'Listar tableros del proyecto',
      operationId: 'listBoards',
      security: bearerAuth,
      responses: {
        '200': {
          description: 'Lista de tableros',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Board' } },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['Boards'],
      summary: 'Crear tablero',
      operationId: 'createBoard',
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateBoardInput' } },
        },
      },
      responses: {
        '201': { description: 'Tablero creado con columnas por defecto (To Do / In Progress / Done)' },
        '400': { description: 'Datos inválidos' },
      },
    },
  },
  '/projects/{projectId}/boards/{boardId}': {
    parameters: [
      { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'boardId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    get: {
      tags: ['Boards'],
      summary: 'Obtener tablero por ID',
      operationId: 'getBoard',
      security: bearerAuth,
      responses: {
        '200': {
          description: 'Datos del tablero',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { properties: { data: { $ref: '#/components/schemas/Board' } } },
                ],
              },
            },
          },
        },
        '404': { description: 'Tablero no encontrado' },
      },
    },
    delete: {
      tags: ['Boards'],
      summary: 'Eliminar tablero',
      operationId: 'deleteBoard',
      security: bearerAuth,
      responses: {
        '200': { description: 'Tablero eliminado' },
        '403': { description: 'Sin permisos' },
      },
    },
  },
  '/projects/{projectId}/boards/{boardId}/columns': {
    parameters: [
      { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'boardId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    post: {
      tags: ['Boards'],
      summary: 'Agregar columna al tablero',
      operationId: 'addColumn',
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/AddColumnInput' } },
        },
      },
      responses: {
        '200': { description: 'Columna agregada' },
      },
    },
  },
  '/projects/{projectId}/boards/{boardId}/columns/{columnId}': {
    parameters: [
      { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'boardId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'columnId', in: 'path', required: true, schema: { type: 'string' } },
    ],
    patch: {
      tags: ['Boards'],
      summary: 'Actualizar columna',
      operationId: 'updateColumn',
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/UpdateColumnInput' } },
        },
      },
      responses: { '200': { description: 'Columna actualizada' } },
    },
    delete: {
      tags: ['Boards'],
      summary: 'Eliminar columna',
      operationId: 'deleteColumn',
      security: bearerAuth,
      responses: { '200': { description: 'Columna eliminada' } },
    },
  },

  // ── Tasks ────────────────────────────────────────────────────────────────
  '/projects/{projectId}/boards/{boardId}/tasks': {
    parameters: [
      { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'boardId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    get: {
      tags: ['Tasks'],
      summary: 'Listar tareas del tablero',
      description: 'Soporta filtros opcionales por query string: `priority`, `assigneeId`, `label`.',
      operationId: 'listTasks',
      security: bearerAuth,
      parameters: [
        { name: 'priority', in: 'query', required: false, schema: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } },
        { name: 'assigneeId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
        { name: 'label', in: 'query', required: false, schema: { type: 'string' } },
      ],
      responses: {
        '200': {
          description: 'Lista de tareas',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['Tasks'],
      summary: 'Crear tarea',
      operationId: 'createTask',
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateTaskInput' } },
        },
      },
      responses: {
        '201': {
          description: 'Tarea creada',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { properties: { data: { $ref: '#/components/schemas/Task' } } },
                ],
              },
            },
          },
        },
      },
    },
  },
  '/projects/{projectId}/boards/{boardId}/tasks/{taskId}': {
    parameters: [
      { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'boardId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'taskId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    get: {
      tags: ['Tasks'],
      summary: 'Obtener tarea por ID',
      operationId: 'getTask',
      security: bearerAuth,
      responses: {
        '200': {
          description: 'Datos de la tarea',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { properties: { data: { $ref: '#/components/schemas/Task' } } },
                ],
              },
            },
          },
        },
        '404': { description: 'Tarea no encontrada' },
      },
    },
    patch: {
      tags: ['Tasks'],
      summary: 'Actualizar tarea',
      description: 'Actualiza cualquier campo de la tarea. Para mover entre columnas usa `columnId`.',
      operationId: 'updateTask',
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/UpdateTaskInput' } },
        },
      },
      responses: {
        '200': { description: 'Tarea actualizada' },
        '404': { description: 'Tarea no encontrada' },
      },
    },
    delete: {
      tags: ['Tasks'],
      summary: 'Eliminar tarea',
      operationId: 'deleteTask',
      security: bearerAuth,
      responses: {
        '200': { description: 'Tarea eliminada' },
        '404': { description: 'Tarea no encontrada' },
      },
    },
  },
  '/projects/{projectId}/boards/{boardId}/tasks/{taskId}/subtasks': {
    parameters: [
      { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'boardId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'taskId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    post: {
      tags: ['Tasks'],
      summary: 'Agregar subtarea',
      operationId: 'addSubtask',
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/AddSubtaskInput' } },
        },
      },
      responses: { '200': { description: 'Subtarea agregada' } },
    },
  },
  '/projects/{projectId}/boards/{boardId}/tasks/{taskId}/subtasks/{subtaskId}/toggle': {
    parameters: [
      { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'boardId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'taskId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'subtaskId', in: 'path', required: true, schema: { type: 'string' } },
    ],
    patch: {
      tags: ['Tasks'],
      summary: 'Marcar/desmarcar subtarea como completada',
      operationId: 'toggleSubtask',
      security: bearerAuth,
      responses: { '200': { description: 'Estado de subtarea actualizado' } },
    },
  },
  '/projects/{projectId}/boards/{boardId}/tasks/{taskId}/comments': {
    parameters: [
      { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'boardId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'taskId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    get: {
      tags: ['Tasks'],
      summary: 'Listar comentarios de una tarea',
      operationId: 'getComments',
      security: bearerAuth,
      responses: {
        '200': {
          description: 'Lista de comentarios',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Comment' } },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['Tasks'],
      summary: 'Agregar comentario',
      operationId: 'addComment',
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/AddCommentInput' } },
        },
      },
      responses: { '201': { description: 'Comentario agregado' } },
    },
  },
  '/projects/{projectId}/boards/{boardId}/tasks/{taskId}/attachments/presign': {
    parameters: [
      { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'boardId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'taskId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    post: {
      tags: ['Tasks'],
      summary: 'Obtener presigned URL para subir adjunto a S3',
      description:
        'Genera una URL pre-firmada de S3 (PUT). El frontend sube el archivo directamente a S3 sin pasar por el backend.',
      operationId: 'presignAttachment',
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/PresignInput' } },
        },
      },
      responses: {
        '200': {
          description: 'URL pre-firmada generada',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          url: { type: 'string', format: 'uri' },
                          key: { type: 'string' },
                          expiresIn: { type: 'integer', example: 300 },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
  },
  '/projects/{projectId}/boards/{boardId}/tasks/{taskId}/attachments': {
    parameters: [
      { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'boardId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'taskId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    post: {
      tags: ['Tasks'],
      summary: 'Registrar un adjunto tras subirlo a S3',
      description:
        'Segundo paso del flujo de adjuntos: tras subir el binario a S3 con la presigned URL, ' +
        'se registran los metadatos (`s3Key` devuelta por /presign) en la tarea.',
      operationId: 'addAttachment',
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/AddAttachmentInput' } },
        },
      },
      responses: {
        '201': {
          description: 'Adjunto registrado — devuelve la tarea actualizada',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { properties: { data: { $ref: '#/components/schemas/Task' } } },
                ],
              },
            },
          },
        },
        '400': { description: 'Tipo de archivo no permitido o tamaño excedido' },
      },
    },
  },
  '/projects/{projectId}/boards/{boardId}/tasks/{taskId}/attachments/{attachmentId}': {
    parameters: [
      { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'boardId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'taskId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'attachmentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    delete: {
      tags: ['Tasks'],
      summary: 'Eliminar un adjunto (borra también el objeto en S3)',
      operationId: 'removeAttachment',
      security: bearerAuth,
      responses: {
        '200': { description: 'Adjunto eliminado — devuelve la tarea actualizada' },
        '404': { description: 'Adjunto no encontrado' },
      },
    },
  },
  '/projects/{projectId}/boards/{boardId}/tasks/{taskId}/attachments/{attachmentId}/download': {
    parameters: [
      { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'boardId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'taskId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      { name: 'attachmentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    get: {
      tags: ['Tasks'],
      summary: 'Obtener URL pre-firmada de descarga del adjunto',
      operationId: 'downloadAttachment',
      security: bearerAuth,
      responses: {
        '200': {
          description: 'URL pre-firmada de descarga (GET, expira en 300s)',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          url: { type: 'string', format: 'uri' },
                          expiresIn: { type: 'integer', example: 300 },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        '404': { description: 'Adjunto no encontrado' },
      },
    },
  },

  // ── Metrics ──────────────────────────────────────────────────────────────
  '/metrics/dashboard': {
    get: {
      tags: ['Metrics'],
      summary: 'Dashboard global del usuario',
      description:
        'Métricas agregadas de todos los proyectos del usuario: totales, por prioridad, actividad reciente.',
      operationId: 'getDashboard',
      security: bearerAuth,
      responses: {
        '200': {
          description: 'Métricas del dashboard',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { properties: { data: { $ref: '#/components/schemas/DashboardMetrics' } } },
                ],
              },
            },
          },
        },
        '401': { description: 'No autenticado' },
      },
    },
  },
  '/metrics/projects/{projectId}': {
    parameters: [
      { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    get: {
      tags: ['Metrics'],
      summary: 'Métricas de un proyecto específico',
      operationId: 'getProjectMetrics',
      security: bearerAuth,
      responses: {
        '200': {
          description: 'Métricas del proyecto',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' },
            },
          },
        },
        '403': { description: 'No es miembro del proyecto' },
      },
    },
  },

  // ── Notifications ──────────────────────────────────────────────────────────
  '/notifications': {
    get: {
      tags: ['Notifications'],
      summary: 'Listar notificaciones del usuario',
      operationId: 'listNotifications',
      security: bearerAuth,
      responses: {
        '200': {
          description: 'Lista de notificaciones (más recientes primero)',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
                    },
                  },
                ],
              },
            },
          },
        },
        '401': { description: 'No autenticado' },
      },
    },
  },
  '/notifications/unread-count': {
    get: {
      tags: ['Notifications'],
      summary: 'Contar notificaciones no leídas',
      operationId: 'countUnreadNotifications',
      security: bearerAuth,
      responses: {
        '200': {
          description: 'Cantidad de no leídas',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { properties: { data: { type: 'object', properties: { count: { type: 'integer', example: 3 } } } } },
                ],
              },
            },
          },
        },
      },
    },
  },
  '/notifications/read-all': {
    patch: {
      tags: ['Notifications'],
      summary: 'Marcar todas las notificaciones como leídas',
      operationId: 'markAllNotificationsRead',
      security: bearerAuth,
      responses: { '200': { description: 'Todas marcadas como leídas' } },
    },
  },
  '/notifications/{notificationId}/read': {
    parameters: [
      { name: 'notificationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    patch: {
      tags: ['Notifications'],
      summary: 'Marcar una notificación como leída',
      operationId: 'markNotificationRead',
      security: bearerAuth,
      responses: {
        '200': { description: 'Notificación marcada como leída' },
        '404': { description: 'Notificación no encontrada' },
      },
    },
  },

  // ── Reports ────────────────────────────────────────────────────────────────
  '/reports/projects/{projectId}': {
    parameters: [
      { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    get: {
      tags: ['Reports'],
      summary: 'Listar reportes generados de un proyecto',
      operationId: 'listReports',
      security: bearerAuth,
      responses: {
        '200': {
          description: 'Lista de reportes',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Report' } },
                    },
                  },
                ],
              },
            },
          },
        },
        '403': { description: 'No es miembro del proyecto' },
      },
    },
    post: {
      tags: ['Reports'],
      summary: 'Generar un reporte (PDF o CSV)',
      description:
        'Genera un reporte del proyecto y lo sube a S3. Devuelve el registro del reporte. ' +
        'La descarga se obtiene luego con `GET /reports/{reportId}/download`.',
      operationId: 'generateReport',
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/GenerateReportInput' } },
        },
      },
      responses: {
        '201': {
          description: 'Reporte generado',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { properties: { data: { $ref: '#/components/schemas/Report' } } },
                ],
              },
            },
          },
        },
        '403': { description: 'No es miembro del proyecto' },
      },
    },
  },
  '/reports/{reportId}/download': {
    parameters: [
      { name: 'reportId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    get: {
      tags: ['Reports'],
      summary: 'Obtener URL de descarga (presigned S3) de un reporte',
      operationId: 'downloadReport',
      security: bearerAuth,
      responses: {
        '200': {
          description: 'URL pre-firmada de descarga',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          url: { type: 'string', format: 'uri' },
                          expiresIn: { type: 'integer', example: 900 },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        '404': { description: 'Reporte no encontrado' },
      },
    },
  },
};

// ── Spec completo ────────────────────────────────────────────────────────────

export const swaggerSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'TaskFlow Cloud API',
    version: '1.0.0',
    description: `
## TaskFlow Cloud — API REST

Plataforma Kanban sobre AWS (DynamoDB · S3 · SES · SQS).

### Autenticación
Todos los endpoints protegidos requieren un **Bearer token** en el header:
\`\`\`
Authorization: Bearer <accessToken>
\`\`\`

Obtén el \`accessToken\` desde \`POST /auth/login\` o \`POST /auth/register\`.
Cuando expire (15 min), usa \`POST /auth/refresh\` con tu \`refreshToken\` para obtener un nuevo par.

### Rate limiting
| Scope | Límite |
|-------|--------|
| Global | 200 req / 15 min / IP |
| \`/auth/login\`, \`/auth/register\`, \`/auth/refresh\` | 10 req / 15 min / IP |
    `.trim(),
    contact: {
      name: 'TaskFlow Cloud',
      email: 'noreply@taskflow.dev',
    },
    license: { name: 'ISC' },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1',
    },
  ],
  tags: [
    { name: 'System', description: 'Health check y estado del servicio' },
    { name: 'Auth', description: 'Registro, login, tokens y perfil' },
    { name: 'Projects', description: 'CRUD de proyectos y gestión de miembros' },
    { name: 'Boards', description: 'Tableros Kanban y columnas' },
    { name: 'Tasks', description: 'Tareas, subtareas, comentarios y adjuntos' },
    { name: 'Notifications', description: 'Notificaciones in-app del usuario' },
    { name: 'Reports', description: 'Generación y descarga de reportes (PDF/CSV)' },
    { name: 'Metrics', description: 'Dashboard y métricas por proyecto' },
  ],
  components: {
    schemas,
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token obtenido en login/register (expira en 15 min)',
      },
    },
  },
  paths,
};
