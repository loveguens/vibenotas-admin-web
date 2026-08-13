import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  Bell,
  CheckCheck,
  Clock3,
  Inbox,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

type UserRole = "admin" | "superadmin";

type NotificationItem = {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  prioridad?: string;
  leida: number | boolean;
  vista?: number | boolean;
  creado_en: string;
  leido_en?: string | null;
  visto_en?: string | null;
  accion_url?: string | null;
  data?: unknown;
};

type NotificationStyle = {
  icon: ReactNode;
  iconClassName: string;
  badgeClassName: string;
  label: string;
  glowClassName: string;
};

function normalizeRole(value: unknown): string {
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const record =
      value as Record<string, unknown>;

    if (typeof record.slug === "string") {
      return record.slug
        .trim()
        .toLowerCase();
    }

    if (
      typeof record.role === "string"
    ) {
      return record.role
        .trim()
        .toLowerCase();
    }
  }

  return "";
}

function resolveUserRole(): UserRole {
  try {
    const raw =
      localStorage.getItem("usuario");

    const parsed = raw
      ? JSON.parse(raw)
      : null;

    const user =
      parsed?.usuario ??
      parsed?.user ??
      parsed;

    const roleCandidates: unknown[] = [];

    if (Array.isArray(user?.roles)) {
      roleCandidates.push(
        ...user.roles,
      );
    }

    roleCandidates.push(
      user?.rol,
      user?.rol_slug,
      user?.role,
      user?.slug,
    );

    const roles = roleCandidates
      .map(normalizeRole)
      .filter(Boolean);

    if (
      roles.includes("super_admin") ||
      roles.includes("superadmin")
    ) {
      return "superadmin";
    }

    return "admin";
  } catch {
    return "admin";
  }
}

function isNotificationRead(
  notification: NotificationItem,
): boolean {
  return Boolean(
    Number(notification.leida),
  );
}

function parseNotificationData(
  notification?: NotificationItem | null,
): Record<string, unknown> {
  if (!notification?.data) {
    return {};
  }

  if (
    typeof notification.data ===
    "string"
  ) {
    try {
      const parsed = JSON.parse(
        notification.data,
      );

      return typeof parsed ===
        "object" && parsed !== null
        ? (parsed as Record<
            string,
            unknown
          >)
        : {};
    } catch {
      return {};
    }
  }

  if (
    typeof notification.data ===
      "object" &&
    notification.data !== null
  ) {
    return notification.data as Record<
      string,
      unknown
    >;
  }

  return {};
}

function formatDate(value: string): string {
  const directDate = new Date(value);

  const date = Number.isNaN(
    directDate.getTime(),
  )
    ? new Date(
        value.replace(" ", "T"),
      )
    : directDate;

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNotificationStyle(
  tipo: string,
): NotificationStyle {
  switch (tipo) {
    case "chat_message":
      return {
        icon: (
          <MessageCircle size={21} />
        ),
        iconClassName:
          "bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/20",
        badgeClassName:
          "border-sky-400/20 bg-sky-500/10 text-sky-200",
        label: "Mensaje",
        glowClassName:
          "from-sky-500/15 via-transparent to-transparent",
      };

    case "group_added":
      return {
        icon: <Users size={21} />,
        iconClassName:
          "bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20",
        badgeClassName:
          "border-violet-400/20 bg-violet-500/10 text-violet-200",
        label: "Grupo",
        glowClassName:
          "from-violet-500/15 via-transparent to-transparent",
      };

    case "friend_request":
      return {
        icon: <Users size={21} />,
        iconClassName:
          "bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-400/20",
        badgeClassName:
          "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-200",
        label: "Solicitud",
        glowClassName:
          "from-fuchsia-500/15 via-transparent to-transparent",
      };

    case "friend_accepted":
      return {
        icon: (
          <CheckCheck size={21} />
        ),
        iconClassName:
          "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20",
        badgeClassName:
          "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
        label: "Amistad",
        glowClassName:
          "from-emerald-500/15 via-transparent to-transparent",
      };

    case "security":
      return {
        icon: (
          <ShieldCheck size={21} />
        ),
        iconClassName:
          "bg-red-500/15 text-red-300 ring-1 ring-red-400/20",
        badgeClassName:
          "border-red-400/20 bg-red-500/10 text-red-200",
        label: "Seguridad",
        glowClassName:
          "from-red-500/15 via-transparent to-transparent",
      };

    case "system":
      return {
        icon: <Settings size={21} />,
        iconClassName:
          "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/20",
        badgeClassName:
          "border-amber-400/20 bg-amber-500/10 text-amber-200",
        label: "Sistema",
        glowClassName:
          "from-amber-500/15 via-transparent to-transparent",
      };

    default:
      return {
        icon: <Bell size={21} />,
        iconClassName:
          "bg-slate-700/80 text-slate-300 ring-1 ring-white/10",
        badgeClassName:
          "border-slate-500/20 bg-slate-700/50 text-slate-300",
        label: "Aviso",
        glowClassName:
          "from-slate-500/15 via-transparent to-transparent",
      };
  }
}

export default function MyNotificationsPage() {
  const navigate = useNavigate();

  const userRole =
    useMemo<UserRole>(
      () => resolveUserRole(),
      [],
    );

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    notifications,
    setNotifications,
  ] = useState<NotificationItem[]>([]);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [loading, setLoading] =
    useState(true);

  const [
    markingAll,
    setMarkingAll,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    selectedNotification,
    setSelectedNotification,
  ] =
    useState<NotificationItem | null>(
      null,
    );

  const totalNotifications =
    notifications.length;

  const readCount = useMemo(
    () =>
      notifications.filter(
        isNotificationRead,
      ).length,
    [notifications],
  );

  const loadNotifications =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          "/notifications/me",
        );

        const payload =
          response.data?.data ??
          response.data;

        const incomingNotifications =
          Array.isArray(
            payload?.notificaciones,
          )
            ? payload.notificaciones
            : [];

        setNotifications(
          incomingNotifications,
        );

        setUnreadCount(
          Number(
            payload?.sin_leer ?? 0,
          ),
        );
      } catch (caughtError) {
        console.error(
          "ERROR CARGANDO NOTIFICACIONES:",
          caughtError,
        );

        if (
          axios.isAxiosError(
            caughtError,
          )
        ) {
          const backendMessage =
            caughtError.response?.data
              ?.message;

          setError(
            typeof backendMessage ===
              "string"
              ? backendMessage
              : "No se pudieron cargar las notificaciones.",
          );
        } else {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "No se pudieron cargar las notificaciones.",
          );
        }
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  async function markAllAsRead() {
    if (
      unreadCount === 0 ||
      markingAll
    ) {
      return;
    }

    try {
      setMarkingAll(true);
      setError("");

      await api.put(
        "/notifications/read-all",
      );

      setNotifications((current) =>
        current.map(
          (notification) => ({
            ...notification,
            leida: 1,
            vista: 1,
          }),
        ),
      );

      setUnreadCount(0);
    } catch (caughtError) {
      console.error(
        "ERROR MARCANDO TODAS COMO LEÍDAS:",
        caughtError,
      );

      setError(
        "No se pudieron marcar las notificaciones como leídas.",
      );
    } finally {
      setMarkingAll(false);
    }
  }

  async function openNotification(
    notification: NotificationItem,
  ) {
    setSelectedNotification(
      notification,
    );

    if (
      isNotificationRead(
        notification,
      )
    ) {
      return;
    }

    try {
      await api.put(
        `/notifications/${notification.id}/read`,
      );

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                leida: 1,
                vista: 1,
              }
            : item,
        ),
      );

      setSelectedNotification(
        (current) =>
          current?.id ===
          notification.id
            ? {
                ...current,
                leida: 1,
                vista: 1,
              }
            : current,
      );

      setUnreadCount((current) =>
        Math.max(0, current - 1),
      );
    } catch (caughtError) {
      console.error(
        "ERROR MARCANDO NOTIFICACIÓN:",
        caughtError,
      );

      setError(
        "No se pudo marcar la notificación como leída.",
      );
    }
  }

  function getActionPath(
    notification: NotificationItem,
  ): string | null {
    if (
      notification.accion_url &&
      notification.accion_url.startsWith(
        "/",
      )
    ) {
      return notification.accion_url;
    }

    const data =
      parseNotificationData(
        notification,
      );

    const conversationId =
      data.conversacion_id ??
      data.conversationId;

    if (
      [
        "chat_message",
        "group_added",
        "friend_accepted",
        "friend_request",
      ].includes(notification.tipo) &&
      conversationId
    ) {
      return `/${userRole}/chat/${String(
        conversationId,
      )}`;
    }

    if (
      notification.tipo ===
      "security"
    ) {
      return `/${userRole}/profile`;
    }

    if (
      notification.tipo ===
      "new_user"
    ) {
      return "/superadmin/users";
    }

    if (
      notification.tipo ===
      "new_admin"
    ) {
      return "/superadmin/administrators";
    }

    return null;
  }

  function goToNotificationAction(
    notification: NotificationItem,
  ) {
    const path =
      getActionPath(notification);

    if (!path) {
      return;
    }

    setSelectedNotification(null);

    navigate(path);
  }

  const selectedStyle =
    selectedNotification
      ? getNotificationStyle(
          selectedNotification.tipo,
        )
      : null;

  const selectedActionPath =
    selectedNotification
      ? getActionPath(
          selectedNotification,
        )
      : null;

  return (
    <div className="min-h-screen bg-[#080E1D] text-white lg:flex">
      <Sidebar
        role={userRole}
        isOpen={sidebarOpen}
        onClose={() =>
          setSidebarOpen(false)
        }
      />

      <div className="min-w-0 flex-1">
        <Topbar
          role={userRole}
          onOpenSidebar={() =>
            setSidebarOpen(true)
          }
        />

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <section className="mx-auto max-w-6xl space-y-6">
            {/* HERO */}
            <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-[#131A2D] via-[#111827] to-[#10243A] p-6 shadow-2xl shadow-black/25 sm:p-8">
              <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

              <div className="pointer-events-none absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />

              <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-violet-200">
                    <Sparkles
                      size={15}
                    />
                    Centro de actividad
                  </div>

                  <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">
                    Mis notificaciones
                  </h1>

                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
                    Revisa mensajes,
                    solicitudes, alertas
                    de seguridad y
                    actividad importante
                    de tu cuenta desde un
                    solo lugar.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[480px]">
                  <article className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total
                    </p>

                    <p className="mt-2 text-3xl font-black text-white">
                      {
                        totalNotifications
                      }
                    </p>
                  </article>

                  <article className="rounded-3xl border border-violet-400/20 bg-violet-500/[0.08] p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">
                      Sin leer
                    </p>

                    <p className="mt-2 text-3xl font-black text-violet-100">
                      {unreadCount}
                    </p>
                  </article>

                  <article className="rounded-3xl border border-emerald-400/20 bg-emerald-500/[0.08] p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                      Leídas
                    </p>

                    <p className="mt-2 text-3xl font-black text-emerald-100">
                      {readCount}
                    </p>
                  </article>
                </div>
              </div>
            </div>

            {/* ACTION BAR */}
            <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#101827] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0">
                <p className="font-bold text-white">
                  {unreadCount > 0
                    ? `${unreadCount} ${
                        unreadCount ===
                        1
                          ? "notificación pendiente"
                          : "notificaciones pendientes"
                      }`
                    : "Todo está al día"}
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {unreadCount > 0
                    ? "Abre una notificación para leerla o marca todas como leídas."
                    : "No tienes notificaciones pendientes por revisar."}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  void markAllAsRead()
                }
                disabled={
                  unreadCount === 0 ||
                  markingAll
                }
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-5 py-3 text-sm font-bold text-violet-100 transition hover:border-violet-400/30 hover:bg-violet-500/20 focus:outline-none focus:ring-2 focus:ring-violet-400/40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {markingAll ? (
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <CheckCheck
                    size={18}
                  />
                )}

                {markingAll
                  ? "Marcando..."
                  : "Marcar todas como leídas"}
              </button>
            </div>

            {/* ERROR */}
            {error && (
              <div className="flex flex-col gap-4 rounded-3xl border border-red-500/20 bg-red-500/10 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-red-500/15 p-2 text-red-300">
                    <TriangleAlert
                      size={18}
                    />
                  </div>

                  <div>
                    <p className="font-bold text-red-100">
                      No pudimos completar
                      la operación
                    </p>

                    <p className="mt-1 text-sm text-red-200/80">
                      {error}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadNotifications()
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-100 transition hover:bg-red-500/20"
                >
                  <RefreshCw
                    size={16}
                  />
                  Reintentar
                </button>
              </div>
            )}

            {/* LISTADO */}
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#101827] shadow-xl shadow-black/15">
              {loading ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 px-6 text-center">
                  <div className="rounded-3xl bg-violet-500/10 p-5 text-violet-300">
                    <LoaderCircle
                      size={30}
                      className="animate-spin"
                    />
                  </div>

                  <div>
                    <p className="font-bold text-white">
                      Cargando
                      notificaciones
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Estamos preparando
                      tu centro de
                      actividad.
                    </p>
                  </div>
                </div>
              ) : notifications.length ===
                0 ? (
                <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-14 text-center">
                  <div className="rounded-[26px] border border-violet-400/15 bg-violet-500/10 p-5 text-violet-300">
                    <Inbox size={34} />
                  </div>

                  <h2 className="mt-5 text-xl font-black text-white">
                    No tienes
                    notificaciones
                  </h2>

                  <p className="mt-2 max-w-md text-sm leading-7 text-slate-400">
                    Cuando haya actividad
                    importante en tu
                    cuenta, aparecerá
                    aquí.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.07]">
                  {notifications.map(
                    (notification) => {
                      const unread =
                        !isNotificationRead(
                          notification,
                        );

                      const style =
                        getNotificationStyle(
                          notification.tipo,
                        );

                      return (
                        <button
                          key={
                            notification.id
                          }
                          type="button"
                          onClick={() =>
                            void openNotification(
                              notification,
                            )
                          }
                          className={`group relative flex w-full items-start gap-4 overflow-hidden px-5 py-5 text-left transition sm:px-6 ${
                            unread
                              ? "bg-violet-500/[0.055]"
                              : "bg-transparent"
                          } hover:bg-white/[0.045] focus:outline-none focus-visible:bg-white/[0.06]`}
                        >
                          {unread && (
                            <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-violet-400 via-fuchsia-400 to-sky-400" />
                          )}

                          <div
                            className={`pointer-events-none absolute inset-0 bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${style.glowClassName}`}
                          />

                          <div
                            className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.iconClassName}`}
                          >
                            {style.icon}
                          </div>

                          <div className="relative min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-sm font-black text-white sm:text-base">
                                    {
                                      notification.titulo
                                    }
                                  </p>

                                  {unread && (
                                    <span className="rounded-full bg-violet-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-950">
                                      Nueva
                                    </span>
                                  )}
                                </div>

                                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-400">
                                  {
                                    notification.mensaje
                                  }
                                </p>
                              </div>

                              {unread && (
                                <span
                                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.7)]"
                                  aria-label="No leída"
                                />
                              )}
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 font-bold ${style.badgeClassName}`}
                              >
                                {
                                  style.label
                                }
                              </span>

                              <span className="inline-flex items-center gap-1.5 text-slate-500">
                                <Clock3
                                  size={14}
                                />
                                {formatDate(
                                  notification.creado_en,
                                )}
                              </span>

                              {!unread && (
                                <span className="inline-flex items-center gap-1 text-emerald-400/80">
                                  <CheckCheck
                                    size={
                                      14
                                    }
                                  />
                                  Leída
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      {/* MODAL */}
      {selectedNotification &&
        selectedStyle && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/80 backdrop-blur-md sm:items-center sm:p-6">
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              onClick={() =>
                setSelectedNotification(
                  null,
                )
              }
              aria-label="Cerrar detalle de notificación"
            />

            <section className="relative w-full overflow-hidden rounded-t-[34px] border border-white/10 bg-[#0F172A] shadow-2xl shadow-black/50 sm:max-w-2xl sm:rounded-[34px]">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

              <header className="relative border-b border-white/10 p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl ${selectedStyle.iconClassName}`}
                    >
                      {
                        selectedStyle.icon
                      }
                    </div>

                    <div className="min-w-0">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${selectedStyle.badgeClassName}`}
                      >
                        {
                          selectedStyle.label
                        }
                      </span>

                      <h2 className="mt-3 break-words text-2xl font-black tracking-tight text-white">
                        {
                          selectedNotification.titulo
                        }
                      </h2>

                      <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <Clock3
                          size={14}
                        />
                        {formatDate(
                          selectedNotification.creado_en,
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedNotification(
                        null,
                      )
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                    aria-label="Cerrar"
                  >
                    <X size={18} />
                  </button>
                </div>
              </header>

              <div className="relative max-h-[55vh] overflow-y-auto p-6 sm:p-7">
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-200">
                    {
                      selectedNotification.mensaje
                    }
                  </p>
                </div>

                <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] p-4">
                  <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-300">
                    <CheckCheck
                      size={18}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-emerald-100">
                      Notificación
                      revisada
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      Esta notificación
                      ya fue marcada como
                      leída.
                    </p>
                  </div>
                </div>
              </div>

              <footer className="relative flex flex-col-reverse gap-3 border-t border-white/10 p-5 sm:flex-row sm:justify-end sm:p-6">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedNotification(
                      null,
                    )
                  }
                  className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                >
                  Cerrar
                </button>

                {selectedActionPath && (
                  <button
                    type="button"
                    onClick={() =>
                      goToNotificationAction(
                        selectedNotification,
                      )
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-400"
                  >
                    Ir a la acción
                    <ArrowUpRight
                      size={17}
                    />
                  </button>
                )}
              </footer>
            </section>
          </div>
        )}
    </div>
  );
}