import {
  ChevronDown,
  ChevronUp,
  Crown,
  LogOut,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { useEffect, useState } from "react";

import type { Conversation, GroupMember, GroupRole } from "../types/chat.types";

import { Avatar } from "./Avatar";

type GroupInfoDrawerProps = {
  open: boolean;
  conversation: Conversation | null;

  members: GroupMember[];
  loading: boolean;

  myRole: GroupRole | null;

  savingMetadata?: boolean;

  onClose: () => void;

  onAddMember?: () => void;

  onRemoveMember?: (userId: string) => void;

  onPromoteMember?: (userId: string) => void;

  onDemoteMember?: (userId: string) => void;

  onTransferOwnership?: (userId: string) => void;

  onLeaveGroup?: () => void;

  onUpdateMetadata?: (changes: {
    title?: string;
    avatarUrl?: string | null;
  }) => void;

  onDeleteGroup?: () => void;
};

export function GroupInfoDrawer({
  open,
  conversation,
  members,
  loading,
  myRole,
  savingMetadata = false,
  onClose,
  onAddMember,
  onRemoveMember,
  onPromoteMember,
  onDemoteMember,
  onTransferOwnership,
  onLeaveGroup,
  onUpdateMetadata,
  onDeleteGroup,
}: GroupInfoDrawerProps) {
  if (!open || !conversation) {
    return null;
  }

  const title = conversation.titulo?.trim() || "Grupo sin nombre";

  const [editedTitle, setEditedTitle] = useState(title);

  const [avatarUrl, setAvatarUrl] = useState(conversation.avatar_url ?? "");

  useEffect(() => {
    setEditedTitle(conversation.titulo?.trim() || "Grupo sin nombre");

    setAvatarUrl(conversation.avatar_url ?? "");
  }, [conversation.id, conversation.titulo, conversation.avatar_url]);

  const isOwner = myRole === "owner";

  const isAdmin = myRole === "admin";

  const canManageMembers = isOwner || isAdmin;

  function getRoleLabel(role: GroupRole): string {
    if (role === "owner") {
      return "Propietario";
    }

    if (role === "admin") {
      return "Admin";
    }

    return "Miembro";
  }

  return (
    <div className="fixed inset-0 z-[10021] bg-slate-950/35 dark:bg-slate-950/75 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Cerrar información del grupo"
      />

      <aside className="absolute bottom-0 right-0 flex h-[min(92vh,820px)] w-full max-w-md flex-col rounded-t-[32px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-2xl shadow-black/60 sm:bottom-auto sm:top-0 sm:h-full sm:rounded-none">
        <header className="border-b border-slate-200 dark:border-slate-800 bg-[radial-gradient(circle_at_top,#0ea5e930,transparent_62%)] p-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <Avatar name={title} size="lg" group />

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-bold text-slate-950 dark:text-white">
                {title}
              </h3>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Administración y miembros del grupo
              </p>

              {myRole && (
                <p className="mt-2 text-xs font-semibold text-sky-300">
                  Tu rol: {getRoleLabel(myRole)}
                </p>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <section className="mb-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Miembros
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                  {members.length} total
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Participantes activos del grupo.
                </p>
              </div>

              {canManageMembers && onAddMember && (
                <button
                  type="button"
                  onClick={onAddMember}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-300 transition hover:bg-sky-500/20"
                  title="Añadir miembro"
                  aria-label="Añadir miembro"
                >
                  <UserPlus size={18} />
                </button>
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-950 dark:text-white">
                Participantes
              </h4>

              <span className="rounded-lg bg-white dark:bg-slate-900 px-2 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {members.length}
              </span>
            </div>

            <div className="space-y-2">
              {loading ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/35 p-5 text-center text-sm text-slate-500">
                  Cargando integrantes del grupo...
                </div>
              ) : (
                members.map((member) => {
                  const memberIsOwner = member.rol === "owner";

                  const memberIsAdmin = member.rol === "admin";

                  const isCurrentMember = member.es_miembro_actual;

                  const canRemove =
                    !isCurrentMember &&
                    !memberIsOwner &&
                    (isOwner || (isAdmin && member.rol === "member"));

                  const canPromote =
                    isOwner && !isCurrentMember && member.rol === "member";

                  const canDemote =
                    isOwner && !isCurrentMember && member.rol === "admin";

                  const canTransfer =
                    isOwner && !isCurrentMember && !memberIsOwner;

                  return (
                    <article
                      key={member.id}
                      className={`rounded-2xl border p-3 ${
                        memberIsOwner
                          ? "border-amber-400/25 bg-amber-500/10"
                          : memberIsAdmin
                            ? "border-violet-400/20 bg-violet-500/10"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/35"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={member.usuario.nombre}
                          src={member.usuario.avatar_url}
                          size="sm"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
                            {member.usuario.nombre}

                            {isCurrentMember && (
                              <span className="ml-2 text-xs font-medium text-sky-300">
                                Tú
                              </span>
                            )}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {getRoleLabel(member.rol)}
                          </p>
                        </div>

                        {canManageMembers && onUpdateMetadata && (
                          <section className="mb-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                              Información del grupo
                            </p>

                            <label className="mt-4 block text-xs font-bold text-slate-700 dark:text-slate-300">
                              Nombre
                              <input
                                value={editedTitle}
                                maxLength={120}
                                disabled={savingMetadata}
                                onChange={(event) =>
                                  setEditedTitle(event.target.value)
                                }
                                className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-950 dark:text-white outline-none focus:border-violet-400"
                              />
                            </label>

                            <label className="mt-4 block text-xs font-bold text-slate-700 dark:text-slate-300">
                              URL de la foto
                              <input
                                type="url"
                                value={avatarUrl}
                                disabled={savingMetadata}
                                onChange={(event) =>
                                  setAvatarUrl(event.target.value)
                                }
                                placeholder="https://..."
                                className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-950 dark:text-white outline-none focus:border-violet-400"
                              />
                            </label>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={savingMetadata || !editedTitle.trim()}
                                onClick={() =>
                                  onUpdateMetadata({
                                    title: editedTitle.trim(),

                                    avatarUrl: avatarUrl.trim()
                                      ? avatarUrl.trim()
                                      : null,
                                  })
                                }
                                className="rounded-xl bg-violet-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-400 disabled:opacity-40"
                              >
                                {savingMetadata
                                  ? "Guardando..."
                                  : "Guardar cambios"}
                              </button>

                              {conversation.avatar_url && (
                                <button
                                  type="button"
                                  disabled={savingMetadata}
                                  onClick={() => {
                                    setAvatarUrl("");

                                    onUpdateMetadata({
                                      avatarUrl: null,
                                    });
                                  }}
                                  className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
                                >
                                  Quitar foto
                                </button>
                              )}
                            </div>
                          </section>
                        )}

                        {memberIsOwner ? (
                          <span className="flex items-center gap-1 rounded-lg bg-amber-400/10 px-2 py-1 text-[10px] font-bold text-amber-300">
                            <Crown size={13} />
                            Owner
                          </span>
                        ) : memberIsAdmin ? (
                          <span className="flex items-center gap-1 rounded-lg bg-violet-400/10 px-2 py-1 text-[10px] font-bold text-violet-300">
                            <ShieldCheck size={13} />
                            Admin
                          </span>
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/70 text-slate-500">
                            <Users size={16} />
                          </span>
                        )}
                      </div>

                      {(canRemove ||
                        canPromote ||
                        canDemote ||
                        canTransfer) && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 dark:border-slate-800/70 pt-3">
                          {canPromote && onPromoteMember && (
                            <button
                              type="button"
                              onClick={() => onPromoteMember(member.usuario.id)}
                              className="flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-2.5 py-1.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20"
                            >
                              <ChevronUp size={14} />
                              Hacer admin
                            </button>
                          )}

                          {canDemote && onDemoteMember && (
                            <button
                              type="button"
                              onClick={() => onDemoteMember(member.usuario.id)}
                              className="flex items-center gap-1.5 rounded-lg bg-slate-700/40 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700/70"
                            >
                              <ChevronDown size={14} />
                              Quitar admin
                            </button>
                          )}

                          {canTransfer && onTransferOwnership && (
                            <button
                              type="button"
                              onClick={() =>
                                onTransferOwnership(member.usuario.id)
                              }
                              className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
                            >
                              <Crown size={14} />
                              Transferir propiedad
                            </button>
                          )}

                          {canRemove && onRemoveMember && (
                            <button
                              type="button"
                              onClick={() => onRemoveMember(member.usuario.id)}
                              className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
                            >
                              <UserMinus size={14} />
                              Quitar
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <section className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/35 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck size={19} className="mt-0.5 shrink-0 text-sky-300" />

              <div>
                <p className="text-sm font-bold text-slate-950 dark:text-white">
                  Permisos del grupo
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  El propietario administra roles y propiedad. Los
                  administradores pueden gestionar miembros.
                </p>
              </div>
            </div>
          </section>

          {isOwner ? (
            <section className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs leading-5 text-amber-200/80">
                Como propietario no puedes salir del grupo hasta transferir
                primero la propiedad a otro miembro.
              </p>
            </section>
          ) : (
            onLeaveGroup && (
              <button
                type="button"
                onClick={onLeaveGroup}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/10"
              >
                <LogOut size={17} />
                Salir del grupo
              </button>
            )
          )}

          {isOwner && onDeleteGroup && (
            <button
              type="button"
              onClick={onDeleteGroup}
              className="mt-4 flex w-full items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/20"
            >
              Eliminar grupo
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
