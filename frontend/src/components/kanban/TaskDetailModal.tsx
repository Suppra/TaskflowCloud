import { useRef, useState } from 'react';
import {
  useUpdateTask, useDeleteTask, useComments, useAddComment, useAddSubtask, useToggleSubtask,
  useUploadAttachment, useDeleteAttachment, useDownloadAttachment,
} from '@/hooks/useTasks';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/date';
import {
  X, Trash2, Save, Plus, CheckCircle2, Circle,
  MessageSquare, Calendar, Flag, User as UserIcon, CheckSquare,
  Paperclip, Download, Loader2,
} from 'lucide-react';
import type { Task, ProjectMemberDetail } from '@/types';

/** Formatea bytes a una unidad legible (KB/MB). */
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface Props {
  task: Task;
  projectId: string;
  boardId: string;
  members: ProjectMemberDetail[];
  onClose: () => void;
  /** ID de la columna "Completado" (última por order). Al marcar completa, la tarea se mueve aquí. */
  completionColumnId?: string;
  /** ID de la primera columna (Por hacer). Al desmarcar, la tarea regresa aquí. */
  defaultColumnId?: string;
}

type Priority = Task['priority'];

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'low',      label: 'Baja',     color: 'text-green-400 border-green-700 bg-green-900/30' },
  { value: 'medium',   label: 'Media',    color: 'text-yellow-400 border-yellow-700 bg-yellow-900/30' },
  { value: 'high',     label: 'Alta',     color: 'text-orange-400 border-orange-700 bg-orange-900/30' },
  { value: 'critical', label: 'Crítica',  color: 'text-red-400 border-red-700 bg-red-900/30' },
];

/** Convierte un ISO a formato compatible con <input type="datetime-local"> */
const toLocalInput = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function TaskDetailModal({ task, projectId, boardId, members, onClose, completionColumnId, defaultColumnId }: Props) {
  const updateTask = useUpdateTask(projectId, boardId);
  const deleteTask = useDeleteTask(projectId, boardId);
  const addSubtask = useAddSubtask(projectId, boardId, task.taskId);
  const toggleSubtask = useToggleSubtask(projectId, boardId, task.taskId);
  const { data: comments = [] } = useComments(projectId, boardId, task.taskId);
  const addComment = useAddComment(projectId, boardId, task.taskId);
  const uploadAttachment = useUploadAttachment(projectId, boardId, task.taskId);
  const deleteAttachment = useDeleteAttachment(projectId, boardId, task.taskId);
  const downloadAttachment = useDownloadAttachment(projectId, boardId, task.taskId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? '');
  const [dueDate, setDueDate] = useState(toLocalInput(task.dueDate));
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');

  const assignable = members.filter(m => m.role !== 'viewer');
  const memberName = (id?: string) => members.find(m => m.userId === id)?.name ?? id ?? '—';
  const completedSubtasks = task.subtasks.filter(s => s.completed).length;
  const isCompleted = !!task.completedAt;

  const handleSave = () => {
    const data: Partial<Task> = {
      title: title.trim() || task.title,
      description: description.trim() || undefined,
      priority,
      assigneeId: assigneeId || undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
    };
    updateTask.mutate({ taskId: task.taskId, data }, { onSuccess: onClose });
  };

  const handleToggleComplete = () => {
    if (isCompleted) {
      // Desmarcar: borrar completedAt (null = REMOVE en DynamoDB) y volver a la primera columna
      updateTask.mutate({
        taskId: task.taskId,
        data: {
          completedAt: null,
          ...(defaultColumnId ? { columnId: defaultColumnId } : {}),
        },
      });
    } else {
      // Marcar: fijar completedAt y mover a la columna de completado
      updateTask.mutate({
        taskId: task.taskId,
        data: {
          completedAt: new Date().toISOString(),
          ...(completionColumnId ? { columnId: completionColumnId } : {}),
        },
      });
    }
  };

  const handleDelete = () => {
    if (confirm('¿Eliminar esta tarea? Esta acción no se puede deshacer.')) {
      deleteTask.mutate(task.taskId, { onSuccess: onClose });
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('El archivo supera el límite de 50 MB.');
      return;
    }
    uploadAttachment.mutate(file, {
      onError: (err) => setUploadError((err as Error).message || 'Error al subir el archivo'),
    });
    e.target.value = ''; // permite re-subir el mismo archivo
  };

  const attachments = task.attachments ?? [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="flex-1 text-lg font-bold text-white bg-transparent border-b border-transparent hover:border-slate-600 focus:border-blue-500 focus:outline-none transition pb-1"
          />
          <button onClick={onClose} className="text-slate-500 hover:text-white transition shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Estado de completado */}
          <button
            onClick={handleToggleComplete}
            className={cn(
              'flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border transition',
              isCompleted
                ? 'text-green-400 border-green-700 bg-green-900/30'
                : 'text-slate-400 border-slate-600 hover:border-slate-400'
            )}
          >
            {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            {isCompleted ? 'Completada' : 'Marcar como completada'}
          </button>

          {/* Metadatos */}
          <div className="grid grid-cols-2 gap-4">
            {/* Prioridad */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1.5">
                <Flag className="w-3.5 h-3.5" /> Prioridad
              </label>
              <div className="flex flex-wrap gap-1">
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    className={cn(
                      'text-xs px-2 py-1 rounded-full border font-medium transition',
                      priority === p.value ? p.color : 'text-slate-500 border-slate-700 hover:border-slate-500'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Asignado */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1.5">
                <UserIcon className="w-3.5 h-3.5" /> Asignado a
              </label>
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className="w-full text-sm bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">Sin asignar</option>
                {assignable.map(m => <option key={m.userId} value={m.userId}>{m.name}</option>)}
              </select>
            </div>

            {/* Fecha límite */}
            <div className="col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1.5">
                <Calendar className="w-3.5 h-3.5" /> Fecha límite
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full text-sm bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Descripción</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Añade más detalles sobre esta tarea..."
              className="w-full text-sm bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-y"
            />
          </div>

          {/* Subtareas */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-2">
              <CheckSquare className="w-3.5 h-3.5" /> Subtareas ({completedSubtasks}/{task.subtasks.length})
            </label>
            <div className="space-y-1.5">
              {task.subtasks.map(st => (
                <button
                  key={st.subtaskId}
                  onClick={() => toggleSubtask.mutate(st.subtaskId)}
                  className="flex items-center gap-2 w-full text-left text-sm text-slate-300 hover:bg-slate-700/50 rounded-lg px-2 py-1.5 transition"
                >
                  {st.completed
                    ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    : <Circle className="w-4 h-4 text-slate-500 shrink-0" />}
                  <span className={cn(st.completed && 'line-through text-slate-500')}>{st.title}</span>
                </button>
              ))}
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (newSubtask.trim()) addSubtask.mutate(newSubtask.trim(), { onSuccess: () => setNewSubtask('') });
              }}
              className="flex gap-2 mt-2"
            >
              <input
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                placeholder="Nueva subtarea..."
                className="flex-1 text-sm bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button type="submit" disabled={addSubtask.isPending || !newSubtask.trim()} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-lg transition">
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Adjuntos */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-2">
              <Paperclip className="w-3.5 h-3.5" /> Adjuntos ({attachments.length})
            </label>
            <div className="space-y-1.5 mb-2">
              {attachments.map(a => (
                <div key={a.attachmentId} className="flex items-center gap-2 bg-slate-900/40 rounded-lg px-3 py-2">
                  <Paperclip className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-200 truncate">{a.filename}</p>
                    <p className="text-[10px] text-slate-500">{formatFileSize(a.fileSize)}</p>
                  </div>
                  <button
                    onClick={() => downloadAttachment.mutate(a.attachmentId)}
                    title="Descargar"
                    className="text-slate-400 hover:text-blue-400 p-1 rounded transition shrink-0"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar "${a.filename}"?`)) deleteAttachment.mutate(a.attachmentId);
                    }}
                    title="Eliminar"
                    className="text-slate-400 hover:text-red-400 p-1 rounded transition shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {attachments.length === 0 && (
                <p className="text-xs text-slate-500 italic">Sin archivos adjuntos.</p>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelected}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAttachment.isPending}
              className="flex items-center gap-1.5 text-sm text-slate-300 border border-dashed border-slate-600 hover:border-blue-500 hover:text-blue-400 rounded-lg px-3 py-2 w-full justify-center transition disabled:opacity-50"
            >
              {uploadAttachment.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
                : <><Plus className="w-4 h-4" /> Adjuntar archivo</>}
            </button>
            {uploadError && <p className="text-xs text-red-400 mt-1.5">{uploadError}</p>}
          </div>

          {/* Comentarios */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-2">
              <MessageSquare className="w-3.5 h-3.5" /> Comentarios ({comments.length})
            </label>
            <div className="space-y-2 mb-2">
              {comments.map(c => (
                <div key={c.commentId} className="bg-slate-900/40 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-slate-300">{memberName(c.authorId)}</span>
                    <span className="text-[10px] text-slate-500">{formatDate(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{c.content}</p>
                </div>
              ))}
              {comments.length === 0 && <p className="text-xs text-slate-500 italic">Sin comentarios todavía.</p>}
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (newComment.trim()) addComment.mutate(newComment.trim(), { onSuccess: () => setNewComment('') });
              }}
              className="flex gap-2"
            >
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Escribe un comentario..."
                className="flex-1 text-sm bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button type="submit" disabled={addComment.isPending || !newComment.trim()} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
                Enviar
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-slate-700 sticky bottom-0 bg-slate-800">
          <button
            onClick={handleDelete}
            disabled={deleteTask.isPending}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-400 px-3 py-2 rounded-lg hover:bg-red-900/20 transition"
          >
            <Trash2 className="w-4 h-4" /> Eliminar
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition">Cerrar</button>
            <button
              onClick={handleSave}
              disabled={updateTask.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-medium rounded-lg transition"
            >
              <Save className="w-4 h-4" /> {updateTask.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
