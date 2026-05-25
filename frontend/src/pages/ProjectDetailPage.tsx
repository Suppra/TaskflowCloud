import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '@/services/projectService';
import { boardService } from '@/services/boardService';
import { Plus, LayoutGrid, Users, Settings, ArrowLeft } from 'lucide-react';
import { formatDate } from '@/utils/date';

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [boardName, setBoardName] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectService.getById(projectId!),
    enabled: !!projectId,
  });

  const { data: boards = [] } = useQuery({
    queryKey: ['boards', projectId],
    queryFn: () => boardService.listByProject(projectId!),
    enabled: !!projectId,
  });

  const createBoard = useMutation({
    mutationFn: (name: string) => boardService.create(projectId!, { name }),
    onSuccess: (board) => {
      qc.invalidateQueries({ queryKey: ['boards', projectId] });
      setShowForm(false);
      setBoardName('');
      navigate(`/projects/${projectId}/boards/${board.boardId}`);
    },
  });

  if (isLoading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!project) return <div className="p-6 text-slate-400">Proyecto no encontrado.</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/projects" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-3 transition">
          <ArrowLeft className="w-4 h-4" /> Proyectos
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            {project.description && <p className="text-slate-400 mt-1">{project.description}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span>Creado {formatDate(project.createdAt)}</span>
              <span>·</span>
              <span>{project.members.length} miembro{project.members.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <span className={`px-3 py-1 text-xs rounded-full border font-medium ${
            project.status === 'active'
              ? 'text-green-400 bg-green-900/20 border-green-800'
              : 'text-slate-400 bg-slate-700 border-slate-600'
          }`}>
            {project.status === 'active' ? 'Activo' : 'Archivado'}
          </span>
        </div>
      </div>

      {/* Boards */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Tableros Kanban</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium transition"
        >
          <Plus className="w-4 h-4" /> Nuevo tablero
        </button>
      </div>

      {/* Create board modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">Nuevo tablero</h2>
            <form onSubmit={e => { e.preventDefault(); if (boardName.trim()) createBoard.mutate(boardName.trim()); }}>
              <input
                autoFocus
                value={boardName}
                onChange={e => setBoardName(e.target.value)}
                placeholder="Nombre del tablero"
                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition mb-4"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition">Cancelar</button>
                <button type="submit" disabled={createBoard.isPending || !boardName.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-medium rounded-lg transition">
                  {createBoard.isPending ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {boards.length === 0 ? (
        <div className="text-center py-16 text-slate-500 bg-slate-800/40 rounded-xl border border-slate-800">
          <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium text-slate-400">Sin tableros</p>
          <p className="text-sm mt-1">Crea tu primer tablero Kanban para organizar tareas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {boards.map(board => (
            <Link
              key={board.boardId}
              to={`/projects/${projectId}/boards/${board.boardId}`}
              className="group bg-slate-800 border border-slate-700 hover:border-blue-600 rounded-xl p-5 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">{board.name}</h3>
              </div>
              <div className="flex gap-2 flex-wrap">
                {board.columns.map(col => (
                  <span key={col.columnId} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded-full">
                    {col.name}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
