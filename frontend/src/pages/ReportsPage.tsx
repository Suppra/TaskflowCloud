import { useState } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useReports, useGenerateReport, useDownloadReport } from '@/hooks/useReports';
import { FileText, FileSpreadsheet, Download, Plus, BarChart3, RefreshCw } from 'lucide-react';
import { formatDate } from '@/utils/date';
import { cn } from '@/utils/cn';

function ProjectReports({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { data: reports = [], isLoading } = useReports(projectId);
  const generate = useGenerateReport(projectId);
  const download = useDownloadReport();

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      {/* Header del proyecto */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <h3 className="font-semibold text-white">{projectName}</h3>
          <span className="text-xs text-slate-500">({reports.length} reportes)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => generate.mutate('csv')}
            disabled={generate.isPending}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-green-400 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition"
          >
            {generate.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            CSV
          </button>
          <button
            onClick={() => generate.mutate('pdf')}
            disabled={generate.isPending}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-red-400 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition"
          >
            {generate.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            PDF
          </button>
        </div>
      </div>

      {/* Lista de reportes */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-10 bg-slate-700 rounded-lg animate-pulse" />)}
        </div>
      ) : reports.length === 0 ? (
        <p className="text-sm text-slate-500 py-3 text-center">
          No hay reportes aún. Genera el primero con los botones de arriba.
        </p>
      ) : (
        <div className="space-y-2">
          {reports.map(report => (
            <div
              key={report.reportId}
              className="flex items-center justify-between px-3 py-2.5 bg-slate-900/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {report.type === 'pdf' ? (
                  <FileText className="w-4 h-4 text-red-400 shrink-0" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-green-400 shrink-0" />
                )}
                <div>
                  <p className="text-sm text-slate-200">
                    Reporte {report.type.toUpperCase()}
                    {report.generatedBy === 'lambda-scheduled' && (
                      <span className="ml-2 text-xs text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded">Auto</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">{formatDate(report.createdAt)}</p>
                </div>
              </div>
              <button
                onClick={() => download.mutate(report.reportId)}
                disabled={download.isPending}
                className={cn(
                  'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition',
                  report.type === 'pdf'
                    ? 'text-red-400 hover:bg-red-900/20'
                    : 'text-green-400 hover:bg-green-900/20'
                )}
              >
                <Download className="w-3.5 h-3.5" />
                Descargar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const { data: projects = [], isLoading } = useProjects();
  const [filter, setFilter] = useState<'all' | 'active'>('active');

  const filtered = filter === 'active'
    ? projects.filter(p => p.status === 'active')
    : projects;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            Reportes
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Genera y descarga reportes PDF y CSV de tus proyectos
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
          {(['active', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-md transition font-medium',
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {f === 'active' ? 'Activos' : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-36 bg-slate-800 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-slate-500">
          <BarChart3 className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p className="font-medium text-slate-400">Sin proyectos</p>
          <p className="text-sm mt-1">Crea un proyecto para poder generar reportes.</p>
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
