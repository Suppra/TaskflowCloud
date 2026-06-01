import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { Settings, User, Save, Loader2, CheckCircle2 } from 'lucide-react';

const inputCls =
  'w-full px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150' +
  ' border text-zinc-50 placeholder-zinc-600' +
  ' focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30';

export default function SettingsPage() {
  const user    = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const qc = useQueryClient();

  const [name,   setName]   = useState(user?.name ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? '');
  const [saved,  setSaved]  = useState(false);

  const update = useMutation({
    mutationFn: (data: { name?: string; avatar?: string }) =>
      api.patch<{ success: boolean; data: typeof user }>('/auth/me', data).then(r => r.data.data!),
    onSuccess: (updatedUser) => {
      if (updatedUser) setUser(updatedUser as NonNullable<typeof user>);
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
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

  const initials = (user?.name ?? 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="p-6 max-w-xl mx-auto">

      {/* Page header */}
      <div className="mb-6">
        <h1
          className="text-xl font-bold flex items-center gap-2.5"
          style={{ color: '#FAFAFA', letterSpacing: '-0.02em' }}
        >
          <Settings className="w-5 h-5" style={{ color: '#818CF8' }} />
          Ajustes
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#52525B' }}>
          Administra tu perfil y preferencias
        </p>
      </div>

      {/* ── Profile panel ────────────────────────────────────────────────────── */}
      <div className="rounded-xl p-5 mb-4" style={{ background: '#111113', border: '1px solid #1C1C1F' }}>
        <div
          className="flex items-center gap-2.5 mb-5 pb-4"
          style={{ borderBottom: '1px solid #1C1C1F' }}
        >
          <User className="w-4 h-4" style={{ color: '#52525B' }} />
          <h2 className="font-semibold text-sm" style={{ color: '#E4E4E7' }}>Perfil</h2>
        </div>

        {/* Avatar + info */}
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden shrink-0 font-bold text-xl"
            style={{ background: avatar ? 'transparent' : '#4F46E5', color: '#FAFAFA' }}
          >
            {avatar ? (
              <img
                src={avatar}
                alt="Avatar"
                className="w-full h-full object-cover"
                onError={() => setAvatar('')}
              />
            ) : initials}
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: '#FAFAFA' }}>{user?.name}</p>
            <p className="text-xs mt-0.5" style={{ color: '#52525B' }}>{user?.email}</p>
            <span
              className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full mt-1.5"
              style={{
                background: 'rgba(99,102,241,0.12)',
                color: '#818CF8',
                border: '1px solid rgba(99,102,241,0.2)',
              }}
            >
              {user?.role}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#71717A' }}>
              Nombre completo
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tu nombre"
              className={inputCls}
              style={{ background: '#0D0D10', borderColor: '#27272A' }}
              onFocus={e => { (e.target as HTMLElement).style.borderColor = '#6366F1'; }}
              onBlur={e => { (e.target as HTMLElement).style.borderColor = '#27272A'; }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#71717A' }}>
              URL del avatar
              <span className="ml-1 normal-case font-normal" style={{ color: '#3F3F46' }}>(opcional)</span>
            </label>
            <input
              type="url"
              value={avatar}
              onChange={e => setAvatar(e.target.value)}
              placeholder="https://ejemplo.com/foto.jpg"
              className={inputCls}
              style={{ background: '#0D0D10', borderColor: '#27272A' }}
              onFocus={e => { (e.target as HTMLElement).style.borderColor = '#6366F1'; }}
              onBlur={e => { (e.target as HTMLElement).style.borderColor = '#27272A'; }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#71717A' }}>
              Email
            </label>
            <input
              value={user?.email ?? ''}
              disabled
              className={inputCls + ' cursor-not-allowed'}
              style={{ background: '#0A0A0D', borderColor: '#1C1C1F', color: '#52525B' }}
            />
            <p className="text-[10px] mt-1" style={{ color: '#3F3F46' }}>
              El email no puede cambiarse.
            </p>
          </div>

          {update.isError && (
            <p className="text-xs" style={{ color: '#F87171' }}>
              Error al guardar. Verifica los datos e intenta de nuevo.
            </p>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={update.isPending || (!name.trim() && !avatar.trim())}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
              style={{
                background: saved ? '#059669' : '#6366F1',
                color: '#FAFAFA',
              }}
              onMouseEnter={e => {
                if (!update.isPending && !saved)
                  (e.currentTarget as HTMLElement).style.background = '#4F46E5';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = saved ? '#059669' : '#6366F1';
              }}
            >
              {update.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saved ? 'Guardado' : update.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Account info ──────────────────────────────────────────────────────── */}
      <div className="rounded-xl p-5" style={{ background: '#111113', border: '1px solid #1C1C1F' }}>
        <h2 className="font-semibold text-sm mb-4" style={{ color: '#E4E4E7' }}>
          Informacion de la cuenta
        </h2>
        <dl className="space-y-3">
          {[
            { label: 'Rol',            value: user?.role ?? '-' },
            { label: 'ID de usuario',  value: user?.userId ?? '-' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center">
              <dt className="text-xs font-medium" style={{ color: '#71717A' }}>{label}</dt>
              <dd
                className="text-xs font-medium tabular-nums"
                style={{ color: '#A1A1AA', fontFamily: "'JetBrains Mono', monospace" }}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
