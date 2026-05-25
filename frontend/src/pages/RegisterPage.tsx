import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useRegister } from '@/hooks/useAuth';

interface FormData { name: string; email: string; password: string }

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const registerUser = useRegister();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Crear cuenta</h1>
      <p className="text-slate-400 text-sm mb-6">Empieza a gestionar proyectos hoy</p>

      <form onSubmit={handleSubmit(d => registerUser.mutate(d))} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Nombre completo</label>
          <input
            {...register('name', { required: 'El nombre es requerido', minLength: { value: 2, message: 'Mínimo 2 caracteres' } })}
            className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            placeholder="Juan Pérez"
          />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
        </div>

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
            {...register('password', { required: true, minLength: { value: 8, message: 'Mínimo 8 caracteres' } })}
            className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            placeholder="Mínimo 8 caracteres"
          />
          {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
        </div>

        {registerUser.isError && (
          <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm px-3 py-2 rounded-lg">
            Error al crear cuenta. El email puede ya estar registrado.
          </div>
        )}

        <button
          type="submit"
          disabled={registerUser.isPending}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition"
        >
          {registerUser.isPending ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
