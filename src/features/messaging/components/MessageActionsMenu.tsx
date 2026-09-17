import { useEffect, useState } from "react";

import {
  Copy,
  Edit3,
  Flag,
  Forward,
  Info,
  Reply,
  Share2,
  Star,
  Trash2,
} from "lucide-react";

import type { Message, MessageMenuState } from "../types/chat.types";

const MESSAGE_EDIT_WINDOW_MS = 2 * 60 * 1000;

type MessageActionsMenuProps = {
  menu: MessageMenuState | null;
  mine: boolean;

  onClose: () => void;

  onCopy: (message: Message) => void;
  onShare: (message: Message) => void;
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
  onFavorite: (message: Message) => void;
  onInfo: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDeleteMine: (message: Message) => void;
  onDeleteAll: (message: Message) => void;
  onReport: (message: Message) => void;
};

type MenuButtonProps = {
  icon: typeof Copy;
  children: React.ReactNode;

  danger?: boolean;
  active?: boolean;

  onClick: () => void;
};

function MenuButton({
  icon: Icon,
  children,
  danger = false,
  active = false,
  onClick,
}: MenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium transition ${
        danger
          ? "text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
          danger
            ? "bg-red-500/10 text-red-500 dark:text-red-400"
            : active
              ? "bg-violet-600 text-white"
              : "bg-violet-100 text-violet-600 group-hover:bg-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:group-hover:bg-violet-500/25"
        }`}
      >
        <Icon
          size={17}
          strokeWidth={2}
          className={active ? "fill-current" : undefined}
        />
      </span>

      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

export function MessageActionsMenu({
  menu,
  mine,
  onClose,
  onCopy,
  onShare,
  onReply,
  onForward,
  onFavorite,
  onInfo,
  onEdit,
  onDeleteMine,
  onDeleteAll,
  onReport,
}: MessageActionsMenuProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());

    if (!menu) {
      return;
    }

    const createdAtMs = Date.parse(menu.message.creado_en);

    if (!Number.isFinite(createdAtMs)) {
      return;
    }

    const remainingMs = createdAtMs + MESSAGE_EDIT_WINDOW_MS - Date.now();

    if (remainingMs <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNowMs(Date.now());
    }, remainingMs + 50);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [menu?.message.id, menu?.message.creado_en]);

  if (!menu) {
    return null;
  }

  const message = menu.message;

  /*
   * Los mensajes reenviados y compartidos son
   * copias inmutables.
   *
   * El fallback reenviado mantiene compatibilidad
   * con mensajes antiguos que todavía no tienen
   * tipo_copia.
   */
  const isCopied =
    message.tipo_copia === "forwarded" ||
    message.tipo_copia === "shared" ||
    Boolean(message.reenviado);

  const createdAtMs = Date.parse(message.creado_en);

  const canEditMessage =
    !isCopied &&
    Number.isFinite(createdAtMs) &&
    nowMs <= createdAtMs + MESSAGE_EDIT_WINDOW_MS;

  function handleAction(callback: () => void): void {
    callback();
    onClose();
  }

  return (
    <div
      className="fixed z-[9999] w-[230px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-950/20 dark:border-white/10 dark:bg-[#111827]"
      style={{
        top: menu.position.y,
        left: menu.position.x,
      }}
    >
      <MenuButton
        icon={Copy}
        onClick={() => handleAction(() => onCopy(message))}
      >
        Copiar mensaje
      </MenuButton>

      <MenuButton
        icon={Share2}
        onClick={() => handleAction(() => onShare(message))}
      >
        Compartir mensaje
      </MenuButton>

      <MenuButton
        icon={Reply}
        onClick={() => handleAction(() => onReply(message))}
      >
        Responder
      </MenuButton>

      <MenuButton
        icon={Forward}
        onClick={() => handleAction(() => onForward(message))}
      >
        Reenviar
      </MenuButton>

      <MenuButton
        icon={Star}
        active={Boolean(message.favorito)}
        onClick={() => handleAction(() => onFavorite(message))}
      >
        {message.favorito ? "Quitar favorito" : "Guardar favorito"}
      </MenuButton>

      <MenuButton
        icon={Info}
        onClick={() => handleAction(() => onInfo(message))}
      >
        Información del mensaje
      </MenuButton>

      <div className="my-1.5 border-t border-slate-200 dark:border-white/10" />

      {mine ? (
        <>
          {canEditMessage && (
            <MenuButton
              icon={Edit3}
              onClick={() => handleAction(() => onEdit(message))}
            >
              Editar mensaje
            </MenuButton>
          )}

          <MenuButton
            icon={Trash2}
            danger
            onClick={() => handleAction(() => onDeleteMine(message))}
          >
            Eliminar para mí
          </MenuButton>

          <MenuButton
            icon={Trash2}
            danger
            onClick={() => handleAction(() => onDeleteAll(message))}
          >
            Eliminar para todos
          </MenuButton>
        </>
      ) : (
        <>
          <MenuButton
            icon={Trash2}
            danger
            onClick={() => handleAction(() => onDeleteMine(message))}
          >
            Eliminar para mí
          </MenuButton>

          <MenuButton
            icon={Flag}
            danger
            onClick={() => handleAction(() => onReport(message))}
          >
            Reportar mensaje
          </MenuButton>
        </>
      )}
    </div>
  );
}
