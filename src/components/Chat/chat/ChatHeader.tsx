import {
  ArrowLeft,
  LockKeyhole,
  MoreVertical,
  Pin,
  Users,
} from "lucide-react";
import type { Conversation } from "../features/types";
import { Avatar } from "./Avatar";

type ChatHeaderProps = {
  conversation: Conversation;
  isPinned: boolean;
  isMuted?: boolean;
  onBack: () => void;
  onOpenInfo: () => void;
  onOpenMenu: (button: HTMLButtonElement) => void;
};

export function ChatHeader({
  conversation,
  isPinned,
  isMuted = false,
  onBack,
  onOpenInfo,
  onOpenMenu,
}: ChatHeaderProps) {
  const isGroup = conversation.tipo === "grupo";

  const title = isGroup
    ? conversation.titulo?.trim() || "Grupo sin nombre"
    : conversation.otro_usuario_nombre?.trim() || "Usuario";

  const subtitle = isGroup
    ? "Grupo de conversación"
    : isMuted
      ? "Notificaciones silenciadas"
      : "En línea · Conversación protegida";

  return (
    <header className="flex items-center gap-3 border-b border-slate-800 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-violet-950/20 px-4 py-3.5 backdrop-blur-xl sm:px-6">
      <button
        type="button"
        onClick={onBack}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
        aria-label="Volver a conversaciones"
        title="Volver a conversaciones"
      >
        <ArrowLeft size={19} />
      </button>

      <button
        type="button"
        onClick={onOpenInfo}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-left outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-violet-400/50"
        title="Ver información del chat"
      >
        <Avatar
          name={title}
          src={isGroup ? null : conversation.otro_usuario_avatar}
          group={isGroup}
          online={!isGroup && !isMuted}
        />

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-bold text-white sm:text-base">
              {title}
            </h2>

            {isPinned && (
              <Pin
                size={13}
                className="shrink-0 fill-violet-300 text-violet-300"
                aria-label="Conversación fijada"
              />
            )}
          </div>

          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-400">
            {isGroup ? (
              <Users size={12} className="shrink-0 text-sky-300" />
            ) : (
              <LockKeyhole size={11} className="shrink-0 text-emerald-300" />
            )}

            <span>{subtitle}</span>
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpenMenu(event.currentTarget);
        }}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:ring-2 focus-visible:ring-violet-400/50"
        aria-label="Opciones del chat"
        title="Opciones del chat"
      >
        <MoreVertical size={20} />
      </button>
    </header>
  );
}