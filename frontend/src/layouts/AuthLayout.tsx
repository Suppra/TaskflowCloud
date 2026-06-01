import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

/* ── Feature list shown on the left branding panel ─────────────────────────── */
const FEATURES = [
  { label: 'Tableros Kanban con drag & drop en tiempo real' },
  { label: 'Auto-asignación inteligente por carga de trabajo' },
  { label: 'Alertas automáticas y reportes programados' },
  { label: 'Control de roles: admin, miembro y observador' },
];

/* ── Logo mark ──────────────────────────────────────────────────────────────── */
function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#6366F1" />
      <rect x="8" y="9" width="7" height="3" rx="1.5" fill="white" />
      <rect x="8" y="14.5" width="11" height="3" rx="1.5" fill="white" fillOpacity="0.7" />
      <rect x="8" y="20" width="5" height="3" rx="1.5" fill="white" fillOpacity="0.4" />
      <rect x="18" y="9" width="6" height="14" rx="3" fill="white" fillOpacity="0.9" />
    </svg>
  );
}

/* ── Check icon ─────────────────────────────────────────────────────────────── */
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7.5" stroke="#6366F1" strokeOpacity="0.4" />
      <path d="M5 8l2 2 4-4" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AuthLayout() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-[100dvh] flex">

      {/* ── Left branding panel ─────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] xl:w-[480px] shrink-0 p-10 xl:p-12"
        style={{
          background: 'linear-gradient(160deg, #111113 0%, #0D0D10 60%, #0A0A0D 100%)',
          borderRight: '1px solid #27272A',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <LogoMark size={36} />
          <span
            className="text-xl font-bold tracking-tight"
            style={{ color: '#FAFAFA', letterSpacing: '-0.02em' }}
          >
            TaskFlow
          </span>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full ml-1"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.25)' }}
          >
            Cloud
          </span>
        </div>

        {/* Main copy */}
        <div>
          <p
            className="text-3xl xl:text-4xl font-bold leading-tight mb-4"
            style={{ color: '#FAFAFA', letterSpacing: '-0.03em', lineHeight: '1.15' }}
          >
            Gestiona proyectos<br />
            <span style={{ color: '#818CF8' }}>con precisión.</span>
          </p>
          <p className="text-sm leading-relaxed mb-8" style={{ color: '#71717A', maxWidth: '32ch' }}>
            Kanban colaborativo con automatización inteligente, directamente en la nube.
          </p>

          {/* Feature list */}
          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0"><CheckIcon /></span>
                <span className="text-sm" style={{ color: '#A1A1AA' }}>{f.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom decoration */}
        <div
          className="text-xs font-medium"
          style={{ color: '#3F3F46', fontFamily: "'JetBrains Mono', monospace" }}
        >
          taskflow.cloud · v2.0
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center p-6 sm:p-10"
        style={{ background: '#09090B' }}
      >
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <LogoMark size={30} />
            <span className="text-lg font-bold" style={{ color: '#FAFAFA', letterSpacing: '-0.02em' }}>
              TaskFlow Cloud
            </span>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}
