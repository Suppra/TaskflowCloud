import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '@/services/projectService';
import { boardService } from '@/services/boardService';
import { useInviteMember, useMembers, useUpdateMemberRole, useRemoveMember } from '@/hooks/useProjects';
import { useAuthStore } from '@/store/authStore';
import { Plus, LayoutGrid, ArrowLeft, Users, UserPlus, X, Crown, Trash2 } from 'lucide-react';
import { formatDate } from '@/utils/date';

const ROLE_LABELS: Record<string, string> = {
  admin:  'Administrador',
  member: 'Miembro',
  viewer: 'Observador',
};

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  admin:  { bg: 'rgba(99,102,241,0.12)',  text: '#818CF8', border: 'rgba(99,102,241,0.25)' },
  member: { bg: 'rgba(16,185,129,0.10)',  text: '#34D399', border: 'rgba(16,185,129,0.2)' },
  viewer: { bg: 'rgba(113,113,122,0.10)', text: '#71717A', border: 'rgba(113,113,122,0.2)' },
};

const inputCls =
  'w-full px-3.5 py-2.5 rounded-lg text-sm font-medium' +
  ' border text-zinc-50 placeholder-zinc-600' +
  ' focus:outline-none transition-all duration-150';

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const currentUserId = useAuthStore(s => s.user?.userId);

  const { data: members = [] } = useMembers(projectId!);
  const [showInvite, setShowInvite]     = useState(false);
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteRole, setInviteRole]     = useState('member');
  const [boardName, setBoardName]       = useState('');
  const [showBoardForm, setShowBoardForm] = useState(false);

  const invite       = useInviteMember(projectId!);
  const updateRole   = useUpdateMemberRole(projectId!);
  const removeMember = useRemoveMember(projectId!);

  const isAdmin = members.some(m => m.userId === currentUserId && m.role === 'admin');
  const isOwner = members.some(m => m.userId === currentUserId && m.isOwner);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    invite.mutate(
      { email: inviteEmail.trim(), role: inviteRole },
      { onSuccess: () => { setInviteEmail(''); setInviteRole('member'); setShowInvite(false); } }
    );
  };

  const { data: project, isLoading } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectService.getById(projectId!),
    enabled: !!projectId,
  });

  const { data: boards = [] } = useQuery({
    queryKey: ['boards', projectId],
    queryFn: () => boardService.listByProject(projectId!),
    enabled: !!projectId,
  });

  const createBoard = useMutation({
    mutationFn: (name: string) => boardService.create(projectId!, { name }),
    onSuccess: (board) => {
      qc.invalidateQueries({ queryKey: ['boards', projectId] });
      setShowBoardForm(false);
      setBoardName('');
      navigate(`/projects/${projectId}/boards/${board.boardId}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#6366F1', borderTopColor: 'transparent' }} />
      </div>
    );
  }
  if (!project) return <div className="p-6 text-sm" style={{ color: '#52525B' }}>Proyecto no encontrado.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 text-xs font-medium mb-4 transition-colors duration-150"
          style={{ color: '#52525B' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#A1A1AA'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#52525B'; }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Proyectos
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#FAFAFA', letterSpacing: '-0.02em' }}>
              {project.name}
            </h1>
            {project.description && (
              <p className="text-sm mt-1" style={{ color: '#71717A' }}>{project.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] tabular-nums" style={{ color: '#3F3F46', fontFamily: "'JetBrains Mono', monospace" }}>
                Creado {formatDate(project.createdAt)}
              </span>
              <span className="text-[10px]" style={{ color: '#27272A' }}>·</span>
              <span className="text-[10px]" style={{ color: '#3F3F46' }}>
                {project.members.length} miembro{project.members.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <span
            className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
            style={
              project.status === 'active'
                ? { background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.2)' }
                : { background: 'rgba(113,113,122,0.12)', color: '#71717A', border: '1px solid rgba(113,113,122,0.2)' }
            }
          >
            {project.status === 'active' ? 'Activo' : 'Archivado'}
          </span>
        </div>
      </div>

      {/* ── Members panel ────────────────────────────────────────────────────── */}
      <div className="rounded-xl p-5 mb-6" style={{ background: '#111113', border: '1px solid #1C1C1F' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm flex items-center gap-2" style={{ color: '#E4E4E7' }}>
            <Users className="w-4 h-4" style={{ color: '#818CF8' }} />
            Colaboradores
            <span
              className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-md"
              style={{ background: '#1C1C1F', color: '#52525B', fontFamily: "'JetBrains Mono', monospace" }}
            >
              {members.length}
            </span>
          </h2>
          {isAdmin && (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', color: '#818CF8' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.12)'; }}
            >
              <UserPlus className="w-3.5 h-3.5" /> Invitar
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          {members.map(m => {
            const rc = ROLE_COLORS[m.role] ?? ROLE_COLORS.member;
            const initials = (m.name || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
            return (
              <div
                key={m.userId}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1C1C1F' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden font-bold text-xs"
                    style={{ background: '#4F46E5', color: '#FAFAFA' }}
                  >
                    {m.avatar
                      ? <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                      : initials
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium flex items-center gap-1.5 truncate" style={{ color: '#E4E4E7' }}>
                      {m.name}
                      {m.isOwner && <Crown className="w-3 h-3 shrink-0" style={{ color: '#FBBF24' }} />}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: '#52525B' }}>{m.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isAdmin && !m.isOwner ? (
                    <select
                      value={m.role}
                      disabled={updateRole.isPending}
                      onChange={e => updateRole.mutate({ memberId: m.userId, role: e.target.value })}
                      className="text-xs rounded-lg px-2 py-1 font-semibold cursor-pointer transition-all duration-150 focus:outline-none"
                      style={{ background: '#1C1C1F', border: '1px solid #27272A', color: '#A1A1AA' }}
                    >
                      {isOwner && <option value="admin">Administrador</option>}
                      <option value="member">Miembro</option>
                      <option value="viewer">Observador</option>
                    </select>
                  ) : (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}
                    >
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                  )}

                  {isAdmin && !m.isOwner && (
                    <button
                      onClick={() => { if (confirm(`¿Quitar a ${m.name} del proyecto?`)) removeMember.mutate(m.userId); }}
                      disabled={removeMember.isPending}
                      className="p-1.5 rounded-lg cursor-pointer transition-all duration-150 disabled:opacity-40"
                      style={{ color: '#52525B' }}
                      title="Quitar del proyecto"
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#F87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.10)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#52525B'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Boards section ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-sm flex items-center gap-2" style={{ color: '#E4E4E7' }}>
          <LayoutGrid className="w-4 h-4" style={{ color: '#818CF8' }} />
          Tableros Kanban
        </h2>
        <button
          onClick={() => setShowBoardForm(true)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150"
          style={{ background: '#6366F1', color: '#FAFAFA' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#4F46E5'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#6366F1'; }}
        >
          <Plus className="w-3.5 h-3.5" /> Nuevo tablero
        </button>
      </div>

      {boards.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed #27272A' }}
        >
          <div className="inline-flex p-3 rounded-xl mb-3" style={{ background: 'rgba(99,102,241,0.08)' }}>
            <LayoutGrid className="w-8 h-8" style={{ color: '#4F46E5' }} />
          </div>
          <p className="font-semibold text-sm" style={{ color: '#A1A1AA' }}>Sin tableros</p>
          <p className="text-xs mt-1" style={{ color: '#52525B' }}>
            Crea tu primer tablero Kanban para organizar tareas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {boards.map(board => (
            <Link
              key={board.boardId}
              to={`/projects/${projectId}/boards/${board.boardId}`}
              className="group rounded-xl p-4 transition-all duration-150"
              style={{ background: '#111113', border: '1px solid #1C1C1F' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1C1C1F'; }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.10)' }}>
                  <LayoutGrid className="w-4 h-4" style={{ color: '#818CF8' }} />
                </div>
                <h3 className="font-semibold text-sm transition-colors duration-150"
                  style={{ color: '#E4E4E7' }}>
                  {board.name}
                </h3>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {board.columns.map(col => (
                  <span
                    key={col.columnId}
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-medium"
                    style={{ background: '#1C1C1F', color: '#52525B' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: col.color ?? '#52525B' }} />
                    {col.name}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Invite modal ─────────────────────────────────────────────────────── */}
      {showInvite && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        >
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#111113', border: '1px solid #27272A' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-sm flex items-center gap-2" style={{ color: '#FAFAFA' }}>
                <UserPlus className="w-4 h-4" style={{ color: '#818CF8' }} />
                Invitar colaborador
              </h2>
              <button
                onClick={() => setShowInvite(false)}
                className="p-1.5 rounded-lg cursor-pointer transition-all duration-150"
                style={{ color: '#52525B' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FAFAFA'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#52525B'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#71717A' }}>
                  Email del colaborador
                </label>
                <input
                  autoFocus
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colaborador@empresa.com"
                  className={inputCls}
                  style={{ background: '#0D0D10', borderColor: '#27272A', color: '#FAFAFA' }}
                  onFocus={e => { (e.target as HTMLElement).style.borderColor = '#6366F1'; }}
                  onBlur={e => { (e.target as HTMLElement).style.borderColor = '#27272A'; }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#71717A' }}>
                  Rol
                </label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="w-full text-sm rounded-lg px-3.5 py-2.5 font-medium cursor-pointer focus:outline-none transition-all duration-150"
                  style={{ background: '#0D0D10', border: '1px solid #27272A', color: '#A1A1AA' }}
                >
                  <option value="member">Miembro - puede crear y editar tareas</option>
                  {isOwner && <option value="admin">Administrador - control total</option>}
                  <option value="viewer">Observador - solo lectura</option>
                </select>
              </div>

              {invite.isError && (
                <p className="text-xs" style={{ color: '#F87171' }}>
                  No se pudo enviar la invitacion. Verifica el email e intenta de nuevo.
                </p>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-150"
                  style={{ color: '#71717A' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FAFAFA'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#71717A'; }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={invite.isPending || !inviteEmail.trim()}
                  className="px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                  style={{ background: '#6366F1', color: '#FAFAFA' }}
                  onMouseEnter={e => { if (!invite.isPending) (e.currentTarget as HTMLElement).style.background = '#4F46E5'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#6366F1'; }}
                >
                  {invite.isPending ? 'Invitando...' : 'Enviar invitacion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create board modal ────────────────────────────────────────────────── */}
      {showBoardForm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        >
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#111113', border: '1px solid #27272A' }}>
            <h2 className="font-bold text-sm mb-4" style={{ color: '#FAFAFA' }}>Nuevo tablero</h2>
            <form onSubmit={e => { e.preventDefault(); if (boardName.trim()) createBoard.mutate(boardName.trim()); }}>
              <input
                autoFocus
                value={boardName}
                onChange={e => setBoardName(e.target.value)}
                placeholder="Nombre del tablero"
                className={inputCls + ' mb-4'}
                style={{ background: '#0D0D10', borderColor: '#27272A', color: '#FAFAFA' }}
                onFocus={e => { (e.target as HTMLElement).style.borderColor = '#6366F1'; }}
                onBlur={e => { (e.target as HTMLElement).style.borderColor = '#27272A'; }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowBoardForm(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-150"
                  style={{ color: '#71717A' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FAFAFA'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#71717A'; }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createBoard.isPending || !boardName.trim()}
                  className="px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                  style={{ background: '#6366F1', color: '#FAFAFA' }}
                  onMouseEnter={e => { if (!createBoard.isPending) (e.currentTarget as HTMLElement).style.background = '#4F46E5'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#6366F1'; }}
                >
                  {createBoard.isPending ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
