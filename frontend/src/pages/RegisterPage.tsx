import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useRegister } from '@/hooks/useAuth';

interface FormData { name: string; email: string; password: string }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputCls =
  'w-full px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150' +
  ' bg-zinc-900 border text-zinc-50 placeholder-zinc-600' +
  ' border-zinc-800 hover:border-zinc-700' +
  ' focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40';

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const registerUser = useRegister();

  return (
    <div>
      <h1
        className="text-2xl font-bold mb-1"
        style={{ color: '#FAFAFA', letterSpacing: '-0.025em' }}
      >
        Crear cuenta
      </h1>
      <p className="text-sm mb-8" style={{ color: '#71717A' }}>
        Empieza a gestionar tus proyectos en minutos
      </p>

      <form onSubmit={handleSubmit(d => registerUser.mutate(d))} className="space-y-4">
        {/* Name */}
        <div>
          <label
            className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
            style={{ color: '#A1A1AA' }}
          >
            Nombre completo
          </label>
          <input
            {...register('name', {
              required: 'El nombre es requerido',
              minLength: { value: 2, message: 'Mínimo 2 caracteres' },
              maxLength: { value: 100, message: 'Máximo 100 caracteres' },
            })}
            className={inputCls}
            placeholder="Ana García"
            autoComplete="name"
          />
          {errors.name && (
            <p className="text-xs mt-1.5" style={{ color: '#EF4444' }}>{errors.name.message}</p>
          )}
        </div>

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
            placeholder="ana@empresa.com"
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
            {...register('password', {
              required: 'La contraseña es requerida',
              minLength: { value: 8, message: 'Mínimo 8 caracteres' },
              maxLength: { value: 128, message: 'Máximo 128 caracteres' },
            })}
            className={inputCls}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
          />
          {errors.password && (
            <p className="text-xs mt-1.5" style={{ color: '#EF4444' }}>{errors.password.message}</p>
          )}
        </div>

        {/* Server error */}
        {registerUser.isError && (
          <div
            className="rounded-lg px-3.5 py-2.5 text-sm"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#FCA5A5',
            }}
          >
            No se pudo crear la cuenta. Es posible que el email ya esté registrado.
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={registerUser.isPending}
          className="w-full py-2.5 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: registerUser.isPending ? '#4338CA' : '#6366F1',
            color: '#FAFAFA',
          }}
          onMouseEnter={e => !registerUser.isPending && ((e.target as HTMLElement).style.background = '#4F46E5')}
          onMouseLeave={e => !registerUser.isPending && ((e.target as HTMLElement).style.background = '#6366F1')}
        >
          {registerUser.isPending ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: '#52525B' }}>
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-semibold" style={{ color: '#818CF8' }}>
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
