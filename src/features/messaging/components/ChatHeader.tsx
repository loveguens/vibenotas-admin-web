import {
  ArrowLeft,
  BellOff,
  LockKeyhole,
  MoreVertical,
  Pin,
  Users,
} from "lucide-react";

import type { Conversation } from "../types/chat.types";
import { Avatar } from "./Avatar";

type ChatHeaderProps = {
  conversation: Conversation;
  isPinned: boolean;
  isMuted?: boolean;
  typingLabel?: string | null;
  presenceOnline?: boolean;
  lastSeenAt?: string | null;
  onBack: () => void;
  onOpenInfo: () => void;
  onOpenMenu: (button: HTMLButtonElement) => void;
};

function formatLastSeen(value?: string | null): string {
  if (!value) {
    return "Desconectado";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Desconectado";
  }

  return `?ltima vez ${date.toLocaleString()}`;
}

export function ChatHeader({
  conversation,
  isPinned,
  isMuted = false,
  typingLabel = null,
  presenceOnline = false,
  lastSeenAt = null,
  onBack,
  onOpenInfo,
  onOpenMenu,
}: ChatHeaderProps) {
  const isGroup = conversation.tipo === "grupo";

  const title = isGroup
    ? conversation.titulo?.trim() || "Grupo sin nombre"
    : conversation.otro_usuario_nombre?.trim() || "Usuario";

  let subtitle: string;

  if (typingLabel) {
    subtitle = typingLabel;
  } else if (isGroup) {
    subtitle = "Grupo de conversaci?n";
  } else if (isMuted) {
    subtitle = "Notificaciones silenciadas";
  } else if (presenceOnline) {
    subtitle = "En l?nea";
  } else {
    subtitle = formatLastSeen(lastSeenAt);
  }

  return (
    <header className="flex min-h-[72px] shrink-0 items-center gap-3 border-b border-slate-200 bg-white/95 px-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#0d1526]/95 sm:px-5">
      <button
        type="button"
        onClick={onBack}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white lg:hidden"
        aria-label="Volver a conversaciones"
      >
        <ArrowLeft size={19} />
      </button>

      <button
        type="button"
        onClick={onOpenInfo}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-left outline-none"
      >
        <Avatar
          name={title}
          src={
            isGroup ? conversation.avatar_url : conversation.otro_usuario_avatar
          }
          group={isGroup}
          online={!isGroup && presenceOnline}
        />

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-black text-slate-950 dark:text-white sm:text-base">
              {title}
            </h2>

            {isPinned && (
              <Pin
                size={12}
                className="shrink-0 fill-violet-500 text-violet-500"
              />
            )}

            {isMuted && (
              <BellOff size={12} className="shrink-0 text-slate-400" />
            )}
          </div>

          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
            {isGroup ? (
              <Users size={11} className="shrink-0 text-sky-500" />
            ) : presenceOnline ? (
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            ) : (
              <LockKeyhole size={10} className="shrink-0 text-emerald-500" />
            )}

            <p
              className={`truncate text-[11px] ${
                typingLabel
                  ? "font-semibold text-violet-600 dark:text-violet-300"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {subtitle}
            </p>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpenMenu(event.currentTarget);
        }}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
        aria-label="Opciones del chat"
      >
        <MoreVertical size={20} />
      </button>
    </header>
  );
}
