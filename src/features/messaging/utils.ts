import { CHAT_THEMES } from "./constants";
import type {
  ChatThemeId,
  CurrentUser,
  FixedMenuPosition,
  Message,
} from "./types/chat.types";

export function getCurrentUser(): CurrentUser | null {
  try {
    const rawUsuario = localStorage.getItem("usuario");
    const rawUser = localStorage.getItem("user");

    const raw = rawUsuario || rawUser;

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    const usuario = parsed?.usuario ?? parsed?.user ?? parsed;

    if (!usuario || !usuario.id) {
      return null;
    }

    return {
      id: String(usuario.id),
      nombre: usuario.nombre ?? usuario.name ?? "Usuario",
      correo: usuario.correo ?? usuario.email ?? "",
      rol: usuario.rol ?? usuario.role ?? "usuario",
      avatar: usuario.avatar ?? usuario.foto_perfil ?? usuario.imagen ?? null,
    } as CurrentUser;
  } catch {
    return null;
  }
}

export function getInitials(name?: string | null): string {
  return (
    (name ?? "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatChatDate(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

export function getDateDivider(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hoy";
  if (date.toDateString() === yesterday.toDateString()) return "Ayer";
  return date.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

export function isDifferentDay(previous?: Message, current?: Message): boolean {
  if (!previous || !current) return true;
  return (
    parseDate(previous.creado_en)?.toDateString() !==
    parseDate(current.creado_en)?.toDateString()
  );
}

export function getErrorMessage(error: unknown, fallback: string): string {
  const source = error as {
    response?: { data?: { message?: string; errors?: { detail?: string } } };
  };
  return (
    source.response?.data?.errors?.detail ??
    source.response?.data?.message ??
    fallback
  );
}

export function getFixedMenuPosition(
  button: HTMLElement,
  width: number,
  estimatedHeight: number,
): FixedMenuPosition {
  const rect = button.getBoundingClientRect();
  const margin = 12;
  let x = Math.min(
    Math.max(margin, rect.right - width),
    window.innerWidth - width - margin,
  );
  let y = rect.bottom + 8;
  if (y + estimatedHeight > window.innerHeight - margin)
    y = Math.max(margin, rect.top - estimatedHeight - 8);
  return { x, y };
}

export function themeStorageKey(conversationId: string): string {
  return `vibenotas_chat_theme_${conversationId}`;
}

export function getConversationTheme(conversationId: string): ChatThemeId {
  const stored = localStorage.getItem(
    themeStorageKey(conversationId),
  ) as ChatThemeId | null;
  return CHAT_THEMES.some((theme) => theme.id === stored)
    ? (stored as ChatThemeId)
    : "violet";
}

export function persistConversationTheme(
  conversationId: string,
  theme: ChatThemeId,
): void {
  localStorage.setItem(themeStorageKey(conversationId), theme);
}

export function getTheme(themeId: ChatThemeId) {
  return CHAT_THEMES.find((theme) => theme.id === themeId) ?? CHAT_THEMES[0];
}
