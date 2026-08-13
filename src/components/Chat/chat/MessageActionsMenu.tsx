import {
  Copy,
  Edit3,
  Forward,
  Info,
  Reply,
  Share2,
  Star,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import type {
  Message,
  MessageMenuState,
} from "../features/types";

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
  onClick: () => void;
};

function MenuButton({
  icon: Icon,
  children,
  danger = false,
  onClick,
}: MenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left text-xs font-medium transition ${
        danger
          ? "text-red-300 hover:bg-red-500/10 hover:text-red-200"
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          danger
            ? "bg-red-500/10 text-red-300"
            : "bg-violet-500/10 text-violet-300"
        }`}
      >
        <Icon size={15} />
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
  if (!menu) {
    return null;
  }

  const message = menu.message;

  function handleAction(callback: () => void) {
    callback();
    onClose();
  }

  return (
    <div
      className="fixed z-[9999] w-56 overflow-hidden rounded-2xl border border-slate-700 bg-[#080f20]/95 py-1.5 shadow-2xl shadow-black/80 backdrop-blur-xl"
      style={{
        left: menu.position.x,
        top: menu.position.y,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <MenuButton onClick={() => handleAction(() => onCopy(message))} icon={Copy}>
        Copiar mensaje
      </MenuButton>

      <MenuButton
        onClick={() => handleAction(() => onShare(message))}
        icon={Share2}
      >
        Compartir mensaje
      </MenuButton>

      <MenuButton
        onClick={() => handleAction(() => onReply(message))}
        icon={Reply}
      >
        Responder
      </MenuButton>

      <MenuButton
        onClick={() => handleAction(() => onForward(message))}
        icon={Forward}
      >
        Reenviar
      </MenuButton>

      <MenuButton
        onClick={() => handleAction(() => onFavorite(message))}
        icon={Star}
      >
        {message.favorito ? "Quitar favorito" : "Guardar favorito"}
      </MenuButton>

      <MenuButton
        onClick={() => handleAction(() => onInfo(message))}
        icon={Info}
      >
        Información del mensaje
      </MenuButton>

      <div className="my-1 border-t border-slate-800" />

      {mine ? (
        <>
          <MenuButton
            onClick={() => handleAction(() => onEdit(message))}
            icon={Edit3}
          >
            Editar mensaje
          </MenuButton>

          <MenuButton
            onClick={() => handleAction(() => onDeleteMine(message))}
            icon={Trash2}
            danger
          >
            Eliminar para mí
          </MenuButton>

          <MenuButton
            onClick={() => handleAction(() => onDeleteAll(message))}
            icon={Trash2}
            danger
          >
            Eliminar para todos
          </MenuButton>
        </>
      ) : (
        <MenuButton
          onClick={() => handleAction(() => onReport(message))}
          icon={TriangleAlert}
          danger
        >
          Reportar mensaje
        </MenuButton>
      )}
    </div>
  );
}