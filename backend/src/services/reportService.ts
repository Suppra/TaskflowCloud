/**
 * reportService — Generación de reportes PDF y CSV para proyectos TaskFlow Cloud
 *
 * PDF: portada, resumen ejecutivo con barras de progreso, equipo, desglose por
 *      columna, tabla completa de tareas, sección de vencidas, pie de página.
 * CSV: cabecera con metadatos, resumen estadístico, detalle completo de tareas.
 */

import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import PDFDocument from 'pdfkit';
import { writeFile, mkdir } from 'fs/promises';
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
import type { Task, Project } from '../types';
import { Report } from '../types';
import { logger } from '../config/logger';

// ── Dev mode ───────────────────────────────────────────────────────────────────
const LOCAL_DIR = join(tmpdir(), 'taskflow-reports');
const isDevMode = () => env.NODE_ENV === 'development' || !!env.DYNAMODB_ENDPOINT;
async function ensureLocalDir() {
  if (!existsSync(LOCAL_DIR)) await mkdir(LOCAL_DIR, { recursive: true });
}

// ── Tipos de contexto compartidos ─────────────────────────────────────────────
interface ReportContext {
  project: Project;
  tasks: Task[];
  columnNameMap: Map<string, string>; // columnId → nombre legible
  memberNameMap: Map<string, string>; // userId → nombre
  generatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  CSV MEJORADO
// ─────────────────────────────────────────────────────────────────────────────
async function buildCsvBuffer(ctx: ReportContext): Promise<Buffer> {
  const { project, tasks, columnNameMap, memberNameMap, generatedAt } = ctx;
  const now = new Date(generatedAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' });

  const total     = tasks.length;
  const completed = tasks.filter(t => !!t.completedAt).length;
  const pending   = tasks.filter(t => !t.completedAt).length;
  const overdue   = tasks.filter(t => t.dueDate && !t.completedAt && new Date(t.dueDate) < new Date()).length;
  const critical  = tasks.filter(t => t.priority === 'critical').length;
  const high      = tasks.filter(t => t.priority === 'high').length;
  const withDue   = tasks.filter(t => t.dueDate).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Líneas del CSV con utf-8 BOM para que Excel lo abra bien
  const lines: string[] = ['﻿'];

  const q = (s: string | undefined | null) =>
    `"${(s ?? '').replace(/"/g, '""')}"`;
  const sep = ';;;;;;;;;;;';

  // ── Sección 1: Metadatos del reporte ────────────────────────────────────────
  lines.push(`REPORTE DE PROYECTO — TaskFlow Cloud`);
  lines.push(`Proyecto;${q(project.name)}`);
  lines.push(`Descripcion;${q(project.description)}`);
  lines.push(`Generado;${now}`);
  lines.push(`Periodo;${new Date(project.createdAt).toLocaleDateString('es-CO')} — ${new Date(generatedAt).toLocaleDateString('es-CO')}`);
  lines.push('');

  // ── Sección 2: Resumen estadístico ──────────────────────────────────────────
  lines.push(`RESUMEN ESTADISTICO`);
  lines.push(`Metrica;Valor`);
  lines.push(`Total de tareas;${total}`);
  lines.push(`Tareas completadas;${completed}`);
  lines.push(`Tareas pendientes;${pending}`);
  lines.push(`Tareas vencidas;${overdue}`);
  lines.push(`Tareas criticas;${critical}`);
  lines.push(`Tareas de alta prioridad;${high}`);
  lines.push(`Tareas con fecha limite;${withDue}`);
  lines.push(`Tasa de completado;${completionRate}%`);
  lines.push(`Miembros en el proyecto;${project.members.length}`);
  lines.push('');

  // ── Sección 3: Resumen por columna ──────────────────────────────────────────
  lines.push(`DISTRIBUCION POR COLUMNA`);
  lines.push(`Columna;Total;Completadas;Pendientes`);
  const colGroups = new Map<string, Task[]>();
  tasks.forEach(t => {
    const name = columnNameMap.get(t.columnId) ?? t.columnId.slice(0, 8);
    const arr = colGroups.get(name) ?? [];
    arr.push(t);
    colGroups.set(name, arr);
  });
  colGroups.forEach((ts, colName) => {
    const comp = ts.filter(t => !!t.completedAt).length;
    lines.push(`${q(colName)};${ts.length};${comp};${ts.length - comp}`);
  });
  lines.push('');

  // ── Sección 4: Detalle completo de tareas ────────────────────────────────────
  lines.push(`DETALLE COMPLETO DE TAREAS`);
  lines.push([
    'ID',
    'Titulo',
    'Descripcion',
    'Prioridad',
    'Columna',
    'Estado',
    'Asignado a',
    'Reportado por',
    'Fecha creacion',
    'Fecha limite',
    'Fecha completado',
    'Vencida',
    'Etiquetas',
    'Subtareas totales',
    'Subtareas completadas',
    'Adjuntos',
  ].join(';'));

  const isOverdue = (t: Task) =>
    !!(t.dueDate && !t.completedAt && new Date(t.dueDate) < new Date());

  tasks.forEach(t => {
    const subtasksTotal = t.subtasks?.length ?? 0;
    const subtasksDone  = t.subtasks?.filter(s => s.completed).length ?? 0;
    lines.push([
      q(t.taskId),
      q(t.title),
      q(t.description),
      q(t.priority),
      q(columnNameMap.get(t.columnId)),
      q(t.completedAt ? 'Completada' : isOverdue(t) ? 'Vencida' : 'Pendiente'),
      q(memberNameMap.get(t.assigneeId ?? '')),
      q(memberNameMap.get(t.reporterId ?? '')),
      q(t.createdAt ? new Date(t.createdAt).toLocaleDateString('es-CO') : ''),
      q(t.dueDate ? new Date(t.dueDate).toLocaleDateString('es-CO') : ''),
      q(t.completedAt ? new Date(t.completedAt).toLocaleDateString('es-CO') : ''),
      q(isOverdue(t) ? 'Si' : 'No'),
      q((t.labels ?? []).join('; ')),
      String(subtasksTotal),
      String(subtasksDone),
      String(t.attachments?.length ?? 0),
    ].join(';'));
  });

  return Buffer.from(lines.join('\n'), 'utf-8');
}

// ─────────────────────────────────────────────────────────────────────────────
//  PDF PROFESIONAL
// ─────────────────────────────────────────────────────────────────────────────

const PDF_COLORS = {
  primary:    '#4F46E5', // indigo
  accent:     '#6366F1',
  success:    '#10B981',
  warning:    '#F59E0B',
  danger:     '#EF4444',
  orange:     '#F97316',
  text:       '#0F172A',
  textMuted:  '#64748B',
  textLight:  '#94A3B8',
  bg:         '#F8FAFC',
  border:     '#E2E8F0',
  white:      '#FFFFFF',
  rowEven:    '#F1F5F9',
  rowOdd:     '#FFFFFF',
};

const PAGE_W  = 595.28;
const PAGE_H  = 841.89;
const MARGIN  = 45;
const CONTENT_W = PAGE_W - MARGIN * 2;

function priorityColor(p: string): string {
  return ({ critical: PDF_COLORS.danger, high: PDF_COLORS.orange, medium: PDF_COLORS.warning, low: PDF_COLORS.success })[p] ?? PDF_COLORS.textMuted;
}
function priorityLabel(p: string): string {
  return ({ critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja' })[p] ?? p;
}

/* Dibuja una barra de progreso */
function drawProgressBar(
  doc: PDFKit.PDFDocument,
  x: number, y: number, w: number, h: number,
  percent: number, color: string
) {
  // Fondo gris
  doc.rect(x, y, w, h).fillColor(PDF_COLORS.border).fill();
  // Relleno coloreado
  const filled = Math.max(0, Math.min(1, percent / 100)) * w;
  if (filled > 0) doc.rect(x, y, filled, h).fillColor(color).fill();
}

/* Dibuja una tarjeta de estadística */
function drawStatCard(
  doc: PDFKit.PDFDocument,
  x: number, y: number, w: number, h: number,
  label: string, value: string, color: string
) {
  // Sombra sutil
  doc.rect(x + 2, y + 2, w, h).fillColor('#E2E8F0').fill();
  // Card body
  doc.rect(x, y, w, h).fillColor(PDF_COLORS.white).fill();
  // Borde izquierdo de color
  doc.rect(x, y, 4, h).fillColor(color).fill();
  // Valor
  doc.font('Helvetica-Bold').fontSize(20).fillColor(color)
    .text(value, x + 12, y + 12, { width: w - 16, align: 'left' });
  // Label
  doc.font('Helvetica').fontSize(8).fillColor(PDF_COLORS.textMuted)
    .text(label, x + 12, y + 36, { width: w - 16 });
}

/* Pie de página */
function addFooter(doc: PDFKit.PDFDocument, projectName: string, pageNum: number, totalPages: number) {
  const y = PAGE_H - 30;
  doc.moveTo(MARGIN, y - 5).lineTo(PAGE_W - MARGIN, y - 5).strokeColor(PDF_COLORS.border).lineWidth(0.5).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(PDF_COLORS.textLight)
    .text(`TaskFlow Cloud · ${projectName}`, MARGIN, y, { width: CONTENT_W / 2 })
    .text(`Página ${pageNum} / ${totalPages}`, MARGIN, y, { width: CONTENT_W, align: 'right' });
}

/* Sección header coloreada */
function drawSectionHeader(doc: PDFKit.PDFDocument, title: string): number {
  if (doc.y > PAGE_H - 120) doc.addPage();
  const y = doc.y;
  doc.rect(MARGIN, y, CONTENT_W, 22).fillColor(PDF_COLORS.primary).fill();
  doc.font('Helvetica-Bold').fontSize(10).fillColor(PDF_COLORS.white)
    .text(title.toUpperCase(), MARGIN + 10, y + 6);
  doc.y = y + 28;
  return y + 28;
}

/* Fila de tabla */
function drawTableRow(
  doc: PDFKit.PDFDocument,
  cells: { text: string; width: number; align?: string }[],
  y: number, rowH: number, isHeader: boolean, isEven: boolean
): number {
  const bg = isHeader ? PDF_COLORS.primary : (isEven ? PDF_COLORS.rowEven : PDF_COLORS.white);
  const textColor = isHeader ? PDF_COLORS.white : PDF_COLORS.text;
  let totalW = cells.reduce((s, c) => s + c.width, 0);

  doc.rect(MARGIN, y, totalW, rowH).fillColor(bg).fill();

  let x = MARGIN;
  cells.forEach(cell => {
    doc
      .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(isHeader ? 8 : 8)
      .fillColor(textColor)
      .text(cell.text, x + 4, y + (rowH - 8) / 2, {
        width: cell.width - 8,
        ellipsis: true,
        lineBreak: false,
      });
    x += cell.width;
  });

  // Línea inferior
  doc.moveTo(MARGIN, y + rowH).lineTo(MARGIN + totalW, y + rowH)
    .strokeColor(PDF_COLORS.border).lineWidth(0.3).stroke();

  return y + rowH;
}

async function buildPdfBuffer(ctx: ReportContext): Promise<Buffer> {
  const { project, tasks, columnNameMap, memberNameMap, generatedAt } = ctx;
  const now = new Date(generatedAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' });

  // ── Estadísticas ────────────────────────────────────────────────────────────
  const total     = tasks.length;
  const completed = tasks.filter(t => !!t.completedAt).length;
  const pending   = tasks.filter(t => !t.completedAt).length;
  const overdueList = tasks.filter(t => t.dueDate && !t.completedAt && new Date(t.dueDate) < new Date());
  const overdue   = overdueList.length;
  const critical  = tasks.filter(t => t.priority === 'critical').length;
  const high      = tasks.filter(t => t.priority === 'high').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const tasksByCol = new Map<string, Task[]>();
  tasks.forEach(t => {
    const name = columnNameMap.get(t.columnId) ?? 'Sin columna';
    const arr = tasksByCol.get(name) ?? [];
    arr.push(t);
    tasksByCol.set(name, arr);
  });

  // ── Conteo de páginas aproximado ────────────────────────────────────────────
  // (usamos un número fijo; pdfkit no da total de páginas fácilmente)
  const TOTAL_PAGES = 1 + Math.ceil(tasks.length / 25) + (overdueList.length > 0 ? 1 : 0);

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let currentPage = 1;

    // ══════════════════════════════════════════════════════════════════════════
    // PORTADA
    // ══════════════════════════════════════════════════════════════════════════

    // Banner superior
    doc.rect(0, 0, PAGE_W, 8).fillColor(PDF_COLORS.accent).fill();

    // Bloque de color central
    doc.rect(0, 90, PAGE_W, 240).fillColor(PDF_COLORS.primary).fill();

    // Nombre de la app
    doc.font('Helvetica-Bold').fontSize(11).fillColor(PDF_COLORS.textLight)
      .text('TASKFLOW CLOUD', MARGIN, 60, { align: 'center', width: CONTENT_W, characterSpacing: 3 });

    // Nombre del proyecto
    doc.font('Helvetica-Bold').fontSize(28).fillColor(PDF_COLORS.white)
      .text(project.name, MARGIN, 120, { align: 'center', width: CONTENT_W });

    // Descripcion
    if (project.description) {
      doc.font('Helvetica').fontSize(11).fillColor('#A5B4FC')
        .text(project.description, MARGIN, 175, { align: 'center', width: CONTENT_W });
    }

    // Tipo de reporte
    doc.font('Helvetica').fontSize(13).fillColor('#C7D2FE')
      .text('REPORTE EJECUTIVO DE PROYECTO', MARGIN, 215, { align: 'center', width: CONTENT_W, characterSpacing: 2 });

    // Fecha
    doc.font('Helvetica').fontSize(10).fillColor('#E0E7FF')
      .text(`Generado el ${now}`, MARGIN, 248, { align: 'center', width: CONTENT_W });

    // ── Tarjetas de estadísticas en la portada ────────────────────────────────
    const cardW  = (CONTENT_W - 15) / 4;
    const cardH  = 60;
    const cardY  = 370;

    const statCards = [
      { label: 'Total de tareas',   value: String(total),    color: PDF_COLORS.accent },
      { label: 'Completadas',        value: String(completed), color: PDF_COLORS.success },
      { label: 'Pendientes',         value: String(pending),   color: PDF_COLORS.warning },
      { label: 'Vencidas',           value: String(overdue),   color: overdue > 0 ? PDF_COLORS.danger : PDF_COLORS.success },
    ];
    statCards.forEach((card, i) => {
      drawStatCard(doc, MARGIN + i * (cardW + 5), cardY, cardW, cardH, card.label, card.value, card.color);
    });

    // ── Barra de tasa de completado ─────────────────────────────────────────
    const barY = cardY + cardH + 20;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(PDF_COLORS.text)
      .text(`Tasa de completado: ${completionRate}%`, MARGIN, barY);
    drawProgressBar(doc, MARGIN, barY + 16, CONTENT_W, 12, completionRate,
      completionRate >= 80 ? PDF_COLORS.success : completionRate >= 40 ? PDF_COLORS.warning : PDF_COLORS.danger);
    doc.font('Helvetica').fontSize(8).fillColor(PDF_COLORS.textMuted)
      .text(`${completed} de ${total} tareas completadas`, MARGIN, barY + 34);

    // ── Distribución por prioridad ──────────────────────────────────────────
    const prioY = barY + 60;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(PDF_COLORS.text).text('Distribución por prioridad', MARGIN, prioY);

    const prios = [
      { label: 'Crítica', count: critical, color: PDF_COLORS.danger },
      { label: 'Alta',    count: high,     color: PDF_COLORS.orange },
      { label: 'Media',   count: tasks.filter(t => t.priority === 'medium').length, color: PDF_COLORS.warning },
      { label: 'Baja',    count: tasks.filter(t => t.priority === 'low').length,    color: PDF_COLORS.success },
    ];
    const prioW = (CONTENT_W - 15) / 4;
    prios.forEach((p, i) => {
      const px = MARGIN + i * (prioW + 5);
      const py = prioY + 16;
      doc.rect(px, py, prioW, 8).fillColor(PDF_COLORS.border).fill();
      if (total > 0) {
        const filled = (p.count / total) * prioW;
        if (filled > 0) doc.rect(px, py, filled, 8).fillColor(p.color).fill();
      }
      doc.font('Helvetica').fontSize(8).fillColor(PDF_COLORS.textMuted)
        .text(`${p.label}: ${p.count}`, px, py + 12, { width: prioW });
    });

    // Banner inferior de portada
    doc.rect(0, PAGE_H - 8, PAGE_W, 8).fillColor(PDF_COLORS.accent).fill();
    doc.font('Helvetica').fontSize(8).fillColor(PDF_COLORS.textLight)
      .text(`Proyecto creado el ${new Date(project.createdAt).toLocaleDateString('es-CO')} · ${project.members.length} miembro${project.members.length !== 1 ? 's' : ''}`, MARGIN, PAGE_H - 22, { align: 'center', width: CONTENT_W });

    // ══════════════════════════════════════════════════════════════════════════
    // PÁGINA 2+: CONTENIDO
    // ══════════════════════════════════════════════════════════════════════════
    doc.addPage();
    currentPage++;

    // ── Sección 1: EQUIPO ────────────────────────────────────────────────────
    drawSectionHeader(doc, 'Equipo del proyecto');

    const teamCols = [
      { text: 'Nombre',     width: 180 },
      { text: 'Rol',        width: 80 },
      { text: 'Asignadas',  width: 80 },
      { text: 'Completadas',width: 85 },
      { text: 'Pendientes', width: 90 },
    ];
    let rowY = doc.y;
    rowY = drawTableRow(doc, teamCols, rowY, 18, true, false);

    project.members.forEach((m, i) => {
      const name      = memberNameMap.get(m.userId) ?? m.userId.slice(0, 12) + '…';
      const assigned  = tasks.filter(t => t.assigneeId === m.userId).length;
      const compMem   = tasks.filter(t => t.assigneeId === m.userId && !!t.completedAt).length;
      const pendMem   = assigned - compMem;
      rowY = drawTableRow(doc, [
        { text: name,            width: 180 },
        { text: m.role,          width: 80 },
        { text: String(assigned),width: 80 },
        { text: String(compMem), width: 85 },
        { text: String(pendMem), width: 90 },
      ], rowY, 16, false, i % 2 === 0);
      doc.y = rowY;
    });

    doc.y = rowY + 12;

    // ── Sección 2: DISTRIBUCIÓN POR COLUMNA ──────────────────────────────────
    drawSectionHeader(doc, 'Distribución de tareas por columna');
    rowY = doc.y;
    const colCols = [
      { text: 'Columna',          width: 160 },
      { text: 'Total',            width: 70 },
      { text: 'Completadas',      width: 100 },
      { text: 'Pendientes',       width: 90 },
      { text: 'Progreso',         width: 95 },
    ];
    rowY = drawTableRow(doc, colCols, rowY, 18, true, false);

    let colIdx = 0;
    tasksByCol.forEach((colTasks, colName) => {
      const colComp   = colTasks.filter(t => !!t.completedAt).length;
      const colPend   = colTasks.length - colComp;
      const colRate   = colTasks.length > 0 ? Math.round((colComp / colTasks.length) * 100) : 0;
      rowY = drawTableRow(doc, [
        { text: colName,              width: 160 },
        { text: String(colTasks.length), width: 70 },
        { text: String(colComp),      width: 100 },
        { text: String(colPend),      width: 90 },
        { text: `${colRate}%`,        width: 95 },
      ], rowY, 16, false, colIdx % 2 === 0);
      doc.y = rowY;
      colIdx++;
    });

    doc.y = rowY + 12;

    // ── Sección 3: TODAS LAS TAREAS ───────────────────────────────────────────
    drawSectionHeader(doc, `Detalle completo de tareas (${total})`);
    rowY = doc.y;

    const taskCols = [
      { text: '#',          width: 25 },
      { text: 'Título',     width: 145 },
      { text: 'Prioridad',  width: 60 },
      { text: 'Columna',    width: 90 },
      { text: 'Asignado a', width: 90 },
      { text: 'Vence',      width: 65 },
      { text: 'Estado',     width: 40 },
    ];
    rowY = drawTableRow(doc, taskCols, rowY, 18, true, false);

    tasks.forEach((task, i) => {
      if (rowY > PAGE_H - 80) {
        addFooter(doc, project.name, currentPage, TOTAL_PAGES);
        doc.addPage();
        currentPage++;
        rowY = MARGIN + 10;
        rowY = drawTableRow(doc, taskCols, rowY, 18, true, false);
      }

      const colName  = columnNameMap.get(task.columnId) ?? '?';
      const assignee = memberNameMap.get(task.assigneeId ?? '') ?? '—';
      const dueStr   = task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-CO') : '—';
      const isOD     = !!(task.dueDate && !task.completedAt && new Date(task.dueDate) < new Date());
      const stateStr = task.completedAt ? '✓' : isOD ? '!' : '·';

      const cells = [
        { text: String(i + 1),      width: 25 },
        { text: task.title,         width: 145 },
        { text: priorityLabel(task.priority), width: 60 },
        { text: colName,            width: 90 },
        { text: assignee,           width: 90 },
        { text: dueStr,             width: 65 },
        { text: stateStr,           width: 40 },
      ];

      // Fondo especial para vencidas
      if (isOD) {
        doc.rect(MARGIN, rowY, CONTENT_W, 15).fillColor('#FEF2F2').fill();
      }

      rowY = drawTableRow(doc, cells, rowY, 15, false, i % 2 === 0);

      // Si tiene etiquetas o subtareas, mostrar en fila secundaria
      if ((task.labels?.length ?? 0) > 0 || (task.subtasks?.length ?? 0) > 0) {
        const extra: string[] = [];
        if (task.labels?.length) extra.push(`Etiquetas: ${task.labels.join(', ')}`);
        if (task.subtasks?.length) {
          const done = task.subtasks.filter(s => s.completed).length;
          extra.push(`Subtareas: ${done}/${task.subtasks.length}`);
        }
        if (task.description) extra.push(`Desc: ${task.description.slice(0, 60)}${task.description.length > 60 ? '…' : ''}`);
        doc.font('Helvetica').fontSize(7).fillColor(PDF_COLORS.textMuted)
          .text('    ' + extra.join('  ·  '), MARGIN + 25, rowY - 12, { width: CONTENT_W - 25 });
      }

      doc.y = rowY;
    });

    doc.y = rowY + 12;

    // ── Sección 4: TAREAS VENCIDAS (si hay) ───────────────────────────────────
    if (overdueList.length > 0) {
      if (doc.y > PAGE_H - 120) {
        addFooter(doc, project.name, currentPage, TOTAL_PAGES);
        doc.addPage();
        currentPage++;
        doc.y = MARGIN + 10;
      }

      drawSectionHeader(doc, `Tareas vencidas (${overdueList.length})`);
      rowY = doc.y;

      doc.rect(MARGIN, rowY, CONTENT_W, 18).fillColor('#FEE2E2').fill();
      doc.font('Helvetica-Bold').fontSize(8).fillColor(PDF_COLORS.danger)
        .text('ATENCIÓN: estas tareas superaron su fecha límite sin completarse', MARGIN + 6, rowY + 5);
      rowY += 18;

      const odCols = [
        { text: '#',          width: 25 },
        { text: 'Título',     width: 160 },
        { text: 'Prioridad',  width: 70 },
        { text: 'Asignado a', width: 100 },
        { text: 'Venció el',  width: 80 },
        { text: 'Días de retraso', width: 80 },
      ];
      rowY = drawTableRow(doc, odCols, rowY, 18, true, false);

      overdueList.forEach((task, i) => {
        const daysLate = Math.floor((Date.now() - new Date(task.dueDate!).getTime()) / 86_400_000);
        const assignee = memberNameMap.get(task.assigneeId ?? '') ?? '—';
        doc.rect(MARGIN, rowY, CONTENT_W, 15).fillColor(i % 2 === 0 ? '#FEF2F2' : '#FEE2E2').fill();
        rowY = drawTableRow(doc, [
          { text: String(i + 1), width: 25 },
          { text: task.title,    width: 160 },
          { text: priorityLabel(task.priority), width: 70 },
          { text: assignee,      width: 100 },
          { text: new Date(task.dueDate!).toLocaleDateString('es-CO'), width: 80 },
          { text: `${daysLate} día${daysLate !== 1 ? 's' : ''}`, width: 80 },
        ], rowY, 15, false, false);
        doc.y = rowY;
      });
    }

    // ── Pie de página en todas las páginas ────────────────────────────────────
    addFooter(doc, project.name, currentPage, TOTAL_PAGES);

    doc.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SERVICE
// ─────────────────────────────────────────────────────────────────────────────

async function buildContext(projectId: string, requesterId: string): Promise<ReportContext> {
  const project = await projectService.assertMember(projectId, requesterId);
  const tasks   = await taskRepository.findByProject(projectId);
  const boards  = await boardService.findByProject(projectId);

  // Mapa columnId → nombre
  const columnNameMap = new Map<string, string>();
  boards.forEach(b => b.columns.forEach(c => columnNameMap.set(c.columnId, c.name)));

  // Mapa userId → nombre
  const memberNameMap = new Map<string, string>();
  await Promise.all(project.members.map(async m => {
    const user = await userRepository.findById(m.userId);
    if (user) memberNameMap.set(m.userId, user.name);
  }));

  return {
    project,
    tasks,
    columnNameMap,
    memberNameMap,
    generatedAt: new Date().toISOString(),
  };
}

export const reportService = {
  async generate(projectId: string, type: 'pdf' | 'csv', requesterId: string): Promise<Report> {
    const ctx = await buildContext(projectId, requesterId);
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

    const report: Report = {
      reportId,
      projectId,
      type,
      s3Key,
      generatedBy: requesterId,
      createdAt: ctx.generatedAt,
    };

    return reportRepository.create(report);
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
    const buffer = await readFile(path);
    return { buffer, type: report.type, projectName: project.name };
  },

  async listByProject(projectId: string, requesterId: string): Promise<Report[]> {
    await projectService.assertMember(projectId, requesterId);
    return reportRepository.findByProject(projectId);
  },
};
