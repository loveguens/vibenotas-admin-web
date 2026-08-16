import {
  Archive,
  BellOff,
  BellRing,
  CalendarClock,
  CircleSlash2,
  Flag,
  Info,
  Pin,
  Search,
  Settings2,
  Trash2,
  Users,
  Volume2,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ConversationMenuState } from "../types/chat.types";

type ConversationActionsMenuProps = {
  menu: ConversationMenuState | null;
  isMuted: boolean;
  isPinned: boolean;
  onClose: () => void;
  onInfo: () => void;
  onPin: () => void;
  onMute: () => void;
  onTheme: () => void;
  onTemporary: () => void;
  onScheduledMessages: () => void;
  onCreateGroup: () => void;
  onArchive: () => void;
  onBlock: () => void;
  onReport: () => void;
  onDeleteLocal: () => void;
  onLeaveGroup: () => void;
  onSearchMessages?: () => void;
};

type MenuItemProps = {
  icon: typeof Info;
  children: ReactNode;
  danger?: boolean;
  muted?: boolean;
  onClick: () => void;
};

function MenuItem({
  icon: Icon,
  children,
  danger = false,
  muted = false,
  onClick,
}: MenuItemProps) {
  return (
    <button
      type="button"
      disabled={muted}
      onClick={() => {
        if (!muted) {
          onClick();
        }
      }}
      className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium transition ${
        muted
          ? "cursor-not-allowed text-slate-600"
          : danger
            ? "text-red-300 hover:bg-red-500/10 hover:text-red-200"
            : "text-slate-200 hover:bg-violet-500/10 hover:text-white"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          muted
            ? "bg-slate-800 text-slate-600"
            : danger
              ? "bg-red-500/10 text-red-300"
              : "bg-violet-500/10 text-violet-300"
        }`}
      >
        <Icon size={16} />
      </span>

      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

export function ConversationActionsMenu({
  menu,
  isMuted,
  isPinned,
  onClose,
  onInfo,
  onPin,
  onMute,
  onTheme,
  onTemporary,
  onScheduledMessages,
  onCreateGroup,
  onArchive,
  onBlock,
  onReport,
  onDeleteLocal,
  onLeaveGroup,
  onSearchMessages,
}: ConversationActionsMenuProps) {
  if (!menu) {
    return null;
  }

  const isGroup = menu.conversation.tipo === "grupo";

  function handleAction(action: () => void): void {
    action();
    onClose();
  }

  return (
    <div
      className="fixed z-[9998] w-64 overflow-hidden rounded-2xl border border-slate-700/70 bg-[#080f20]/95 p-1.5 shadow-2xl shadow-black/80 backdrop-blur-xl"
      style={{
        left: menu.position.x,
        top: menu.position.y,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <MenuItem icon={Info} onClick={() => handleAction(onInfo)}>
        Ver información del chat
      </MenuItem>

      <MenuItem icon={Pin} onClick={() => handleAction(onPin)}>
        {isPinned ? "Quitar conversación fijada" : "Fijar conversación"}
      </MenuItem>

      <MenuItem
        icon={isMuted ? BellRing : BellOff}
        onClick={() => handleAction(onMute)}
      >
        {isMuted ? "Activar notificaciones" : "Silenciar chat"}
      </MenuItem>

      <MenuItem icon={Settings2} onClick={() => handleAction(onTheme)}>
        Cambiar tema del chat
      </MenuItem>

      <MenuItem icon={Volume2} onClick={() => handleAction(onTemporary)}>
        Mensajes temporales
      </MenuItem>

      <MenuItem
        icon={CalendarClock}
        onClick={() => handleAction(onScheduledMessages)}
      >
        Mensajes programados
      </MenuItem>

      <MenuItem
        icon={Search}
        onClick={() => {
          if (onSearchMessages) {
            handleAction(onSearchMessages);
          }
        }}
        muted={!onSearchMessages}
      >
        <span className="flex items-center gap-2">
          Buscar mensajes
          {!onSearchMessages && (
            <span className="text-[10px] font-medium text-slate-500">
              Próximamente
            </span>
          )}
        </span>
      </MenuItem>

      <MenuItem icon={Users} onClick={() => handleAction(onCreateGroup)}>
        Crear grupo
      </MenuItem>

      <div className="mx-2 my-1 border-t border-slate-800" />

      <MenuItem icon={Archive} onClick={() => handleAction(onArchive)}>
        Archivar conversación
      </MenuItem>

      {!isGroup && (
        <>
          <MenuItem
            icon={CircleSlash2}
            danger
            onClick={() => handleAction(onBlock)}
          >
            Bloquear usuario
          </MenuItem>

          <MenuItem icon={Flag} danger onClick={() => handleAction(onReport)}>
            Reportar usuario
          </MenuItem>
        </>
      )}

      {isGroup && (
        <MenuItem
          icon={CircleSlash2}
          danger
          onClick={() => handleAction(onLeaveGroup)}
        >
          Salir del grupo
        </MenuItem>
      )}

      <MenuItem
        icon={Trash2}
        danger
        onClick={() => handleAction(onDeleteLocal)}
      >
        Eliminar de mi vista
      </MenuItem>
    </div>
  );
}
