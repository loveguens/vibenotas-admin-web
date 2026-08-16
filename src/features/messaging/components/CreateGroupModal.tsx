import { Check, Search, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Friend } from "../types/chat.types";
import { Avatar } from "./Avatar";

type CreateGroupModalProps = {
  open: boolean;
  friends: Friend[];
  creating: boolean;
  onClose: () => void;
  onCreate: (name: string, memberIds: string[]) => void;
};

export function CreateGroupModal({
  open,
  friends,
  creating,
  onClose,
  onCreate,
}: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setName("");
      setQuery("");
      setMemberIds([]);
    }
  }, [open]);

  const filteredFriends = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return friends;
    }

    return friends.filter((friend) => {
      const searchableText = `${friend.nombre} ${friend.correo}`.toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [friends, query]);

  function toggleMember(userId: string) {
    setMemberIds((current) => {
      if (current.includes(userId)) {
        return current.filter((id) => id !== userId);
      }

      return [...current, userId];
    });
  }

  function handleClose() {
    if (creating) return;

    onClose();
  }

  function handleSubmit() {
    const groupName = name.trim();

    if (!groupName || memberIds.length < 1 || creating) {
      return;
    }

    onCreate(groupName, memberIds);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10020] flex items-end bg-slate-950/75 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={handleClose}
        disabled={creating}
        aria-label="Cerrar creación de grupo"
      />

      <section className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[32px] border border-slate-700 bg-[#111827] shadow-2xl shadow-black/60 sm:rounded-[32px]">
        <header className="flex items-start justify-between gap-4 border-b border-slate-800 p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-400">
              Nuevo espacio
            </p>

            <h3 className="mt-1 text-xl font-bold text-white">Crear grupo</h3>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Elige un nombre y agrega al menos una persona.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={creating}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            title="Cerrar"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-5 overflow-y-auto p-6">
          <label className="block text-sm font-bold text-slate-200">
            Nombre del grupo
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              disabled={creating}
              placeholder="Ej.: Equipo de contenido"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <span className="mt-1 block text-right text-[10px] font-normal text-slate-600">
              {name.length}/80
            </span>
          </label>

          <div>
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                disabled={creating}
                placeholder="Buscar amigos..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <p className="mt-3 text-xs font-bold text-slate-400">
              {memberIds.length}{" "}
              {memberIds.length === 1
                ? "miembro seleccionado"
                : "miembros seleccionados"}
            </p>
          </div>

          <div className="space-y-2">
            {filteredFriends.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 p-6 text-center">
                <Users size={24} className="mx-auto mb-2 text-slate-600" />

                <p className="text-sm font-semibold text-slate-300">
                  No encontramos amigos
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Prueba con otro nombre o agrega amigos antes de crear un
                  grupo.
                </p>
              </div>
            ) : (
              filteredFriends.map((friend) => {
                const selected = memberIds.includes(friend.usuario_id);

                return (
                  <button
                    key={friend.amistad_id}
                    type="button"
                    disabled={creating}
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
            disabled={creating}
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!name.trim() || memberIds.length < 1 || creating}
            onClick={handleSubmit}
            className="flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Users size={16} />
            {creating ? "Creando grupo..." : "Crear grupo"}
          </button>
        </footer>
      </section>
    </div>
  );
}
