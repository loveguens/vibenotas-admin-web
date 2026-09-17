import { Check, Forward, Search, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { Conversation, Friend, Message } from "../types/chat.types";
import { Avatar } from "./Avatar";

type ForwardTarget =
  | {
      type: "friend";
      id: string;
    }
  | {
      type: "group";
      id: string;
    };

type ForwardMessageModalProps = {
  message: Message | null;
  friends: Friend[];
  conversations: Conversation[];
  loadingFriends: boolean;
  busy: boolean;
  onClose: () => void;
  onForward: (
    friendId: string | null,
    conversationId: string | null,
  ) => Promise<void>;
};

export function ForwardMessageModal({
  message,
  friends,
  conversations,
  loadingFriends,
  busy,
  onClose,
  onForward,
}: ForwardMessageModalProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ForwardTarget | null>(null);

  useEffect(() => {
    if (!message) {
      return;
    }

    setQuery("");
    setSelected(null);
  }, [message?.id]);

  const normalizedQuery = query.trim().toLowerCase();

  const visibleFriends = useMemo(() => {
    if (!normalizedQuery) {
      return friends;
    }

    return friends.filter((friend) =>
      `${friend.nombre} ${friend.username ?? ""}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [friends, normalizedQuery]);

  const groups = useMemo(() => {
    const available = conversations.filter(
      (conversation) =>
        conversation.tipo === "grupo" && !conversation.isArchived,
    );

    if (!normalizedQuery) {
      return available;
    }

    return available.filter((conversation) =>
      (conversation.titulo ?? "Grupo").toLowerCase().includes(normalizedQuery),
    );
  }, [conversations, normalizedQuery]);

  if (!message) {
    return null;
  }

  async function submit(): Promise<void> {
    if (!selected || busy) {
      return;
    }

    if (selected.type === "friend") {
      await onForward(selected.id, null);
      return;
    }

    await onForward(null, selected.id);
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !busy) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0b1220]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-950 dark:text-white">
              Reenviar mensaje
            </h2>

            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
              {message.contenido}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-slate-200 p-4 dark:border-white/10">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 dark:border-white/10 dark:bg-white/5">
            <Search size={17} className="shrink-0 text-slate-400" />

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar amigo o grupo..."
              className="h-11 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <section>
            <div className="mb-2 flex items-center gap-2 px-1">
              <Users size={15} className="text-violet-500" />

              <h3 className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Amigos
              </h3>
            </div>

            {loadingFriends ? (
              <p className="px-2 py-5 text-center text-sm text-slate-500">
                Cargando amigos...
              </p>
            ) : visibleFriends.length === 0 ? (
              <p className="px-2 py-5 text-center text-sm text-slate-500">
                No hay amigos que coincidan.
              </p>
            ) : (
              <div className="space-y-1">
                {visibleFriends.map((friend) => {
                  const isSelected =
                    selected?.type === "friend" &&
                    selected.id === friend.usuario_id;

                  return (
                    <button
                      key={friend.usuario_id}
                      type="button"
                      onClick={() =>
                        setSelected({
                          type: "friend",
                          id: friend.usuario_id,
                        })
                      }
                      disabled={busy}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-slate-100 disabled:opacity-60 dark:hover:bg-white/5"
                    >
                      <Avatar
                        name={friend.nombre}
                        src={friend.avatar}
                        size="sm"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {friend.nombre}
                        </p>

                        {friend.username && (
                          <p className="truncate text-xs text-slate-500">
                            @{friend.username}
                          </p>
                        )}
                      </div>

                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                          isSelected
                            ? "border-violet-500 bg-violet-500 text-white"
                            : "border-slate-300 text-transparent dark:border-slate-600"
                        }`}
                      >
                        <Check size={14} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-6">
            <div className="mb-2 flex items-center gap-2 px-1">
              <Users size={15} className="text-violet-500" />

              <h3 className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Grupos
              </h3>
            </div>

            {groups.length === 0 ? (
              <p className="px-2 py-5 text-center text-sm text-slate-500">
                No hay grupos que coincidan.
              </p>
            ) : (
              <div className="space-y-1">
                {groups.map((conversation) => {
                  const isSelected =
                    selected?.type === "group" &&
                    selected.id === conversation.id;

                  const name = conversation.titulo?.trim() || "Grupo";

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() =>
                        setSelected({
                          type: "group",
                          id: conversation.id,
                        })
                      }
                      disabled={busy}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-slate-100 disabled:opacity-60 dark:hover:bg-white/5"
                    >
                      <Avatar
                        name={name}
                        src={conversation.avatar_url}
                        size="sm"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {name}
                        </p>

                        <p className="text-xs text-slate-500">Grupo</p>
                      </div>

                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                          isSelected
                            ? "border-violet-500 bg-violet-500 text-white"
                            : "border-slate-300 text-transparent dark:border-slate-600"
                        }`}
                      >
                        <Check size={14} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-200 px-5 py-4 dark:border-white/10">
          <p className="text-xs font-semibold text-slate-500">
            {selected ? "1 destino seleccionado" : "Selecciona un destino"}
          </p>

          <button
            type="button"
            onClick={() => void submit()}
            disabled={!selected || busy}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Forward size={16} />

            {busy ? "Reenviando..." : "Reenviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
