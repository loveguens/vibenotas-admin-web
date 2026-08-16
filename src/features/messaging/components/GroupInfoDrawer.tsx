import {
  Crown,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { Conversation } from "../types/chat.types";
import { Avatar } from "./Avatar";

type GroupMember = {
  usuario_id: string;
  rol: "admin" | "miembro";
  nombre: string;
  correo: string;
  foto_perfil?: string | null;
};

type GroupInfoDrawerProps = {
  open: boolean;
  conversation: Conversation | null;
  members: GroupMember[];
  loading: boolean;
  isAdmin?: boolean;
  onClose: () => void;
  onAddMember?: () => void;
  onRemoveMember?: (userId: string) => void;
  onMakeAdmin?: (userId: string) => void;
};

export function GroupInfoDrawer({
  open,
  conversation,
  members,
  loading,
  isAdmin = true,
  onClose,
  onAddMember,
  onRemoveMember,
}: GroupInfoDrawerProps) {
  if (!open || !conversation) {
    return null;
  }

  const title = conversation.titulo?.trim() || "Grupo sin nombre";

  return (
    <div className="fixed inset-0 z-[10021] bg-slate-950/75 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Cerrar informaciÃƒÂ³n del grupo"
      />

      <aside className="absolute bottom-0 right-0 flex h-[min(92vh,820px)] w-full max-w-md flex-col rounded-t-[32px] border border-slate-700 bg-[#111827] shadow-2xl shadow-black/60 sm:bottom-auto sm:top-0 sm:h-full sm:rounded-none">
        <header className="border-b border-slate-800 bg-[radial-gradient(circle_at_top,#0ea5e930,transparent_62%)] p-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <Avatar name={title} size="lg" group />

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-bold text-white">{title}</h3>

              <p className="mt-1 text-sm text-slate-400">
                AdministraciÃƒÂ³n y miembros del grupo
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Miembros
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {members.length} total
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Lista actualizada de participantes del grupo.
                </p>
              </div>

              {isAdmin && onAddMember && (
                <button
                  type="button"
                  onClick={onAddMember}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-300 transition hover:bg-sky-500/20"
                  title="AÃƒÂ±adir miembro"
                  aria-label="AÃƒÂ±adir miembro"
                >
                  <UserPlus size={18} />
                </button>
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Participantes</h4>

              <span className="rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-bold text-slate-400">
                {members.length + 1} total
              </span>
            </div>

            <div className="space-y-2">
              {loading ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/35 p-5 text-center text-sm text-slate-500">
                  Cargando integrantes del grupo...
                </div>
              ) : (
                members.map((member) => {
                  const memberIsAdmin = member.rol === "admin";

                  return (
                    <article
                      key={member.usuario_id}
                      className={`flex items-center gap-3 rounded-2xl border p-3 ${
                        memberIsAdmin
                          ? "border-violet-400/20 bg-violet-500/10"
                          : "border-slate-800 bg-slate-900/35"
                      }`}
                    >
                      <Avatar
                        name={member.nombre}
                        src={member.foto_perfil}
                        size="sm"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">
                          {member.nombre}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {member.correo}
                        </p>
                      </div>

                      {memberIsAdmin ? (
                        <span className="flex items-center gap-1 rounded-lg bg-amber-400/10 px-2 py-1 text-[10px] font-bold text-amber-300">
                          <Crown size={13} />
                          Admin
                        </span>
                      ) : isAdmin && onRemoveMember ? (
                        <button
                          type="button"
                          onClick={() => onRemoveMember(member.usuario_id)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-red-500/10 hover:text-red-300"
                          title={`Eliminar a ${member.nombre}`}
                          aria-label={`Eliminar a ${member.nombre}`}
                        >
                          <UserMinus size={16} />
                        </button>
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/70 text-slate-500">
                          <Users size={16} />
                        </span>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/35 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck size={19} className="mt-0.5 shrink-0 text-sky-300" />

              <div>
                <p className="text-sm font-bold text-white">
                  Permisos del grupo
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Los administradores podrÃƒÂ¡n aÃƒÂ±adir miembros, quitar
                  miembros, cambiar el nombre y administrar la configuraciÃƒÂ³n
                  del grupo.
                </p>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
