import {
  Check,
  CheckCheck,
  FileText,
  Forward,
  MoreVertical,
  Pin,
  Share2,
  Star,
} from "lucide-react";
import type { KeyboardEvent } from "react";
import type { Message } from "../types/chat.types";
import { formatChatDate } from "../utils";
import { Avatar } from "./Avatar";
import { PrivateChatImage } from "./PrivateChatImage";
import { PrivateChatAudio } from "./PrivateChatAudio";

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
  onOpenActions: (button: HTMLButtonElement, message: Message) => void;
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
  const isSystem = message.tipo === "sistema";

  const copyKind =
    message.tipo_copia ?? (Boolean(message.reenviado) ? "forwarded" : null);

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <div className="max-w-[90%] rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            {message.contenido}
          </p>
        </div>
      </div>
    );
  }

  const hasFileAttachment = message.tipo === "archivo";

  function handleEditKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
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
    <div className={`group flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className="flex max-w-[92%] items-end gap-2 sm:max-w-[78%]">
        {!isMine && (
          <Avatar
            name={message.emisor_nombre}
            src={message.emisor_avatar}
            size="sm"
          />
        )}

        <div className="relative min-w-0">
          <div
            className={`relative px-4 py-2.5 shadow-sm ${
              isMine
                ? `rounded-[22px] rounded-br-md ${mineBubbleClass} text-white`
                : "rounded-[22px] rounded-bl-md border border-slate-200 bg-white/95 text-slate-900 dark:border-white/10 dark:bg-[#172033] dark:text-slate-100"
            }`}
          >
            {!isMine && isGroup && (
              <p className="mb-1 text-[11px] font-black text-violet-600 dark:text-violet-300">
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
                className={`absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg opacity-70 transition sm:opacity-0 sm:group-hover:opacity-100 ${
                  isMine
                    ? "text-white/80 hover:bg-white/15 hover:text-white"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
                aria-label="Opciones del mensaje"
              >
                <MoreVertical size={15} />
              </button>
            )}

            {editing ? (
              <>
                <textarea
                  value={editingText}
                  onChange={(event) => onEditingTextChange(event.target.value)}
                  onKeyDown={handleEditKeyDown}
                  autoFocus
                  maxLength={3000}
                  className="min-h-24 w-full resize-none rounded-xl border border-violet-300 bg-white p-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-violet-500/20 dark:bg-slate-900 dark:text-white"
                />

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={onSaveEdit}
                    disabled={!editingText.trim()}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-violet-700 transition disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
              </>
            ) : (
              <>
                {message.reply_to && !isDeleted && (
                  <div
                    className={`mb-2 rounded-xl border-l-2 px-3 py-2 text-xs ${
                      isMine
                        ? "border-white/60 bg-white/10 text-white/90"
                        : "border-violet-500 bg-violet-50 text-slate-700 dark:bg-black/15 dark:text-slate-300"
                    }`}
                  >
                    <p className="font-bold">
                      {message.reply_to.emisor_nombre}
                    </p>

                    <p className="mt-0.5 truncate opacity-75">
                      {message.reply_to.contenido}
                    </p>
                  </div>
                )}

                {isDeleted ? (
                  <p
                    className={`text-sm italic ${
                      isMine
                        ? "text-white/70"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    Este mensaje fue eliminado.
                  </p>
                ) : message.tipo === "imagen" ? (
                  <div className="space-y-2 pr-6">
                    <PrivateChatImage
                      messageId={message.id}
                      alt={
                        message.contenido
                          ? `Imagen: ${message.contenido}`
                          : "Imagen del chat"
                      }
                    />

                    {message.contenido && (
                      <p className="whitespace-pre-wrap break-words text-sm leading-6">
                        {message.contenido}
                      </p>
                    )}
                  </div>
                ) : hasFileAttachment ? (
                  message.archivo_url ? (
                    <a
                      href={message.archivo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl bg-black/5 p-2 pr-8 text-sm transition hover:bg-black/10 dark:bg-black/15"
                    >
                      <FileText size={21} />

                      <span className="truncate">
                        {message.archivo_nombre ?? "Archivo adjunto"}
                      </span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl bg-black/5 p-2 pr-8 text-sm opacity-70">
                      <FileText size={21} />
                      <span>Archivo no disponible</span>
                    </div>
                  )
                ) : message.tipo === "audio" ? (
                  <div className="space-y-2 pr-6">
                    <PrivateChatAudio messageId={message.id} />

                    {message.contenido && (
                      <p className="whitespace-pre-wrap break-words text-sm leading-6">
                        {message.contenido}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="pr-6">
                    {copyKind && (
                      <div
                        className={`mb-1 flex items-center gap-1 text-[11px] font-semibold ${
                          isMine
                            ? "text-white/70"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {copyKind === "shared" ? (
                          <Share2 size={11} />
                        ) : (
                          <Forward size={11} />
                        )}
                        <span>
                          {copyKind === "shared" ? "Compartido" : "Reenviado"}
                        </span>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap break-words text-sm leading-6">
                      {message.contenido}
                    </p>
                  </div>
                )}

                <div
                  className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
                    isMine
                      ? "text-white/75"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  <span>{formatChatDate(message.creado_en)}</span>

                  {Number(message.editado ?? 0) === 1 && <span>· editado</span>}

                  {message.fijado && <Pin size={10} />}

                  {message.favorito && (
                    <Star size={10} className="fill-current" />
                  )}

                  {isMine &&
                    (Number(message.leido ?? 0) === 1 ? (
                      <CheckCheck size={12} />
                    ) : (
                      <Check size={12} />
                    ))}
                </div>

                {message.reacciones && message.reacciones.length > 0 && (
                  <div className="absolute -bottom-3 left-3 flex gap-1">
                    {message.reacciones.map((reaction) => (
                      <span
                        key={reaction.emoji}
                        className="rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] shadow-sm dark:border-white/10 dark:bg-[#111a2c]"
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
