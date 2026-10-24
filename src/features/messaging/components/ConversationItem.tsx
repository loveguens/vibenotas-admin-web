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

  const preview = conversation.ultimo_mensaje?.trim() || "Sin mensajes todavía";

  const online =
    !isGroup &&
    (conversation.presencia?.online ??
      String(
        conversation.presencia?.status ?? conversation.presencia?.estado ?? "",
      ).toUpperCase() === "ONLINE");

  return (
    <button
      type="button"
      onClick={onClick}
      className={`vn-chat-conversation-item group flex w-full items-center gap-3 rounded-[18px] border px-3 py-3.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 ${
        selected
          ? "border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50/40 shadow-sm dark:border-violet-400/30 dark:from-violet-500/20 dark:to-violet-500/5"
          : "border-transparent hover:border-slate-200/70 hover:bg-slate-50 dark:hover:border-white/10 dark:hover:bg-white/[0.05]"
      }`}
      aria-current={selected ? "page" : undefined}
      title={`Abrir conversación con ${title}`}
    >
      <Avatar
        name={title}
        src={
          isGroup ? conversation.avatar_url : conversation.otro_usuario_avatar
        }
        group={isGroup}
        online={online}
        size="md"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <p
              className={`truncate text-sm ${
                unreadCount > 0
                  ? "font-black text-slate-950 dark:text-white"
                  : "font-bold text-slate-800 dark:text-slate-200"
              }`}
            >
              {title}
            </p>

            {conversation.isPinned && (
              <Pin
                size={11}
                className="shrink-0 fill-violet-500 text-violet-500"
              />
            )}

            {conversation.isMuted && (
              <BellOff size={11} className="shrink-0 text-slate-400" />
            )}
          </div>

          <span
            className={`shrink-0 text-[10px] font-semibold ${
              unreadCount > 0
                ? "text-violet-600 dark:text-violet-300"
                : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {lastMessageDate}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2">
          <p
            className={`min-w-0 flex-1 truncate text-xs ${
              unreadCount > 0
                ? "font-semibold text-slate-700 dark:text-slate-300"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {preview}
          </p>

          {unreadCount > 0 && (
            <span className="flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 px-1.5 text-[10px] font-black text-white shadow-sm shadow-violet-600/30">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
