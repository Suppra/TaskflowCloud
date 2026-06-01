import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useLogin } from '@/hooks/useAuth';

interface FormData { email: string; password: string }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ── Shared input style ─────────────────────────────────────────────────────── */
const inputCls =
  'w-full px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150' +
  ' bg-zinc-900 border text-zinc-50 placeholder-zinc-600' +
  ' border-zinc-800 hover:border-zinc-700' +
  ' focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40';

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const login = useLogin();

  return (
    <div>
      {/* Heading */}
      <h1
        className="text-2xl font-bold mb-1"
        style={{ color: '#FAFAFA', letterSpacing: '-0.025em' }}
      >
        Bienvenido de vuelta
      </h1>
      <p className="text-sm mb-8" style={{ color: '#71717A' }}>
        Inicia sesión para continuar en TaskFlow Cloud
      </p>

      <form onSubmit={handleSubmit(d => login.mutate(d))} className="space-y-4">
        {/* Email */}
        <div>
          <label
            className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
            style={{ color: '#A1A1AA' }}
          >
            Email
          </label>
          <input
            type="email"
            {...register('email', {
              required: 'El email es requerido',
              pattern: { value: EMAIL_PATTERN, message: 'Ingresa un email válido' },
            })}
            className={inputCls}
            placeholder="tu@empresa.com"
            autoComplete="email"
          />
          {errors.email && (
            <p className="text-xs mt-1.5" style={{ color: '#EF4444' }}>{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label
            className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
            style={{ color: '#A1A1AA' }}
          >
            Contraseña
          </label>
          <input
            type="password"
            {...register('password', { required: 'La contraseña es requerida' })}
            className={inputCls}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          {errors.password && (
            <p className="text-xs mt-1.5" style={{ color: '#EF4444' }}>{errors.password.message}</p>
          )}
        </div>

        {/* Server error */}
        {login.isError && (
          <div
            className="rounded-lg px-3.5 py-2.5 text-sm"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#FCA5A5',
            }}
          >
            Credenciales incorrectas. Verifica tu email y contraseña.
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={login.isPending}
          className="w-full py-2.5 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: login.isPending ? '#4338CA' : '#6366F1',
            color: '#FAFAFA',
          }}
          onMouseEnter={e => !login.isPending && ((e.target as HTMLElement).style.background = '#4F46E5')}
          onMouseLeave={e => !login.isPending && ((e.target as HTMLElement).style.background = '#6366F1')}
        >
          {login.isPending ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
      </form>

      {/* Register link */}
      <p className="text-center text-sm mt-6" style={{ color: '#52525B' }}>
        ¿No tienes cuenta?{' '}
        <Link
          to="/register"
          className="font-semibold"
          style={{ color: '#818CF8' }}
        >
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}
