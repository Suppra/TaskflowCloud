import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useLogin } from '@/hooks/useAuth';

interface FormData { email: string; password: string }

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const login = useLogin();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Iniciar sesión</h1>
      <p className="text-slate-400 text-sm mb-6">Bienvenido de vuelta a TaskFlow</p>

      <form onSubmit={handleSubmit(d => login.mutate(d))} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Email</label>
          <input
            type="email"
            {...register('email', { required: 'El email es requerido' })}
            className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            placeholder="tu@email.com"
          />
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Contraseña</label>
          <input
            type="password"
            {...register('password', { required: 'La contraseña es requerida' })}
            className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            placeholder="••••••••"
          />
          {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
        </div>

        {login.isError && (
          <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm px-3 py-2 rounded-lg">
            Credenciales inválidas. Intenta nuevamente.
          </div>
        )}

        <button
          type="submit"
          disabled={login.isPending}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition"
        >
          {login.isPending ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">
          Regístrate
        </Link>
      </p>
    </div>
  );
}
