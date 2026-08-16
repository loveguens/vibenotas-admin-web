import { BellOff, Pin } from "lucide-react";
import type { Conversation } from "../types/chat.types";
import { formatChatDate } from "../utils";
import { Avatar } from "./Avatar";

type ConversationItemProps = {
  conversation: Conversation;
  selected: boolean;
  onClick: () => void;
};

export function ConversationItem({
  conversation,
  selected,
  onClick,
}: ConversationItemProps) {
  const isGroup = conversation.tipo === "grupo";

  const title = isGroup
    ? conversation.titulo?.trim() || "Grupo sin nombre"
    : conversation.otro_usuario_nombre?.trim() || "Usuario";

  const unreadCount = Number(conversation.no_leidos ?? 0);

  const lastMessageDate = formatChatDate(
    conversation.ultimo_mensaje_fecha ?? conversation.actualizado_en,
  );

  const previewText =
    conversation.ultimo_mensaje?.trim() || "Sin mensajes todavía";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-1 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 ${
        selected
          ? "bg-violet-500/15 ring-1 ring-violet-400/25"
          : "hover:bg-slate-800/75"
      }`}
      aria-current={selected ? "page" : undefined}
      title={`Abrir conversación con ${title}`}
    >
      <Avatar
        name={title}
        src={isGroup ? null : conversation.otro_usuario_avatar}
        group={isGroup}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-sm font-bold text-white">{title}</p>

            {conversation.isPinned && (
              <span title="Conversación fijada">
                <Pin
                  size={12}
                  className="shrink-0 fill-violet-300 text-violet-300"
                />
              </span>
            )}

            {conversation.isMuted && (
              <span title="Notificaciones silenciadas">
                <BellOff size={12} className="shrink-0 text-slate-500" />
              </span>
            )}
          </div>

          <span
            className={`shrink-0 text-[11px] ${
              unreadCount > 0 ? "text-violet-300" : "text-slate-500"
            }`}
          >
            {lastMessageDate}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2">
          <p
            className={`min-w-0 flex-1 truncate text-xs ${
              unreadCount > 0 ? "font-medium text-slate-200" : "text-slate-400"
            }`}
          >
            {previewText}
          </p>

          {unreadCount > 0 && (
            <span className="flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-violet-500 px-1.5 text-[10px] font-bold text-white shadow-sm shadow-violet-500/30">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
