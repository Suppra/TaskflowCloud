import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { useCreateTask } from '@/hooks/useTasks';
import { Plus, X, Zap } from 'lucide-react';
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

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string; activeColor: string }[] = [
  { value: 'low',      label: 'Baja',    color: '#52525B', activeColor: '#27272A' },
  { value: 'medium',   label: 'Media',   color: '#CA8A04', activeColor: 'rgba(234,179,8,0.15)' },
  { value: 'high',     label: 'Alta',    color: '#C2410C', activeColor: 'rgba(249,115,22,0.15)' },
  { value: 'critical', label: 'Critica', color: '#DC2626', activeColor: 'rgba(239,68,68,0.15)' },
];

const inputCls =
  'w-full bg-transparent text-sm outline-none placeholder-zinc-700 font-medium resize-none' +
  ' text-zinc-50';

export function KanbanColumn({ column, tasks, projectId, boardId, members }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.columnId });
  const createTask = useCreateTask(projectId, boardId);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [assigneeId, setAssigneeId] = useState('');

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
        ...(assigneeId ? { assigneeId } : {}),
      },
      { onSuccess: () => { setTitle(''); setPriority('medium'); setAssigneeId(''); setAdding(false); } }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setAdding(false);
  };

  return (
    <div className="w-[272px] shrink-0 flex flex-col">

      {/* ── Column header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          {/* Color dot */}
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: column.color ?? '#52525B' }}
          />
          <span
            className="text-xs font-semibold truncate"
            style={{ color: '#D4D4D8', letterSpacing: '-0.01em' }}
          >
            {column.name}
          </span>
          {/* Task count */}
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums shrink-0"
            style={{
              background: '#1C1C1F',
              color: '#52525B',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="p-1 rounded-md cursor-pointer transition-all duration-150 shrink-0"
          style={{ color: '#3F3F46' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = '#A1A1AA';
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = '#3F3F46';
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
          title="Agregar tarea"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Drop zone ──────────────────────────────────────────────────────────── */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-16 space-y-2 rounded-xl p-2 transition-all duration-150'
        )}
        style={{
          background: isOver ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
          border: isOver
            ? '1px dashed rgba(99,102,241,0.4)'
            : '1px solid transparent',
        }}
      >
        <SortableContext items={tasks.map(t => t.taskId)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task.taskId} task={task} members={members} />
          ))}
        </SortableContext>

        {/* ── Add task form ────────────────────────────────────────────────────── */}
        {adding ? (
          <form
            onSubmit={handleAdd}
            onKeyDown={handleKeyDown}
            className="rounded-xl p-3 space-y-2.5"
            style={{ background: '#1C1C1F', border: '1px solid #27272A' }}
          >
            {/* Title input */}
            <textarea
              autoFocus
              rows={2}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titulo de la tarea..."
              className={inputCls}
            />

            {/* Priority chips */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#52525B' }}>
                Prioridad
              </p>
              <div className="flex items-center gap-1">
                {PRIORITY_OPTIONS.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className="text-[10px] px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-all duration-150"
                    style={{
                      color: priority === p.value ? p.color : '#52525B',
                      background: priority === p.value ? p.activeColor : 'transparent',
                      border: `1px solid ${priority === p.value ? p.color + '50' : '#27272A'}`,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Assignee select */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#52525B' }}>
                Asignado
              </p>
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className="w-full text-xs rounded-lg px-2.5 py-1.5 font-medium cursor-pointer"
                style={{
                  background: '#111113',
                  border: '1px solid #27272A',
                  color: '#A1A1AA',
                  outline: 'none',
                }}
              >
                <option value="">Automatico (sistema asigna)</option>
                {assignableMembers.map(m => (
                  <option key={m.userId} value={m.userId}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Auto icon hint */}
            {!assigneeId && (
              <p className="flex items-center gap-1 text-[10px]" style={{ color: '#3F3F46' }}>
                <Zap className="w-3 h-3" />
                El sistema asignara al miembro con menor carga
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="submit"
                disabled={createTask.isPending || !title.trim()}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                style={{ background: '#6366F1', color: '#FAFAFA' }}
                onMouseEnter={e => { if (!createTask.isPending) (e.currentTarget as HTMLElement).style.background = '#4F46E5'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#6366F1'; }}
              >
                {createTask.isPending ? '...' : 'Agregar'}
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="p-1.5 rounded-lg cursor-pointer transition-all duration-150"
                style={{ color: '#52525B' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#A1A1AA'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#52525B'; }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full text-left text-xs px-2 py-2 flex items-center gap-1.5 rounded-lg cursor-pointer transition-all duration-150"
            style={{ color: '#3F3F46' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#71717A';
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = '#3F3F46';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar tarea
          </button>
        )}
      </div>
    </div>
  );
}
