import { api } from './api';
import type { Notification } from '@/types';

export const notificationService = {
  list: () =>
    api.get<{ success: boolean; data: Notification[] }>('/notifications')
      .then(r => r.data.data ?? []),

  countUnread: () =>
    api.get<{ success: boolean; data: { count: number } }>('/notifications/unread-count')
      .then(r => r.data.data?.count ?? 0),

  markAsRead: (notificationId: string) =>
    api.patch<{ success: boolean; data: Notification }>(`/notifications/${notificationId}/read`)
      .then(r => r.data.data!),

  markAllAsRead: () =>
    api.patch('/notifications/read-all'),
};
