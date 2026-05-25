export interface User {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'member' | 'viewer';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Project {
  projectId: string;
  name: string;
  description?: string;
  ownerId: string;
  members: ProjectMember[];
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
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export type Priority = Task['priority'];
