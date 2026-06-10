/**
 * reportService — Generación de reportes PDF y CSV para proyectos TaskFlow Cloud
 *
 * PDF: portada, resumen ejecutivo, equipo, desglose por columna, detalle de
 *      tareas, sección de vencidas.  Usa tracking EXPLÍCITO de Y para evitar
 *      páginas en blanco y texto solapado (NO mezcla modo fluido y posicionado).
 * CSV: metadatos, resumen estadístico, distribución por columna, detalle completo.
 */

import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import PDFDocument from 'pdfkit';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { s3 } from '../config/aws';
import { env } from '../config/env';
import { reportRepository } from '../repositories/reportRepository';
import { taskRepository } from '../repositories/taskRepository';
import { boardService } from './boardService';
import { projectService } from './projectService';
import { userRepository } from '../repositories/userRepository';
import { eventPublisher } from '../events/eventPublisher';
import type { Task, Project } from '../types';
import { Report } from '../types';
import { logger } from '../config/logger';

// ── Dev mode ───────────────────────────────────────────────────────────────────
const LOCAL_DIR = join(tmpdir(), 'taskflow-reports');
const isDevMode = () => env.NODE_ENV === 'development' || !!env.DYNAMODB_ENDPOINT;

async function ensureLocalDir() {
  if (!existsSync(LOCAL_DIR)) await mkdir(LOCAL_DIR, { recursive: true });
}

// ── Tipos de contexto ──────────────────────────────────────────────────────────
interface ReportContext {
  project:        Project;
  tasks:          Task[];
  columnNameMap:  Map<string, string>; // columnId → nombre legible
  memberNameMap:  Map<string, string>; // userId   → nombre
  generatedAt:    string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  CSV MEJORADO
// ─────────────────────────────────────────────────────────────────────────────
async function buildCsvBuffer(ctx: ReportContext): Promise<Buffer> {
  const { project, tasks, columnNameMap, memberNameMap, generatedAt } = ctx;
  const fmt   = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '';
  const fmtD  = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString('es-CO') : '';
  const now   = fmt(generatedAt);
  const q     = (s: string | undefined | null) => `"${(s ?? '').replace(/"/g, '""')}"`;

  const total          = tasks.length;
  const completed      = tasks.filter(t => !!t.completedAt).length;
  const pending        = total - completed;
  const isOD           = (t: Task) => !!(t.dueDate && !t.completedAt && new Date(t.dueDate) < new Date());
  const overdue        = tasks.filter(isOD).length;
  const critical       = tasks.filter(t => t.priority === 'critical').length;
  const high           = tasks.filter(t => t.priority === 'high').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const lines: string[] = ['﻿']; // BOM UTF-8 para Excel

  // ── Metadatos ──────────────────────────────────────────────────────────────
  lines.push('REPORTE DE PROYECTO — TaskFlow Cloud');
  lines.push(`Proyecto;${q(project.name)}`);
  if (project.description) lines.push(`Descripcion;${q(project.description)}`);
  lines.push(`Generado;${q(now)}`);
  lines.push(`Creado;${fmtD(project.createdAt)}`);
  lines.push(`Miembros;${project.members.length}`);
  lines.push('');

  // ── Resumen ─────────────────────────────────────────────────────────────────
  lines.push('RESUMEN ESTADISTICO');
  lines.push('Metrica;Valor');
  lines.push(`Total de tareas;${total}`);
  lines.push(`Completadas;${completed}`);
  lines.push(`Pendientes;${pending}`);
  lines.push(`Vencidas;${overdue}`);
  lines.push(`Criticas;${critical}`);
  lines.push(`Alta prioridad;${high}`);
  lines.push(`Tasa de completado;${completionRate}%`);
  lines.push('');

  // ── Por columna ─────────────────────────────────────────────────────────────
  lines.push('DISTRIBUCION POR COLUMNA');
  lines.push('Columna;Total;Completadas;Pendientes;Vencidas');
  const colGroups = new Map<string, Task[]>();
  tasks.forEach(t => {
    const n = columnNameMap.get(t.columnId) ?? 'Sin columna';
    const arr = colGroups.get(n) ?? [];
    arr.push(t);
    colGroups.set(n, arr);
  });
  colGroups.forEach((ts, col) => {
    lines.push(`${q(col)};${ts.length};${ts.filter(t => !!t.completedAt).length};${ts.filter(t => !t.completedAt).length};${ts.filter(isOD).length}`);
  });
  lines.push('');

  // ── Detalle ─────────────────────────────────────────────────────────────────
  lines.push('DETALLE COMPLETO DE TAREAS');
  lines.push([
    'ID','Titulo','Descripcion','Prioridad','Columna','Estado',
    'Asignado a','Reportado por',
    'Fecha creacion','Fecha limite','Completado',
    'Vencida','Etiquetas','Subtareas totales','Subtareas completadas','Adjuntos',
  ].join(';'));

  tasks.forEach(t => {
    lines.push([
      q(t.taskId),
      q(t.title),
      q(t.description),
      q(t.priority),
      q(columnNameMap.get(t.columnId)),
      q(t.completedAt ? 'Completada' : isOD(t) ? 'Vencida' : 'Pendiente'),
      q(memberNameMap.get(t.assigneeId ?? '')),
      q(memberNameMap.get(t.reporterId ?? '')),
      q(fmt(t.createdAt)),
      q(fmtD(t.dueDate)),
      q(fmt(t.completedAt)),
      q(isOD(t) ? 'Si' : 'No'),
      q((t.labels ?? []).join('; ')),
      String(t.subtasks?.length ?? 0),
      String(t.subtasks?.filter(s => s.completed).length ?? 0),
      String(t.attachments?.length ?? 0),
    ].join(';'));
  });

  return Buffer.from(lines.join('\n'), 'utf-8');
}

// ─────────────────────────────────────────────────────────────────────────────
//  PDF PROFESIONAL — tracking explícito de Y (sin mezcla de modos)
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_W    = 595.28;
const PAGE_H    = 841.89;
const ML        = 45;           // margen izquierdo
const MR        = 45;           // margen derecho
const MT        = 45;           // margen superior en páginas de contenido
const CONTENT_W = PAGE_W - ML - MR;
const FOOTER_H  = 30;
const MAX_Y     = PAGE_H - FOOTER_H - 10;

const C = {
  primary:   '#4F46E5',
  accent:    '#6366F1',
  success:   '#10B981',
  warning:   '#F59E0B',
  danger:    '#EF4444',
  orange:    '#F97316',
  text:      '#111827',
  muted:     '#6B7280',
  light:     '#9CA3AF',
  border:    '#E5E7EB',
  rowEven:   '#F9FAFB',
  rowOdd:    '#FFFFFF',
  white:     '#FFFFFF',
};

function pLabel(p: string) {
  return ({ critical:'Critica', high:'Alta', medium:'Media', low:'Baja' })[p] ?? p;
}
function pColor(p: string) {
  return ({ critical: C.danger, high: C.orange, medium: C.warning, low: C.success })[p] ?? C.muted;
}
function fmtDate(d: string | null | undefined, time = false) {
  if (!d) return '—';
  const dt = new Date(d);
  if (time) return dt.toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  return dt.toLocaleDateString('es-CO');
}

async function buildPdfBuffer(ctx: ReportContext): Promise<Buffer> {
  const { project, tasks, columnNameMap, memberNameMap, generatedAt } = ctx;
  const now = fmtDate(generatedAt, true);

  // ── Estadísticas ────────────────────────────────────────────────────────────
  const total     = tasks.length;
  const completed = tasks.filter(t => !!t.completedAt).length;
  const pending   = total - completed;
  const isODFn    = (t: Task) => !!(t.dueDate && !t.completedAt && new Date(t.dueDate) < new Date());
  const odList    = tasks.filter(isODFn);
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const byCol = new Map<string, Task[]>();
  tasks.forEach(t => {
    const n = columnNameMap.get(t.columnId) ?? 'Sin columna';
    const arr = byCol.get(n) ?? [];
    arr.push(t);
    byCol.set(n, arr);
  });

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4', autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end',  ()         => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let y    = 0;
    let page = 1;

    // ── Helpers ─────────────────────────────────────────────────────────────
    const footer = () => {
      const fy = PAGE_H - 22;
      doc.moveTo(ML, fy - 4).lineTo(PAGE_W - MR, fy - 4)
        .strokeColor(C.border).lineWidth(0.5).stroke();
      doc.font('Helvetica').fontSize(8).fillColor(C.light)
        .text(`TaskFlow Cloud  ·  ${project.name}`, ML, fy, { width: CONTENT_W / 2, lineBreak: false });
      doc.font('Helvetica').fontSize(8).fillColor(C.light)
        .text(`Página ${page}`, ML, fy, { width: CONTENT_W, align: 'right', lineBreak: false });
    };

    const newPage = () => {
      footer();
      doc.addPage();
      page++;
      y = MT;
    };

    const check = (need: number) => {
      if (y + need > MAX_Y) newPage();
    };

    // ── Texto helper ─────────────────────────────────────────────────────────
    const txt = (
      text: string, x: number, ty: number,
      opts: { font?: string; size?: number; color?: string; width?: number; align?: string } = {}
    ): number => {
      doc
        .font(opts.font ?? 'Helvetica')
        .fontSize(opts.size ?? 10)
        .fillColor(opts.color ?? C.text)
        .text(text, x, ty, {
          width:       opts.width ?? CONTENT_W,
          align:       (opts.align as 'left' | 'center' | 'right' | 'justify' | undefined),
          lineBreak:   false,
          ellipsis:    true,
        });
      return ty + (opts.size ?? 10) + 3;
    };

    // ── Sección header ───────────────────────────────────────────────────────
    const section = (title: string): number => {
      check(28);
      doc.rect(ML, y, CONTENT_W, 20).fillColor(C.primary).fill();
      txt(title.toUpperCase(), ML + 8, y + 5,
        { font: 'Helvetica-Bold', size: 9, color: C.white });
      y += 26;
      return y;
    };

    // ── Fila de tabla ────────────────────────────────────────────────────────
    const ROW_H = 16;
    const tableRow = (
      cols: { text: string; w: number; align?: string }[],
      isHeader: boolean,
      isEven:   boolean
    ): void => {
      check(ROW_H + 2);
      const totalW = cols.reduce((s, c) => s + c.w, 0);
      const bg = isHeader ? C.primary : (isEven ? C.rowEven : C.rowOdd);
      doc.rect(ML, y, totalW, ROW_H).fillColor(bg).fill();

      let x = ML;
      cols.forEach(col => {
        doc
          .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isHeader ? 8 : 8)
          .fillColor(isHeader ? C.white : C.text)
          .text(col.text ?? '', x + 4, y + 4, {
            width: col.w - 8,
            lineBreak: false,
            ellipsis: true,
            align: (col.align as 'left' | 'center' | 'right' | 'justify' | undefined) ?? 'left',
          });
        x += col.w;
      });

      doc.moveTo(ML, y + ROW_H).lineTo(ML + totalW, y + ROW_H)
        .strokeColor(C.border).lineWidth(0.3).stroke();
      y += ROW_H;
    };

    // ── Barra de progreso ────────────────────────────────────────────────────
    const progressBar = (px: number, py: number, w: number, h: number, pct: number, color: string) => {
      doc.rect(px, py, w, h).fillColor('#E5E7EB').fill();
      const filled = Math.max(0, Math.min(1, pct / 100)) * w;
      if (filled > 0) doc.rect(px, py, filled, h).fillColor(color).fill();
    };

    // ════════════════════════════════════════════════════════════════════════
    // PÁGINA 1: PORTADA
    // ════════════════════════════════════════════════════════════════════════

    // Franja superior
    doc.rect(0, 0, PAGE_W, 6).fillColor(C.accent).fill();

    // Bloque de color central
    doc.rect(0, 80, PAGE_W, 200).fillColor(C.primary).fill();

    // Nombre de la app
    txt('TASKFLOW CLOUD', ML, 52,
      { font: 'Helvetica-Bold', size: 10, color: C.muted, width: CONTENT_W, align: 'center' });

    // Nombre del proyecto
    doc.font('Helvetica-Bold').fontSize(28).fillColor(C.white)
      .text(project.name, ML, 112, { width: CONTENT_W, align: 'center', lineBreak: false });

    // Descripcion
    if (project.description) {
      doc.font('Helvetica').fontSize(10).fillColor('#A5B4FC')
        .text(project.description, ML, 155, { width: CONTENT_W, align: 'center', lineBreak: true, height: 30 });
    }

    txt('REPORTE EJECUTIVO DE PROYECTO', ML, 195,
      { font: 'Helvetica', size: 10, color: '#C7D2FE', width: CONTENT_W, align: 'center' });

    txt(`Generado el ${now}`, ML, 218,
      { font: 'Helvetica', size: 9, color: '#E0E7FF', width: CONTENT_W, align: 'center' });

    // ── Cuatro stat boxes ───────────────────────────────────────────────────
    const statY  = 310;
    const statH  = 58;
    const statW  = (CONTENT_W - 15) / 4;
    const stats  = [
      { label: 'Total tareas',  value: String(total),     color: C.accent   },
      { label: 'Completadas',    value: String(completed), color: C.success  },
      { label: 'Pendientes',     value: String(pending),   color: C.warning  },
      { label: 'Vencidas',       value: String(odList.length), color: odList.length > 0 ? C.danger : C.success },
    ];
    stats.forEach((s, i) => {
      const bx = ML + i * (statW + 5);
      doc.rect(bx, statY, statW, statH).fillColor(C.white).fill();
      doc.rect(bx, statY, 4, statH).fillColor(s.color).fill();
      doc.font('Helvetica-Bold').fontSize(22).fillColor(s.color)
        .text(s.value, bx + 10, statY + 10, { width: statW - 14, lineBreak: false });
      doc.font('Helvetica').fontSize(8).fillColor(C.muted)
        .text(s.label, bx + 10, statY + 38, { width: statW - 14, lineBreak: false });
    });

    // ── Barra de completado ─────────────────────────────────────────────────
    const barY = statY + statH + 16;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text)
      .text(`Tasa de completado: ${completionRate}%`, ML, barY, { lineBreak: false });
    progressBar(ML, barY + 14, CONTENT_W, 10, completionRate,
      completionRate >= 80 ? C.success : completionRate >= 40 ? C.warning : C.danger);
    doc.font('Helvetica').fontSize(8).fillColor(C.muted)
      .text(`${completed} de ${total} tareas completadas`, ML, barY + 28, { lineBreak: false });

    // ── Distribución por prioridad ──────────────────────────────────────────
    const prioY = barY + 50;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text)
      .text('Distribución por prioridad', ML, prioY, { lineBreak: false });

    const prios = [
      { l: 'Crítica', n: tasks.filter(t => t.priority==='critical').length, c: C.danger   },
      { l: 'Alta',    n: tasks.filter(t => t.priority==='high').length,     c: C.orange   },
      { l: 'Media',   n: tasks.filter(t => t.priority==='medium').length,   c: C.warning  },
      { l: 'Baja',    n: tasks.filter(t => t.priority==='low').length,      c: C.success  },
    ];
    const prioW2 = (CONTENT_W - 15) / 4;
    prios.forEach((p, i) => {
      const px = ML + i * (prioW2 + 5);
      progressBar(px, prioY + 14, prioW2, 8, total > 0 ? (p.n / total) * 100 : 0, p.c);
      doc.font('Helvetica').fontSize(8).fillColor(C.muted)
        .text(`${p.l}: ${p.n}`, px, prioY + 26, { width: prioW2, lineBreak: false });
    });

    // Franja inferior portada
    doc.rect(0, PAGE_H - 6, PAGE_W, 6).fillColor(C.accent).fill();
    doc.font('Helvetica').fontSize(8).fillColor(C.light)
      .text(
        `Creado: ${fmtDate(project.createdAt)}  ·  ${project.members.length} miembro${project.members.length!==1?'s':''}  ·  ${project.members.map(m => memberNameMap.get(m.userId) ?? '?').join(', ')}`,
        ML, PAGE_H - 22, { width: CONTENT_W, align: 'center', lineBreak: false }
      );

    // ════════════════════════════════════════════════════════════════════════
    // PÁGINA 2+: CONTENIDO
    // ════════════════════════════════════════════════════════════════════════
    doc.addPage();
    page++;
    y = MT;

    // ── SECCIÓN: EQUIPO ──────────────────────────────────────────────────────
    section('Equipo del proyecto');
    tableRow([
      { text: 'Nombre',       w: 175 },
      { text: 'Rol',          w: 80  },
      { text: 'Asignadas',    w: 80  },
      { text: 'Completadas',  w: 90  },
      { text: 'Pendientes',   w: 80  },
    ], true, false);

    project.members.forEach((m, i) => {
      const name  = memberNameMap.get(m.userId) ?? '?';
      const asgn  = tasks.filter(t => t.assigneeId === m.userId).length;
      const comp  = tasks.filter(t => t.assigneeId === m.userId && !!t.completedAt).length;
      tableRow([
        { text: name,         w: 175 },
        { text: m.role,       w: 80  },
        { text: String(asgn), w: 80  },
        { text: String(comp), w: 90  },
        { text: String(asgn - comp), w: 80 },
      ], false, i % 2 === 0);
    });

    y += 14;

    // ── SECCIÓN: DISTRIBUCIÓN POR COLUMNA ───────────────────────────────────
    section('Distribución de tareas por columna');
    tableRow([
      { text: 'Columna',       w: 155 },
      { text: 'Total',         w: 70  },
      { text: 'Completadas',   w: 90  },
      { text: 'Pendientes',    w: 90  },
      { text: 'Vencidas',      w: 70  },
      { text: 'Progreso',      w: 30  },
    ], true, false);

    let ci = 0;
    byCol.forEach((ts, colName) => {
      const comp = ts.filter(t => !!t.completedAt).length;
      const od   = ts.filter(isODFn).length;
      const rate = ts.length > 0 ? Math.round((comp / ts.length) * 100) : 0;
      tableRow([
        { text: colName,      w: 155 },
        { text: String(ts.length), w: 70 },
        { text: String(comp), w: 90 },
        { text: String(ts.length - comp), w: 90 },
        { text: String(od),   w: 70 },
        { text: `${rate}%`,   w: 30 },
      ], false, ci % 2 === 0);
      ci++;
    });

    y += 14;

    // ── SECCIÓN: DETALLE COMPLETO ────────────────────────────────────────────
    section(`Detalle completo de tareas (${total})`);

    const TCOLS = [
      { text: '#',          w: 24  },
      { text: 'Título',     w: 145 },
      { text: 'Prioridad',  w: 58  },
      { text: 'Columna',    w: 88  },
      { text: 'Asignado',   w: 88  },
      { text: 'Vence',      w: 60  },
      { text: 'Estado',     w: 42  },
    ];
    tableRow(TCOLS, true, false);

    tasks.forEach((task, i) => {
      const isOD  = isODFn(task);
      const state = task.completedAt ? 'OK' : isOD ? 'VENCIDA' : 'Pendiente';
      const stateColor = task.completedAt ? C.success : isOD ? C.danger : C.muted;

      // Fondo rojo claro para vencidas
      if (isOD && !task.completedAt) {
        check(ROW_H);
        doc.rect(ML, y, TCOLS.reduce((s, c) => s + c.w, 0), ROW_H)
          .fillColor('#FEF2F2').fill();
      }

      tableRow([
        { text: String(i + 1),                     w: 24  },
        { text: task.title,                         w: 145 },
        { text: pLabel(task.priority),              w: 58  },
        { text: columnNameMap.get(task.columnId) ?? '?', w: 88 },
        { text: memberNameMap.get(task.assigneeId ?? '') ?? '—', w: 88 },
        { text: fmtDate(task.dueDate),              w: 60  },
        { text: state,                              w: 42  },
      ], false, i % 2 === 0);

      // Fila extra si tiene etiquetas / subtareas / descripción
      const extras: string[] = [];
      if (task.labels?.length)   extras.push(`Etiquetas: ${task.labels.join(', ')}`);
      if (task.subtasks?.length) {
        const done = task.subtasks.filter(s => s.completed).length;
        extras.push(`Subtareas: ${done}/${task.subtasks.length}`);
      }
      if (task.description)      extras.push(task.description.slice(0, 80) + (task.description.length > 80 ? '…' : ''));

      if (extras.length > 0) {
        check(12);
        doc.font('Helvetica').fontSize(7).fillColor(C.muted)
          .text('  → ' + extras.join('  ·  '), ML + 24, y, {
            width: CONTENT_W - 24, lineBreak: false, ellipsis: true,
          });
        y += 12;
      }
    });

    // ── SECCIÓN: TAREAS VENCIDAS (si hay) ───────────────────────────────────
    if (odList.length > 0) {
      y += 14;
      section(`Tareas vencidas (${odList.length})`);

      check(18);
      doc.rect(ML, y, CONTENT_W, 16).fillColor('#FEE2E2').fill();
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.danger)
        .text('ATENCIÓN: estas tareas superaron su fecha límite sin completarse.',
          ML + 6, y + 4, { width: CONTENT_W - 12, lineBreak: false });
      y += 20;

      tableRow([
        { text: '#',              w: 24  },
        { text: 'Título',         w: 160 },
        { text: 'Prioridad',      w: 68  },
        { text: 'Asignado',       w: 100 },
        { text: 'Venció el',      w: 80  },
        { text: 'Días de retraso', w: 73  },
      ], true, false);

      odList.forEach((task, i) => {
        const days = Math.floor((Date.now() - new Date(task.dueDate!).getTime()) / 86_400_000);
        check(ROW_H);
        doc.rect(ML, y, 505, ROW_H).fillColor(i % 2 === 0 ? '#FEF2F2' : '#FEE2E2').fill();
        tableRow([
          { text: String(i + 1),  w: 24  },
          { text: task.title,     w: 160 },
          { text: pLabel(task.priority), w: 68 },
          { text: memberNameMap.get(task.assigneeId ?? '') ?? '—', w: 100 },
          { text: fmtDate(task.dueDate), w: 80  },
          { text: `${days} día${days !== 1 ? 's' : ''}`, w: 73  },
        ], false, false);
      });
    }

    // Pie de la última página
    footer();
    doc.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  CONTEXTO COMPARTIDO
// ─────────────────────────────────────────────────────────────────────────────
async function buildContext(projectId: string, requesterId: string): Promise<ReportContext> {
  const project = await projectService.assertMember(projectId, requesterId);
  const [tasks, boards] = await Promise.all([
    taskRepository.findByProject(projectId),
    boardService.findByProject(projectId),
  ]);

  const columnNameMap = new Map<string, string>();
  boards.forEach(b => b.columns.forEach(c => columnNameMap.set(c.columnId, c.name)));

  const memberNameMap = new Map<string, string>();
  await Promise.all(project.members.map(async m => {
    const user = await userRepository.findById(m.userId);
    if (user) memberNameMap.set(m.userId, user.name);
  }));

  return { project, tasks, columnNameMap, memberNameMap, generatedAt: new Date().toISOString() };
}

// ─────────────────────────────────────────────────────────────────────────────
//  SERVICE
// ─────────────────────────────────────────────────────────────────────────────
export const reportService = {
  async generate(projectId: string, type: 'pdf' | 'csv', requesterId: string): Promise<Report> {
    const ctx         = await buildContext(projectId, requesterId);
    const reportId    = uuidv4();
    const ext         = type === 'pdf' ? 'pdf' : 'csv';
    const s3Key       = `reports/${projectId}/${reportId}.${ext}`;
    const contentType = type === 'pdf' ? 'application/pdf' : 'text/csv; charset=utf-8';

    const buffer = type === 'pdf'
      ? await buildPdfBuffer(ctx)
      : await buildCsvBuffer(ctx);

    if (isDevMode()) {
      await ensureLocalDir();
      await writeFile(join(LOCAL_DIR, `${reportId}.${ext}`), buffer);
      logger.info({ message: 'Reporte guardado localmente (dev)', reportId, bytes: buffer.length });
    } else {
      await s3.send(new PutObjectCommand({
        Bucket: env.S3_BUCKET_REPORTS,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
      }));
      logger.info({ message: 'Reporte subido a S3', reportId, s3Key });
    }

    const report: Report = { reportId, projectId, type, s3Key, generatedBy: requesterId, createdAt: ctx.generatedAt };
    const createdReport = await reportRepository.create(report);

    const recipientUserIds = ctx.project.members.map(member => member.userId);

    await eventPublisher.publish({
      type: 'REPORT_GENERATED',
      payload: {
        reportId,
        projectId,
        projectName: ctx.project.name,
        reportType: type,
        generatedBy: requesterId,
        recipientUserIds,
      },
      timestamp: ctx.generatedAt,
    });

    return createdReport;
  },

  async getDownloadUrl(reportId: string, requesterId: string): Promise<string> {
    const report = await reportRepository.findById(reportId);
    if (!report) throw Object.assign(new Error('Reporte no encontrado'), { statusCode: 404 });
    await projectService.assertMember(report.projectId, requesterId);
    if (isDevMode()) return `/reports/${reportId}/file`;
    const command = new GetObjectCommand({ Bucket: env.S3_BUCKET_REPORTS, Key: report.s3Key });
    return getSignedUrl(s3, command, { expiresIn: 900 });
  },

  async streamLocalFile(reportId: string, requesterId: string): Promise<{ buffer: Buffer; type: 'pdf' | 'csv'; projectName: string }> {
    const report = await reportRepository.findById(reportId);
    if (!report) throw Object.assign(new Error('Reporte no encontrado'), { statusCode: 404 });
    await projectService.assertMember(report.projectId, requesterId);
    const project = await projectService.findById(report.projectId);
    const ext  = report.type === 'pdf' ? 'pdf' : 'csv';
    const path = join(LOCAL_DIR, `${reportId}.${ext}`);
    const { readFile } = await import('fs/promises');
    return { buffer: await readFile(path), type: report.type, projectName: project.name };
  },

  async deleteReport(reportId: string, requesterId: string): Promise<void> {
    const report = await reportRepository.findById(reportId);
    if (!report) throw Object.assign(new Error('Reporte no encontrado'), { statusCode: 404 });

    // Solo admins o el generador pueden eliminar
    const project = await projectService.assertMember(report.projectId, requesterId);
    const member  = project.members.find(m => m.userId === requesterId);
    const isAdmin = member?.role === 'admin' || project.ownerId === requesterId;
    const isOwner = report.generatedBy === requesterId;
    if (!isAdmin && !isOwner) {
      throw Object.assign(new Error('Solo el generador o un admin puede eliminar este reporte'), { statusCode: 403 });
    }

    // Eliminar archivo local en dev
    if (isDevMode()) {
      const ext  = report.type === 'pdf' ? 'pdf' : 'csv';
      const path = join(LOCAL_DIR, `${reportId}.${ext}`);
      try { await unlink(path); } catch { /* ya no existe */ }
    } else {
      // En prod: eliminar de S3
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      try { await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET_REPORTS, Key: report.s3Key })); } catch { /* ignorar */ }
    }

    await reportRepository.delete(reportId);
  },

  async listByProject(projectId: string, requesterId: string): Promise<Report[]> {
    await projectService.assertMember(projectId, requesterId);
    return reportRepository.findByProject(projectId);
  },
};
