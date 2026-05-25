import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">T</div>
            <span className="text-2xl font-bold text-white">TaskFlow</span>
          </div>
          <p className="text-slate-400 text-sm">Gestión de proyectos en la nube</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
