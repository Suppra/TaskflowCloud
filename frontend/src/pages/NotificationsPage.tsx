import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/hooks/useNotifications';
import { formatDate } from '@/utils/date';
import type { Notification } from '@/types';

/* ── Type config ────────────────────────────────────────────────────────────── */
const TYPE_CONFIG: Record<string, { label: string; dotColor: string; textColor: string }> = {
  task_assigned:   { label: 'Tarea asignada', dotColor: '#6366F1', textColor: '#818CF8' },
  task_overdue:    { label: 'Tarea vencida',  dotColor: '#EF4444', textColor: '#F87171' },
  comment_added:   { label: 'Comentario',     dotColor: '#8B5CF6', textColor: '#A78BFA' },
  project_invite:  { label: 'Invitacion',     dotColor: '#10B981', textColor: '#34D399' },
  report_ready:    { label: 'Reporte listo',  dotColor: '#F59E0B', textColor: '#FBBF24' },
  alert_triggered: { label: 'Alerta',         dotColor: '#F97316', textColor: '#FB923C' },
};

/* ── Skeleton ───────────────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="rounded-xl h-20 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
  );
}

/* ── Notification item ──────────────────────────────────────────────────────── */
function NotificationItem({ notification }: { notification: Notification }) {
  const markAsRead = useMarkAsRead();
  const cfg = TYPE_CONFIG[notification.type] ?? { label: notification.type, dotColor: '#52525B', textColor: '#71717A' };
  const unread = !notification.read;

  return (
    <div
      className="flex items-start gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-150"
      style={{
        background: unread ? 'rgba(99,102,241,0.04)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${unread ? 'rgba(99,102,241,0.15)' : '#1C1C1F'}`,
      }}
    >
      {/* Unread dot */}
      <div className="mt-1.5 shrink-0">
        <span
          className="block w-1.5 h-1.5 rounded-full"
          style={{ background: unread ? cfg.dotColor : '#27272A' }}
        />
      </div>

      <div className="flex-1 min-w-0">
        {/* Type badge + date */}
        <div className="flex items-center justify-between gap-3 mb-1">
          <span
            className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: cfg.textColor }}
          >
            {cfg.label}
          </span>
          <span
            className="text-[10px] shrink-0 tabular-nums"
            style={{ color: '#3F3F46', fontFamily: "'JetBrains Mono', monospace" }}
          >
            {formatDate(notification.createdAt)}
          </span>
        </div>
        <p className="text-sm font-medium mb-0.5" style={{ color: '#E4E4E7' }}>
          {notification.title}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: '#71717A' }}>
          {notification.message}
        </p>
      </div>

      {/* Mark as read */}
      {unread && (
        <button
          onClick={() => markAsRead.mutate(notification.notificationId)}
          disabled={markAsRead.isPending}
          className="shrink-0 p-1.5 rounded-lg cursor-pointer transition-all duration-150 mt-0.5"
          style={{ color: '#3F3F46' }}
          title="Marcar como leida"
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = '#818CF8';
            (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.10)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = '#3F3F46';
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <CheckCheck className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────────── */
export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markAllAsRead = useMarkAllAsRead();

  const unread = notifications.filter(n => !n.read);
  const read   = notifications.filter(n => n.read).slice(0, 20);

  return (
    <div className="p-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2.5" style={{ color: '#FAFAFA', letterSpacing: '-0.02em' }}>
            <Bell className="w-5 h-5" style={{ color: '#818CF8' }} />
            Notificaciones
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#52525B' }}>
            {unread.length > 0 ? `${unread.length} sin leer` : 'Todo al dia'}
          </p>
        </div>
        {unread.length > 0 && (
          <button
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150 disabled:opacity-50"
            style={{ background: '#1C1C1F', border: '1px solid #27272A', color: '#71717A' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#818CF8'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#71717A'; (e.currentTarget as HTMLElement).style.borderColor = '#27272A'; }}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Marcar todas como leidas
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-24">
          <div className="inline-flex p-4 rounded-2xl mb-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Inbox className="w-10 h-10" style={{ color: '#27272A' }} />
          </div>
          <p className="font-semibold text-sm" style={{ color: '#A1A1AA' }}>Sin notificaciones</p>
          <p className="text-sm mt-1" style={{ color: '#52525B' }}>
            Aqui apareceran las alertas de tus proyectos.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Unread */}
          {unread.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest px-1 mb-2" style={{ color: '#3F3F46' }}>
                Sin leer ({unread.length})
              </p>
              <div className="space-y-2">
                {unread.map(n => <NotificationItem key={n.notificationId} notification={n} />)}
              </div>
            </div>
          )}

          {/* Read */}
          {read.length > 0 && (
            <div className={unread.length > 0 ? 'pt-2' : ''}>
              {unread.length > 0 && <div className="mb-3" style={{ borderTop: '1px solid #1C1C1F' }} />}
              <p className="text-[10px] font-semibold uppercase tracking-widest px-1 mb-2" style={{ color: '#3F3F46' }}>
                Anteriores
              </p>
              <div className="space-y-2">
                {read.map(n => <NotificationItem key={n.notificationId} notification={n} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
