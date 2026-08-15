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
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
  X,
  Zap,
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
  prioridad?: string | null;
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

type ReadFilter =
  | "todas"
  | "sin_leer"
  | "leidas";

type LoadOptions = {
  silent?: boolean;
};

const READ_FILTERS: Array<{
  key: ReadFilter;
  label: string;
}> = [
  {
    key: "todas",
    label: "Todas",
  },
  {
    key: "sin_leer",
    label: "Sin leer",
  },
  {
    key: "leidas",
    label: "Leídas",
  },
];

const POLL_INTERVAL_MS = 30_000;

function normalizeRole(
  value: unknown,
): string {
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
          "object" &&
        parsed !== null
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

function formatDate(value: string) {
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

function formatRelativeDate(
  value: string,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return formatDate(value);
  }

  const diffMs =
    Date.now() - date.getTime();

  if (diffMs < 0) {
    return formatDate(value);
  }

  const minutes = Math.floor(
    diffMs / 60_000,
  );

  if (minutes < 1) {
    return "Ahora";
  }

  if (minutes < 60) {
    return `Hace ${minutes} min`;
  }

  const hours = Math.floor(
    minutes / 60,
  );

  if (hours < 24) {
    return `Hace ${hours} h`;
  }

  const days = Math.floor(
    hours / 24,
  );

  if (days < 7) {
    return `Hace ${days} d`;
  }

  return formatDate(value);
}

function normalizePriority(
  value?: string | null,
) {
  return String(value ?? "NORMAL")
    .trim()
    .toUpperCase();
}

function isHighPriority(
  notification: NotificationItem,
) {
  const priority = normalizePriority(
    notification.prioridad,
  );

  return (
    priority === "HIGH" ||
    priority === "CRITICAL" ||
    priority === "ALTA" ||
    priority === "CRITICA" ||
    priority === "CRÍTICA"
  );
}

function getPriorityBadge(
  value?: string | null,
) {
  const priority =
    normalizePriority(value);

  if (
    priority === "CRITICAL" ||
    priority === "CRITICA" ||
    priority === "CRÍTICA"
  ) {
    return {
      label: "Crítica",
      className:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200",
    };
  }

  if (
    priority === "HIGH" ||
    priority === "ALTA"
  ) {
    return {
      label: "Alta",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200",
    };
  }

  if (
    priority === "LOW" ||
    priority === "BAJA"
  ) {
    return {
      label: "Baja",
      className:
        "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400",
    };
  }

  return null;
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
          "bg-sky-100 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-400/20",
        badgeClassName:
          "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-200",
        label: "Mensaje",
        glowClassName:
          "from-sky-500/15 via-transparent to-transparent",
      };

    case "group_added":
      return {
        icon: <Users size={21} />,
        iconClassName:
          "bg-violet-100 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-400/20",
        badgeClassName:
          "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200",
        label: "Grupo",
        glowClassName:
          "from-violet-500/15 via-transparent to-transparent",
      };

    case "friend_request":
      return {
        icon: <Users size={21} />,
        iconClassName:
          "bg-fuchsia-100 text-fuchsia-700 ring-1 ring-fuchsia-200 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:ring-fuchsia-400/20",
        badgeClassName:
          "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-400/20 dark:bg-fuchsia-500/10 dark:text-fuchsia-200",
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
          "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/20",
        badgeClassName:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200",
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
          "bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-400/20",
        badgeClassName:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200",
        label: "Seguridad",
        glowClassName:
          "from-red-500/15 via-transparent to-transparent",
      };

    case "system":
      return {
        icon: <Settings size={21} />,
        iconClassName:
          "bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/20",
        badgeClassName:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200",
        label: "Sistema",
        glowClassName:
          "from-amber-500/15 via-transparent to-transparent",
      };

    case "new_user":
      return {
        icon: <Users size={21} />,
        iconClassName:
          "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:ring-cyan-400/20",
        badgeClassName:
          "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-200",
        label: "Usuario",
        glowClassName:
          "from-cyan-500/15 via-transparent to-transparent",
      };

    case "new_admin":
      return {
        icon: (
          <ShieldCheck size={21} />
        ),
        iconClassName:
          "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-400/20",
        badgeClassName:
          "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-200",
        label: "Administrador",
        glowClassName:
          "from-indigo-500/15 via-transparent to-transparent",
      };

    default:
      return {
        icon: <Bell size={21} />,
        iconClassName:
          "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-700/80 dark:text-slate-300 dark:ring-white/10",
        badgeClassName:
          "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-500/20 dark:bg-slate-700/50 dark:text-slate-300",
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
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    markingAll,
    setMarkingAll,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    readFilter,
    setReadFilter,
  ] =
    useState<ReadFilter>("todas");

  const [
    typeFilter,
    setTypeFilter,
  ] = useState("todos");

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

  const highPriorityCount =
    useMemo(
      () =>
        notifications.filter(
          (notification) =>
            !isNotificationRead(
              notification,
            ) &&
            isHighPriority(
              notification,
            ),
        ).length,
      [notifications],
    );

  const availableTypes =
    useMemo(() => {
      const types = new Map<
        string,
        string
      >();

      for (const notification of notifications) {
        if (
          !types.has(
            notification.tipo,
          )
        ) {
          types.set(
            notification.tipo,
            getNotificationStyle(
              notification.tipo,
            ).label,
          );
        }
      }

      return Array.from(
        types.entries(),
      )
        .map(([value, label]) => ({
          value,
          label,
        }))
        .sort((a, b) =>
          a.label.localeCompare(
            b.label,
            "es",
          ),
        );
    }, [notifications]);

  const filteredNotifications =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return notifications.filter(
        (notification) => {
          const read =
            isNotificationRead(
              notification,
            );

          const matchesRead =
            readFilter === "todas" ||
            (readFilter ===
              "sin_leer" &&
              !read) ||
            (readFilter ===
              "leidas" &&
              read);

          const matchesType =
            typeFilter === "todos" ||
            notification.tipo ===
              typeFilter;

          const matchesSearch =
            !query ||
            notification.titulo
              .toLowerCase()
              .includes(query) ||
            notification.mensaje
              .toLowerCase()
              .includes(query);

          return (
            matchesRead &&
            matchesType &&
            matchesSearch
          );
        },
      );
    }, [
      notifications,
      readFilter,
      typeFilter,
      search,
    ]);

  const loadNotifications =
    useCallback(
      async (
        options: LoadOptions = {},
      ) => {
        const silent =
          options.silent ?? false;

        try {
          if (silent) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          const response =
            await api.get(
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
          if (silent) {
            setRefreshing(false);
          } else {
            setLoading(false);
          }
        }
      },
      [],
    );

  useEffect(() => {
    void loadNotifications();

    const poll = window.setInterval(
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void loadNotifications({
            silent: true,
          });
        }
      },
      POLL_INTERVAL_MS,
    );

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void loadNotifications({
            silent: true,
          });
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.clearInterval(poll);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
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

      const now =
        new Date().toISOString();

      setNotifications((current) =>
        current.map(
          (notification) => ({
            ...notification,
            leida: 1,
            vista: 1,
            leido_en:
              notification.leido_en ??
              now,
            visto_en:
              notification.visto_en ??
              now,
          }),
        ),
      );

      setUnreadCount(0);

      setSelectedNotification(
        (current) =>
          current
            ? {
                ...current,
                leida: 1,
                vista: 1,
                leido_en:
                  current.leido_en ??
                  now,
                visto_en:
                  current.visto_en ??
                  now,
              }
            : current,
      );
    } catch (caughtError) {
      setError(
        axios.isAxiosError(
          caughtError,
        ) &&
          typeof caughtError.response
            ?.data?.message ===
            "string"
          ? caughtError.response.data
              .message
          : "No se pudieron marcar las notificaciones como leídas.",
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
      setError("");

      await api.put(
        `/notifications/${notification.id}/read`,
      );

      const now =
        new Date().toISOString();

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                leida: 1,
                vista: 1,
                leido_en:
                  item.leido_en ??
                  now,
                visto_en:
                  item.visto_en ??
                  now,
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
                leido_en:
                  current.leido_en ??
                  now,
                visto_en:
                  current.visto_en ??
                  now,
              }
            : current,
      );

      setUnreadCount((current) =>
        Math.max(0, current - 1),
      );
    } catch (caughtError) {
      setError(
        axios.isAxiosError(
          caughtError,
        ) &&
          typeof caughtError.response
            ?.data?.message ===
            "string"
          ? caughtError.response.data
              .message
          : "No se pudo marcar la notificación como leída.",
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

  function clearFilters() {
    setSearch("");
    setReadFilter("todas");
    setTypeFilter("todos");
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

  const selectedPriority =
    selectedNotification
      ? getPriorityBadge(
          selectedNotification.prioridad,
        )
      : null;

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)] transition-colors duration-300 lg:flex">
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
            <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-6 shadow-xl shadow-slate-200/60 sm:p-8 dark:border-white/10 dark:from-[#131A2D] dark:via-[#111827] dark:to-[#10243A] dark:shadow-2xl dark:shadow-black/25">
              <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-500/10" />
              <div className="pointer-events-none absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl dark:bg-sky-500/10" />

              <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200">
                    <Sparkles size={15} />
                    Centro de actividad
                  </div>

                  <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                    Mis notificaciones
                  </h1>

                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-400 sm:text-base">
                    Mantente al día con mensajes, alertas de seguridad y avisos importantes. Las notificaciones nuevas se sincronizan automáticamente.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[600px]">
                  <article className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total
                    </p>
                    <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                      {totalNotifications}
                    </p>
                  </article>

                  <article className="rounded-3xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-400/20 dark:bg-violet-500/[0.08]">
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                      Sin leer
                    </p>
                    <p className="mt-2 text-3xl font-black text-violet-900 dark:text-violet-100">
                      {unreadCount}
                    </p>
                  </article>

                  <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-400/20 dark:bg-emerald-500/[0.08]">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                      Leídas
                    </p>
                    <p className="mt-2 text-3xl font-black text-emerald-900 dark:text-emerald-100">
                      {readCount}
                    </p>
                  </article>

                  <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-400/20 dark:bg-amber-500/[0.08]">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                      Prioridad
                    </p>
                    <p className="mt-2 text-3xl font-black text-amber-900 dark:text-amber-100">
                      {highPriorityCount}
                    </p>
                  </article>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-white/10 dark:bg-[#101827] dark:shadow-none">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Buscar por título o mensaje"
                    className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-white/[0.035] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-violet-400/30 dark:focus:ring-violet-500/10"
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() =>
                        setSearch("")
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
                      aria-label="Limpiar búsqueda"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {READ_FILTERS.map(
                    (filter) => (
                      <button
                        key={filter.key}
                        type="button"
                        onClick={() =>
                          setReadFilter(
                            filter.key,
                          )
                        }
                        className={`rounded-xl px-3.5 py-2.5 text-sm font-bold transition ${
                          readFilter ===
                          filter.key
                            ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                            : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.07] dark:hover:text-white"
                        }`}
                      >
                        {filter.label}
                      </button>
                    ),
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadNotifications({
                      silent: true,
                    })
                  }
                  disabled={refreshing}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
                >
                  <RefreshCw
                    size={17}
                    className={
                      refreshing
                        ? "animate-spin"
                        : ""
                    }
                  />
                  Actualizar
                </button>
              </div>

              {availableTypes.length >
                1 && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-white/[0.07]">
                  <button
                    type="button"
                    onClick={() =>
                      setTypeFilter(
                        "todos",
                      )
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      typeFilter ===
                      "todos"
                        ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/25 dark:bg-violet-500/10 dark:text-violet-200"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-500 dark:hover:bg-white/[0.05]"
                    }`}
                  >
                    Todos los tipos
                  </button>

                  {availableTypes.map(
                    (type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          setTypeFilter(
                            type.value,
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                          typeFilter ===
                          type.value
                            ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/25 dark:bg-violet-500/10 dark:text-violet-200"
                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-500 dark:hover:bg-white/[0.05]"
                        }`}
                      >
                        {type.label}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-white/10 dark:bg-[#101827] dark:shadow-none">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-white">
                  {unreadCount > 0
                    ? `${unreadCount} ${
                        unreadCount ===
                        1
                          ? "notificación pendiente"
                          : "notificaciones pendientes"
                      }`
                    : "Todo está al día"}
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-500">
                  {unreadCount > 0
                    ? "Abre una notificación para revisarla o marca todas como leídas."
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
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3 text-sm font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-400/30 disabled:cursor-not-allowed disabled:opacity-40 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-100 dark:hover:border-violet-400/30 dark:hover:bg-violet-500/20 dark:focus:ring-violet-400/40"
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

            {error && (
              <div className="flex flex-col gap-4 rounded-3xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-red-500/20 dark:bg-red-500/10">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-red-100 p-2 text-red-700 dark:bg-red-500/15 dark:text-red-300">
                    <TriangleAlert
                      size={18}
                    />
                  </div>

                  <div>
                    <p className="font-bold text-red-900 dark:text-red-100">
                      No pudimos completar la operación
                    </p>

                    <p className="mt-1 text-sm text-red-700 dark:text-red-200/80">
                      {error}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setError("")
                    }
                    className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 dark:border-red-400/20 dark:bg-transparent dark:text-red-200 dark:hover:bg-red-500/10"
                  >
                    Cerrar
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void loadNotifications({
                        silent: true,
                      })
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-100 dark:hover:bg-red-500/20"
                  >
                    <RefreshCw
                      size={16}
                    />
                    Reintentar
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-[#101827] dark:shadow-black/15">
              <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-white/[0.07]">
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    Centro de notificaciones
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {filteredNotifications.length} de {notifications.length} visibles
                  </p>
                </div>

                {refreshing && (
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-violet-600 dark:text-violet-300">
                    <LoaderCircle
                      size={14}
                      className="animate-spin"
                    />
                    Sincronizando
                  </span>
                )}
              </div>

              {loading ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 px-6 text-center">
                  <div className="rounded-3xl bg-violet-100 p-5 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                    <LoaderCircle
                      size={30}
                      className="animate-spin"
                    />
                  </div>

                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      Cargando notificaciones
                    </p>

                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-500">
                      Estamos preparando tu centro de actividad.
                    </p>
                  </div>
                </div>
              ) : notifications.length ===
                0 ? (
                <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-14 text-center">
                  <div className="rounded-[26px] border border-violet-200 bg-violet-50 p-5 text-violet-700 dark:border-violet-400/15 dark:bg-violet-500/10 dark:text-violet-300">
                    <Inbox size={34} />
                  </div>

                  <h2 className="mt-5 text-xl font-black text-slate-950 dark:text-white">
                    No tienes notificaciones
                  </h2>

                  <p className="mt-2 max-w-md text-sm leading-7 text-slate-600 dark:text-slate-400">
                    Cuando haya actividad importante en tu cuenta, aparecerá aquí automáticamente.
                  </p>
                </div>
              ) : filteredNotifications.length ===
                0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-14 text-center">
                  <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-5 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                    <Search size={30} />
                  </div>

                  <h2 className="mt-5 text-xl font-black text-slate-950 dark:text-white">
                    Sin coincidencias
                  </h2>

                  <p className="mt-2 max-w-md text-sm leading-7 text-slate-600 dark:text-slate-400">
                    No encontramos notificaciones con los filtros actuales.
                  </p>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08]"
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/[0.07]">
                  {filteredNotifications.map(
                    (notification) => {
                      const unread =
                        !isNotificationRead(
                          notification,
                        );

                      const style =
                        getNotificationStyle(
                          notification.tipo,
                        );

                      const priority =
                        getPriorityBadge(
                          notification.prioridad,
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
                              ? "bg-violet-50/80 dark:bg-violet-500/[0.055]"
                              : "bg-transparent"
                          } hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-100 dark:hover:bg-white/[0.045] dark:focus-visible:bg-white/[0.06]`}
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
                                  <p className="truncate text-sm font-black text-slate-900 dark:text-white sm:text-base">
                                    {notification.titulo}
                                  </p>

                                  {unread && (
                                    <span className="rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                                      Nueva
                                    </span>
                                  )}

                                  {priority && (
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${priority.className}`}
                                    >
                                      <Zap size={10} />
                                      {priority.label}
                                    </span>
                                  )}
                                </div>

                                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                  {notification.mensaje}
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
                                {style.label}
                              </span>

                              <span
                                title={formatDate(
                                  notification.creado_en,
                                )}
                                className="inline-flex items-center gap-1.5 text-slate-500"
                              >
                                <Clock3
                                  size={14}
                                />
                                {formatRelativeDate(
                                  notification.creado_en,
                                )}
                              </span>

                              {!unread && (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400/80">
                                  <CheckCheck
                                    size={14}
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

      {selectedNotification &&
        selectedStyle && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 backdrop-blur-md sm:items-center sm:p-6 dark:bg-slate-950/80">
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

            <section className="relative w-full overflow-hidden rounded-t-[34px] border border-slate-200 bg-white shadow-2xl shadow-slate-500/30 sm:max-w-2xl sm:rounded-[34px] dark:border-white/10 dark:bg-[#0F172A] dark:shadow-black/50">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

              <header className="relative border-b border-slate-200 p-6 sm:p-7 dark:border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl ${selectedStyle.iconClassName}`}
                    >
                      {selectedStyle.icon}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${selectedStyle.badgeClassName}`}
                        >
                          {selectedStyle.label}
                        </span>

                        {selectedPriority && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${selectedPriority.className}`}
                          >
                            <Zap size={12} />
                            {selectedPriority.label}
                          </span>
                        )}
                      </div>

                      <h2 className="mt-3 break-words text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                        {selectedNotification.titulo}
                      </h2>

                      <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <Clock3 size={14} />
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
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
                    aria-label="Cerrar"
                  >
                    <X size={18} />
                  </button>
                </div>
              </header>

              <div className="relative max-h-[55vh] overflow-y-auto p-6 sm:p-7">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-700 dark:text-slate-200">
                    {selectedNotification.mensaje}
                  </p>
                </div>

                <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/15 dark:bg-emerald-500/[0.06]">
                  <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <CheckCheck
                      size={18}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                      Notificación revisada
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {selectedNotification.leido_en
                        ? `Leída el ${formatDate(
                            selectedNotification.leido_en,
                          )}`
                        : "Esta notificación ya fue marcada como leída."}
                    </p>
                  </div>
                </div>
              </div>

              <footer className="relative flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end sm:p-6 dark:border-white/10">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedNotification(
                      null,
                    )
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
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