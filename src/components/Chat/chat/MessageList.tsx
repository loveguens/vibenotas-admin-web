import { ArrowDown, MessageCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Message } from "../features/types";
import {
  getDateDivider,
  isDifferentDay,
} from "../features/utils";
import { MessageBubble } from "./MessageBubble";

type MessageListProps = {
  messages: Message[];
  currentUserId?: number;
  isGroup: boolean;
  loading: boolean;
  mineBubbleClass: string;
  editingMessageId: number | null;
  editingText: string;
  onEditingTextChange: (value: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: number) => void;
  onOpenActions: (
    button: HTMLButtonElement,
    message: Message,
  ) => void;
  onNearEndChange: (nearEnd: boolean) => void;
  showJump: boolean;
  onJumpToBottom: () => void;
};

export function MessageList({
  messages,
  currentUserId,
  isGroup,
  loading,
  mineBubbleClass,
  editingMessageId,
  editingText,
  onEditingTextChange,
  onCancelEdit,
  onSaveEdit,
  onOpenActions,
  onNearEndChange,
  showJump,
  onJumpToBottom,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
  function handleScroll() {
    const scrollElement = scrollRef.current;

    if (!scrollElement) {
      return;
    }

    const distanceToBottom =
      scrollElement.scrollHeight -
      scrollElement.scrollTop -
      scrollElement.clientHeight;

    onNearEndChange(distanceToBottom < 160);
  }

  const scrollElement = scrollRef.current;

  if (!scrollElement) {
    return;
  }

  handleScroll();

  scrollElement.addEventListener("scroll", handleScroll, {
    passive: true,
  });

  return () => {
    scrollElement.removeEventListener("scroll", handleScroll);
  };
}, [onNearEndChange]);

  return (
    <div
      ref={scrollRef}
      className="relative flex-1 overflow-y-auto px-3 py-5 sm:px-5 md:px-9"
    >
      {loading ? (
        <div className="space-y-4">
          <div className="h-14 w-2/5 animate-pulse rounded-2xl bg-slate-800" />
          <div className="ml-auto h-20 w-1/2 animate-pulse rounded-2xl bg-slate-800" />
          <div className="h-16 w-1/3 animate-pulse rounded-2xl bg-slate-800" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex h-full items-center justify-center text-center">
          <div>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
              <MessageCircle size={24} />
            </div>

            <p className="font-semibold text-slate-200">
              Este chat está listo.
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Envía el primer mensaje para comenzar.
            </p>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-4xl flex-col gap-5">
          {messages.map((message, index) => {
            const previousMessage = messages[index - 1];
            const isMine =
              Number(message.emisor_id) === Number(currentUserId);

            return (
              <div key={message.id}>
                {isDifferentDay(previousMessage, message) && (
                  <div className="my-1 flex justify-center">
                    <span className="rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1 text-[10px] font-bold text-slate-400">
                      {getDateDivider(message.creado_en)}
                    </span>
                  </div>
                )}

                <MessageBubble
                  message={message}
                  isMine={isMine}
                  isGroup={isGroup}
                  mineBubbleClass={mineBubbleClass}
                  editing={editingMessageId === message.id}
                  editingText={editingText}
                  onEditingTextChange={onEditingTextChange}
                  onCancelEdit={onCancelEdit}
                  onSaveEdit={() => onSaveEdit(message.id)}
                  onOpenActions={onOpenActions}
                />
              </div>
            );
          })}
        </div>
      )}

      {showJump && (
        <button
          type="button"
          onClick={onJumpToBottom}
          className="sticky bottom-4 ml-auto mr-2 flex h-11 w-11 items-center justify-center rounded-full bg-violet-500 text-white shadow-xl shadow-violet-950/50 transition hover:bg-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          aria-label="Ir al último mensaje"
          title="Ir al último mensaje"
        >
          <ArrowDown size={19} />
        </button>
      )}
    </div>
  );
}