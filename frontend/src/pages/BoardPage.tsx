import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { boardService } from '@/services/boardService';
import { projectService } from '@/services/projectService';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { ChevronRight, LayoutGrid } from 'lucide-react';

export default function BoardPage() {
  const { projectId, boardId } = useParams<{ projectId: string; boardId: string }>();

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
      <div className="flex items-center justify-center h-full">
        <div
          className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#6366F1', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="p-6 text-sm" style={{ color: '#52525B' }}>
        Tablero no encontrado.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Board header / breadcrumb ────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderBottom: '1px solid #1C1C1F', background: '#09090B' }}
      >
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs" aria-label="Breadcrumb">
          <Link
            to="/projects"
            className="font-medium transition-colors duration-150"
            style={{ color: '#52525B' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#A1A1AA'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#52525B'; }}
          >
            Proyectos
          </Link>
          <ChevronRight className="w-3 h-3" style={{ color: '#27272A' }} />
          <Link
            to={`/projects/${projectId}`}
            className="font-medium transition-colors duration-150"
            style={{ color: '#52525B' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#A1A1AA'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#52525B'; }}
          >
            {project?.name ?? '...'}
          </Link>
          <ChevronRight className="w-3 h-3" style={{ color: '#27272A' }} />
          <span className="flex items-center gap-1.5 font-semibold" style={{ color: '#E4E4E7' }}>
            <LayoutGrid className="w-3.5 h-3.5" style={{ color: '#818CF8' }} />
            {board.name}
          </span>
        </nav>

        {/* Column count */}
        <span
          className="text-[10px] font-medium tabular-nums"
          style={{ color: '#3F3F46', fontFamily: "'JetBrains Mono', monospace" }}
        >
          {board.columns.length} columnas
        </span>
      </div>

      {/* ── Kanban board ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          board={board}
          projectId={projectId!}
          projectName={project?.name}
          projectDescription={project?.description}
        />
      </div>
    </div>
  );
}
