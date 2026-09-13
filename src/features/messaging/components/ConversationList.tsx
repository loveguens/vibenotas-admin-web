import { MessageCircle, Search, UserPlus, Users } from "lucide-react";
import type { ChatTab, Conversation } from "../types/chat.types";
import { ConversationItem } from "./ConversationItem";

type ConversationListProps = {
  conversations: Conversation[];
  selectedConversationId: string | null;
  search: string;
  loading: boolean;
  activeTab: ChatTab;
  requestCount: number;
  onTabChange: (tab: ChatTab) => void;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  onCreateChat: () => void;
  onCreateGroup: () => void;
};

function ConversationSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-2xl px-3 py-3">
      <div className="h-12 w-12 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800" />

      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-2/3 rounded-full bg-slate-100 dark:bg-slate-800" />
        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}

export function ConversationList({
  conversations,
  selectedConversationId,
  search,
  loading,
  onSearchChange,
  onSelect,
  onCreateChat,
  onCreateGroup,
}: ConversationListProps) {
  const orderedConversations = [...conversations].sort((first, second) => {
    const firstPinned = Number(Boolean(first.isPinned));
    const secondPinned = Number(Boolean(second.isPinned));

    if (firstPinned !== secondPinned) {
      return secondPinned - firstPinned;
    }

    return (
      new Date(second.actualizado_en).getTime() -
      new Date(first.actualizado_en).getTime()
    );
  });

  const uniqueConversations = orderedConversations.filter(
    (conversation, index, array) =>
      array.findIndex(
        (item) =>
          item.id === conversation.id && item.tipo === conversation.tipo,
      ) === index,
  );

  return (
    <aside
      className={`${
        selectedConversationId ? "hidden lg:flex" : "flex"
      } w-full shrink-0 flex-col border-r border-slate-200 bg-white dark:border-white/10 dark:bg-[#0d1526] lg:w-[360px] xl:w-[390px]`}
    >
      <header className="border-b border-slate-200 px-4 pb-4 pt-4 dark:border-white/10 sm:px-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-black tracking-tight text-slate-950 dark:text-white">
                Conversaciones
              </h1>

              {uniqueConversations.length > 0 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 dark:bg-white/5 dark:text-slate-400">
                  {uniqueConversations.length}
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Tus mensajes recientes
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onCreateGroup}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-violet-400/30 dark:hover:bg-violet-500/10 dark:hover:text-violet-300"
              title="Crear grupo"
            >
              <Users size={17} />
            </button>

            <button
              type="button"
              onClick={onCreateChat}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-500/20 transition hover:bg-violet-500"
              title="Nuevo chat"
            >
              <UserPlus size={17} />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar conversaciones..."
            className="w-full rounded-2xl border border-transparent bg-slate-100 px-4 py-3 pl-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-500/5 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/40 dark:focus:bg-white/[0.07]"
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map((item) => (
              <ConversationSkeleton key={item} />
            ))}
          </div>
        ) : uniqueConversations.length === 0 ? (
          <div className="flex h-full min-h-72 flex-col items-center justify-center px-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
              <MessageCircle size={25} />
            </div>

            <p className="font-bold text-slate-800 dark:text-slate-200">
              {search.trim()
                ? "No encontramos conversaciones"
                : "Todavía no tienes chats"}
            </p>

            <p className="mt-2 max-w-56 text-sm leading-6 text-slate-500">
              {search.trim()
                ? "Prueba con otro nombre."
                : "Busca un amigo o crea un grupo para comenzar."}
            </p>
          </div>
        ) : (
          uniqueConversations.map((conversation) => (
            <ConversationItem
              key={`${conversation.id}-${conversation.tipo}`}
              conversation={conversation}
              selected={conversation.id === selectedConversationId}
              onClick={() => onSelect(conversation.id)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
