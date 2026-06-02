import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createObjectCsvStringifier } from 'csv-writer';
import PDFDocument from 'pdfkit';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { s3 } from '../config/aws';
import { env } from '../config/env';
import { reportRepository } from '../repositories/reportRepository';
import { taskRepository } from '../repositories/taskRepository';
import { projectService } from './projectService';
import { Report } from '../types';
import { logger } from '../config/logger';

// ── Directorio local para reportes en modo desarrollo ──────────────────────────
const LOCAL_DIR = join(tmpdir(), 'taskflow-reports');
const isDevMode = () => env.NODE_ENV === 'development' || !!env.DYNAMODB_ENDPOINT;

async function ensureLocalDir() {
  if (!existsSync(LOCAL_DIR)) await mkdir(LOCAL_DIR, { recursive: true });
}

async function buildCsvBuffer(projectId: string): Promise<Buffer> {
  const tasks = await taskRepository.findByProject(projectId);

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'taskId',      title: 'ID' },
      { id: 'title',       title: 'Título' },
      { id: 'priority',    title: 'Prioridad' },
      { id: 'columnId',    title: 'Columna/Estado' },
      { id: 'assigneeId',  title: 'Asignado a' },
      { id: 'dueDate',     title: 'Fecha límite' },
      { id: 'completedAt', title: 'Completado en' },
      { id: 'labels',      title: 'Etiquetas' },
      { id: 'createdAt',   title: 'Creado en' },
    ],
  });

  const records = tasks.map(t => ({
    taskId:      t.taskId,
    title:       t.title,
    priority:    t.priority,
    columnId:    t.columnId,
    assigneeId:  t.assigneeId ?? '',
    dueDate:     t.dueDate ?? '',
    completedAt: t.completedAt ?? '',
    labels:      (t.labels ?? []).join('; '),
    createdAt:   t.createdAt,
  }));

  const content = csvStringifier.getHeaderString()! + csvStringifier.stringifyRecords(records);
  return Buffer.from(content, 'utf-8');
}

async function buildPdfBuffer(projectId: string, projectName: string): Promise<Buffer> {
  const tasks = await taskRepository.findByProject(projectId);

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Portada ────────────────────────────────────────────
    doc
      .fontSize(22).fillColor('#2563EB')
      .text('TaskFlow Cloud', { align: 'center' })
      .moveDown(0.5)
      .fontSize(16).fillColor('#1E293B')
      .text(`Reporte del Proyecto: ${projectName}`, { align: 'center' })
      .moveDown(0.5)
      .fontSize(10).fillColor('#64748B')
      .text(`Generado: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`, { align: 'center' })
      .moveDown(2);

    // ── Resumen ────────────────────────────────────────────
    const total      = tasks.length;
    const completed  = tasks.filter(t => !!t.completedAt).length;
    const overdue    = tasks.filter(t => t.dueDate && !t.completedAt && new Date(t.dueDate) < new Date()).length;
    const critical   = tasks.filter(t => t.priority === 'critical').length;

    doc.fontSize(13).fillColor('#0F172A').text('Resumen Ejecutivo').moveDown(0.3);

    const stats = [
      [`Total de tareas`, `${total}`],
      [`Completadas`, `${completed} (${total ? Math.round((completed / total) * 100) : 0}%)`],
      [`Vencidas`, `${overdue}`],
      [`Críticas`, `${critical}`],
    ];

    stats.forEach(([label, value]) => {
      doc
        .fontSize(10).fillColor('#334155').text(`${label}:`, { continued: true })
        .fillColor('#0F172A').text(`  ${value}`);
    });

    doc.moveDown(1.5);

    // ── Tabla de tareas ─────────────────────────────────────
    doc.fontSize(13).fillColor('#0F172A').text('Detalle de Tareas').moveDown(0.5);

    const priorityColors: Record<string, string> = {
      critical: '#EF4444',
      high:     '#F97316',
      medium:   '#EAB308',
      low:      '#22C55E',
    };

    tasks.forEach((task, idx) => {
      if (doc.y > 720) doc.addPage();

      const color = priorityColors[task.priority] ?? '#64748B';
      doc
        .fontSize(10).fillColor(color)
        .text(`[${task.priority.toUpperCase()}]`, { continued: true })
        .fillColor('#0F172A')
        .text(`  ${idx + 1}. ${task.title}`)
        .fontSize(8).fillColor('#64748B')
        .text(`   Estado: ${task.columnId}  |  Asignado: ${task.assigneeId ?? 'Sin asignar'}  |  Vence: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-CO') : '—'}`)
        .moveDown(0.4);
    });

    doc.end();
  });
}

export const reportService = {
  async generate(
    projectId: string,
    type: 'pdf' | 'csv',
    requesterId: string
  ): Promise<Report> {
    const project = await projectService.assertMember(projectId, requesterId);

    const reportId  = uuidv4();
    const ext       = type === 'pdf' ? 'pdf' : 'csv';
    const s3Key     = `reports/${projectId}/${reportId}.${ext}`;
    const contentType = type === 'pdf' ? 'application/pdf' : 'text/csv';

    const buffer = type === 'pdf'
      ? await buildPdfBuffer(projectId, project.name)
      : await buildCsvBuffer(projectId);

    if (isDevMode()) {
      // ── Desarrollo: guardar en disco local (no hay S3) ──────────────────
      await ensureLocalDir();
      await writeFile(join(LOCAL_DIR, `${reportId}.${ext}`), buffer);
      logger.info({ message: 'Reporte guardado localmente (dev)', reportId, localDir: LOCAL_DIR });
    } else {
      // ── Producción: subir a S3 ──────────────────────────────────────────
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
      createdAt: new Date().toISOString(),
    };

    return reportRepository.create(report);
  },

  async getDownloadUrl(reportId: string, requesterId: string): Promise<string> {
    const report = await reportRepository.findById(reportId);
    if (!report) throw Object.assign(new Error('Reporte no encontrado'), { statusCode: 404 });
    await projectService.assertMember(report.projectId, requesterId);

    if (isDevMode()) {
      // URL relativa al backend — el controlador servirá el archivo directamente
      return `/api/v1/reports/${reportId}/file`;
    }

    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET_REPORTS,
      Key: report.s3Key,
    });
    return getSignedUrl(s3, command, { expiresIn: 900 });
  },

  /**
   * Sirve el archivo del reporte directamente desde el disco local (solo dev).
   * En producción la descarga va por S3 presigned URL.
   */
  async streamLocalFile(
    reportId: string,
    requesterId: string
  ): Promise<{ buffer: Buffer; type: 'pdf' | 'csv'; projectName: string }> {
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
