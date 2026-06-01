import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects, useCreateProject, useDeleteProject } from '@/hooks/useProjects';
import { FolderKanban, Plus, Trash2, X } from 'lucide-react';
import { formatDate } from '@/utils/date';

/* ── Skeleton ───────────────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div
      className="rounded-xl h-36 animate-pulse"
      style={{ background: 'rgba(255,255,255,0.04)' }}
    />
  );
}

/* ── Modal input ────────────────────────────────────────────────────────────── */
const inputCls =
  'w-full px-3.5 py-2.5 rounded-lg text-sm font-medium' +
  ' bg-zinc-900 border border-zinc-800 text-zinc-50 placeholder-zinc-600' +
  ' focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30' +
  ' transition-all duration-150';

/* ── Project card ───────────────────────────────────────────────────────────── */
function ProjectCard({
  project,
  onDelete,
}: {
  project: { projectId: string; name: string; description?: string; status: string; updatedAt: string; members: Array<{ userId: string; role: string }> };
  onDelete: () => void;
}) {
  const isActive = project.status === 'active';

  return (
    <div
      className="group relative rounded-xl p-5 transition-all duration-150 cursor-pointer"
      style={{
        background: '#111113',
        border: '1px solid #1C1C1F',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#27272A'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1C1C1F'; }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        {/* Icon + name */}
        <Link to={`/projects/${project.projectId}`} className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="mt-0.5 p-2 rounded-lg shrink-0"
            style={{ background: 'rgba(99,102,241,0.12)' }}
          >
            <FolderKanban className="w-4 h-4" style={{ color: '#818CF8' }} />
          </div>
          <div className="min-w-0">
            <h3
              className="font-semibold text-sm truncate leading-tight"
              style={{ color: '#FAFAFA', letterSpacing: '-0.01em' }}
            >
              {project.name}
            </h3>
            {project.description && (
              <p
                className="text-xs mt-1 line-clamp-2 leading-relaxed"
                style={{ color: '#52525B' }}
              >
                {project.description}
              </p>
            )}
          </div>
        </Link>

        {/* Delete */}
        <button
          onClick={e => { e.preventDefault(); onDelete(); }}
          className="shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer"
          style={{ color: '#52525B' }}
          title="Eliminar proyecto"
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = '#F87171';
            (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.10)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = '#52525B';
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #1C1C1F' }}>
        <span className="text-[10px] tabular-nums" style={{ color: '#3F3F46', fontFamily: "'JetBrains Mono', monospace" }}>
          {formatDate(project.updatedAt)}
        </span>
        <div className="flex items-center gap-2">
          {/* Members count */}
          <span className="text-[10px]" style={{ color: '#52525B' }}>
            {project.members.length} miembro{project.members.length !== 1 ? 's' : ''}
          </span>
          {/* Status badge */}
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={
              isActive
                ? { background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.2)' }
                : { background: 'rgba(113,113,122,0.12)', color: '#71717A', border: '1px solid rgba(113,113,122,0.2)' }
            }
          >
            {isActive ? 'Activo' : 'Archivado'}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────────── */
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
    createProject.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      { onSuccess: () => { setShowForm(false); setName(''); setDescription(''); } }
    );
  };

  const handleDelete = (projectId: string) => {
    if (confirm('¿Eliminar este proyecto? Esta acción no se puede deshacer.')) {
      deleteProject.mutate(projectId);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: '#FAFAFA', letterSpacing: '-0.02em' }}
          >
            Proyectos
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#52525B' }}>
            {projects.length} proyecto{projects.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer transition-all duration-150"
          style={{ background: '#6366F1', color: '#FAFAFA' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#4F46E5'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#6366F1'; }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo proyecto
        </button>
      </div>

      {/* ── Create modal ──────────────────────────────────────────────────────── */}
      {showForm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ background: '#111113', border: '1px solid #27272A' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-base" style={{ color: '#FAFAFA', letterSpacing: '-0.01em' }}>
                Nuevo proyecto
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg cursor-pointer transition-all duration-150"
                style={{ color: '#52525B' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FAFAFA'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#52525B'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#71717A' }}>
                  Nombre
                </label>
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Mi proyecto"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#71717A' }}>
                  Descripcion <span style={{ color: '#3F3F46', textTransform: 'none', fontWeight: 400 }}>(opcional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="¿De qué trata este proyecto?"
                  rows={3}
                  className={inputCls + ' resize-none'}
                />
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-150"
                  style={{ color: '#71717A' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FAFAFA'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#71717A'; }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createProject.isPending || !name.trim()}
                  className="px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                  style={{ background: '#6366F1', color: '#FAFAFA' }}
                  onMouseEnter={e => { if (!createProject.isPending && name.trim()) (e.currentTarget as HTMLElement).style.background = '#4F46E5'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#6366F1'; }}
                >
                  {createProject.isPending ? 'Creando...' : 'Crear proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-24">
          <div
            className="inline-flex p-4 rounded-2xl mb-4"
            style={{ background: 'rgba(99,102,241,0.08)' }}
          >
            <FolderKanban className="w-10 h-10" style={{ color: '#4F46E5' }} />
          </div>
          <p className="font-semibold text-sm" style={{ color: '#A1A1AA' }}>Sin proyectos todavia</p>
          <p className="text-sm mt-1" style={{ color: '#52525B' }}>
            Crea tu primer proyecto para comenzar a gestionar tareas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <ProjectCard
              key={project.projectId}
              project={project}
              onDelete={() => handleDelete(project.projectId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
