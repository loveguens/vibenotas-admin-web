import {
  Bell,
  Clock3,
  FolderOpen,
  MessageSquareText,
  Pin,
  ShieldAlert,
  Star,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { Conversation, TemporaryDuration } from "../types/chat.types";
import { Avatar } from "./Avatar";

type DrawerRowProps = {
  icon: typeof Bell;
  title: string;
  text: string;
  onClick?: () => void;
  disabled?: boolean;
};

type ChatInfoDrawerProps = {
  open: boolean;
  conversation: Conversation | null;
  muted: boolean;
  temporaryDuration: TemporaryDuration;
  onClose: () => void;
  onMute: () => void;
  onTheme: () => void;
  onTemporary: () => void;
  onOpenGroupInfo: () => void;
  onAddMembers?: () => void;
  onOpenProfile?: () => void;
  onOpenPinnedMessages?: () => void;
  onOpenSharedFiles?: () => void;
  onOpenFavorites?: () => void;
  onOpenPrivacy?: () => void;
};

function DrawerRow({
  icon: Icon,
  title,
  text,
  onClick,
  disabled = false,
}: DrawerRowProps) {
  const isClickable = Boolean(onClick) && !disabled;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={`flex w-full items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4 text-left transition ${
        isClickable
          ? "hover:border-violet-400/35 hover:bg-slate-800"
          : "cursor-default opacity-75"
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
        <Icon size={19} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-white">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {text}
        </span>
      </span>
    </button>
  );
}

function getTemporaryDurationLabel(duration: TemporaryDuration): string {
  const labels: Record<TemporaryDuration, string> = {
    off: "Desactivados",
    "24h": "24 horas",
    "7d": "7 días",
    "30d": "30 días",
    custom: "Personalizado",
  };

  return labels[duration] ?? "Desactivados";
}

export function ChatInfoDrawer({
  open,
  conversation,
  muted,
  temporaryDuration,
  onClose,
  onMute,
  onTheme,
  onTemporary,
  onOpenGroupInfo,
  onAddMembers,
  onOpenProfile,
  onOpenPinnedMessages,
  onOpenSharedFiles,
  onOpenFavorites,
  onOpenPrivacy,
}: ChatInfoDrawerProps) {
  if (!open || !conversation) {
    return null;
  }

  const isGroup = conversation.tipo === "grupo";

  const chatName = isGroup
    ? conversation.titulo?.trim() || "Grupo sin nombre"
    : conversation.otro_usuario_nombre?.trim() || "Usuario";

  const chatSubtitle = isGroup
    ? "Grupo de VibeNotas"
    : conversation.otro_usuario_correo || "Chat privado";

  return (
    <div className="fixed inset-0 z-[10010] bg-slate-950/75 backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar información del chat"
      />

      <aside className="absolute bottom-0 right-0 flex h-[min(92vh,820px)] w-full max-w-md flex-col rounded-t-[32px] border border-slate-700 bg-[#111827] shadow-2xl sm:bottom-auto sm:top-0 sm:h-full sm:rounded-none">
        <header className="border-b border-slate-800 bg-[radial-gradient(circle_at_top,#7c3aed35,transparent_62%)] px-6 pb-6 pt-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title="Cerrar"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!isGroup) {
                onOpenProfile?.();
              }
            }}
            className={`mx-auto flex flex-col items-center text-center ${
              !isGroup
                ? "rounded-2xl outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-violet-400/50"
                : "cursor-default"
            }`}
            disabled={isGroup}
          >
            <Avatar
              name={chatName}
              src={isGroup ? null : conversation.otro_usuario_avatar}
              size="xl"
              group={isGroup}
              online={!isGroup && !muted}
            />

            <h3 className="mt-4 text-xl font-bold text-white">{chatName}</h3>

            <p className="mt-1 text-sm text-slate-400">{chatSubtitle}</p>

            {!isGroup && (
              <span className="mt-2 text-[11px] font-medium text-violet-300">
                Ver perfil
              </span>
            )}
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          <DrawerRow
            icon={Bell}
            title={
              muted ? "Notificaciones silenciadas" : "Notificaciones activas"
            }
            text={
              muted
                ? "No recibirás alertas de nuevos mensajes."
                : "Recibirás alertas de nuevos mensajes."
            }
            onClick={onMute}
          />

          <DrawerRow
            icon={Clock3}
            title={`Mensajes temporales: ${getTemporaryDurationLabel(
              temporaryDuration,
            )}`}
            text="Configura cuándo deberían desaparecer los mensajes."
            onClick={onTemporary}
          />

          <DrawerRow
            icon={MessageSquareText}
            title="Tema del chat"
            text="Personaliza las burbujas, fondo y color de esta conversación."
            onClick={onTheme}
          />

          <DrawerRow
            icon={Star}
            title="Mensajes destacados"
            text="Consulta mensajes guardados o importantes."
            onClick={onOpenFavorites}
          />

          <DrawerRow
            icon={Pin}
            title="Mensajes fijados"
            text="Revisa mensajes importantes de esta conversación."
            onClick={onOpenPinnedMessages}
          />

          <DrawerRow
            icon={FolderOpen}
            title="Archivos compartidos"
            text="Imágenes, documentos, enlaces y archivos PDF."
            onClick={onOpenSharedFiles}
          />

          {isGroup ? (
            <>
              <DrawerRow
                icon={UserPlus}
                title="Agregar personas"
                text="Invita amigos a este grupo."
                onClick={onAddMembers}
              />

              <DrawerRow
                icon={Users}
                title="Información del grupo"
                text="Miembros, administradores, permisos y configuración."
                onClick={onOpenGroupInfo}
              />
            </>
          ) : (
            <DrawerRow
              icon={ShieldAlert}
              title="Privacidad y seguridad"
              text="Bloquear, reportar y administrar el contacto."
              onClick={onOpenPrivacy}
            />
          )}
        </div>
      </aside>
    </div>
  );
}
