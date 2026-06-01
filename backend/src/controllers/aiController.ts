/**
 * aiController — Generación de tareas con Groq + LLaMA 3.3 70B (completamente gratis)
 *
 * Modelo  : llama-3.3-70b-versatile (Meta, open source, hosteado por Groq)
 * Clave   : https://console.groq.com → "Create API Key"  (sin tarjeta)
 * Formato : gsk_...
 * Límite  : 30 req/min · 6K tokens/min · gratis para siempre
 *
 * Endpoint : POST /api/v1/ai/suggest-tasks
 * Body     : { projectName: string, description?: string, count?: number }
 * Returns  : { tasks: AiTaskSuggestion[], model: string, count: number }
 */

import Groq from 'groq-sdk';
import { z } from 'zod';
import type { Response } from 'express';
import { env } from '../config/env';
import type { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

export interface AiTaskSuggestion {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  labels: string[];
}

const suggestSchema = z.object({
  projectName:  z.string().min(1).max(200),
  description:  z.string().max(1000).optional(),
  count:        z.coerce.number().int().min(3).max(15).default(8),
});

function buildPrompt(projectName: string, description: string | undefined, count: number): string {
  return `Eres un experto en gestión de proyectos ágiles. Genera exactamente ${count} tareas Kanban específicas y accionables.

Proyecto: "${projectName}"
${description ? `Contexto: "${description}"` : ''}

Reglas:
- Cada tarea empieza con un verbo en infinitivo (Crear, Implementar, Diseñar, Configurar, etc.)
- Prioridades variadas y realistas según importancia
- 1-2 etiquetas cortas en español (una sola palabra)
- Títulos concretos, no vagos

Responde SOLO con un array JSON válido, sin texto adicional:

[
  {
    "title": "Título (máx 80 caracteres)",
    "description": "Descripción breve opcional (máx 120 caracteres)",
    "priority": "low|medium|high|critical",
    "labels": ["etiqueta1"]
  }
]`;
}

export const aiController = {
  suggestTasks: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!env.GROQ_API_KEY) {
      return sendError(
        res,
        'La funcionalidad de IA no está habilitada. Configura GROQ_API_KEY. Obtén una clave gratis en https://console.groq.com',
        503
      );
    }

    const { projectName, description, count } = suggestSchema.parse(req.body);

    const groq = new Groq({ apiKey: env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens:  2048,
      messages: [
        {
          role:    'user',
          content: buildPrompt(projectName, description, count),
        },
      ],
    });

    const rawText = completion.choices[0]?.message?.content ?? '';

    let tasks: AiTaskSuggestion[];
    try {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No se encontró JSON en la respuesta');

      tasks = JSON.parse(jsonMatch[0]) as AiTaskSuggestion[];

      const validPriorities = ['low', 'medium', 'high', 'critical'] as const;
      tasks = tasks
        .filter(t => t.title && typeof t.title === 'string')
        .map(t => ({
          title:       t.title.trim().slice(0, 80),
          description: t.description?.trim().slice(0, 120) || undefined,
          priority:    validPriorities.includes(t.priority as typeof validPriorities[number])
            ? t.priority
            : 'medium',
          labels:      Array.isArray(t.labels)
            ? t.labels.slice(0, 2).map(l => String(l).toLowerCase().trim())
            : [],
        }));
    } catch {
      return sendError(res, 'Error al procesar la respuesta de IA. Intenta de nuevo.', 500);
    }

    return sendSuccess(res, {
      tasks,
      model: 'llama-3.3-70b-versatile',
      count: tasks.length,
    });
  }),
};
