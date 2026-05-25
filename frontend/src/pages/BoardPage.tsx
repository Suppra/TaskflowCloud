import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boardService } from '@/services/boardService';
import { projectService } from '@/services/projectService';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { Plus, ChevronRight, LayoutGrid } from 'lucide-react';

export default function BoardPage() {
  const { projectId, boardId } = useParams<{ projectId: string; boardId: string }>();
  const qc = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectService.getById(projectId!),
    enabled: !!projectId,
  });

  const { data: board, isLoading } = useQuery({
    queryKey: ['boards', projectId, boardId],
    queryFn: () => boardService.getById(projectId!, boardId!),
    enabled: !!projectId && !!boardId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!board) return <div className="p-6 text-slate-400">Tablero no encontrado.</div>;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Link to="/projects" className="hover:text-slate-200 transition">Proyectos</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to={`/projects/${projectId}`} className="hover:text-slate-200 transition">{project?.name ?? '...'}</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-white font-medium">{board.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{board.columns.length} columnas</span>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard board={board} projectId={projectId!} />
      </div>
    </div>
  );
}
