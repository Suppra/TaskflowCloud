import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useLogout } from '@/hooks/useAuth';
import { useUnreadCount } from '@/hooks/useNotifications';
import { cn } from '@/utils/cn';
import {
  LayoutDashboard, FolderKanban, Bell, Settings,
  ChevronLeft, ChevronRight, LogOut, User, BarChart3
} from 'lucide-react';

const navItems = [
  { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects',       icon: FolderKanban,    label: 'Proyectos' },
  { to: '/notifications',  icon: Bell,            label: 'Notificaciones', badge: true },
  { to: '/reports',        icon: BarChart3,       label: 'Reportes' },
  { to: '/settings',       icon: Settings,        label: 'Ajustes' },
];

export default function MainLayout() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const logout = useLogout();
  const { data: unreadCount = 0 } = useUnreadCount();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        'flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 shrink-0',
        sidebarOpen ? 'w-60' : 'w-16'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-800 h-16">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white shrink-0">T</div>
          {sidebarOpen && <span className="font-bold text-white truncate">TaskFlow</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              )}
            >
              <div className="relative shrink-0">
                <Icon className="w-5 h-5" />
                {/* Badge de notificaciones no leídas */}
                {badge && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              {sidebarOpen && (
                <span className="truncate flex-1">{label}</span>
              )}
              {sidebarOpen && badge && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User + toggle */}
        <div className="p-2 border-t border-slate-800 space-y-1">
          <div className={cn('flex items-center gap-3 px-3 py-2', !sidebarOpen && 'justify-center')}>
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={() => logout.mutate()}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors w-full',
              !sidebarOpen && 'justify-center'
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && 'Cerrar sesión'}
          </button>
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center w-full p-2 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
