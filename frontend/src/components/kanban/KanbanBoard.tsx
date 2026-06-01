import { useState, useCallback, useEffect } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { useMembers } from '@/hooks/useProjects';
import { useUIStore } from '@/store/uiStore';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/hooks/useSocket';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { TaskDetailModal } from './TaskDetailModal';
import { AiTaskGenerator } from '@/components/ai/AiTaskGenerator';
import type { Board, Task } from '@/types';
import { Filter, X, ChevronDown, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Props {
  board: Board;
  projectId: string;
  projectName?: string;
  projectDescription?: string;
}

type Priority = Task['priority'];

const PRIORITIES: { value: Priority; label: string; borderColor: string; textColor: string; bg: string }[] = [
  { value: 'critical', label: 'Critica', borderColor: '#EF4444', textColor: '#F87171', bg: 'rgba(239,68,68,0.10)' },
  { value: 'high',     label: 'Alta',    borderColor: '#F97316', textColor: '#FB923C', bg: 'rgba(249,115,22,0.10)' },
  { value: 'medium',   label: 'Media',   borderColor: '#EAB308', textColor: '#FACC15', bg: 'rgba(234,179,8,0.10)'  },
  { value: 'low',      label: 'Baja',    borderColor: '#27272A', textColor: '#71717A', bg: 'rgba(113,113,122,0.10)' },
];

export function KanbanBoard({ board, projectId, projectName = '', projectDescription }: Props) {
  const { data: tasks = [], isLoading } = useTasks(projectId, board.boardId);
  const { data: members = [] } = useMembers(projectId);
  const updateTask = useUpdateTask(projectId, board.boardId);
  const qc = useQueryClient();

  const { activeModal, selectedTaskId, closeModal } = useUIStore();
  const detailTask = activeModal === 'task-detail'
    ? tasks.find(t => t.taskId === selectedTaskId)
    : undefined;

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [pendingColumnId, setPendingColumnId] = useState<string | null>(null);
  const [showAiGenerator, setShowAiGenerator] = useState(false);

  // ── WebSocket — sincronización en tiempo real ──────────────────────────────
  const { socket, isConnected } = useSocket(projectId);

  useEffect(() => {
    if (!socket) return;
    const invalidate = () => qc.invalidateQueries({ queryKey: ['tasks', board.boardId] });
    socket.on('task:created', invalidate);
    socket.on('task:updated', invalidate);
    socket.on('task:deleted', invalidate);
    return () => {
      socket.off('task:created', invalidate);
      socket.off('task:updated', invalidate);
      socket.off('task:deleted', invalidate);
    };
  }, [socket, qc, board.boardId]);

  const [filterPriority, setFilterPriority] = useState<Priority | null>(null);
  const [filterLabel, setFilterLabel]       = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [showFilters, setShowFilters]       = useState(false);

  const hasActiveFilters = !!filterPriority || !!filterLabel || !!filterAssignee;

  const clearFilters = () => { setFilterPriority(null); setFilterLabel(''); setFilterAssignee(''); };

  const filteredTasks = tasks.filter(t => {
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterAssignee && t.assigneeId !== filterAssignee) return false;
    if (filterLabel && !(t.labels ?? []).some(l => l.toLowerCase().includes(filterLabel.toLowerCase()))) return false;
    return true;
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const getTasksByColumn = useCallback(
    (columnId: string) => filteredTasks.filter(t => t.columnId === columnId).sort((a, b) => a.order - b.order),
    [filteredTasks]
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    const task = tasks.find(t => t.taskId === active.id);
    if (task) { setActiveTask(task); setPendingColumnId(null); }
  };

  const handleDragOver = ({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) => {
    if (!over || active.id === over.id) return;
    const overColumn = board.columns.find(c => c.columnId === over.id);
    if (overColumn) setPendingColumnId(overColumn.columnId);
  };

  const handleDragEnd = ({ over }: DragEndEvent) => {
    const dragged = activeTask;
    setActiveTask(null);
    if (!over || !dragged) { setPendingColumnId(null); return; }
    if (pendingColumnId && dragged.columnId !== pendingColumnId) {
      updateTask.mutate({ taskId: dragged.taskId, data: { columnId: pendingColumnId } });
      setPendingColumnId(null);
      return;
    }
    const overTask = tasks.find(t => t.taskId === over.id);
    if (dragged && overTask && dragged.columnId === overTask.columnId && dragged.taskId !== overTask.taskId) {
      updateTask.mutate({ taskId: dragged.taskId, data: { order: overTask.order } });
    }
    setPendingColumnId(null);
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 p-5">
        {board.columns.map(col => (
          <div key={col.columnId} className="w-[272px] shrink-0 h-48 rounded-xl animate-pulse"
            style={{ background: 'rgba(255,255,255,0.04)' }} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="px-5 py-2.5 shrink-0" style={{ borderBottom: '1px solid #1C1C1F' }}>
        <div className="flex items-center gap-2 flex-wrap">
          {/* ── Botón IA ───────────────────────────────────────────────────── */}
          <button
            onClick={() => setShowAiGenerator(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150"
            style={{
              background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.25)',
              color: '#818CF8',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.22)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.12)'; }}
            title="Generar tareas con IA"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generar con IA
          </button>

          {/* ── Divisor ───────────────────────────────────────────────────── */}
          <span className="w-px h-4" style={{ background: '#1C1C1F' }} />

          {/* ── Indicador WebSocket ───────────────────────────────────────── */}
          <span
            className="flex items-center gap-1 text-[10px] font-medium"
            style={{ color: isConnected ? '#34D399' : '#52525B' }}
            title={isConnected ? 'Sincronización en tiempo real activa' : 'Sin conexión en tiempo real'}
          >
            {isConnected
              ? <Wifi className="w-3 h-3" />
              : <WifiOff className="w-3 h-3" />
            }
            {isConnected ? 'En vivo' : 'Offline'}
          </span>

          <span className="w-px h-4" style={{ background: '#1C1C1F' }} />

          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150"
            style={{
              background: showFilters || hasActiveFilters ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
              border: showFilters || hasActiveFilters ? '1px solid rgba(99,102,241,0.3)' : '1px solid #1C1C1F',
              color: showFilters || hasActiveFilters ? '#818CF8' : '#52525B',
            }}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
            {hasActiveFilters && (
              <span className="flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
                style={{ background: '#6366F1', color: '#FAFAFA' }}>
                {[filterPriority, filterLabel, filterAssignee].filter(Boolean).length}
              </span>
            )}
            <ChevronDown className={cn('w-3 h-3 transition-transform duration-150', showFilters && 'rotate-180')} />
          </button>

          {PRIORITIES.map(p => (
            <button
              key={p.value}
              onClick={() => setFilterPriority(filterPriority === p.value ? null : p.value)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-all duration-150"
              style={{
                background: filterPriority === p.value ? p.bg : 'transparent',
                border: filterPriority === p.value ? `1px solid ${p.borderColor}50` : '1px solid #1C1C1F',
                color: filterPriority === p.value ? p.textColor : '#3F3F46',
              }}
            >
              {p.label}
            </button>
          ))}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg cursor-pointer"
              style={{ color: '#52525B' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#F87171'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#52525B'; }}
            >
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}

          {hasActiveFilters && (
            <span className="ml-auto text-[10px] tabular-nums" style={{ color: '#3F3F46', fontFamily: "'JetBrains Mono', monospace" }}>
              {filteredTasks.length} / {tasks.length}
            </span>
          )}
        </div>

        {showFilters && (
          <div className="flex items-center gap-3 mt-2.5 pt-2.5 flex-wrap" style={{ borderTop: '1px solid #1C1C1F' }}>
            <input
              value={filterLabel}
              onChange={e => setFilterLabel(e.target.value)}
              placeholder="Filtrar por etiqueta..."
              className="text-xs px-3 py-1.5 rounded-lg font-medium w-44 outline-none transition-all duration-150"
              style={{ background: '#111113', border: '1px solid #1C1C1F', color: '#A1A1AA' }}
              onFocus={e => { (e.target as HTMLElement).style.borderColor = '#6366F1'; }}
              onBlur={e => { (e.target as HTMLElement).style.borderColor = '#1C1C1F'; }}
            />
            <select
              value={filterAssignee}
              onChange={e => setFilterAssignee(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium w-48 outline-none cursor-pointer"
              style={{ background: '#111113', border: '1px solid #1C1C1F', color: '#A1A1AA' }}
            >
              <option value="">Todos los asignados</option>
              {members.map(m => <option key={m.userId} value={m.userId}>{m.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── Board ────────────────────────────────────────────────────────────── */}
      <DndContext sensors={sensors} collisionDetection={closestCorners}
        onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 p-5 overflow-x-auto flex-1">
          <SortableContext items={board.columns.map(c => c.columnId)} strategy={horizontalListSortingStrategy}>
            {board.columns.slice().sort((a, b) => a.order - b.order).map(column => (
              <KanbanColumn
                key={column.columnId}
                column={column}
                tasks={getTasksByColumn(column.columnId)}
                projectId={projectId}
                boardId={board.boardId}
                members={members}
              />
            ))}
          </SortableContext>
        </div>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} members={members} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          projectId={projectId}
          boardId={board.boardId}
          members={members}
          onClose={closeModal}
        />
      )}

      {/* Modal de generación de tareas con IA */}
      {showAiGenerator && (
        <AiTaskGenerator
          projectId={projectId}
          boardId={board.boardId}
          projectName={projectName}
          projectDescription={projectDescription}
          columns={board.columns.slice().sort((a, b) => a.order - b.order)}
          onClose={() => setShowAiGenerator(false)}
        />
      )}
    </div>
  );
}
