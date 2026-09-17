import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  FileText,
  Folder,
  HardDrive,
  ListChecks,
  MessageCircle,
  MessagesSquare,
  RefreshCw,
  StickyNote,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";

type UserStatus =
  "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "DISABLED" | string;

type Role = {
  id: string;
  name: string;
  slug: string;
  priority: number;
};

type UserRoleAssignment = {
  assignedAt: string;
  expiresAt: string | null;
  role: Role;
};

type RecentUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  status: UserStatus;
  emailVerifiedAt: string | null;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles: UserRoleAssignment[];
};

type DashboardData = {
  generatedAt: string;

  summary: {
    users: {
      total: number;
      active: number;
      pendingVerification: number;
      suspended: number;
      disabled: number;
      newLastSevenDays: number;
    };

    content: {
      notes: number;
      folders: number;
      documents: number;
      checklists: number;
      storageBytes: number;
    };

    productivity: {
      checklistItems: {
        total: number;
        completed: number;
        pending: number;
      };

      reminders: {
        pending: number;
        upcomingNextSevenDays: number;
      };
    };

    communication: {
      conversations: number;
      directConversations: number;
      groupConversations: number;
      activeToday: number;
      messages: number;
      messagesToday: number;
      pendingReports: number;
    };
  };

  today: {
    notesCreated: number;
    foldersCreated: number;
    documentsUploaded: number;
    checklistsCreated: number;
    checklistItemsCompleted: number;
    messagesSent: number;
  };

  recentUsers: RecentUser[];
};

type StoredUser = {
  id?: string;
  email?: string;
  displayName?: string;
  nombre?: string;
  correo?: string;
};

type ApiErrorResponse = {
  message?: string | string[];
  error?: string;

  errors?: {
    detail?: string;
  };
};

type MetricCardProps = {
  title: string;
  value: string | number;
  description: string;
  icon: ReactNode;
  change?: string;
  warning?: boolean;
};

type UserAvatarProps = {
  user: RecentUser;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStoredUser(): StoredUser | null {
  const keys = ["usuario", "user"];

  for (const key of keys) {
    const storedValue = localStorage.getItem(key);

    if (!storedValue) {
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(storedValue);

      if (!isObject(parsed)) {
        continue;
      }

      const data = isObject(parsed.data) ? parsed.data : null;

      const candidates: unknown[] = [
        data?.usuario,
        data?.user,
        parsed.usuario,
        parsed.user,
        data,
        parsed,
      ];

      for (const candidate of candidates) {
        if (isObject(candidate)) {
          return candidate as StoredUser;
        }
      }
    } catch {
      // Ignorar almacenamiento inválido.
    }
  }

  return null;
}

function clearLocalSession(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("usuario");
  localStorage.removeItem("user");
}

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return initials || "U";
}

function getUserDisplayName(user: RecentUser): string {
  const displayName = user.displayName?.trim();

  if (displayName) {
    return displayName;
  }

  const emailName = user.email?.split("@")[0]?.trim();

  return emailName || "Usuario";
}

function resolveAvatarUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl?.trim()) {
    return null;
  }

  const normalizedUrl = avatarUrl.trim();

  if (
    normalizedUrl.startsWith("http://") ||
    normalizedUrl.startsWith("https://") ||
    normalizedUrl.startsWith("data:") ||
    normalizedUrl.startsWith("blob:")
  ) {
    return normalizedUrl;
  }

  const baseUrl = api.defaults.baseURL;

  if (!baseUrl) {
    return normalizedUrl;
  }

  try {
    const backendUrl = new URL(baseUrl);

    return new URL(
      normalizedUrl.startsWith("/") ? normalizedUrl : `/${normalizedUrl}`,
      backendUrl.origin,
    ).toString();
  } catch {
    return normalizedUrl;
  }
}

function formatDate(dateValue: string | null | undefined): string {
  if (!dateValue) {
    return "Sin fecha";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return date.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateValue: string | null | undefined): string {
  if (!dateValue) {
    return "Sin fecha";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];

  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  const value = bytes / 1024 ** exponent;

  return `${value.toLocaleString("es-CL", {
    maximumFractionDigits: value >= 10 ? 1 : 2,
  })} ${units[exponent]}`;
}

function getPrimaryRole(user: RecentUser): Role | null {
  if (!Array.isArray(user.roles) || user.roles.length === 0) {
    return null;
  }

  return (
    [...user.roles]
      .filter((assignment) => Boolean(assignment?.role))
      .sort(
        (left, right) => (right.role.priority ?? 0) - (left.role.priority ?? 0),
      )
      .at(0)?.role ?? null
  );
}

function getRoleLabel(role: string): string {
  const normalizedRole = role
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  switch (normalizedRole) {
    case "super_admin":
    case "superadmin":
      return "Super Admin";

    case "admin":
    case "administrator":
    case "administrador":
      return "Administrador";

    case "user":
    case "usuario":
      return "Usuario";

    default:
      return role || "Sin rol";
  }
}

function getStatusLabel(status: UserStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Activo";

    case "PENDING_VERIFICATION":
      return "Pendiente";

    case "SUSPENDED":
      return "Suspendido";

    case "DISABLED":
      return "Deshabilitado";

    default:
      return status || "Desconocido";
  }
}

function getStatusStyle(status: UserStatus): string {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300";

    case "PENDING_VERIFICATION":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300";

    case "SUSPENDED":
      return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-400/20 dark:bg-orange-500/10 dark:text-orange-300";

    case "DISABLED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-300";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-400/20 dark:bg-slate-500/10 dark:text-slate-300";
  }
}

function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(" ");
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    const detail = error.response?.data?.errors?.detail;

    if (detail) {
      return detail;
    }

    if (!error.response) {
      return (
        "No se pudo conectar con el backend. " +
        "Verifica que NestJS esté ejecutándose."
      );
    }

    if (error.response.status === 403) {
      return (
        "Tu cuenta no tiene permiso para consultar " +
        "el dashboard administrativo."
      );
    }

    return (
      error.response.data?.error ||
      `Error ${error.response.status} al cargar el dashboard.`
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "No se pudieron cargar los datos del dashboard.";
}

function MetricCard({
  title,
  value,
  description,
  icon,
  change,
  warning = false,
}: MetricCardProps) {
  return (
    <article
      className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 ${
        warning
          ? "border-amber-200 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/[0.07]"
          : "border-slate-200 bg-white dark:border-white/10 dark:bg-slate-800/80"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>

          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            {value}
          </p>
        </div>

        <div
          className={`rounded-2xl border p-3 ${
            warning
              ? "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300"
              : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300"
          }`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>

      {change && (
        <p
          className={`mt-4 text-xs font-semibold ${
            warning
              ? "text-amber-700 dark:text-amber-300"
              : "text-violet-700 dark:text-violet-300"
          }`}
        >
          {change}
        </p>
      )}
    </article>
  );
}

function UserAvatar({ user }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const displayName = getUserDisplayName(user);

  const avatarUrl = useMemo(
    () => resolveAvatarUrl(user.avatarUrl),
    [user.avatarUrl],
  );

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-xs font-extrabold text-white">
      {avatarUrl && !imageFailed ? (
        <img
          src={avatarUrl}
          alt={`Foto de ${displayName}`}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        getInitials(displayName)
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentUser = useMemo(() => getStoredUser(), []);

  const adminName =
    currentUser?.displayName?.trim() ||
    currentUser?.nombre?.trim() ||
    currentUser?.email?.split("@")[0]?.trim() ||
    currentUser?.correo?.split("@")[0]?.trim() ||
    "Administrador";

  const loadDashboard = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get<DashboardData>("/admin/dashboard");

      if (
        !response.data ||
        !response.data.summary ||
        !response.data.summary.users ||
        !response.data.summary.content ||
        !response.data.summary.productivity ||
        !response.data.summary.communication
      ) {
        throw new Error(
          "El backend no devolvió el dashboard administrativo esperado.",
        );
      }

      setData({
        ...response.data,
        recentUsers: Array.isArray(response.data.recentUsers)
          ? response.data.recentUsers
          : [],
      });
    } catch (caughtError: unknown) {
      console.error(
        "Error al cargar el dashboard administrativo:",
        caughtError,
      );

      if (
        axios.isAxiosError(caughtError) &&
        caughtError.response?.status === 401
      ) {
        clearLocalSession();

        navigate("/login", {
          replace: true,
        });

        return;
      }

      setData(null);
      setError(getApiErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <section className="space-y-6 pb-8">
        <div className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5" />

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="h-44 animate-pulse rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-6 dark:border-red-500/20 dark:bg-red-500/10 md:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-red-100 p-3 text-red-700 dark:bg-red-500/15 dark:text-red-300">
            <AlertTriangle size={24} />
          </div>

          <div>
            <h2 className="text-lg font-bold text-red-800 dark:text-red-200">
              No se pudo cargar el dashboard
            </h2>

            <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-200/80">
              {error || "No hay datos disponibles."}
            </p>

            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-500"
            >
              <RefreshCw size={16} />
              Reintentar
            </button>
          </div>
        </div>
      </section>
    );
  }

  const { users, content, productivity, communication } = data.summary;

  const recentUsers = data.recentUsers ?? [];

  const checklistCompletionPercentage =
    productivity.checklistItems.total > 0
      ? Math.round(
          (productivity.checklistItems.completed /
            productivity.checklistItems.total) *
            100,
        )
      : 0;

  const currentDate = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <section className="space-y-8 pb-8">
      {/* CABECERA */}

      <article className="relative overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-100 via-white to-slate-100 p-6 shadow-sm dark:border-violet-400/15 dark:from-violet-500/20 dark:via-[#1E293B] dark:to-[#0F172A] md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-fuchsia-300/30 blur-3xl dark:bg-fuchsia-500/20" />

        <div className="pointer-events-none absolute bottom-0 left-1/3 h-36 w-36 rounded-full bg-violet-300/30 blur-3xl dark:bg-violet-500/20" />

        <div className="relative flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">
              Administración de VibeNotas
            </p>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white md:text-4xl">
              Hola, {adminName} 👋
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 md:text-base">
              Supervisa usuarios, contenido, productividad y comunicación de
              VibeNotas desde un solo lugar.
            </p>

            <p className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Clock3
                size={16}
                className="text-violet-600 dark:text-violet-300"
              />
              {currentDate}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[430px]">
            <button
              type="button"
              onClick={() => navigate("/admin/users")}
              className="group flex items-center justify-between rounded-2xl border border-violet-200 bg-violet-50 p-4 text-left transition hover:-translate-y-1 hover:bg-violet-100 dark:border-violet-300/15 dark:bg-violet-500/15 dark:hover:bg-violet-500/25"
            >
              <div>
                <p className="text-sm font-bold text-slate-950 dark:text-white">
                  Gestionar usuarios
                </p>

                <p className="mt-1 text-xs text-violet-700 dark:text-violet-200/80">
                  Revisar y administrar cuentas
                </p>
              </div>

              <Users
                size={21}
                className="text-violet-700 transition group-hover:translate-x-1 dark:text-violet-200"
              />
            </button>

            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 p-4 text-left transition hover:-translate-y-1 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <div>
                <p className="text-sm font-bold text-slate-950 dark:text-white">
                  Actualizar datos
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Obtener estadísticas recientes
                </p>
              </div>

              <RefreshCw
                size={21}
                className="text-slate-600 transition group-hover:rotate-180 dark:text-slate-300"
              />
            </button>
          </div>
        </div>
      </article>

      {/* RESUMEN RÁPIDO */}

      <div className="grid gap-4 md:grid-cols-3">
        <article className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/15 dark:bg-emerald-500/[0.07]">
          <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <UserCheck size={20} />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-950 dark:text-white">
              Nuevos usuarios
            </p>

            <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
              {users.newLastSevenDays} registrados en 7 días
            </p>
          </div>
        </article>

        <article className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-500/15 dark:bg-sky-500/[0.07]">
          <div className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
            <MessageCircle size={20} />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-950 dark:text-white">
              Mensajes de hoy
            </p>

            <p className="mt-0.5 text-xs text-sky-700 dark:text-sky-300">
              {communication.messagesToday} mensajes enviados
            </p>
          </div>
        </article>

        <article
          className={`flex items-center gap-3 rounded-2xl border p-4 ${
            communication.pendingReports > 0
              ? "border-amber-200 bg-amber-50 dark:border-amber-500/15 dark:bg-amber-500/[0.07]"
              : "border-violet-200 bg-violet-50 dark:border-violet-500/15 dark:bg-violet-500/[0.07]"
          }`}
        >
          <div
            className={`rounded-xl p-2.5 ${
              communication.pendingReports > 0
                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                : "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
            }`}
          >
            <AlertTriangle size={20} />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-950 dark:text-white">
              Reportes pendientes
            </p>

            <p
              className={`mt-0.5 text-xs ${
                communication.pendingReports > 0
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-violet-700 dark:text-violet-300"
              }`}
            >
              {communication.pendingReports} requieren revisión
            </p>
          </div>
        </article>
      </div>

      {/* MÉTRICAS PRINCIPALES */}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Usuarios"
          value={users.total}
          description="Cuentas registradas"
          icon={<Users size={22} />}
          change={`${users.active} usuarios activos`}
        />

        <MetricCard
          title="Notas"
          value={content.notes}
          description="Notas creadas en VibeNotas"
          icon={<StickyNote size={22} />}
          change={`${data.today.notesCreated} creadas hoy`}
        />

        <MetricCard
          title="Carpetas"
          value={content.folders}
          description="Carpetas de organización"
          icon={<Folder size={22} />}
          change={`${data.today.foldersCreated} creadas hoy`}
        />

        <MetricCard
          title="Documentos"
          value={content.documents}
          description="Archivos almacenados"
          icon={<FileText size={22} />}
          change={`${data.today.documentsUploaded} subidos hoy`}
        />

        <MetricCard
          title="Checklists"
          value={content.checklists}
          description="Listas creadas"
          icon={<ListChecks size={22} />}
          change={`${data.today.checklistsCreated} creadas hoy`}
        />

        <MetricCard
          title="Conversaciones"
          value={communication.conversations}
          description="Chats de VibeNotas"
          icon={<MessagesSquare size={22} />}
          change={`${communication.activeToday} activas hoy`}
        />

        <MetricCard
          title="Mensajes"
          value={communication.messages}
          description="Mensajes registrados"
          icon={<MessageCircle size={22} />}
          change={`${communication.messagesToday} enviados hoy`}
        />

        <MetricCard
          title="Almacenamiento"
          value={formatBytes(content.storageBytes)}
          description="Espacio usado por documentos"
          icon={<HardDrive size={22} />}
          change={`${content.documents} archivos almacenados`}
        />
      </div>

      {/* USUARIOS QUE REQUIEREN ATENCIÓN */}

      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-800/80">
        <div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            Gestión de usuarios
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
            Cuentas que requieren atención
          </h2>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left transition hover:-translate-y-1 dark:border-amber-500/20 dark:bg-amber-500/[0.07]"
          >
            <div className="flex items-center justify-between">
              <Clock3
                size={22}
                className="text-amber-700 dark:text-amber-300"
              />

              <span className="text-2xl font-extrabold text-amber-700 dark:text-amber-300">
                {users.pendingVerification}
              </span>
            </div>

            <p className="mt-4 text-sm font-bold text-slate-950 dark:text-white">
              Pendientes
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Esperando verificación.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-left transition hover:-translate-y-1 dark:border-orange-500/20 dark:bg-orange-500/[0.07]"
          >
            <div className="flex items-center justify-between">
              <UserX
                size={22}
                className="text-orange-700 dark:text-orange-300"
              />

              <span className="text-2xl font-extrabold text-orange-700 dark:text-orange-300">
                {users.suspended}
              </span>
            </div>

            <p className="mt-4 text-sm font-bold text-slate-950 dark:text-white">
              Suspendidos
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Cuentas con acceso suspendido.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className="rounded-2xl border border-red-200 bg-red-50 p-5 text-left transition hover:-translate-y-1 dark:border-red-500/20 dark:bg-red-500/[0.07]"
          >
            <div className="flex items-center justify-between">
              <AlertTriangle
                size={22}
                className="text-red-700 dark:text-red-300"
              />

              <span className="text-2xl font-extrabold text-red-700 dark:text-red-300">
                {users.disabled}
              </span>
            </div>

            <p className="mt-4 text-sm font-bold text-slate-950 dark:text-white">
              Deshabilitados
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Cuentas actualmente desactivadas.
            </p>
          </button>
        </div>
      </article>

      {/* PRODUCTIVIDAD + COMUNICACIÓN */}

      <div className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-800/80">
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              Productividad
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              Checklists y recordatorios
            </h2>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ítems totales
              </p>

              <p className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">
                {productivity.checklistItems.total}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/[0.07]">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Completados
              </p>

              <p className="mt-2 text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
                {productivity.checklistItems.completed}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.07]">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Pendientes
              </p>

              <p className="mt-2 text-2xl font-extrabold text-amber-700 dark:text-amber-300">
                {productivity.checklistItems.pending}
              </p>
            </div>

            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-500/20 dark:bg-violet-500/[0.07]">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                Progreso global
              </p>

              <p className="mt-2 text-2xl font-extrabold text-violet-700 dark:text-violet-300">
                {checklistCompletionPercentage}%
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-white/5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BellRing
                  size={20}
                  className="text-violet-600 dark:text-violet-300"
                />

                <div>
                  <p className="text-sm font-bold text-slate-950 dark:text-white">
                    Recordatorios pendientes
                  </p>

                  <p className="text-xs text-slate-500">
                    Próximos 7 días:{" "}
                    {productivity.reminders.upcomingNextSevenDays}
                  </p>
                </div>
              </div>

              <span className="text-2xl font-extrabold text-violet-700 dark:text-violet-300">
                {productivity.reminders.pending}
              </span>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-800/80">
          <div>
            <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">
              Comunicación
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              Uso del chat
            </h2>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
              <div>
                <p className="text-sm font-bold text-slate-950 dark:text-white">
                  Conversaciones directas
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Chats entre usuarios
                </p>
              </div>

              <span className="text-xl font-extrabold text-sky-700 dark:text-sky-300">
                {communication.directConversations}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
              <div>
                <p className="text-sm font-bold text-slate-950 dark:text-white">
                  Grupos
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Conversaciones grupales
                </p>
              </div>

              <span className="text-xl font-extrabold text-violet-700 dark:text-violet-300">
                {communication.groupConversations}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
              <div>
                <p className="text-sm font-bold text-slate-950 dark:text-white">
                  Conversaciones activas hoy
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Con actividad durante el día
                </p>
              </div>

              <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
                {communication.activeToday}
              </span>
            </div>

            <div
              className={`flex items-center justify-between rounded-2xl border p-4 ${
                communication.pendingReports > 0
                  ? "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/[0.07]"
                  : "border-slate-200 bg-slate-50 dark:border-white/5 dark:bg-white/[0.03]"
              }`}
            >
              <div>
                <p className="text-sm font-bold text-slate-950 dark:text-white">
                  Reportes pendientes
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Mensajes reportados por usuarios
                </p>
              </div>

              <span
                className={`text-xl font-extrabold ${
                  communication.pendingReports > 0
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                {communication.pendingReports}
              </span>
            </div>
          </div>
        </article>
      </div>

      {/* ACTIVIDAD DE HOY */}

      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-800/80">
        <div>
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
            VibeNotas hoy
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
            Actividad de la plataforma
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Resumen de las acciones realizadas durante el día.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
            <StickyNote className="text-violet-600 dark:text-violet-300" />

            <p className="mt-3 text-2xl font-extrabold text-slate-950 dark:text-white">
              {data.today.notesCreated}
            </p>

            <p className="mt-1 text-sm text-slate-500">Notas creadas</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
            <Folder className="text-amber-600 dark:text-amber-300" />

            <p className="mt-3 text-2xl font-extrabold text-slate-950 dark:text-white">
              {data.today.foldersCreated}
            </p>

            <p className="mt-1 text-sm text-slate-500">Carpetas creadas</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
            <FileText className="text-sky-600 dark:text-sky-300" />

            <p className="mt-3 text-2xl font-extrabold text-slate-950 dark:text-white">
              {data.today.documentsUploaded}
            </p>

            <p className="mt-1 text-sm text-slate-500">Documentos subidos</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
            <ListChecks className="text-emerald-600 dark:text-emerald-300" />

            <p className="mt-3 text-2xl font-extrabold text-slate-950 dark:text-white">
              {data.today.checklistsCreated}
            </p>

            <p className="mt-1 text-sm text-slate-500">Checklists creadas</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
            <CheckCircle2 className="text-emerald-600 dark:text-emerald-300" />

            <p className="mt-3 text-2xl font-extrabold text-slate-950 dark:text-white">
              {data.today.checklistItemsCompleted}
            </p>

            <p className="mt-1 text-sm text-slate-500">Tareas completadas</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
            <MessageCircle className="text-fuchsia-600 dark:text-fuchsia-300" />

            <p className="mt-3 text-2xl font-extrabold text-slate-950 dark:text-white">
              {data.today.messagesSent}
            </p>

            <p className="mt-1 text-sm text-slate-500">Mensajes enviados</p>
          </div>
        </div>
      </article>

      {/* USUARIOS RECIENTES */}

      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-800/80">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">
              Usuarios
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              Usuarios recientes
            </h2>
          </div>

          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className="rounded-xl p-2 text-violet-700 transition hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10"
            title="Ver todos los usuarios"
          >
            <ArrowRight size={20} />
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {recentUsers.length > 0 ? (
            recentUsers.map((user) => {
              const primaryRole = getPrimaryRole(user);
              const displayName = getUserDisplayName(user);

              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => navigate("/admin/users")}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-violet-200 hover:bg-violet-50 dark:border-white/5 dark:bg-white/[0.03] dark:hover:border-violet-500/20 dark:hover:bg-white/[0.07]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar user={user} />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
                        {displayName}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="hidden text-right sm:block">
                    <div className="flex justify-end gap-1.5">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusStyle(
                          user.status,
                        )}`}
                      >
                        {getStatusLabel(user.status)}
                      </span>

                      {primaryRole && (
                        <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300">
                          {getRoleLabel(primaryRole.slug)}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-[10px] text-slate-500">
                      {formatDate(user.createdAt)}
                    </p>
                  </div>
                </button>
              );
            })
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">
              No hay usuarios recientes.
            </p>
          )}
        </div>

        <p className="mt-5 text-xs text-slate-500">
          Última actualización: {formatDateTime(data.generatedAt)}
        </p>
      </article>
    </section>
  );
}
