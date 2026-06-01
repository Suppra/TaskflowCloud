import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useLogout } from '@/hooks/useAuth';
import { useUnreadCount } from '@/hooks/useNotifications';
import { cn } from '@/utils/cn';
import {
  LayoutDashboard, FolderKanban, Bell, Settings,
  ChevronLeft, ChevronRight, LogOut, BarChart3
} from 'lucide-react';

/* ── Logo mark ──────────────────────────────────────────────────────────────── */
function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#6366F1" />
      <rect x="8" y="9" width="7" height="3" rx="1.5" fill="white" />
      <rect x="8" y="14.5" width="11" height="3" rx="1.5" fill="white" fillOpacity="0.7" />
      <rect x="8" y="20" width="5" height="3" rx="1.5" fill="white" fillOpacity="0.4" />
      <rect x="18" y="9" width="6" height="14" rx="3" fill="white" fillOpacity="0.9" />
    </svg>
  );
}

const navItems = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects',      icon: FolderKanban,    label: 'Proyectos' },
  { to: '/notifications', icon: Bell,            label: 'Notificaciones', badge: true },
  { to: '/reports',       icon: BarChart3,       label: 'Reportes' },
  { to: '/settings',      icon: Settings,        label: 'Ajustes' },
];

/* ── Avatar initials ────────────────────────────────────────────────────────── */
function Avatar({ name, avatar, size = 28 }: { name?: string; avatar?: string; size?: number }) {
  const initials = (name ?? 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 overflow-hidden font-semibold"
      style={{
        width: size, height: size,
        background: avatar ? 'transparent' : '#4F46E5',
        fontSize: size * 0.38,
        color: '#FAFAFA',
      }}
    >
      {avatar
        ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
        : initials
      }
    </div>
  );
}

export default function MainLayout() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const logout = useLogout();
  const { data: unreadCount = 0 } = useUnreadCount();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div
      className="flex overflow-hidden"
      style={{ height: '100dvh', background: '#09090B' }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col shrink-0 transition-all duration-300"
        style={{
          width: sidebarOpen ? 220 : 60,
          background: '#111113',
          borderRight: '1px solid #1C1C1F',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center h-14 shrink-0"
          style={{
            padding: sidebarOpen ? '0 16px' : '0',
            justifyContent: sidebarOpen ? 'flex-start' : 'center',
            borderBottom: '1px solid #1C1C1F',
          }}
        >
          <LogoMark size={28} />
          {sidebarOpen && (
            <span
              className="ml-2.5 font-bold text-sm whitespace-nowrap overflow-hidden"
              style={{ color: '#FAFAFA', letterSpacing: '-0.02em' }}
            >
              TaskFlow Cloud
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-0.5 p-2 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              title={!sidebarOpen ? label : undefined}
              className={({ isActive }) => cn(
                'group flex items-center rounded-lg transition-all duration-150 relative select-none',
                sidebarOpen ? 'gap-2.5 px-3 py-2' : 'justify-center py-2.5',
                isActive
                  ? 'text-indigo-400'
                  : 'text-zinc-500 hover:text-zinc-200'
              )}
              style={({ isActive }) => ({
                background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
              })}
              onMouseEnter={e => {
                const el = e.currentTarget;
                if (!el.classList.contains('text-indigo-400')) {
                  el.style.background = 'rgba(255,255,255,0.04)';
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                if (!el.classList.contains('text-indigo-400')) {
                  el.style.background = 'transparent';
                }
              }}
            >
              {/* Active indicator line */}
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full"
                      style={{ background: '#6366F1' }}
                    />
                  )}
                  <span className="relative shrink-0">
                    <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2 : 1.75} />
                    {badge && unreadCount > 0 && (
                      <span
                        className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full font-bold"
                        style={{
                          minWidth: 14, height: 14,
                          fontSize: 9,
                          background: '#EF4444',
                          color: '#FAFAFA',
                          padding: '0 3px',
                        }}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </span>
                  {sidebarOpen && (
                    <span className="text-sm font-medium truncate flex-1">{label}</span>
                  )}
                  {sidebarOpen && badge && unreadCount > 0 && (
                    <span
                      className="ml-auto flex items-center justify-center rounded-full text-[10px] font-bold"
                      style={{
                        minWidth: 18, height: 18,
                        background: '#EF4444',
                        color: '#FAFAFA',
                        padding: '0 4px',
                      }}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: user + toggle */}
        <div className="p-2 shrink-0" style={{ borderTop: '1px solid #1C1C1F' }}>
          {/* User info */}
          {sidebarOpen ? (
            <div
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <Avatar name={user?.name} avatar={user?.avatar} size={28} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate" style={{ color: '#FAFAFA' }}>{user?.name}</p>
                <p className="text-[10px] truncate" style={{ color: '#52525B' }}>{user?.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-1.5 mb-1">
              <Avatar name={user?.name} avatar={user?.avatar} size={28} />
            </div>
          )}

          {/* Logout */}
          <button
            onClick={() => logout.mutate()}
            title={!sidebarOpen ? 'Cerrar sesión' : undefined}
            className={cn(
              'flex items-center w-full rounded-lg text-xs transition-all duration-150 cursor-pointer',
              sidebarOpen ? 'gap-2 px-3 py-2' : 'justify-center py-2'
            )}
            style={{ color: '#52525B' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#FCA5A5';
              (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = '#52525B';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span className="font-medium">Cerrar sesión</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={toggleSidebar}
            className={cn(
              'flex items-center justify-center w-full rounded-lg py-1.5 mt-0.5 transition-all duration-150 cursor-pointer',
            )}
            style={{ color: '#3F3F46' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#A1A1AA';
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = '#3F3F46';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
            title={sidebarOpen ? 'Colapsar' : 'Expandir'}
          >
            {sidebarOpen
              ? <ChevronLeft className="w-3.5 h-3.5" />
              : <ChevronRight className="w-3.5 h-3.5" />
            }
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto" style={{ background: '#09090B' }}>
        <Outlet />
      </main>
    </div>
  );
}
