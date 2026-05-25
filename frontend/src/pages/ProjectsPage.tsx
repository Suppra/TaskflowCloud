import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects, useCreateProject, useDeleteProject } from '@/hooks/useProjects';
import { FolderKanban, Plus, Trash2, Archive, MoreHorizontal } from 'lucide-react';
import { formatDate } from '@/utils/date';

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createProject.mutate({ name: name.trim(), description: description.trim() || undefined }, {
      onSuccess: () => { setShowForm(false); setName(''); setDescription(''); }
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Proyectos</h1>
          <p className="text-slate-400 text-sm mt-0.5">{projects.length} proyectos en total</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition"
        >
          <Plus className="w-4 h-4" /> Nuevo proyecto
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">Nuevo proyecto</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nombre del proyecto"
                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descripción (opcional)"
                rows={3}
                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                  Cancelar
                </button>
                <button type="submit" disabled={createProject.isPending || !name.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-medium rounded-lg transition">
                  {createProject.isPending ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-40 bg-slate-800 rounded-xl animate-pulse" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-24 text-slate-500">
          <FolderKanban className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p className="font-medium text-slate-400">Sin proyectos todavía</p>
          <p className="text-sm mt-1">Crea tu primer proyecto para comenzar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <div key={project.projectId} className="group bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-all">
              <div className="flex items-start justify-between mb-3">
                <Link to={`/projects/${project.projectId}`} className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white hover:text-blue-300 transition-colors truncate">{project.name}</h3>
                </Link>
                <button
                  onClick={() => { if (confirm('¿Eliminar proyecto?')) deleteProject.mutate(project.projectId); }}
                  className="ml-2 p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {project.description && (
                <p className="text-sm text-slate-400 mb-3 line-clamp-2">{project.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{formatDate(project.updatedAt)}</span>
                <span className={`px-2 py-0.5 rounded-full border ${
                  project.status === 'active'
                    ? 'text-green-400 bg-green-900/20 border-green-800'
                    : 'text-slate-400 bg-slate-700 border-slate-600'
                }`}>
                  {project.status === 'active' ? 'Activo' : 'Archivado'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
