import { useState } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useReports, useGenerateReport, useDownloadReport, useDeleteReport } from '@/hooks/useReports';
import { FileText, FileSpreadsheet, Download, Plus, BarChart3, Loader2, Trash2 } from 'lucide-react';

/* ── Fecha con hora ─────────────────────────────────────────────────────────── */
function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      day:    '2-digit',
      month:  'short',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/* ── Skeleton ───────────────────────────────────────────────────────────────── */
function Skeleton() {
  return <div className="h-36 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />;
}

/* ── Per-project reports panel ──────────────────────────────────────────────── */
function ProjectReports({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { data: reports = [], isLoading } = useReports(projectId);
  const generate     = useGenerateReport(projectId);
  const download     = useDownloadReport();
  const deleteReport = useDeleteReport(projectId);

  return (
    <div className="rounded-xl p-5" style={{ background: '#111113', border: '1px solid #1C1C1F' }}>

      {/* Header del proyecto */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg shrink-0" style={{ background: 'rgba(99,102,241,0.12)' }}>
            <BarChart3 className="w-3.5 h-3.5" style={{ color: '#818CF8' }} />
          </div>
          <h3 className="font-semibold text-sm truncate" style={{ color: '#E4E4E7', letterSpacing: '-0.01em' }}>
            {projectName}
          </h3>
          {reports.length > 0 && (
            <span
              className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-md shrink-0"
              style={{ background: '#1C1C1F', color: '#52525B', fontFamily: "'JetBrains Mono', monospace" }}
            >
              {reports.length}
            </span>
          )}
        </div>

        {/* Botones de generación */}
        <div className="flex items-center gap-2 shrink-0">
          {(['csv', 'pdf'] as const).map(type => (
            <button
              key={type}
              onClick={() => generate.mutate(type)}
              disabled={generate.isPending}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
              style={{
                background: type === 'csv' ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
                border:     type === 'csv' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)',
                color:      type === 'csv' ? '#34D399' : '#F87171',
              }}
            >
              {generate.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Plus className="w-3.5 h-3.5" />
              }
              {type.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de reportes */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-10 rounded-lg animate-pulse"
              style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <p className="text-xs py-4 text-center" style={{ color: '#3F3F46' }}>
          Sin reportes aun. Genera el primero con los botones de arriba.
        </p>
      ) : (
        <div className="space-y-1.5">
          {reports
            .slice()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map(report => (
              <div
                key={report.reportId}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1C1C1F' }}
              >
                {/* Icono + info */}
                <div className="flex items-center gap-3 min-w-0">
                  {report.type === 'pdf'
                    ? <FileText className="w-4 h-4 shrink-0" style={{ color: '#F87171' }} />
                    : <FileSpreadsheet className="w-4 h-4 shrink-0" style={{ color: '#34D399' }} />
                  }
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold" style={{ color: '#D4D4D8' }}>
                        Reporte {report.type.toUpperCase()}
                      </p>
                      {report.generatedBy === 'lambda-scheduled' && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}
                        >
                          Auto
                        </span>
                      )}
                    </div>
                    {/* Fecha con hora */}
                    <p
                      className="text-[10px] tabular-nums mt-0.5"
                      style={{ color: '#52525B', fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {formatDateTime(report.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Acciones: descargar + eliminar */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Descargar */}
                  <button
                    onClick={() => download.mutate(report.reportId)}
                    disabled={download.isPending}
                    title="Descargar"
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg cursor-pointer disabled:opacity-50 transition-all duration-150"
                    style={{ color: report.type === 'pdf' ? '#F87171' : '#34D399', background: 'transparent' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background =
                        report.type === 'pdf' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)';
                    }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar
                  </button>

                  {/* Eliminar */}
                  <button
                    onClick={() => {
                      if (confirm('¿Eliminar este reporte? Esta acción no se puede deshacer.')) {
                        deleteReport.mutate(report.reportId);
                      }
                    }}
                    disabled={deleteReport.isPending}
                    title="Eliminar reporte"
                    className="p-1.5 rounded-lg cursor-pointer disabled:opacity-50 transition-all duration-150"
                    style={{ color: '#52525B', background: 'transparent' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.color = '#F87171';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.color = '#52525B';
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────────── */
export default function ReportsPage() {
  const { data: projects = [], isLoading } = useProjects();
  const [filter, setFilter] = useState<'all' | 'active'>('active');
  const filtered = filter === 'active' ? projects.filter(p => p.status === 'active') : projects;

  return (
    <div className="p-6 max-w-3xl mx-auto">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2.5"
            style={{ color: '#FAFAFA', letterSpacing: '-0.02em' }}>
            <BarChart3 className="w-5 h-5" style={{ color: '#818CF8' }} />
            Reportes
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#52525B' }}>
            Genera y descarga reportes PDF y CSV por proyecto
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: '#1C1C1F' }}>
          {(['active', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="text-xs px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-all duration-150"
              style={{ background: filter === f ? '#6366F1' : 'transparent', color: filter === f ? '#FAFAFA' : '#71717A' }}
            >
              {f === 'active' ? 'Activos' : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <div className="inline-flex p-4 rounded-2xl mb-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <BarChart3 className="w-10 h-10" style={{ color: '#27272A' }} />
          </div>
          <p className="font-semibold text-sm" style={{ color: '#A1A1AA' }}>Sin proyectos</p>
          <p className="text-sm mt-1" style={{ color: '#52525B' }}>
            Crea un proyecto para generar reportes.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(project => (
            <ProjectReports
              key={project.projectId}
              projectId={project.projectId}
              projectName={project.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
