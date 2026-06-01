import { useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/utils/cn';
import { formatDate, isOverdue } from '@/utils/date';
import { Calendar, Paperclip, AlertCircle, CheckSquare } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import type { Task, ProjectMemberDetail } from '@/types';

/* ── Priority visual system ─────────────────────────────────────────────────── */
const PRIORITY_BORDER: Record<string, string> = {
  low:      '#27272A',
  medium:   '#EAB308',
  high:     '#F97316',
  critical: '#EF4444',
};

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Critica',
};

const PRIORITY_TEXT: Record<string, string> = {
  low:      '#52525B',
  medium:   '#CA8A04',
  high:     '#C2410C',
  critical: '#DC2626',
};

interface Props {
  task: Task;
  members?: ProjectMemberDetail[];
  isDragging?: boolean;
}

export function TaskCard({ task, members = [], isDragging = false }: Props) {
  const assignee = task.assigneeId ? members.find(m => m.userId === task.assigneeId) : undefined;
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging: isSorting,
  } = useSortable({ id: task.taskId });

  const { openModal } = useUIStore();
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const wasDragged = useRef(false);
  const [hovered, setHovered] = useState(false);

  const ghost = isDragging || isSorting;
  const overdue = isOverdue(task.dueDate);
  const completedSubtasks = task.subtasks.filter(s => s.completed).length;
  const priorityBorderColor = PRIORITY_BORDER[task.priority] ?? '#27272A';

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    wasDragged.current = false;
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartPos.current) return;
    if (Math.abs(e.clientX - dragStartPos.current.x) > 5 ||
        Math.abs(e.clientY - dragStartPos.current.y) > 5) wasDragged.current = true;
  };
  const handleClick = () => {
    if (wasDragged.current || isSorting || isDragging) return;
    openModal('task-detail', task.taskId);
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'rounded-r-xl p-3 select-none transition-all duration-150',
        'cursor-grab active:cursor-grabbing',
        !ghost && hovered && '-translate-y-px'
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        background: hovered && !ghost ? '#1C1C1F' : '#111113',
        borderTop:    `1px solid ${hovered && !ghost ? '#27272A' : '#1C1C1F'}`,
        borderRight:  `1px solid ${hovered && !ghost ? '#27272A' : '#1C1C1F'}`,
        borderBottom: `1px solid ${hovered && !ghost ? '#27272A' : '#1C1C1F'}`,
        borderLeft:   `3px solid ${priorityBorderColor}`,
        opacity: ghost ? 0.35 : 1,
        outline: ghost ? '1px solid #6366F1' : 'none',
        outlineOffset: 2,
      }}
    >
      {/* Priority + overdue */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: PRIORITY_TEXT[task.priority] ?? '#52525B' }}
        >
          {PRIORITY_LABEL[task.priority] ?? task.priority}
        </span>
        {overdue && <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#EF4444' }} />}
      </div>

      {/* Title */}
      <p className="text-sm font-medium leading-snug mb-2.5 line-clamp-2" style={{ color: '#E4E4E7' }}>
        {task.title}
      </p>

      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {task.labels.slice(0, 3).map(label => (
            <span
              key={label}
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{
                background: 'rgba(99,102,241,0.10)',
                color: '#818CF8',
                border: '1px solid rgba(99,102,241,0.18)',
              }}
            >
              {label}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#1C1C1F', color: '#52525B' }}>
              +{task.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 flex-wrap">
        {task.dueDate && (
          <span
            className="flex items-center gap-1 text-[10px]"
            style={{
              color: overdue ? '#F87171' : '#52525B',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <Calendar className="w-3 h-3" />
            {formatDate(task.dueDate)}
          </span>
        )}
        {task.subtasks.length > 0 && (
          <span
            className="flex items-center gap-1 text-[10px]"
            style={{
              color: completedSubtasks === task.subtasks.length ? '#34D399' : '#52525B',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <CheckSquare className="w-3 h-3" />
            {completedSubtasks}/{task.subtasks.length}
          </span>
        )}
        {task.attachments.length > 0 && (
          <span
            className="flex items-center gap-1 text-[10px]"
            style={{ color: '#52525B', fontFamily: "'JetBrains Mono', monospace" }}
          >
            <Paperclip className="w-3 h-3" />
            {task.attachments.length}
          </span>
        )}
        {assignee && (
          <span className="ml-auto" title={`Asignado a ${assignee.name}`}>
            <span
              className="flex items-center justify-center rounded-full overflow-hidden font-bold"
              style={{ width: 18, height: 18, background: '#4F46E5', fontSize: 8, color: '#FAFAFA' }}
            >
              {assignee.avatar
                ? <img src={assignee.avatar} alt={assignee.name} className="w-full h-full object-cover" />
                : (assignee.name || '?')[0].toUpperCase()
              }
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
