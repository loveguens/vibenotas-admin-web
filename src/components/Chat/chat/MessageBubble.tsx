import {
  Check,
  CheckCheck,
  FileText,
  MoreVertical,
  Pin,
  Star,
  Volume2,
} from "lucide-react";
import type { Message } from "../features/types";
import { formatChatDate } from "../features/utils";
import { Avatar } from "./Avatar";

type MessageBubbleProps = {
  message: Message;
  isMine: boolean;
  isGroup: boolean;
  mineBubbleClass: string;
  editing: boolean;
  editingText: string;
  onEditingTextChange: (value: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onOpenActions: (
    button: HTMLButtonElement,
    message: Message,
  ) => void;
};

export function MessageBubble({
  message,
  isMine,
  isGroup,
  mineBubbleClass,
  editing,
  editingText,
  onEditingTextChange,
  onCancelEdit,
  onSaveEdit,
  onOpenActions,
}: MessageBubbleProps) {
  const isDeleted = Number(message.eliminado ?? 0) === 1;

  const hasAttachment =
    message.tipo === "archivo" || message.tipo === "imagen";

  function handleEditKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancelEdit();
      return;
    }

    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onSaveEdit();
    }
  }

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className="flex max-w-[92%] items-end gap-2 sm:max-w-[76%]">
        {!isMine && (
          <Avatar
            name={message.emisor_nombre}
            src={message.emisor_avatar}
            size="sm"
          />
        )}

        <div className="relative min-w-0">
          <div
            className={`relative rounded-2xl px-4 py-3 pr-12 shadow-lg ${
              isMine
                ? `rounded-br-md ${mineBubbleClass} text-white`
                : "rounded-bl-md border border-slate-700 bg-slate-800 text-slate-100"
            }`}
          >
            {!isMine && isGroup && (
              <p className="mb-1 text-xs font-bold text-violet-300">
                {message.emisor_nombre}
              </p>
            )}

            {!editing && !isDeleted && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenActions(event.currentTarget, message);
                }}
                className={`absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg transition ${
                  isMine
                    ? "text-white/80 hover:bg-white/15 hover:text-white"
                    : "text-slate-400 hover:bg-slate-700 hover:text-white"
                }`}
                aria-label="Opciones del mensaje"
              >
                <MoreVertical size={17} />
              </button>
            )}

            {editing ? (
              <>
                <textarea
                  value={editingText}
                  onChange={(event) =>
                    onEditingTextChange(event.target.value)
                  }
                  onKeyDown={handleEditKeyDown}
                  autoFocus
                  maxLength={3000}
                  className="min-h-24 w-full resize-none rounded-xl border border-violet-300 bg-slate-900 p-3 text-sm text-white outline-none transition focus:ring-2 focus:ring-violet-500/20"
                />

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-violet-100/70">
                    Ctrl + Enter para guardar
                  </span>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-violet-100 transition hover:bg-violet-400/20"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={onSaveEdit}
                      disabled={!editingText.trim()}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-violet-600 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {message.reply_to && !isDeleted && (
                  <div
                    className={`mb-2 rounded-xl border-l-2 px-3 py-2 text-xs ${
                      isMine
                        ? "border-white/60 bg-white/10 text-violet-50"
                        : "border-violet-400 bg-slate-700/70 text-slate-300"
                    }`}
                  >
                    <p className="font-bold">
                      {message.reply_to.emisor_nombre}
                    </p>

                    <p className="mt-0.5 truncate opacity-80">
                      {message.reply_to.contenido}
                    </p>
                  </div>
                )}

                {isDeleted ? (
                  <p className="italic text-sm text-slate-300">
                    Este mensaje fue eliminado.
                  </p>
                ) : hasAttachment ? (
                  message.archivo_url ? (
                    <a
                      href={message.archivo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl bg-black/10 p-2 text-sm underline-offset-4 transition hover:bg-black/20 hover:underline"
                    >
                      <FileText size={22} />

                      <span className="truncate">
                        {message.archivo_nombre ?? "Archivo adjunto"}
                      </span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl bg-black/10 p-2 text-sm opacity-70">
                      <FileText size={22} />

                      <span className="truncate">
                        {message.archivo_nombre ?? "Archivo no disponible"}
                      </span>
                    </div>
                  )
                ) : message.tipo === "audio" ? (
                  <div className="flex items-center gap-3">
                    <Volume2 size={18} />
                    <div className="h-1 w-36 rounded-full bg-white/35" />
                  </div>
                ) : message.tipo === "sistema" ? (
                  <p className="text-center text-xs text-slate-300">
                    {message.contenido}
                  </p>
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
                    {message.reenviado && (
                      <span className="mr-1 text-xs opacity-80">
                        Reenviado ·
                      </span>
                    )}

                    {message.contenido}
                  </p>
                )}

                <div
                  className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${
                    isMine ? "text-white/80" : "text-slate-500"
                  }`}
                >
                  <span>{formatChatDate(message.creado_en)}</span>

                  {Number(message.editado ?? 0) === 1 && (
                    <span>· editado</span>
                  )}

                  {message.fijado && <Pin size={11} />}

                  {message.favorito && (
                    <Star size={11} className="fill-current" />
                  )}

                  {isMine &&
                    (Number(message.leido ?? 0) === 1 ? (
                      <CheckCheck size={13} />
                    ) : (
                      <Check size={13} />
                    ))}
                </div>

                {message.reacciones && message.reacciones.length > 0 && (
                  <div className="absolute -bottom-3 left-3 flex gap-1">
                    {message.reacciones.map((reaction) => (
                      <span
                        key={reaction.emoji}
                        className="rounded-full border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] shadow"
                      >
                        {reaction.emoji} {reaction.total}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}