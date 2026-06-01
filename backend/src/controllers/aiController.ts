/**
 * aiController — Generación de tareas con Claude (Anthropic API)
 *
 * Endpoint: POST /api/v1/ai/suggest-tasks
 * Body:     { projectName: string, description?: string, columnId: string, count?: number }
 * Returns:  { tasks: AiTaskSuggestion[] }
 *
 * Si ANTHROPIC_API_KEY no está configurada, retorna 503 con mensaje claro.
 */

import { Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '../config/env';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

export interface AiTaskSuggestion {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  labels: string[];
}

const suggestSchema = z.object({
  projectName: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  count: z.coerce.number().int().min(3).max(15).default(8),
});

/* ── Prompt ──────────────────────────────────────────────────────────────────── */
function buildPrompt(projectName: string, description: string | undefined, count: number): string {
  return `Eres un experto en gestión de proyectos ágiles. Tu tarea es generar tareas Kanban específicas y accionables para un proyecto.

Proyecto: "${projectName}"
${description ? `Descripción: "${description}"` : ''}

Genera exactamente ${count} tareas Kanban que:
- Cubran las principales áreas del proyecto de forma balanceada
- Sean concretas y ejecutables (no vagas)
- Empiecen con un verbo de acción en infinitivo (Crear, Implementar, Diseñar, Configurar, Definir, etc.)
- Tengan prioridades variadas y realistas según su importancia
- Tengan 1-2 etiquetas cortas y descriptivas (en español, una sola palabra)

Responde ÚNICAMENTE con un array JSON válido, sin markdown, sin explicaciones, sin texto extra:

[
  {
    "title": "Título de la tarea (máx 80 caracteres)",
    "description": "Descripción breve opcional (máx 120 caracteres)",
    "priority": "low" | "medium" | "high" | "critical",
    "labels": ["etiqueta1", "etiqueta2"]
  }
]`;
}

export const aiController = {
  suggestTasks: asyncHandler(async (req: AuthRequest, res: Response) => {
    // Verificar que la API key esté configurada
    if (!env.ANTHROPIC_API_KEY) {
      return sendError(res, 'La funcionalidad de IA no está habilitada. Configura ANTHROPIC_API_KEY en el servidor.', 503);
    }

    const { projectName, description, count } = suggestSchema.parse(req.body);

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',  // Rápido y económico — ideal para esta feature
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: buildPrompt(projectName, description, count),
        },
      ],
    });

    // Extraer texto de la respuesta
    const rawText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('');

    // Parsear el JSON — Claude haiku con este prompt es muy consistente
    let tasks: AiTaskSuggestion[];
    try {
      // Por si Claude añade backticks o texto antes/después del JSON
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No se encontró JSON en la respuesta');
      tasks = JSON.parse(jsonMatch[0]) as AiTaskSuggestion[];

      // Validar y limpiar cada tarea
      tasks = tasks
        .filter(t => t.title && typeof t.title === 'string')
        .map(t => ({
          title:       t.title.trim().slice(0, 80),
          description: t.description?.trim().slice(0, 120),
          priority:    (['low', 'medium', 'high', 'critical'] as const).includes(t.priority)
            ? t.priority
            : 'medium',
          labels:      Array.isArray(t.labels)
            ? t.labels.slice(0, 2).map(l => String(l).toLowerCase().trim())
            : [],
        }));
    } catch {
      return sendError(res, 'Error al procesar la respuesta de IA. Intenta de nuevo.', 500);
    }

    return sendSuccess(res, { tasks, model: 'claude-haiku-4-5', count: tasks.length });
  }),
};
