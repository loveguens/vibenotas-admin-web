import { Bell, MessageCircle, Search, UserPlus, Users } from "lucide-react";
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
    <div className="flex animate-pulse gap-3 rounded-2xl p-3">
      <div className="h-11 w-11 shrink-0 rounded-2xl bg-slate-800" />

      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-2/3 rounded bg-slate-800" />
        <div className="h-2 w-full rounded bg-slate-800" />
      </div>
    </div>
  );
}

export function ConversationList({
  conversations,
  selectedConversationId,
  search,
  loading,
  activeTab,
  requestCount,
  onTabChange,
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

    const firstDate = new Date(first.actualizado_en).getTime();
    const secondDate = new Date(second.actualizado_en).getTime();

    return secondDate - firstDate;
  });

  const uniqueOrderedConversations = orderedConversations.filter(
    (conversation, index, array) =>
      array.findIndex(
        (item) =>
          item.id === conversation.id && item.tipo === conversation.tipo,
      ) === index,
  );

  {
    loading ? (
      <div className="space-y-2 p-2">
        {[1, 2, 3, 4, 5].map((item) => (
          <ConversationSkeleton key={item} />
        ))}
      </div>
    ) : uniqueOrderedConversations.length === 0 ? (
      <div className="p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
          <MessageCircle size={25} />
        </div>

        <p className="font-semibold text-slate-200">
          {search.trim()
            ? "No encontramos conversaciones"
            : "Aún no tienes chats"}
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {search.trim()
            ? "Prueba con otro nombre o revisa tus conversaciones."
            : "Crea una conversación desde Amigos o crea un grupo."}
        </p>
      </div>
    ) : (
      uniqueOrderedConversations.map((conversation, index) => (
        <ConversationItem
          key={`${conversation.id}-${conversation.tipo}-${index}`}
          conversation={conversation}
          selected={conversation.id === selectedConversationId}
          onClick={() => onSelect(conversation.id)}
        />
      ))
    );
  }

  return (
    <aside
      className={`${
        selectedConversationId ? "hidden lg:flex" : "flex"
      } w-full shrink-0 flex-col border-r border-slate-800 bg-slate-950/30 sm:max-w-[390px]`}
    >
      <div className="border-b border-slate-800 px-5 pb-4 pt-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-400">
              VibeNotas
            </p>

            <h1 className="mt-1 text-2xl font-bold text-white">Mensajes</h1>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCreateGroup}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-sky-400/50 hover:bg-sky-500/10 hover:text-sky-300"
              title="Crear grupo"
            >
              <Users size={18} />
            </button>

            <button
              type="button"
              onClick={onCreateChat}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-400"
              title="Nuevo chat"
            >
              <UserPlus size={18} />
            </button>
          </div>
        </div>

        {/* Tabs superiores */}
        <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-1.5">
          <button
            type="button"
            onClick={() => onTabChange("chats")}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition ${
              activeTab === "chats"
                ? "bg-violet-500 text-white shadow-md shadow-violet-500/25"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <MessageCircle size={15} />
            Chats
          </button>

          <button
            type="button"
            onClick={() => onTabChange("amigos")}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition ${
              activeTab === "amigos"
                ? "bg-violet-500 text-white shadow-md shadow-violet-500/25"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Users size={15} />
            Amigos
          </button>

          <button
            type="button"
            onClick={() => onTabChange("solicitudes")}
            className={`relative flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition ${
              activeTab === "solicitudes"
                ? "bg-violet-500 text-white shadow-md shadow-violet-500/25"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Bell size={15} />
            Solicitudes
            {requestCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-black text-slate-950">
                {requestCount > 9 ? "9+" : requestCount}
              </span>
            )}
          </button>
        </div>

        <div className="relative">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          />

          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar conversación..."
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 pl-10 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4, 5].map((item) => (
              <ConversationSkeleton key={item} />
            ))}
          </div>
        ) : orderedConversations.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
              <MessageCircle size={25} />
            </div>

            <p className="font-semibold text-slate-200">
              {search.trim()
                ? "No encontramos conversaciones"
                : "Aún no tienes chats"}
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {search.trim()
                ? "Prueba con otro nombre o revisa tus conversaciones."
                : "Crea una conversación desde Amigos o crea un grupo."}
            </p>
          </div>
        ) : (
          orderedConversations.map((conversation, index) => (
            <ConversationItem
              key={`${conversation.id}-${conversation.tipo}-${index}`}
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
