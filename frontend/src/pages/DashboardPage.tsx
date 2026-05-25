import { useProjects } from '@/hooks/useProjects';
import { useAuthStore } from '@/store/authStore';
import { Link } from 'react-router-dom';
import { FolderKanban, Plus, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/utils/date';

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const { data: projects = [], isLoading } = useProjects();

  const activeProjects = projects.filter(p => p.status === 'active');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Hola, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 mt-1">Aquí tienes un resumen de tus proyectos.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={FolderKanban} label="Proyectos activos" value={activeProjects.length} color="blue" />
        <StatCard icon={CheckCircle2} label="Completados" value={projects.filter(p => p.status === 'archived').length} color="green" />
        <StatCard icon={AlertTriangle} label="Con riesgo" value={0} color="yellow" />
      </div>

      {/* Projects */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Proyectos recientes</h2>
        <Link
          to="/projects"
          className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 font-medium"
        >
          <Plus className="w-4 h-4" /> Nuevo proyecto
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-800 rounded-xl animate-pulse" />)}
        </div>
      ) : activeProjects.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No tienes proyectos activos</p>
          <p className="text-sm mt-1">
            <Link to="/projects" className="text-blue-400 hover:underline">Crea tu primer proyecto</Link>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeProjects.map(project => (
            <Link
              key={project.projectId}
              to={`/projects/${project.projectId}`}
              className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-blue-600 hover:bg-slate-800/80 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-xs px-2 py-1 bg-green-900/30 text-green-400 border border-green-800 rounded-full">
                  Activo
                </span>
              </div>
              <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors truncate">{project.name}</h3>
              {project.description && (
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">{project.description}</p>
              )}
              <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                {formatDate(project.updatedAt)}
                <span>·</span>
                <span>{project.members.length} miembro{project.members.length !== 1 ? 's' : ''}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number; color: 'blue' | 'green' | 'yellow'
}) {
  const colors = {
    blue: 'bg-blue-600/10 border-blue-800/50 text-blue-400',
    green: 'bg-green-600/10 border-green-800/50 text-green-400',
    yellow: 'bg-yellow-600/10 border-yellow-800/50 text-yellow-400',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <Icon className="w-6 h-6 mb-3" />
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm mt-1 text-slate-400">{label}</p>
    </div>
  );
}
