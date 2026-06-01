/**
 * AiTaskGenerator — Modal para generar tareas con Claude IA
 *
 * Flujo:
 * 1. Usuario ve el formulario con el nombre del proyecto pre-relleno
 * 2. Opcionalmente añade más contexto en el campo de descripción
 * 3. Hace clic "Generar" → Claude retorna 8 sugerencias de tareas
 * 4. Cada sugerencia es un checkbox seleccionable con priority badge y labels
 * 5. "Crear X tareas" las crea en el tablero en la columna elegida
 *
 * El botón para abrir este modal vive en KanbanBoard (barra superior).
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useCreateTask } from '@/hooks/useTasks';
import { aiService, type AiTaskSuggestion } from '@/services/aiService';
import { X, Sparkles, Loader2, CheckSquare, Square, ChevronDown } from 'lucide-react';
import type { Column } from '@/types';

/* ── Priority visuals ───────────────────────────────────────────────────────── */
const PRIORITY_CONFIG = {
  critical: { label: 'Critica',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
  high:     { label: 'Alta',     color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  medium:   { label: 'Media',    color: '#EAB308', bg: 'rgba(234,179,8,0.12)'  },
  low:      { label: 'Baja',     color: '#71717A', bg: 'rgba(113,113,122,0.12)'},
} as const;

interface Props {
  projectId: string;
  boardId: string;
  projectName: string;
  projectDescription?: string;
  columns: Column[];
  onClose: () => void;
}

export function AiTaskGenerator({
  projectId,
  boardId,
  projectName,
  projectDescription,
  columns,
  onClose,
}: Props) {
  const createTask = useCreateTask(projectId, boardId);

  /* Form state */
  const [description, setDescription] = useState(projectDescription ?? '');
  const [targetColumnId, setTargetColumnId] = useState(
    columns.find(c => c.order === 0)?.columnId ?? columns[0]?.columnId ?? ''
  );

  /* Suggestions state */
  const [suggestions, setSuggestions] = useState<AiTaskSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  /* AI call */
  const generate = useMutation({
    mutationFn: () => aiService.suggestTasks(projectName, description || undefined),
    onSuccess: (data) => {
      setSuggestions(data.tasks);
      // Pre-seleccionar todas
      setSelected(new Set(data.tasks.map((_, i) => i)));
    },
  });

  const toggleAll = () => {
    if (selected.size === suggestions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(suggestions.map((_, i) => i)));
    }
  };

  const toggleOne = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!selected.size || !targetColumnId) return;
    setCreating(true);
    setCreatedCount(0);

    const toCreate = suggestions.filter((_, i) => selected.has(i));
    let count = 0;

    for (const task of toCreate) {
      await new Promise<void>(resolve => {
        createTask.mutate(
          {
            title: task.title,
            description: task.description,
            priority: task.priority,
            labels: task.labels,
            columnId: targetColumnId,
            order: 999,
          },
          {
            onSettled: () => {
              count++;
              setCreatedCount(count);
              resolve();
            },
          }
        );
      });
    }

    setCreating(false);
    onClose();
  };

  const selectedCount = selected.size;
  const hasResults = suggestions.length > 0;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full flex flex-col"
        style={{
          maxWidth: 540,
          maxHeight: '85dvh',
          background: '#111113',
          border: '1px solid #27272A',
          borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid #1C1C1F' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.15)' }}>
              <Sparkles className="w-4 h-4" style={{ color: '#818CF8' }} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: '#FAFAFA', letterSpacing: '-0.01em' }}>
                Generar tareas con IA
              </h2>
              <p className="text-[10px]" style={{ color: '#52525B' }}>
                Powered by Claude (Anthropic)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg cursor-pointer transition-all duration-150"
            style={{ color: '#52525B' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FAFAFA'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#52525B'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Project name (read-only) */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#71717A' }}>
              Proyecto
            </label>
            <div
              className="px-3.5 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: '#0D0D10', border: '1px solid #1C1C1F', color: '#52525B' }}
            >
              {projectName}
            </div>
          </div>

          {/* Additional context */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#71717A' }}>
              Contexto adicional
              <span className="ml-1 normal-case font-normal" style={{ color: '#3F3F46' }}>(opcional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe el stack, objetivos o cualquier detalle relevante..."
              className="w-full text-sm rounded-lg px-3.5 py-2.5 font-medium resize-none outline-none transition-all duration-150"
              style={{ background: '#0D0D10', border: '1px solid #27272A', color: '#FAFAFA' }}
              onFocus={e => { (e.target as HTMLElement).style.borderColor = '#6366F1'; }}
              onBlur={e => { (e.target as HTMLElement).style.borderColor = '#27272A'; }}
              disabled={generate.isPending || creating}
            />
          </div>

          {/* Generate button */}
          {!hasResults && (
            <button
              onClick={() => generate.mutate()}
              disabled={generate.isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
              style={{ background: '#6366F1', color: '#FAFAFA' }}
              onMouseEnter={e => { if (!generate.isPending) (e.currentTarget as HTMLElement).style.background = '#4F46E5'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#6366F1'; }}
            >
              {generate.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando tareas...</>
                : <><Sparkles className="w-4 h-4" /> Generar tareas</>
              }
            </button>
          )}

          {/* Error */}
          {generate.isError && (
            <div
              className="rounded-lg px-3.5 py-2.5 text-xs"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}
            >
              {generate.error instanceof Error
                ? generate.error.message
                : 'Error al generar tareas. Verifica que ANTHROPIC_API_KEY esté configurada.'}
            </div>
          )}

          {/* ── Suggestions list ──────────────────────────────────────────── */}
          {hasResults && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#71717A' }}>
                  Sugerencias ({suggestions.length})
                </label>
                <button
                  onClick={toggleAll}
                  className="text-[10px] font-medium cursor-pointer transition-colors duration-150"
                  style={{ color: '#6366F1' }}
                >
                  {selected.size === suggestions.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </button>
              </div>

              <div className="space-y-1.5">
                {suggestions.map((task, i) => {
                  const pc = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
                  const isSelected = selected.has(i);
                  return (
                    <button
                      key={i}
                      onClick={() => toggleOne(i)}
                      className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150"
                      style={{
                        background: isSelected ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isSelected ? 'rgba(99,102,241,0.2)' : '#1C1C1F'}`,
                      }}
                    >
                      {/* Checkbox */}
                      <span className="mt-0.5 shrink-0">
                        {isSelected
                          ? <CheckSquare className="w-4 h-4" style={{ color: '#6366F1' }} />
                          : <Square className="w-4 h-4" style={{ color: '#3F3F46' }} />
                        }
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug" style={{ color: '#E4E4E7' }}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: '#52525B' }}>
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {/* Priority */}
                          <span
                            className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                            style={{ background: pc.bg, color: pc.color }}
                          >
                            {pc.label}
                          </span>
                          {/* Labels */}
                          {task.labels.map(label => (
                            <span
                              key={label}
                              className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(99,102,241,0.10)', color: '#818CF8' }}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer (columna destino + crear) ─────────────────────────────── */}
        {hasResults && (
          <div
            className="flex items-center gap-3 px-5 py-4 shrink-0"
            style={{ borderTop: '1px solid #1C1C1F' }}
          >
            {/* Column selector */}
            <div className="relative flex-1">
              <select
                value={targetColumnId}
                onChange={e => setTargetColumnId(e.target.value)}
                disabled={creating}
                className="w-full text-xs rounded-lg px-3 py-2 font-medium cursor-pointer outline-none appearance-none pr-8"
                style={{ background: '#1C1C1F', border: '1px solid #27272A', color: '#A1A1AA' }}
              >
                {columns.map(col => (
                  <option key={col.columnId} value={col.columnId}>{col.name}</option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                style={{ color: '#52525B' }}
              />
            </div>

            {/* Regenerate */}
            <button
              onClick={() => { setSuggestions([]); setSelected(new Set()); generate.reset(); }}
              className="text-xs font-medium px-3 py-2 rounded-lg cursor-pointer transition-all duration-150"
              style={{ background: '#1C1C1F', border: '1px solid #27272A', color: '#71717A' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FAFAFA'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#71717A'; }}
            >
              Nueva generacion
            </button>

            {/* Create tasks */}
            <button
              onClick={handleCreate}
              disabled={!selectedCount || creating}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
              style={{ background: selectedCount ? '#6366F1' : '#27272A', color: '#FAFAFA' }}
              onMouseEnter={e => { if (selectedCount && !creating) (e.currentTarget as HTMLElement).style.background = '#4F46E5'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selectedCount ? '#6366F1' : '#27272A'; }}
            >
              {creating
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {createdCount}/{selectedCount}</>
                : <><Sparkles className="w-3.5 h-3.5" /> Crear {selectedCount} tarea{selectedCount !== 1 ? 's' : ''}</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
