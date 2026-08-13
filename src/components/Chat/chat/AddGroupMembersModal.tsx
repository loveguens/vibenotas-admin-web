import { Check, Search, UserPlus, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Friend } from "../features/types";
import { Avatar } from "./Avatar";

type AddGroupMembersModalProps = {
  open: boolean;
  friends: Friend[];
  existingMemberIds?: number[];
  saving: boolean;
  onClose: () => void;
  onAdd: (memberIds: number[]) => void;
};

export function AddGroupMembersModal({
  open,
  friends,
  existingMemberIds = [],
  saving,
  onClose,
  onAdd,
}: AddGroupMembersModalProps) {
  const [query, setQuery] = useState("");
  const [memberIds, setMemberIds] = useState<number[]>([]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setMemberIds([]);
    }
  }, [open]);

  const availableFriends = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return friends.filter((friend) => {
      const alreadyInGroup = existingMemberIds.includes(friend.usuario_id);

      if (alreadyInGroup) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return `${friend.nombre} ${friend.correo}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [existingMemberIds, friends, query]);

  function toggleMember(userId: number) {
    setMemberIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  function handleClose() {
    if (saving) return;

    onClose();
  }

  function handleSubmit() {
    if (saving || memberIds.length === 0) return;

    onAdd(memberIds);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10030] flex items-end bg-slate-950/75 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        onClick={handleClose}
        disabled={saving}
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar agregar personas"
      />

      <section className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[32px] border border-slate-700 bg-[#111827] shadow-2xl shadow-black/60 sm:rounded-[32px]">
        <header className="flex items-start justify-between gap-4 border-b border-slate-800 p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-400">
              Grupo
            </p>

            <h3 className="mt-1 text-xl font-bold text-white">
              Agregar personas
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Selecciona los amigos que quieres invitar al grupo.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-5 overflow-y-auto p-6">
          <div>
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                disabled={saving}
                placeholder="Buscar amigos..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <p className="mt-3 text-xs font-bold text-slate-400">
              {memberIds.length}{" "}
              {memberIds.length === 1
                ? "persona seleccionada"
                : "personas seleccionadas"}
            </p>
          </div>

          <div className="space-y-2">
            {availableFriends.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 p-6 text-center">
                <Users size={24} className="mx-auto mb-2 text-slate-600" />

                <p className="text-sm font-semibold text-slate-300">
                  No hay amigos disponibles
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Todos tus amigos ya están en el grupo o no se encontró nadie.
                </p>
              </div>
            ) : (
              availableFriends.map((friend) => {
                const selected = memberIds.includes(friend.usuario_id);

                return (
                  <button
                    key={friend.amistad_id}
                    type="button"
                    disabled={saving}
                    onClick={() => toggleMember(friend.usuario_id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      selected
                        ? "border-violet-400/45 bg-violet-500/10"
                        : "border-slate-800 bg-slate-900/45 hover:border-slate-600 hover:bg-slate-800/70"
                    }`}
                    aria-pressed={selected}
                  >
                    <Avatar
                      name={friend.nombre}
                      src={friend.avatar}
                      size="sm"
                    />

                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm text-white">
                        {friend.nombre}
                      </strong>

                      <small className="mt-0.5 block truncate text-xs text-slate-500">
                        {friend.correo}
                      </small>
                    </span>

                    {selected && (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                        <Check size={18} />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-800 p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={saving || memberIds.length === 0}
            onClick={handleSubmit}
            className="flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <UserPlus size={16} />
            {saving ? "Agregando..." : "Agregar al grupo"}
          </button>
        </footer>
      </section>
    </div>
  );
}