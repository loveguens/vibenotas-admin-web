import { Bell, CircleSlash2, MessageCircle, Users } from "lucide-react";
import type { ChatTab, CurrentUser } from "../types/chat.types";

type ChatSidebarProps = {
  activeTab: ChatTab;
  unreadChats: number;
  requestCount: number;
  currentUser: CurrentUser | null;
  onBack: () => void;
  onTabChange: (tab: ChatTab) => void;
};

type SidebarItem = {
  id: ChatTab;
  label: string;
  icon: typeof MessageCircle;
};

const items: SidebarItem[] = [
  {
    id: "chats",
    label: "Chats",
    icon: MessageCircle,
  },
  {
    id: "amigos",
    label: "Amigos",
    icon: Users,
  },
  {
    id: "solicitudes",
    label: "Solicitudes",
    icon: Bell,
  },
  {
    id: "bloqueados",
    label: "Bloqueados",
    icon: CircleSlash2,
  },
];

function getBadgeValue(
  tab: ChatTab,
  unreadChats: number,
  requestCount: number,
): number {
  if (tab === "chats") {
    return unreadChats;
  }

  if (tab === "solicitudes") {
    return requestCount;
  }

  return 0;
}

export function ChatSidebar({
  activeTab,
  unreadChats,
  requestCount,
  onTabChange,
}: ChatSidebarProps) {
  return (
    <nav className="shrink-0 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#0d1526]/95 sm:px-4">
      <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto">
        {items.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          const badge = getBadgeValue(id, unreadChats, requestCount);

          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`relative flex min-w-fit items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition sm:text-sm ${
                active
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/20"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
              }`}
            >
              <Icon size={17} />

              <span>{label}</span>

              {badge > 0 && (
                <span
                  className={`flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black ${
                    active
                      ? "bg-white/20 text-white"
                      : id === "solicitudes"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300"
                        : "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                  }`}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
