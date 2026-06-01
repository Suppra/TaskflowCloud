import { Bell, CheckCheck, Circle, Inbox } from 'lucide-react';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/hooks/useNotifications';
import { formatDate } from '@/utils/date';
import type { Notification } from '@/types';
import { cn } from '@/utils/cn';

const typeConfig: Record<string, { label: string; color: string }> = {
  task_assigned:  { label: 'Tarea asignada',    color: 'text-blue-400 bg-blue-900/30' },
  task_overdue:   { label: 'Tarea vencida',     color: 'text-red-400 bg-red-900/30' },
  comment_added:  { label: 'Comentario',        color: 'text-purple-400 bg-purple-900/30' },
  project_invite: { label: 'Invitación',        color: 'text-green-400 bg-green-900/30' },
  report_ready:   { label: 'Reporte listo',     color: 'text-yellow-400 bg-yellow-900/30' },
  alert_triggered:{ label: 'Alerta',            color: 'text-orange-400 bg-orange-900/30' },
};

function NotificationItem({ notification }: { notification: Notification }) {
  const markAsRead = useMarkAsRead();
  const config = typeConfig[notification.type] ?? { label: notification.type, color: 'text-slate-400 bg-slate-700' };

  return (
    <div
      className={cn(
        'flex items-start gap-4 p-4 rounded-xl border transition-all',
        notification.read
          ? 'border-slate-800 bg-slate-900/30'
          : 'border-slate-700 bg-slate-800/60 shadow-sm'
      )}
    >
      {/* Indicador no leído */}
      <div className="mt-1 shrink-0">
        {notification.read
          ? <Circle className="w-2.5 h-2.5 text-slate-700 fill-slate-700" />
          : <Circle className="w-2.5 h-2.5 text-blue-400 fill-blue-400" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full shrink-0', config.color)}>
            {config.label}
          </span>
          <span className="text-xs text-slate-500 shrink-0">{formatDate(notification.createdAt)}</span>
        </div>
        <p className="text-sm font-medium text-slate-200 mb-0.5">{notification.title}</p>
        <p className="text-sm text-slate-400 leading-relaxed">{notification.message}</p>
      </div>

      {!notification.read && (
        <button
          onClick={() => markAsRead.mutate(notification.notificationId)}
          disabled={markAsRead.isPending}
          className="shrink-0 p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition"
          title="Marcar como leída"
        >
          <CheckCheck className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markAllAsRead = useMarkAllAsRead();

  const unread = notifications.filter(n => !n.read);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-400" />
            Notificaciones
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {unread.length > 0
              ? `${unread.length} sin leer`
              : 'Todo al día'}
          </p>
        </div>

        {unread.length > 0 && (
          <button
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 px-3 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            <CheckCheck className="w-4 h-4" />
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-24 text-slate-500">
          <Inbox className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p className="font-medium text-slate-400">Sin notificaciones</p>
          <p className="text-sm mt-1">Cuando haya actividad en tus proyectos aparecerá aquí.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Sin leer primero */}
          {unread.length > 0 && (
            <>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 mb-2">
                Sin leer ({unread.length})
              </p>
              {unread.map(n => (
                <NotificationItem key={n.notificationId} notification={n} />
              ))}
              {notifications.some(n => n.read) && (
                <div className="border-t border-slate-800 my-4" />
              )}
            </>
          )}

          {/* Leídas */}
          {notifications.filter(n => n.read).length > 0 && (
            <>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 mb-2">
                Anteriores
              </p>
              {notifications
                .filter(n => n.read)
                .slice(0, 20)
                .map(n => (
                  <NotificationItem key={n.notificationId} notification={n} />
                ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
