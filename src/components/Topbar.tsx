import {
  ArrowLeft,
  Bell,
  CheckCheck,
  ChevronDown,
  Clock3,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  UserCircle2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

type TopbarProps = {
  role: "admin" | "superadmin";
  onOpenSidebar?: () => void;
};

type UsuarioGuardado = {
  id?: number;
  nombre?: string;
  correo?: string;
  rol?: string;
  foto_perfil?: string | null;
  usuario?: UsuarioGuardado;
  user?: UsuarioGuardado;
};

type NotificationItem = {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: number | boolean;
  creado_en: string;
  data?: unknown;
};

type NotificationVisual = {
  icon: ReactNode;
  label: string;
  iconClassName: string;
  badgeClassName: string;
  glowClassName: string;
};

const API_URL = "http://localhost/vibenotas-backend/public";

function getPhotoUrl(path?: string | null) {
  if (!path) return "";

  const url = path.startsWith("http")
    ? path
    : `${API_URL}/${path.replace(/^\/+/, "")}`;

  return `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
}

function getStoredUser(): UsuarioGuardado {
  try {
    const raw = localStorage.getItem("usuario");
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed?.usuario ?? parsed?.user ?? parsed;
  } catch {
    return {};
  }
}

function formatNotificationDate(value: string) {
  const date = new Date(value.replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseNotificationData(notification?: NotificationItem | null) {
  if (!notification) return {};

  const raw = notification.data;

  if (!raw) return {};

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  if (typeof raw === "object") {
    return raw as Record<string, unknown>;
  }

  return {};
}

function getNotificationVisual(tipo: string): NotificationVisual {
  if (tipo === "chat_message") {
    return {
      icon: <MessageCircle size={19} />,
      label: "Mensaje",
      iconClassName:
        "bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/20",
      badgeClassName:
        "border-sky-400/20 bg-sky-500/10 text-sky-200",
      glowClassName: "from-sky-500/20 via-transparent to-transparent",
    };
  }

  if (tipo === "group_added") {
    return {
      icon: <Users size={19} />,
      label: "Grupo",
      iconClassName:
        "bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20",
      badgeClassName:
        "border-violet-400/20 bg-violet-500/10 text-violet-200",
      glowClassName:
        "from-violet-500/20 via-transparent to-transparent",
    };
  }

  if (tipo === "friend_request") {
    return {
      icon: <Users size={19} />,
      label: "Solicitud",
      iconClassName:
        "bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-400/20",
      badgeClassName:
        "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-200",
      glowClassName:
        "from-fuchsia-500/20 via-transparent to-transparent",
    };
  }

  if (tipo === "friend_accepted") {
    return {
      icon: <CheckCheck size={19} />,
      label: "Amistad",
      iconClassName:
        "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20",
      badgeClassName:
        "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
      glowClassName:
        "from-emerald-500/20 via-transparent to-transparent",
    };
  }

  if (tipo === "security") {
    return {
      icon: <ShieldCheck size={19} />,
      label: "Seguridad",
      iconClassName:
        "bg-red-500/15 text-red-300 ring-1 ring-red-400/20",
      badgeClassName:
        "border-red-400/20 bg-red-500/10 text-red-200",
      glowClassName: "from-red-500/20 via-transparent to-transparent",
    };
  }

  if (tipo === "system") {
    return {
      icon: <Settings size={19} />,
      label: "Sistema",
      iconClassName:
        "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/20",
      badgeClassName:
        "border-amber-400/20 bg-amber-500/10 text-amber-200",
      glowClassName:
        "from-amber-500/20 via-transparent to-transparent",
    };
  }

  return {
    icon: <Bell size={19} />,
    label: "Aviso",
    iconClassName:
      "bg-slate-700/80 text-slate-300 ring-1 ring-white/10",
    badgeClassName:
      "border-slate-500/20 bg-slate-700/60 text-slate-300",
    glowClassName: "from-slate-500/20 via-transparent to-transparent",
  };
}

export default function Topbar({ role, onOpenSidebar }: TopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("tema") !== "light";
  });

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationItem | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [search, setSearch] = useState("");
  const [usuarioActual, setUsuarioActual] =
    useState<UsuarioGuardado>(getStoredUser);
  const [profilePhotoError, setProfilePhotoError] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const usuario = usuarioActual;

  const nombreUsuario =
    usuario.nombre ||
    (role === "superadmin" ? "Super Admin" : "Administrador");

  const iniciales =
    nombreUsuario
      .split(" ")
      .slice(0, 2)
      .map((palabra) => palabra.charAt(0).toUpperCase())
      .join("") || "VN";

  const currentDate = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const esDashboard =
    location.pathname === "/superadmin/dashboard" ||
    location.pathname === "/admin/dashboard";

  const tituloPagina = (() => {
    const path = location.pathname;

    if (path.includes("/users")) return "Usuarios";
    if (path.includes("/administrators")) return "Administradores";
    if (path.includes("/profile")) return "Mi perfil";
    if (path.includes("/settings")) return "Configuración";
    if (path.includes("/notifications")) return "Notificaciones";
    if (path.includes("/analytics")) return "Analíticas";
    if (path.includes("/documents")) return "Documentos PDF";
    if (path.includes("/reminders")) return "Recordatorios";
    if (path.includes("/chat")) return "Mensajería";

    return "Dashboard";
  })();

  const latestNotifications = useMemo(() => {
    return notifications.slice(0, 8);
  }, [notifications]);

  const selectedVisual = selectedNotification
    ? getNotificationVisual(selectedNotification.tipo)
    : null;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("tema", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    const cerrarMenus = (event: MouseEvent) => {
      const target = event.target as Node;

      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", cerrarMenus);

    return () => {
      document.removeEventListener("mousedown", cerrarMenus);
    };
  }, []);

  useEffect(() => {
    const actualizarUsuario = () => {
      setUsuarioActual(getStoredUser());
      setProfilePhotoError(false);
    };

    window.addEventListener("usuarioActualizado", actualizarUsuario);
    window.addEventListener("storage", actualizarUsuario);

    return () => {
      window.removeEventListener("usuarioActualizado", actualizarUsuario);
      window.removeEventListener("storage", actualizarUsuario);
    };
  }, []);

  async function loadNotifications() {
    try {
      setLoadingNotifications(true);

      const response = await api.get("/notifications/me");
      const payload = response.data?.data ?? response.data;

      setNotifications(payload?.notificaciones ?? []);
      setUnreadCount(Number(payload?.sin_leer ?? 0));
    } catch (error) {
      console.error("ERROR CARGANDO NOTIFICACIONES:", error);
    } finally {
      setLoadingNotifications(false);
    }
  }

  useEffect(() => {
    void loadNotifications();

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const cambiarTema = () => {
    setDarkMode((temaActual) => !temaActual);
  };

  const cerrarSesion = () => {
    setProfileOpen(false);
    setNotificationsOpen(false);

    navigate("/logout", {
      replace: true,
    });
  };

  const abrirPerfil = () => {
    setProfileOpen(false);

    navigate(
      role === "superadmin" ? "/superadmin/profile" : "/admin/profile"
    );
  };

  const abrirConfiguracion = () => {
    setProfileOpen(false);

    navigate(
      role === "superadmin" ? "/superadmin/settings" : "/admin/settings"
    );
  };

  const buscar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const texto = search.trim();

    if (!texto) return;

    navigate(
      role === "superadmin"
        ? `/superadmin/users?buscar=${encodeURIComponent(texto)}`
        : `/admin/users?buscar=${encodeURIComponent(texto)}`
    );
  };

  const volverAtras = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(
      role === "superadmin" ? "/superadmin/dashboard" : "/admin/dashboard"
    );
  };

  async function markAllAsRead() {
    try {
      setMarkingAll(true);

      await api.put("/notifications/read-all");

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          leida: 1,
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("ERROR MARCANDO TODAS COMO LEÍDAS:", error);
      await loadNotifications();
    } finally {
      setMarkingAll(false);
    }
  }

  async function openNotification(notification: NotificationItem) {
    setSelectedNotification(notification);
    setNotificationsOpen(false);

    const wasUnread = !Number(notification.leida);

    if (!wasUnread) {
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
    } catch (error) {
      console.error("ERROR MARCANDO NOTIFICACIÓN:", error);
    }
  }

  function goToNotificationAction(notification: NotificationItem) {
    const data = parseNotificationData(notification);
    const basePath = role === "superadmin" ? "/superadmin" : "/admin";

    setSelectedNotification(null);
    setNotificationsOpen(false);

    if (
      (notification.tipo === "chat_message" ||
        notification.tipo === "group_added") &&
      data?.conversacion_id
    ) {
      navigate(`${basePath}/chat/${data.conversacion_id}`);
      return;
    }

    if (
      notification.tipo === "friend_request" ||
      notification.tipo === "friend_accepted"
    ) {
      navigate(`${basePath}/chat`);
      return;
    }

    if (notification.tipo === "security") {
      navigate(`${basePath}/profile`);
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

    if (notification.tipo === "system") {
      navigate("/my-notifications");
      return;
    }

    navigate("/my-notifications");
  }

  const claseBotonIcono = darkMode
    ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900";

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b px-4 py-4 backdrop-blur-xl md:px-8 ${
          darkMode
            ? "border-white/10 bg-[#0F172A]/85"
            : "border-slate-200 bg-white/90"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onOpenSidebar}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition lg:hidden ${claseBotonIcono}`}
              title="Abrir menú"
              aria-label="Abrir menú lateral"
            >
              <Menu size={21} />
            </button>

            {!esDashboard && (
              <button
                type="button"
                onClick={volverAtras}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${claseBotonIcono}`}
                title="Volver atrás"
                aria-label="Volver atrás"
              >
                <ArrowLeft size={20} />
              </button>
            )}

            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-violet-400">
                {role === "superadmin"
                  ? "Panel Super Admin"
                  : "Panel Administrador"}
              </p>

              <h2
                className={`mt-1 truncate text-lg font-bold md:text-2xl ${
                  darkMode ? "text-white" : "text-slate-900"
                }`}
              >
                {esDashboard
                  ? `Bienvenido, ${nombreUsuario} 👋`
                  : tituloPagina}
              </h2>

              <p
                className={`mt-1 hidden text-sm md:block ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {esDashboard
                  ? currentDate
                  : "Gestiona la información de VibeNotas"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <form
              onSubmit={buscar}
              className={`hidden min-w-[260px] items-center gap-3 rounded-2xl border px-4 py-3 lg:flex ${
                darkMode
                  ? "border-white/10 bg-white/5"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <Search
                size={18}
                className={darkMode ? "text-slate-500" : "text-slate-400"}
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar usuarios..."
                className={`w-full bg-transparent text-sm outline-none ${
                  darkMode
                    ? "text-white placeholder:text-slate-500"
                    : "text-slate-800 placeholder:text-slate-400"
                }`}
              />
            </form>

            <button
              type="button"
              onClick={cambiarTema}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border transition ${claseBotonIcono}`}
              title={
                darkMode ? "Cambiar a tema claro" : "Cambiar a tema oscuro"
              }
            >
              {darkMode ? <Sun size={19} /> : <Moon size={19} />}
            </button>

            <div ref={notificationsRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((current) => !current);
                  setProfileOpen(false);
                  void loadNotifications();
                }}
                className={`relative flex h-11 w-11 items-center justify-center rounded-xl border transition ${
                  darkMode
                    ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
                aria-label="Ver notificaciones"
                title="Ver notificaciones"
              >
                <Bell size={19} />

                {unreadCount > 0 && (
                  <>
                    <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-black text-white shadow-lg shadow-violet-500/40">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>

                    <span className="absolute right-1 top-1 h-2 w-2 animate-ping rounded-full bg-violet-400" />
                  </>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-[calc(100%+14px)] z-50 w-[380px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0F172A] shadow-2xl shadow-black/50">
                  <div className="relative overflow-hidden border-b border-white/10 px-5 py-4">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#8B5CF633,transparent_40%)]" />

                    <div className="relative flex items-center justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-200">
                          <Sparkles size={13} />
                          Actividad
                        </div>

                        <p className="mt-2 text-base font-black text-white">
                          Notificaciones
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {unreadCount > 0
                            ? `${unreadCount} sin leer`
                            : "Todo al día"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => void loadNotifications()}
                        disabled={loadingNotifications}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                        title="Recargar"
                      >
                        <RefreshCcw
                          size={16}
                          className={
                            loadingNotifications ? "animate-spin" : ""
                          }
                        />
                      </button>
                    </div>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => void markAllAsRead()}
                        disabled={markingAll}
                        className="relative mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-400 disabled:opacity-50"
                      >
                        {markingAll ? (
                          <RefreshCcw size={15} className="animate-spin" />
                        ) : (
                          <CheckCheck size={15} />
                        )}
                        Marcar todas como leídas
                      </button>
                    )}
                  </div>

                  <div className="max-h-[430px] overflow-y-auto p-2">
                    {loadingNotifications ? (
                      <div className="flex items-center gap-3 rounded-2xl p-5 text-sm text-slate-400">
                        <RefreshCcw size={18} className="animate-spin" />
                        Cargando notificaciones...
                      </div>
                    ) : latestNotifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-3xl p-8 text-center">
                        <div className="rounded-2xl bg-violet-500/10 p-4 text-violet-300 ring-1 ring-violet-400/20">
                          <Bell size={26} />
                        </div>

                        <p className="mt-4 text-sm font-bold text-white">
                          Sin notificaciones
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Cuando haya actividad importante, aparecerá aquí.
                        </p>
                      </div>
                    ) : (
                      latestNotifications.map((notification) => {
                        const isUnread = !Number(notification.leida);
                        const visual = getNotificationVisual(notification.tipo);

                        return (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => void openNotification(notification)}
                            className={`group relative w-full overflow-hidden rounded-2xl p-3 text-left transition hover:bg-white/[0.055] ${
                              isUnread
                                ? "bg-violet-500/[0.09]"
                                : "bg-transparent"
                            }`}
                          >
                            <div
                              className={`absolute inset-0 bg-gradient-to-r opacity-0 transition group-hover:opacity-100 ${visual.glowClassName}`}
                            />

                            {isUnread && (
                              <div className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-gradient-to-b from-violet-400 via-fuchsia-400 to-sky-400" />
                            )}

                            <div className="relative flex items-start gap-3">
                              <div
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${visual.iconClassName}`}
                              >
                                {visual.icon}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="truncate text-sm font-black text-white">
                                    {notification.titulo}
                                  </p>

                                  {isUnread && (
                                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-400 shadow-lg shadow-violet-400/50" />
                                  )}
                                </div>

                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                                  {notification.mensaje}
                                </p>

                                <div className="mt-3 flex items-center justify-between gap-3">
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${visual.badgeClassName}`}
                                  >
                                    {visual.label}
                                  </span>

                                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                    <Clock3 size={12} />
                                    {formatNotificationDate(
                                      notification.creado_en
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="border-t border-white/10 p-3">
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        navigate("/my-notifications");
                      }}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/[0.08] hover:text-white"
                    >
                      Ver centro de notificaciones
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((estado) => !estado);
                  setNotificationsOpen(false);
                }}
                className={`flex items-center gap-3 rounded-2xl border p-1.5 pr-2 transition md:px-3 md:py-2 ${
                  darkMode
                    ? "border-white/10 bg-white/5 hover:bg-white/10"
                    : "border-slate-200 bg-white hover:bg-slate-100"
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-sm font-bold text-white shadow-lg shadow-violet-900/30 md:h-10 md:w-10">
                  {usuario.foto_perfil && !profilePhotoError ? (
                    <img
                      src={getPhotoUrl(usuario.foto_perfil)}
                      alt={`Foto de ${nombreUsuario}`}
                      className="h-full w-full object-cover"
                      onError={() => setProfilePhotoError(true)}
                    />
                  ) : (
                    <span>{iniciales}</span>
                  )}
                </div>

                <div className="hidden text-left lg:block">
                  <p
                    className={`max-w-[140px] truncate text-sm font-semibold ${
                      darkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {nombreUsuario}
                  </p>

                  <p className="text-xs text-violet-400">
                    {role === "superadmin" ? "Acceso total" : "Administrador"}
                  </p>
                </div>

                <ChevronDown
                  size={17}
                  className={`hidden transition md:block ${
                    profileOpen ? "rotate-180" : ""
                  } ${darkMode ? "text-slate-400" : "text-slate-500"}`}
                />
              </button>

              {profileOpen && (
                <div
                  className={`absolute right-0 top-[calc(100%+12px)] z-50 w-60 rounded-2xl border p-2 shadow-2xl ${
                    darkMode
                      ? "border-white/10 bg-[#1E293B] shadow-black/40"
                      : "border-slate-200 bg-white shadow-slate-300/30"
                  }`}
                >
                  <div
                    className={`mb-2 rounded-xl px-3 py-3 ${
                      darkMode ? "bg-white/5" : "bg-slate-50"
                    }`}
                  >
                    <p
                      className={`truncate text-sm font-bold ${
                        darkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {nombreUsuario}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-500">
                      {usuario.correo || "superadmin@vibenotas.com"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={abrirPerfil}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                      darkMode
                        ? "text-slate-300 hover:bg-white/5 hover:text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <UserCircle2 size={18} />
                    Mi perfil
                  </button>

                  <button
                    type="button"
                    onClick={abrirConfiguracion}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                      darkMode
                        ? "text-slate-300 hover:bg-white/5 hover:text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Settings size={18} />
                    Configuración
                  </button>

                  <div
                    className={`my-2 border-t ${
                      darkMode ? "border-white/10" : "border-slate-100"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={cerrarSesion}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                  >
                    <LogOut size={18} />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {selectedNotification && selectedVisual && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-md sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setSelectedNotification(null)}
            aria-label="Cerrar notificación"
          />

          <section className="relative w-full overflow-hidden rounded-t-[34px] border border-white/10 bg-[#0F172A] shadow-2xl shadow-black/50 sm:max-w-xl sm:rounded-[34px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#8B5CF633,transparent_36%),radial-gradient(circle_at_bottom_right,#38BDF822,transparent_34%)]" />
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

            <div className="relative border-b border-white/10 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl ${selectedVisual.iconClassName}`}
                  >
                    {selectedVisual.icon}
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${selectedVisual.badgeClassName}`}
                    >
                      {selectedVisual.label}
                    </span>

                    <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
                      {selectedNotification.titulo}
                    </h2>

                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock3 size={14} />
                      {formatNotificationDate(selectedNotification.creado_en)}
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

            <div className="relative max-h-[50vh] overflow-y-auto p-6">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="whitespace-pre-line text-sm leading-7 text-slate-200">
                  {selectedNotification.mensaje}
                </p>
              </div>

              <div className="mt-5 rounded-3xl border border-emerald-400/15 bg-emerald-500/[0.06] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
                  Estado
                </p>

                <p className="mt-2 text-sm text-slate-300">
                  Esta notificación fue marcada como leída.
                </p>
              </div>
            </div>

            <div className="relative flex flex-col-reverse gap-3 border-t border-white/10 p-5 sm:flex-row sm:justify-end">
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
                Ir a la acción
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}