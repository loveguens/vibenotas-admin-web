import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  CheckCheck,
  Clock3,
  LoaderCircle,
  MessageCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import axios from "axios";
import Topbar from "../components/Topbar";

type NotificationItem = {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: number | boolean;
  creado_en: string;
  data?: unknown;
};

type NotificationStyle = {
  icon: ReactNode;
  iconClassName: string;
  badgeClassName: string;
  label: string;
  glowClassName: string;
};

export default function NotificationsPage() {
  const navigate = useNavigate();

  const userRole: "admin" | "superadmin" = (() => {
  try {
    const raw = localStorage.getItem("usuario");
    const parsed = raw ? JSON.parse(raw) : null;
    const user = parsed?.usuario ?? parsed?.user ?? parsed;

    const roles = Array.isArray(user?.roles)
      ? user.roles
          .map((role: unknown) =>
            String(role).trim().toLowerCase(),
          )
          .filter(Boolean)
      : [];

    const legacyRole = String(user?.rol ?? "")
      .trim()
      .toLowerCase();

    return roles.includes("super_admin") ||
      roles.includes("superadmin") ||
      legacyRole === "super_admin" ||
      legacyRole === "superadmin"
      ? "superadmin"
      : "admin";
  } catch {
    return "admin";
  }
})();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationItem | null>(null);

  const totalNotifications = notifications.length;

  const [, setSidebarOpen] = useState(false);
  const readCount = useMemo(() => {
    return notifications.filter((notification) =>
      Boolean(Number(notification.leida))
    ).length;
  }, [notifications]);

  async function loadNotifications() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/notifications/me");
      const payload = response.data?.data ?? response.data;

      setNotifications(payload?.notificaciones ?? []);
      setUnreadCount(Number(payload?.sin_leer ?? 0));
    } catch (err) {
      console.error("ERROR CARGANDO NOTIFICACIONES:", err);

      if (axios.isAxiosError(err)) {
        console.error("STATUS:", err.response?.status);
        console.error("RESPUESTA BACKEND:", err.response?.data);

        setError(
          err.response?.data?.message ||
            "No se pudieron cargar las notificaciones."
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las notificaciones."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  async function markAllAsRead() {
    try {
      setMarkingAll(true);
      setError("");

      await api.put("/notifications/read-all");

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          leida: 1,
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error("ERROR MARCANDO TODAS COMO LEÃƒÆ’Ã†â€™Ãƒâ€šÃ‚ÂDAS:", err);
      setError("No se pudieron marcar las notificaciones como leÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­das.");
    } finally {
      setMarkingAll(false);
    }
  }

  async function openNotification(notification: NotificationItem) {
    setSelectedNotification(notification);

    const isUnread = !Number(notification.leida);

    if (!isUnread) {
      return;
    }

    try {
      await api.put(`/notifications/${notification.id}/read`);

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, leida: 1 } : item
        )
      );

      setSelectedNotification((current) =>
        current?.id === notification.id ? { ...current, leida: 1 } : current
      );

      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (err) {
      console.error("ERROR MARCANDO NOTIFICACIÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œN:", err);
    }
  }

  function parseNotificationData(notification?: NotificationItem | null) {
    if (!notification) return {};

    const raw = notification.data;

    if (!raw) return {};

    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }

    if (typeof raw === "object") {
      return raw as Record<string, unknown>;
    }

    return {};
  }

  function goToNotificationAction(notification: NotificationItem) {
    const data = parseNotificationData(notification);

    if (
      (notification.tipo === "chat_message" ||
        notification.tipo === "group_added" ||
        notification.tipo === "friend_accepted" ||
        notification.tipo === "friend_request") &&
      data?.conversacion_id
    ) {
      navigate(`/${userRole}/chat/${data.conversacion_id}`);
      return;
    }

    if (notification.tipo === "security") {
      navigate(`/${userRole}/profile`);
      return;
    }

    if (notification.tipo === "new_user") {
      navigate("/superadmin/users");
      return;
    }

    if (notification.tipo === "new_admin") {
      navigate("/superadmin/administrators");
      return;
    }

    setSelectedNotification(null);
  }

  function formatDate(value: string) {
    const date = new Date(value.replace(" ", "T"));

    if (Number.isNaN(date.getTime())) {
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

  function getNotificationStyle(tipo: string): NotificationStyle {
    if (tipo === "chat_message") {
      return {
        icon: <MessageCircle size={21} />,
        iconClassName:
          "bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/20",
        badgeClassName:
          "border-sky-400/20 bg-sky-500/10 text-sky-200",
        label: "Mensaje",
        glowClassName: "from-sky-500/20 via-transparent to-transparent",
      };
    }

    if (tipo === "group_added") {
      return {
        icon: <Users size={21} />,
        iconClassName:
          "bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20",
        badgeClassName:
          "border-violet-400/20 bg-violet-500/10 text-violet-200",
        label: "Grupo",
        glowClassName: "from-violet-500/20 via-transparent to-transparent",
      };
    }

    if (tipo === "friend_request") {
      return {
        icon: <Users size={21} />,
        iconClassName:
          "bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-400/20",
        badgeClassName:
          "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-200",
        label: "Solicitud",
        glowClassName: "from-fuchsia-500/20 via-transparent to-transparent",
      };
    }

    if (tipo === "friend_accepted") {
      return {
        icon: <CheckCheck size={21} />,
        iconClassName:
          "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20",
        badgeClassName:
          "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
        label: "Amistad",
        glowClassName: "from-emerald-500/20 via-transparent to-transparent",
      };
    }

    if (tipo === "security") {
      return {
        icon: <ShieldCheck size={21} />,
        iconClassName:
          "bg-red-500/15 text-red-300 ring-1 ring-red-400/20",
        badgeClassName:
          "border-red-400/20 bg-red-500/10 text-red-200",
        label: "Seguridad",
        glowClassName: "from-red-500/20 via-transparent to-transparent",
      };
    }

    if (tipo === "system") {
      return {
        icon: <Settings size={21} />,
        iconClassName:
          "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/20",
        badgeClassName:
          "border-amber-400/20 bg-amber-500/10 text-amber-200",
        label: "Sistema",
        glowClassName: "from-amber-500/20 via-transparent to-transparent",
      };
    }

    return {
      icon: <Bell size={21} />,
      iconClassName:
        "bg-slate-700/80 text-slate-300 ring-1 ring-white/10",
      badgeClassName:
        "border-slate-500/20 bg-slate-700/50 text-slate-300",
      label: "Aviso",
      glowClassName: "from-slate-500/20 via-transparent to-transparent",
    };
  }

  const selectedStyle = selectedNotification
    ? getNotificationStyle(selectedNotification.tipo)
    : null;

  return (
  <div className="min-h-screen bg-[#0B1120] text-slate-100">
    <Topbar role={userRole}
    onOpenSidebar={() => setSidebarOpen(true)} />

    <main className="px-4 py-7 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl space-y-7">
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#111827] p-6 shadow-2xl shadow-black/25 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#8B5CF633,transparent_34%),radial-gradient(circle_at_bottom_right,#38BDF822,transparent_34%)]" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-violet-200">
              <Sparkles size={15} />
              Centro de actividad
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">
              Mis Notificaciones
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              Revisa mensajes, solicitudes, alertas de seguridad y actividad
              importante de tu cuenta con una vista mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡s clara y profesional.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold text-slate-400">Total</p>
              <p className="mt-2 text-2xl font-black text-white">
                {totalNotifications}
              </p>
            </article>

            <article className="rounded-3xl border border-violet-400/15 bg-violet-500/[0.08] p-4">
              <p className="text-xs font-semibold text-violet-200">
                Sin leer
              </p>
              <p className="mt-2 text-2xl font-black text-violet-100">
                {unreadCount}
              </p>
            </article>

            <article className="rounded-3xl border border-emerald-400/15 bg-emerald-500/[0.08] p-4">
              <p className="text-xs font-semibold text-emerald-200">
                LeÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­das
              </p>
              <p className="mt-2 text-2xl font-black text-emerald-100">
                {readCount}
              </p>
            </article>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-white">
            {unreadCount > 0
              ? `${unreadCount} notificaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n${
                  unreadCount === 1 ? "" : "es"
                } sin leer`
              : "Todo estÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ al dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a"}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Haz clic en una notificaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n para leerla en detalle.
          </p>
        </div>

        <button
          type="button"
          onClick={markAllAsRead}
          disabled={unreadCount === 0 || markingAll}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-bold text-violet-100 shadow-lg shadow-violet-500/5 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {markingAll ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <CheckCheck size={18} />
          )}
          Marcar todas como leÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­das
        </button>
      </div>

      {error && (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#111827]/95 shadow-2xl shadow-black/20">
        {loading ? (
          <div className="flex items-center justify-center gap-3 p-16 text-sm text-slate-400">
            <LoaderCircle size={22} className="animate-spin" />
            Cargando notificaciones...
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="rounded-3xl bg-violet-500/10 p-5 text-violet-300 ring-1 ring-violet-400/20">
              <Bell size={34} />
            </div>

            <p className="mt-5 text-lg font-bold text-white">
              No tienes notificaciones todavÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a
            </p>

            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
              Cuando haya actividad importante en tu cuenta, aparecerÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ aquÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {notifications.map((notification) => {
              const isUnread = !Number(notification.leida);
              const style = getNotificationStyle(notification.tipo);

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void openNotification(notification)}
                  className={`group relative flex w-full items-start gap-4 overflow-hidden px-5 py-5 text-left transition hover:bg-white/[0.045] sm:px-6 ${
                    isUnread ? "bg-violet-500/[0.055]" : "bg-transparent"
                  }`}
                >
                  <div
                    className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${
                      isUnread
                        ? "from-violet-400 via-fuchsia-400 to-sky-400"
                        : "from-transparent to-transparent"
                    }`}
                  />

                  <div
                    className={`absolute inset-0 bg-gradient-to-r opacity-0 transition group-hover:opacity-100 ${style.glowClassName}`}
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
                            {notification.titulo}
                          </p>

                          {isUnread && (
                            <span className="rounded-full bg-violet-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-950">
                              Nueva
                            </span>
                          )}
                        </div>

                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-400">
                          {notification.mensaje}
                        </p>
                      </div>

                      {isUnread && (
                        <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-violet-400 shadow-lg shadow-violet-400/50" />
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 font-bold ${style.badgeClassName}`}
                      >
                        {style.label}
                      </span>

                      <span className="inline-flex items-center gap-1.5 text-slate-500">
                        <Clock3 size={14} />
                        {formatDate(notification.creado_en)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedNotification && selectedStyle && (
        <div className="fixed inset-0 z-[12000] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-md sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setSelectedNotification(null)}
            aria-label="Cerrar ventana"
          />

          <section className="relative w-full overflow-hidden rounded-t-[34px] border border-white/10 bg-[#0F172A] shadow-2xl shadow-black/50 sm:max-w-2xl sm:rounded-[34px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#8B5CF633,transparent_36%),radial-gradient(circle_at_bottom_right,#38BDF822,transparent_34%)]" />
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

            <div className="relative border-b border-white/10 p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl ${selectedStyle.iconClassName}`}
                  >
                    {selectedStyle.icon}
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${selectedStyle.badgeClassName}`}
                    >
                      {selectedStyle.label}
                    </span>

                    <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
                      {selectedNotification.titulo}
                    </h2>

                    <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <Clock3 size={14} />
                      {formatDate(selectedNotification.creado_en)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="relative max-h-[55vh] overflow-y-auto p-6 sm:p-7">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="whitespace-pre-line text-sm leading-7 text-slate-200">
                  {selectedNotification.mensaje}
                </p>
              </div>

              <div className="mt-5 rounded-3xl border border-violet-400/15 bg-violet-500/[0.06] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
                  Estado
                </p>

                <p className="mt-2 text-sm text-slate-300">
                  Esta notificaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n ya fue marcada como leÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­da.
                </p>
              </div>
            </div>

            <div className="relative flex flex-col-reverse gap-3 border-t border-white/10 p-5 sm:flex-row sm:justify-end sm:p-6">
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={() => goToNotificationAction(selectedNotification)}
                className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-400"
              >
                Ir a la acciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n
              </button>
            </div>
          </section>
        </div>
      )}
      </section>
    </main>
  </div>
);
}