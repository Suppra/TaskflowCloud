import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/utils/cn';
import { formatDate, isOverdue } from '@/utils/date';
import { Calendar, MessageSquare, Paperclip, AlertCircle } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import type { Task } from '@/types';

const PRIORITY_STYLES = {
  low: 'bg-slate-700 text-slate-300',
  medium: 'bg-blue-900/60 text-blue-300',
  high: 'bg-orange-900/60 text-orange-300',
  critical: 'bg-red-900/60 text-red-300',
};

const PRIORITY_LABELS = {
  low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica',
};

interface Props {
  task: Task;
  isDragging?: boolean;
}

export function TaskCard({ task, isDragging = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSorting } = useSortable({
    id: task.taskId,
  });
  const { openModal } = useUIStore();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const overdue = isOverdue(task.dueDate);
  const completedSubtasks = task.subtasks.filter(s => s.completed).length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => openModal('task-detail', task.taskId)}
      className={cn(
        'bg-slate-800 border border-slate-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-slate-600 transition-all',
        (isDragging || isSorting) && 'opacity-40 ring-1 ring-blue-500'
      )}
    >
      {/* Priority badge */}
      <div className="flex items-center justify-between mb-2">
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PRIORITY_STYLES[task.priority])}>
          {PRIORITY_LABELS[task.priority]}
        </span>
        {overdue && <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-white leading-snug mb-2 line-clamp-2">{task.title}</p>

      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 3).map(label => (
            <span key={label} className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        {task.dueDate && (
          <span className={cn('flex items-center gap-1', overdue && 'text-red-400')}>
            <Calendar className="w-3 h-3" />{formatDate(task.dueDate)}
          </span>
        )}
        {task.subtasks.length > 0 && (
          <span>{completedSubtasks}/{task.subtasks.length}</span>
        )}
        {task.attachments.length > 0 && (
          <span className="flex items-center gap-0.5">
            <Paperclip className="w-3 h-3" />{task.attachments.length}
          </span>
        )}
      </div>
    </div>
  );
}
