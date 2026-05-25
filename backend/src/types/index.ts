export interface User {
  userId: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'member' | 'viewer';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  refreshToken?: string; // almacenado como hash SHA-256
}

export interface Project {
  projectId: string;
  name: string;
  description?: string;
  ownerId: string;
  members: ProjectMember[];
  /** Desnormalizado: lista de userIds de todos los miembros para filtros eficientes */
  memberUserIds: string[];
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  userId: string;
  role: 'admin' | 'member' | 'viewer';
  joinedAt: string;
}

export interface Board {
  boardId: string;
  projectId: string;
  name: string;
  columns: Column[];
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  columnId: string;
  name: string;
  order: number;
  color?: string;
}

export interface Task {
  taskId: string;
  boardId: string;
  projectId: string;
  columnId: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** Siempre sincronizado con columnId */
  status: string;
  assigneeId?: string;
  reporterId: string;
  dueDate?: string;
  labels: string[];
  subtasks: Subtask[];
  attachments: Attachment[];
  order: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  overdueNotifiedAt?: string;
}

export interface Subtask {
  subtaskId: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface Attachment {
  attachmentId: string;
  filename: string;
  s3Key: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Comment {
  commentId: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

export type NotificationType =
  | 'task_assigned'
  | 'task_overdue'
  | 'comment_added'
  | 'project_invite'
  | 'report_ready'
  | 'alert_triggered';

export interface Alert {
  alertId: string;
  projectId: string;
  type: 'overdue_tasks' | 'risk_detected' | 'deadline_approaching';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  resolved: boolean;
  createdAt: string;
}

export interface Report {
  reportId: string;
  projectId: string;
  type: 'pdf' | 'csv';
  s3Key: string;
  generatedBy: string;
  createdAt: string;
}

export interface SQSEvent {
  type: SQSEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

export type SQSEventType =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_OVERDUE'
  | 'COMMENT_CREATED'
  | 'INVITATION_SENT'
  | 'REPORT_GENERATED'
  | 'ALERT_TRIGGERED';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
