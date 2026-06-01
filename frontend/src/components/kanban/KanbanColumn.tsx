import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { useCreateTask } from '@/hooks/useTasks';
import { Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Column, Task, ProjectMemberDetail } from '@/types';

interface Props {
  column: Column;
  tasks: Task[];
  projectId: string;
  boardId: string;
  members: ProjectMemberDetail[];
}

type Priority = Task['priority'];

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'low',      label: 'Baja',     color: 'text-green-400' },
  { value: 'medium',   label: 'Media',    color: 'text-yellow-400' },
  { value: 'high',     label: 'Alta',     color: 'text-orange-400' },
  { value: 'critical', label: 'Crítica',  color: 'text-red-400' },
];

export function KanbanColumn({ column, tasks, projectId, boardId, members }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.columnId });
  const createTask = useCreateTask(projectId, boardId);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [assigneeId, setAssigneeId] = useState(''); // '' = automático (lo decide el sistema)

  // Solo admins y members pueden recibir tareas (los viewers son de solo lectura)
  const assignableMembers = members.filter(m => m.role !== 'viewer');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createTask.mutate(
      {
        title: title.trim(),
        columnId: column.columnId,
        priority,
        labels: [],
        order: tasks.length,
        ...(assigneeId ? { assigneeId } : {}), // sin assigneeId => auto-asignación en el backend
      },
      { onSuccess: () => { setTitle(''); setPriority('medium'); setAssigneeId(''); setAdding(false); } }
    );
  };

  return (
    <div className="w-72 shrink-0 flex flex-col">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color ?? '#6B7280' }} />
          <span className="text-sm font-semibold text-slate-200">{column.name}</span>
          <span className="text-xs bg-slate-700 text-slate-400 rounded-full px-2 py-0.5 font-medium">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="p-1 text-slate-500 hover:text-slate-200 hover:bg-slate-700 rounded transition"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Tasks */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-24 space-y-2 rounded-xl p-2 transition-colors',
          isOver ? 'bg-blue-950/40 ring-1 ring-blue-700' : 'bg-slate-900/40'
        )}
      >
        <SortableContext items={tasks.map(t => t.taskId)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => <TaskCard key={task.taskId} task={task} members={members} />)}
        </SortableContext>

        {/* Quick add */}
        {adding ? (
          <form onSubmit={handleAdd} className="bg-slate-800 rounded-lg p-2 border border-slate-700">
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Título de la tarea..."
              className="w-full text-sm bg-transparent text-white placeholder-slate-500 outline-none"
            />
            {/* Selector de prioridad */}
            <div className="flex items-center gap-1 mt-2">
              <span className="text-[10px] uppercase tracking-wide text-slate-500 mr-1">Prioridad</span>
              {PRIORITY_OPTIONS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={cn(
                    'text-[11px] px-2 py-0.5 rounded-full border font-medium transition',
                    priority === p.value
                      ? `${p.color} border-current bg-slate-900`
                      : 'text-slate-500 border-slate-700 hover:border-slate-500'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {/* Selector de asignado — "Automático" deja que el sistema balancee la carga */}
            <div className="mt-2">
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className="w-full text-xs bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-blue-600 transition"
              >
                <option value="">⚡ Automático (el sistema asigna)</option>
                {assignableMembers.map(m => (
                  <option key={m.userId} value={m.userId}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-1 mt-2">
              <button type="submit" disabled={createTask.isPending} className="text-xs px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition">
                {createTask.isPending ? '...' : 'Agregar'}
              </button>
              <button type="button" onClick={() => setAdding(false)} className="text-xs px-2.5 py-1 text-slate-500 hover:text-white transition">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full text-left text-xs text-slate-600 hover:text-slate-400 p-2 flex items-center gap-1.5 transition rounded-lg hover:bg-slate-800/50"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar tarea
          </button>
        )}
      </div>
    </div>
  );
}
