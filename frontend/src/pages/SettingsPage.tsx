import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { Settings, User, Save, RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';

export default function SettingsPage() {
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const qc = useQueryClient();

  const [name, setName] = useState(user?.name ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? '');
  const [saved, setSaved] = useState(false);

  const update = useMutation({
    mutationFn: (data: { name?: string; avatar?: string }) =>
      api.patch<{ success: boolean; data: typeof user }>('/auth/me', data).then(r => r.data.data!),
    onSuccess: (updatedUser) => {
      if (updatedUser) setUser(updatedUser as NonNullable<typeof user>);
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: { name?: string; avatar?: string } = {};
    if (name.trim() && name !== user?.name) payload.name = name.trim();
    if (avatar.trim() !== (user?.avatar ?? '')) payload.avatar = avatar.trim() || undefined;
    if (Object.keys(payload).length === 0) return;
    update.mutate(payload);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-400" />
          Ajustes
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">Administra tu perfil y preferencias</p>
      </div>

      {/* Perfil */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-4">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-700">
          <User className="w-5 h-5 text-slate-400" />
          <h2 className="font-semibold text-white">Perfil</h2>
        </div>

        {/* Avatar preview */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden shrink-0">
            {avatar ? (
              <img src={avatar} alt="Avatar" className="w-full h-full object-cover"
                onError={() => setAvatar('')} />
            ) : (
              <span className="text-2xl font-bold text-white">
                {(user?.name ?? 'U')[0].toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="font-medium text-white">{user?.name}</p>
            <p className="text-sm text-slate-400">{user?.email}</p>
            <p className="text-xs text-slate-500 mt-0.5 capitalize">{user?.role}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Nombre completo
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              URL del avatar <span className="text-slate-500 font-normal">(opcional)</span>
            </label>
            <input
              type="url"
              value={avatar}
              onChange={e => setAvatar(e.target.value)}
              placeholder="https://ejemplo.com/foto.jpg"
              className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Email
            </label>
            <input
              value={user?.email ?? ''}
              disabled
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">El email no puede cambiarse.</p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={update.isPending || (!name.trim() && !avatar.trim())}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition',
                saved
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white'
              )}
            >
              {update.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saved ? '¡Guardado!' : update.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>

          {update.isError && (
            <p className="text-sm text-red-400 mt-2">
              Error al guardar. Verifica los datos e intenta de nuevo.
            </p>
          )}
        </form>
      </div>

      {/* Info de la cuenta */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-4">Información de la cuenta</h2>
        <dl className="space-y-3 text-sm">
          {[
            ['Rol', user?.role ?? '—'],
            ['ID de usuario', user?.userId ?? '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <dt className="text-slate-400">{label}</dt>
              <dd className="text-slate-300 font-mono text-xs">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
