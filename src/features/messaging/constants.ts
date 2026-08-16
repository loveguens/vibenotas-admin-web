import type { ChatThemeId, TemporaryDuration } from "./types/chat.types";

export const API_ROUTES = {
  conversations: "/chat/conversations",
  conversationMessages: (id: string) => `/chat/conversations/${id}/messages`,
  markConversationRead: (id: string) => `/chat/conversations/${id}/read`,
  createDirectChat: "/chat/conversations/direct",
  updateMessage: (id: string) => `/chat/messages/${id}`,
  deleteMessage: (id: string) => `/chat/messages/${id}`,

  friends: "/friends",
  requests: "/friends/requests",
  blocked: "/friends/blocked",
  requestFriendship: "/friends/request",
  acceptRequest: (id: string) => `/friends/${id}/accept`,
  rejectRequest: (id: string) => `/friends/${id}/reject`,
  unblockUser: (id: string) => `/friends/${id}/unblock`,
  searchUsers: (query: string) =>
    `/friends/search?q=${encodeURIComponent(query)}`,

  // FUTURE PHP ROUTES: do not call these until their controllers exist.
  createGroup: "/chat/groups",
  updateConversationSettings: (id: string) =>
    `/chat/conversations/${id}/settings`,
  updateConversationTheme: (id: string) => `/chat/conversations/${id}/theme`,
  temporaryMessages: (id: string) =>
    `/chat/conversations/${id}/temporary-messages`,
  archiveConversation: (id: string) => `/chat/conversations/${id}/archive`,
  removeConversationLocally: (id: string) => `/chat/conversations/${id}/local`,
  blockConversationUser: (id: string) => `/chat/conversations/${id}/block`,

  addGroupMember: (groupId: string) => `/chat/groups/${groupId}/members`,

  removeGroupMember: (groupId: string, userId: string) =>
    `/chat/groups/${groupId}/members/${userId}`,
} as const;

export const CHAT_THEMES: Array<{
  id: ChatThemeId;
  label: string;
  description: string;
  mineBubble: string;
  sendButton: string;
  active: string;
  background: string;
  dot: string;
}> = [
  {
    id: "violet",
    label: "Violeta premium",
    description: "Predeterminado VibeNotas",
    mineBubble: "bg-violet-500",
    sendButton: "bg-violet-500 hover:bg-violet-400",
    active: "bg-violet-500/15 ring-violet-400/30",
    background:
      "bg-[radial-gradient(circle_at_top_right,#7c3aed2d,transparent_40%),radial-gradient(circle_at_left,#0f172a,transparent_45%)]",
    dot: "bg-violet-400",
  },
  {
    id: "blue",
    label: "Azul profundo",
    description: "Sereno y profesional",
    mineBubble: "bg-sky-600",
    sendButton: "bg-sky-600 hover:bg-sky-500",
    active: "bg-sky-500/15 ring-sky-400/30",
    background:
      "bg-[radial-gradient(circle_at_top_right,#0369a12d,transparent_42%),radial-gradient(circle_at_left,#0f172a,transparent_45%)]",
    dot: "bg-sky-400",
  },
  {
    id: "emerald",
    label: "Esmeralda",
    description: "Equilibrado y claro",
    mineBubble: "bg-emerald-600",
    sendButton: "bg-emerald-600 hover:bg-emerald-500",
    active: "bg-emerald-500/15 ring-emerald-400/30",
    background:
      "bg-[radial-gradient(circle_at_top_right,#0596692d,transparent_42%),radial-gradient(circle_at_left,#0f172a,transparent_45%)]",
    dot: "bg-emerald-400",
  },
  {
    id: "rose",
    label: "Rosa suave",
    description: "Cálido y moderno",
    mineBubble: "bg-rose-600",
    sendButton: "bg-rose-600 hover:bg-rose-500",
    active: "bg-rose-500/15 ring-rose-400/30",
    background:
      "bg-[radial-gradient(circle_at_top_right,#e11d482d,transparent_42%),radial-gradient(circle_at_left,#0f172a,transparent_45%)]",
    dot: "bg-rose-400",
  },
  {
    id: "amber",
    label: "Ámbar",
    description: "Brillante y elegante",
    mineBubble: "bg-amber-500",
    sendButton: "bg-amber-500 hover:bg-amber-400",
    active: "bg-amber-500/15 ring-amber-400/30",
    background:
      "bg-[radial-gradient(circle_at_top_right,#f59e0b2d,transparent_42%),radial-gradient(circle_at_left,#0f172a,transparent_45%)]",
    dot: "bg-amber-400",
  },
  {
    id: "slate",
    label: "Gris elegante",
    description: "Sobrio y minimalista",
    mineBubble: "bg-slate-600",
    sendButton: "bg-slate-600 hover:bg-slate-500",
    active: "bg-slate-500/15 ring-slate-400/30",
    background:
      "bg-[radial-gradient(circle_at_top_right,#64748b28,transparent_42%),radial-gradient(circle_at_left,#0f172a,transparent_45%)]",
    dot: "bg-slate-400",
  },
  {
    id: "midnight",
    label: "Oscuro minimalista",
    description: "Contraste profundo",
    mineBubble: "bg-indigo-700",
    sendButton: "bg-indigo-700 hover:bg-indigo-600",
    active: "bg-indigo-500/15 ring-indigo-400/30",
    background: "bg-[#070b16]",
    dot: "bg-indigo-400",
  },
];

export const TEMPORARY_OPTIONS: Array<{
  value: TemporaryDuration;
  label: string;
  description: string;
}> = [
  {
    value: "off",
    label: "Desactivados",
    description: "Los nuevos mensajes no vencen.",
  },
  {
    value: "24h",
    label: "24 horas",
    description: "Preparado para eliminar mensajes tras un día.",
  },
  {
    value: "7d",
    label: "7 días",
    description: "Preparado para eliminar mensajes tras una semana.",
  },
  {
    value: "30d",
    label: "30 días",
    description: "Preparado para eliminar mensajes tras un mes.",
  },
  {
    value: "custom",
    label: "Personalizado",
    description: "Requiere configuración futura del backend.",
  },
];
