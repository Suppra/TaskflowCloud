/**
 * Lambda: scheduled-reports
 * ──────────────────────────────────────────────────────────────────────────
 * Trigger : Amazon EventBridge — cron(0 8 ? * MON *)  → lunes 8am UTC
 * Función : Por cada proyecto activo:
 *           1. Genera reporte CSV  → sube a S3 → guarda en DynamoDB
 *           2. Genera reporte PDF  → sube a S3 → guarda en DynamoDB
 *           3. Envía email al CREADOR del proyecto con ambos enlaces
 * ──────────────────────────────────────────────────────────────────────────
 * HU-18: Recibir reportes automáticos semanales en CSV y PDF
 */

const { DynamoDBClient }   = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl }     = require('@aws-sdk/s3-request-presigner');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const PDFDocument          = require('pdfkit');
const { randomUUID }       = require('crypto');

const region        = process.env.AWS_REGION        ?? 'us-east-1';
const reportsBucket = process.env.S3_BUCKET_REPORTS  ?? 'taskflow-reports-dev';
const fromEmail     = process.env.SES_FROM_EMAIL     ?? 'noreply@taskflow.dev';
const frontendUrl   = process.env.FRONTEND_URL       ?? 'https://taskflow.dev';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true },
});
const s3  = new S3Client({ region });
const ses = new SESClient({ region });

// ── Helpers DynamoDB ───────────────────────────────────────────────────────

async function getAllActiveProjects() {
  const items = [];
  let lastKey;
  do {
    const result = await dynamo.send(new ScanCommand({
      TableName: 'taskflow-projects',
      FilterExpression: '#status = :active',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':active': 'active' },
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(result.Items ?? []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function getTasksByProject(projectId) {
  const items = [];
  let lastKey;
  do {
    const result = await dynamo.send(new QueryCommand({
      TableName: 'taskflow-tasks',
      IndexName: 'projectId-index',
      KeyConditionExpression: 'projectId = :pid',
      ExpressionAttributeValues: { ':pid': projectId },
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(result.Items ?? []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function getUserById(userId) {
  if (!userId) return null;
  const r = await dynamo.send(new GetCommand({ TableName: 'taskflow-users', Key: { userId } }));
  return r.Item ?? null;
}

async function saveReport(reportId, projectId, type, s3Key) {
  await dynamo.send(new PutCommand({
    TableName: 'taskflow-reports',
    Item: {
      reportId,
      projectId,
      type,
      s3Key,
      generatedBy: 'lambda-scheduled',
      createdAt: new Date().toISOString(),
    },
  }));
}

async function saveNotification(userId, projectId, projectName, reportId, type) {
  await dynamo.send(new PutCommand({
    TableName: 'taskflow-notifications',
    Item: {
      notificationId: randomUUID(),
      userId,
      type: 'report_ready',
      title: `Reporte semanal listo: ${projectName}`,
      message: `El reporte semanal ${type.toUpperCase()} del proyecto "${projectName}" está disponible.`,
      read: false,
      data: { reportId, projectId },
      createdAt: new Date().toISOString(),
    },
  }));
}

// ── Generadores de archivos ────────────────────────────────────────────────

function buildCsv(tasks) {
  const header = 'ID,Titulo,Prioridad,Estado/Columna,Asignado,Fecha limite,Completado,Etiquetas,Creado\n';
  const rows = tasks.map(t => [
    t.taskId,
    `"${(t.title ?? '').replace(/"/g, '""')}"`,
    t.priority ?? '',
    t.columnId ?? '',
    t.assigneeId ?? '',
    t.dueDate ?? '',
    t.completedAt ?? '',
    `"${(t.labels ?? []).join('; ')}"`,
    t.createdAt ?? '',
  ].join(',')).join('\n');
  return Buffer.from(header + rows, 'utf-8');
}

function buildPdf(tasks, projectName) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];

    doc.on('data',  chunk => chunks.push(chunk));
    doc.on('end',   ()    => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const now = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });

    // Portada
    doc
      .fontSize(22).fillColor('#2563EB').text('TaskFlow Cloud', { align: 'center' }).moveDown(0.4)
      .fontSize(16).fillColor('#1E293B').text(`Reporte del Proyecto: ${projectName}`, { align: 'center' }).moveDown(0.4)
      .fontSize(10).fillColor('#64748B').text(`Generado: ${now}`, { align: 'center' }).moveDown(1.5);

    // Resumen ejecutivo
    const total     = tasks.length;
    const completed = tasks.filter(t => !!t.completedAt).length;
    const overdue   = tasks.filter(t => t.dueDate && !t.completedAt && new Date(t.dueDate) < new Date()).length;
    const critical  = tasks.filter(t => t.priority === 'critical').length;

    doc.fontSize(13).fillColor('#0F172A').text('Resumen Ejecutivo').moveDown(0.3);
    [
      [`Total de tareas`, `${total}`],
      [`Completadas`, `${completed} (${total ? Math.round((completed / total) * 100) : 0}%)`],
      [`Vencidas`, `${overdue}`],
      [`Criticas`, `${critical}`],
    ].forEach(([label, value]) => {
      doc.fontSize(10).fillColor('#334155').text(`${label}:`, { continued: true })
         .fillColor('#0F172A').text(`  ${value}`);
    });
    doc.moveDown(1.5);

    // Detalle
    doc.fontSize(13).fillColor('#0F172A').text('Detalle de Tareas').moveDown(0.5);
    const colors = { critical: '#EF4444', high: '#F97316', medium: '#EAB308', low: '#22C55E' };

    tasks.forEach((task, idx) => {
      if (doc.y > 720) doc.addPage();
      const color = colors[task.priority] ?? '#64748B';
      doc
        .fontSize(10).fillColor(color)
        .text(`[${(task.priority ?? '').toUpperCase()}]`, { continued: true })
        .fillColor('#0F172A')
        .text(`  ${idx + 1}. ${task.title}`)
        .fontSize(8).fillColor('#64748B')
        .text(`   Estado: ${task.columnId}  |  Vence: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-CO') : '-'}`)
        .moveDown(0.4);
    });

    doc.end();
  });
}

// ── S3 ─────────────────────────────────────────────────────────────────────

async function uploadToS3(buffer, key, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: reportsBucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
}

async function getPresignedUrl(key, hours = 24) {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: reportsBucket, Key: key }),
    { expiresIn: hours * 3600 }
  );
}

// ── Email al creador ────────────────────────────────────────────────────────

async function sendReportEmail(creatorEmail, creatorName, projectName, csvUrl, pdfUrl) {
  const html = `
    <html><body style="font-family:Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:20px">
    <div style="background:#1e293b;border-radius:12px;padding:24px;max-width:560px;margin:auto">
      <div style="color:#6366f1;font-size:22px;font-weight:bold;margin-bottom:16px">TaskFlow Cloud</div>
      <h2 style="margin:0 0 12px">Reporte semanal disponible</h2>
      <p>Hola <strong>${creatorName}</strong>,</p>
      <p>El reporte semanal del proyecto <strong>${projectName}</strong> está listo.</p>
      <div style="margin:20px 0;display:flex;gap:12px;flex-wrap:wrap">
        <a href="${csvUrl}"
           style="display:inline-block;background:#16a34a;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:bold">
          Descargar CSV
        </a>
        <a href="${pdfUrl}"
           style="display:inline-block;background:#dc2626;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:bold">
          Descargar PDF
        </a>
      </div>
      <a href="${frontendUrl}/projects"
         style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:bold">
        Ir a mis proyectos
      </a>
      <p style="color:#475569;font-size:12px;margin-top:20px">
        Los enlaces de descarga expiran en 24 horas.<br>
        Recibes este email como creador del proyecto.
      </p>
    </div></body></html>`;

  try {
    await ses.send(new SendEmailCommand({
      Source: `TaskFlow Cloud <${fromEmail}>`,
      Destination: { ToAddresses: [creatorEmail] },
      Message: {
        Subject: { Data: `[TaskFlow] Reporte semanal: ${projectName}`, Charset: 'UTF-8' },
        Body: { Html: { Charset: 'UTF-8', Data: html } },
      },
    }));
    console.log(`[scheduled-reports] Email enviado a ${creatorEmail}`);
  } catch (err) {
    console.error('[scheduled-reports] SES error:', err.message);
  }
}

// ── Handler principal ───────────────────────────────────────────────────────

exports.handler = async () => {
  const now = new Date().toISOString();
  console.log('[scheduled-reports] Iniciando generacion semanal:', now);

  const projects = await getAllActiveProjects();
  console.log(`[scheduled-reports] ${projects.length} proyectos activos`);

  const results = [];

  for (const project of projects) {
    try {
      const tasks = await getTasksByProject(project.projectId);
      if (tasks.length === 0) {
        console.log(`[scheduled-reports] Sin tareas en ${project.projectId}, omitiendo`);
        continue;
      }

      const safeName = (project.name ?? 'proyecto').replace(/[^a-z0-9]/gi, '-');
      const dateStr  = now.slice(0, 10);

      // ── Generar y subir CSV ────────────────────────────────────────────
      const csvBuffer  = buildCsv(tasks);
      const csvId      = randomUUID();
      const csvKey     = `reports/${project.projectId}/${csvId}.csv`;
      await uploadToS3(csvBuffer, csvKey, 'text/csv; charset=utf-8');
      await saveReport(csvId, project.projectId, 'csv', csvKey);
      const csvUrl = await getPresignedUrl(csvKey, 24);

      // ── Generar y subir PDF ────────────────────────────────────────────
      const pdfBuffer  = await buildPdf(tasks, project.name ?? 'Proyecto');
      const pdfId      = randomUUID();
      const pdfKey     = `reports/${project.projectId}/${pdfId}.pdf`;
      await uploadToS3(pdfBuffer, pdfKey, 'application/pdf');
      await saveReport(pdfId, project.projectId, 'pdf', pdfKey);
      const pdfUrl = await getPresignedUrl(pdfKey, 24);

      // ── Notificar y enviar email SOLO al creador del proyecto ──────────
      const creator = await getUserById(project.ownerId);
      if (creator) {
        // Notificación en plataforma (CSV)
        await saveNotification(creator.userId, project.projectId, project.name, csvId, 'csv');
        // Notificación en plataforma (PDF)
        await saveNotification(creator.userId, project.projectId, project.name, pdfId, 'pdf');
        // Email con ambos enlaces
        await sendReportEmail(creator.email, creator.name, project.name, csvUrl, pdfUrl);
      }

      console.log(`[scheduled-reports] OK: ${project.projectId} — csv:${csvId} pdf:${pdfId}`);
      results.push({ projectId: project.projectId, csvId, pdfId, tasks: tasks.length });

    } catch (err) {
      console.error(`[scheduled-reports] Error en ${project.projectId}:`, err.message);
      results.push({ projectId: project.projectId, error: err.message });
    }
  }

  console.log(`[scheduled-reports] Completado. ${results.length} proyectos procesados.`);
  return { timestamp: now, reports: results };
};
