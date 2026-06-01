/**
 * aiController — Generación de tareas con Google Gemini (completamente gratis)
 *
 * Modelo : gemini-1.5-flash
 * Clave  : https://ai.google.dev  (sin tarjeta de crédito)
 * Límite : 15 req/min · 1 millón de tokens/día — más que suficiente para demo
 *
 * Endpoint : POST /api/v1/ai/suggest-tasks
 * Body     : { projectName: string, description?: string, count?: number }
 * Returns  : { tasks: AiTaskSuggestion[], model: string, count: number }
 *
 * Si GEMINI_API_KEY no está configurada, retorna 503 con mensaje descriptivo.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
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

/* ── Prompt ──────────────────────────────────────────────────────────────────── */
function buildPrompt(projectName: string, description: string | undefined, count: number): string {
  return `Eres un experto en gestión de proyectos ágiles. Tu tarea es generar tareas Kanban específicas y accionables.

Proyecto: "${projectName}"
${description ? `Contexto adicional: "${description}"` : ''}

Genera exactamente ${count} tareas Kanban que:
- Cubran las principales áreas del proyecto de forma balanceada
- Sean concretas y ejecutables (no vagas ni genéricas)
- Empiecen con un verbo de acción en infinitivo (Crear, Implementar, Diseñar, Configurar, Definir, Integrar, etc.)
- Tengan prioridades variadas y realistas según su importancia para el proyecto
- Incluyan 1-2 etiquetas cortas descriptivas en español (una sola palabra por etiqueta)

Responde ÚNICAMENTE con un array JSON válido. Sin texto extra, sin explicaciones, sin bloques de código markdown:

[
  {
    "title": "Título de la tarea (máximo 80 caracteres)",
    "description": "Descripción breve opcional (máximo 120 caracteres)",
    "priority": "low",
    "labels": ["etiqueta"]
  }
]

Prioridades disponibles: "low", "medium", "high", "critical"`;
}

/* ── Controlador ─────────────────────────────────────────────────────────────── */
export const aiController = {
  suggestTasks: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!env.GEMINI_API_KEY) {
      return sendError(
        res,
        'La funcionalidad de IA no está habilitada. Configura GEMINI_API_KEY. Obtén una clave gratis en https://ai.google.dev',
        503
      );
    }

    const { projectName, description, count } = suggestSchema.parse(req.body);

    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature:     0.7,  // algo de creatividad pero predecible
        maxOutputTokens: 2048,
        // Forzar respuesta en JSON puro
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(buildPrompt(projectName, description, count));
    const rawText = result.response.text();

    let tasks: AiTaskSuggestion[];
    try {
      // Con responseMimeType: 'application/json' Gemini devuelve JSON limpio,
      // pero por robustez también manejamos el caso con markdown fences
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No se encontró JSON en la respuesta');

      tasks = JSON.parse(jsonMatch[0]) as AiTaskSuggestion[];

      // Normalizar y validar cada tarea
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
      model: 'gemini-1.5-flash',
      count: tasks.length,
    });
  }),
};
