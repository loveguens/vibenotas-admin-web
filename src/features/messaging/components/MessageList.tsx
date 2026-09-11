import { ArrowDown, MessageCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Message } from "../types/chat.types";
import { getDateDivider, isDifferentDay } from "../utils";
import { MessageBubble } from "./MessageBubble";

type MessageListProps = {
  messages: Message[];
  currentUserId?: string;
  isGroup: boolean;
  loading: boolean;
  mineBubbleClass: string;
  editingMessageId: string | null;
  editingText: string;
  onEditingTextChange: (value: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onOpenActions: (button: HTMLButtonElement, message: Message) => void;
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
      const element = scrollRef.current;

      if (!element) {
        return;
      }

      const distance =
        element.scrollHeight - element.scrollTop - element.clientHeight;

      onNearEndChange(distance < 160);
    }

    const element = scrollRef.current;

    if (!element) {
      return;
    }

    handleScroll();

    element.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      element.removeEventListener("scroll", handleScroll);
    };
  }, [onNearEndChange]);

  return (
    <div
      ref={scrollRef}
      className="vn-message-surface relative flex-1 overflow-y-auto px-3 py-5 sm:px-6 sm:py-6"
    >
      {loading ? (
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-14 w-2/5 animate-pulse rounded-[22px] bg-white/80 dark:bg-white/5" />
          <div className="ml-auto h-16 w-1/2 animate-pulse rounded-[22px] bg-violet-500/15" />
          <div className="h-14 w-1/3 animate-pulse rounded-[22px] bg-white/80 dark:bg-white/5" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex h-full items-center justify-center text-center">
          <div className="rounded-[28px] border border-white/70 bg-white/70 px-8 py-7 shadow-sm backdrop-blur dark:border-white/5 dark:bg-white/[0.03]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
              <MessageCircle size={24} />
            </div>

            <p className="font-black text-slate-800 dark:text-slate-200">
              Este chat est? listo
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Env?a el primer mensaje para comenzar.
            </p>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-3xl flex-col gap-2.5">
          {messages.map((message, index) => {
            const previousMessage = messages[index - 1];
            const isMine = message.emisor_id === currentUserId;

            return (
              <div key={message.id}>
                {isDifferentDay(previousMessage, message) && (
                  <div className="my-5 flex justify-center">
                    <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-bold text-slate-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#111a2c]/90 dark:text-slate-400">
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
          className="sticky bottom-4 ml-auto mr-2 flex h-10 w-10 items-center justify-center rounded-full border border-violet-400/20 bg-violet-600 text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-500"
          aria-label="Ir al ?ltimo mensaje"
        >
          <ArrowDown size={18} />
        </button>
      )}
    </div>
  );
}
