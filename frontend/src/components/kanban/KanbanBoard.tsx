import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { useMembers } from '@/hooks/useProjects';
import { useUIStore } from '@/store/uiStore';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { TaskDetailModal } from './TaskDetailModal';
import type { Board, Task } from '@/types';
import { Filter, X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Props {
  board: Board;
  projectId: string;
}

type Priority = Task['priority'];

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'critical', label: 'Crítica',  color: 'text-red-400 bg-red-900/30 border-red-800' },
  { value: 'high',     label: 'Alta',     color: 'text-orange-400 bg-orange-900/30 border-orange-800' },
  { value: 'medium',   label: 'Media',    color: 'text-yellow-400 bg-yellow-900/30 border-yellow-800' },
  { value: 'low',      label: 'Baja',     color: 'text-green-400 bg-green-900/30 border-green-800' },
];

export function KanbanBoard({ board, projectId }: Props) {
  const { data: tasks = [], isLoading } = useTasks(projectId, board.boardId);
  const { data: members = [] } = useMembers(projectId);
  const updateTask = useUpdateTask(projectId, board.boardId);

  // Modal de detalle de tarea (estado global en uiStore)
  const { activeModal, selectedTaskId, closeModal } = useUIStore();
  const detailTask = activeModal === 'task-detail'
    ? tasks.find(t => t.taskId === selectedTaskId)
    : undefined;
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [pendingColumnId, setPendingColumnId] = useState<string | null>(null);

  // ── Filtros locales (no requieren llamada a API) ─────────────────────────
  const [filterPriority, setFilterPriority]   = useState<Priority | null>(null);
  const [filterLabel, setFilterLabel]         = useState('');
  const [filterAssignee, setFilterAssignee]   = useState('');
  const [showFilters, setShowFilters]         = useState(false);

  const hasActiveFilters = !!filterPriority || !!filterLabel || !!filterAssignee;

  const clearFilters = () => {
    setFilterPriority(null);
    setFilterLabel('');
    setFilterAssignee('');
  };

  // Filtrado en cliente (instantáneo, sin latencia de red)
  const filteredTasks = tasks.filter(t => {
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterAssignee && t.assigneeId !== filterAssignee) return false;
    if (filterLabel && !(t.labels ?? []).some(l =>
      l.toLowerCase().includes(filterLabel.toLowerCase())
    )) return false;
    return true;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const getTasksByColumn = useCallback(
    (columnId: string) =>
      filteredTasks.filter(t => t.columnId === columnId).sort((a, b) => a.order - b.order),
    [filteredTasks]
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    const task = tasks.find(t => t.taskId === active.id);
    if (task) {
      setActiveTask(task);
      setPendingColumnId(null);
    }
  };

  const handleDragOver = ({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) => {
    if (!over || active.id === over.id) return;
    const overColumn = board.columns.find(c => c.columnId === over.id);
    if (overColumn) setPendingColumnId(overColumn.columnId);
  };

  const handleDragEnd = ({ over }: DragEndEvent) => {
    const dragged = activeTask;
    setActiveTask(null);

    if (!over || !dragged) {
      setPendingColumnId(null);
      return;
    }

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
      <div className="flex gap-4 p-6">
        {board.columns.map(col => (
          <div key={col.columnId} className="w-72 shrink-0 h-48 bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Barra de filtros ───────────────────────────────────────────────── */}
      <div className="px-6 py-2 border-b border-slate-800 bg-slate-900/30 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle filtros */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition',
              showFilters || hasActiveFilters
                ? 'bg-blue-900/40 border-blue-700 text-blue-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
            {hasActiveFilters && (
              <span className="w-4 h-4 bg-blue-500 text-white rounded-full text-[10px] flex items-center justify-center">
                {[filterPriority, filterLabel, filterAssignee].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Chips de prioridad — siempre visibles */}
          {PRIORITIES.map(p => (
            <button
              key={p.value}
              onClick={() => setFilterPriority(filterPriority === p.value ? null : p.value)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition font-medium',
                filterPriority === p.value
                  ? p.color
                  : 'text-slate-500 bg-slate-800 border-slate-700 hover:border-slate-500'
              )}
            >
              {p.label}
            </button>
          ))}

          {/* Limpiar filtros */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 px-2 py-1 rounded-lg transition"
            >
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}

          {/* Contador de tareas visibles */}
          {hasActiveFilters && (
            <span className="ml-auto text-xs text-slate-500">
              {filteredTasks.length} / {tasks.length} tareas
            </span>
          )}
        </div>

        {/* Filtros expandidos */}
        {showFilters && (
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-800">
            <input
              value={filterLabel}
              onChange={e => setFilterLabel(e.target.value)}
              placeholder="Filtrar por etiqueta..."
              className="text-xs px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-600 transition w-44"
            />
            <select
              value={filterAssignee}
              onChange={e => setFilterAssignee(e.target.value)}
              className="text-xs px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-blue-600 transition w-48"
            >
              <option value="">Todos los asignados</option>
              {members.map(m => (
                <option key={m.userId} value={m.userId}>{m.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Tablero Kanban ────────────────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-6 overflow-x-auto flex-1">
          <SortableContext
            items={board.columns.map(c => c.columnId)}
            strategy={horizontalListSortingStrategy}
          >
            {board.columns
              .slice()
              .sort((a, b) => a.order - b.order)
              .map(column => (
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

      {/* Modal de detalle de tarea */}
      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          projectId={projectId}
          boardId={board.boardId}
          members={members}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
