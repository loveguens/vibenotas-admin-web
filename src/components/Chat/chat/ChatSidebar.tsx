import {
  ArrowLeft,
  Bell,
  CircleSlash2,
  MessageCircle,
  Users,
} from "lucide-react";
import type { ChatTab, CurrentUser } from "../features/types";
import { Avatar } from "./Avatar";

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
) {
  if (tab === "chats") return unreadChats;
  if (tab === "solicitudes") return requestCount;

  return 0;
}

export function ChatSidebar({
  activeTab,
  unreadChats,
  requestCount,
  currentUser,
  onBack,
  onTabChange,
}: ChatSidebarProps) {
  return (
    <>
      {/* Navegación de escritorio */}
      <aside className="hidden w-[82px] shrink-0 flex-col items-center border-r border-slate-800 bg-slate-950/55 py-5 lg:flex">
        <button
          type="button"
          onClick={onBack}
          className="mb-7 flex h-11 w-11 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:ring-2 focus-visible:ring-violet-400/50"
          aria-label="Volver"
          title="Volver"
        >
          <ArrowLeft size={20} />
        </button>

        {items.map(({ id, label, icon: Icon }) => {
          const badge = getBadgeValue(id, unreadChats, requestCount);
          const isActive = activeTab === id;
          const isRequests = id === "solicitudes";

          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`relative mb-3 flex h-11 w-11 items-center justify-center rounded-2xl transition focus-visible:ring-2 focus-visible:ring-violet-400/50 ${
                isActive
                  ? "bg-violet-500 text-white shadow-lg shadow-violet-500/25"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
              title={label}
              aria-label={label}
            >
              <Icon size={20} />

              {badge > 0 && (
                <span
                  className={`absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                    isRequests
                      ? "bg-amber-400 text-slate-950"
                      : "bg-violet-500 text-white"
                  }`}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="mt-auto">
          <Avatar
            name={currentUser?.nombre}
            src={currentUser?.avatar}
            size="sm"
          />
        </div>
      </aside>

      {/* Navegación móvil */}
      <nav className="flex border-b border-slate-800 bg-slate-950/50 p-2 lg:hidden">
        {items.slice(0, 3).map(({ id, label, icon: Icon }) => {
          const badge = getBadgeValue(id, unreadChats, requestCount);
          const isActive = activeTab === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`relative flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-bold transition ${
                isActive
                  ? "bg-violet-500 text-white"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>

              {badge > 0 && (
                <span
                  className={`absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                    id === "solicitudes"
                      ? "bg-amber-400 text-slate-950"
                      : "bg-violet-500 text-white"
                  }`}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}