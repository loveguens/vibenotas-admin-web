import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  FileText,
  Folder,
  HardDrive,
  KeyRound,
  ListChecks,
  LockKeyhole,
  MessageCircle,
  MessagesSquare,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  StickyNote,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import StatCard from "../components/StatCard";
import api from "../services/api";

type UserStatus =
  "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "DISABLED" | string;

type AuditOutcome = "SUCCESS" | "FAILURE" | "DENIED" | string;

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

type RecentActivity = {
  id: string;
  eventType: string;
  outcome: AuditOutcome;
  targetType: string | null;
  targetId: string | null;
  occurredAt: string;

  actor: {
    id: string;
    email: string;
    displayName: string;
  } | null;
};

type UsersByStatus = {
  status: UserStatus;
  total: number;
};

type UsersByRole = Role & {
  totalUsers: number;
};

type IdentityDashboardData = {
  generatedAt: string;

  summary: {
    users: {
      total: number;
      active: number;
      pendingVerification: number;
      suspended: number;
      disabled: number;
      mfaEnabled: number;
    };

    administrators: number;
    superAdministrators: number;
    roles: number;

    sessions: {
      active: number;
      compromised: number;
    };

    audit: {
      eventsToday: number;
      deniedToday: number;
    };
  };

  distributions: {
    usersByStatus: UsersByStatus[];
    usersByRole: UsersByRole[];
  };

  recentUsers: RecentUser[];
  recentActivity: RecentActivity[];
};

type PlatformDashboardData = {
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
      // Ignoramos valores corruptos.
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

function getRoleLabel(role: string): string {
  const normalizedRole = role
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (normalizedRole === "super_admin" || normalizedRole === "superadmin") {
    return "Super Admin";
  }

  if (normalizedRole === "admin" || normalizedRole === "administrator") {
    return "Administrador";
  }

  if (normalizedRole === "user" || normalizedRole === "usuario") {
    return "Usuario";
  }

  return role || "Sin rol";
}

function getRoleStyle(role: string): string {
  const normalizedRole = role
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (normalizedRole === "super_admin" || normalizedRole === "superadmin") {
    return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-400/20 dark:bg-fuchsia-500/10 dark:text-fuchsia-300";
  }

  if (normalizedRole === "admin" || normalizedRole === "administrator") {
    return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300";
  }

  return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300";
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
      return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-400/20 dark:bg-slate-500/10 dark:text-slate-300";
  }
}

function getOutcomeStyle(outcome: AuditOutcome): string {
  switch (outcome) {
    case "SUCCESS":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300";

    case "DENIED":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300";

    case "FAILURE":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-300";

    default:
      return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-400/20 dark:bg-slate-500/10 dark:text-slate-300";
  }
}

function getOutcomeLabel(outcome: AuditOutcome): string {
  switch (outcome) {
    case "SUCCESS":
      return "Correcto";

    case "DENIED":
      return "Denegado";

    case "FAILURE":
      return "Fallido";

    default:
      return outcome || "Desconocido";
  }
}

function formatEventType(eventType: string): string {
  const knownEvents: Record<string, string> = {
    AUTH_LOGIN: "Inicio de sesión",

    AUTH_LOGOUT: "Cierre de sesión",

    AUTH_REGISTERED: "Registro de usuario",

    AUTH_TOKEN_REFRESHED: "Token renovado",

    IDENTITY_LOGIN_SUCCEEDED: "Inicio de sesión",

    IDENTITY_USER_STATUS_UPDATED: "Estado de usuario actualizado",

    IDENTITY_USER_ROLE_ASSIGNED: "Rol asignado",

    IDENTITY_USER_ROLE_REVOKED: "Rol revocado",

    IDENTITY_PROFILE_UPDATED: "Perfil actualizado",
  };

  return (
    knownEvents[eventType] ??
    eventType
      .toLowerCase()
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
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
        "Tu usuario no posee los permisos necesarios " +
        "para consultar el panel de Super Admin."
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

function UserAvatar({ user }: { user: RecentUser }) {
  const [failed, setFailed] = useState(false);

  const avatarUrl = useMemo(
    () => resolveAvatarUrl(user.avatarUrl),
    [user.avatarUrl],
  );

  useEffect(() => {
    setFailed(false);
  }, [avatarUrl]);

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-xs font-extrabold text-white">
      {avatarUrl && !failed ? (
        <img
          src={avatarUrl}
          alt={`Foto de ${user.displayName}`}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        getInitials(user.displayName)
      )}
    </div>
  );
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();

  const [identityData, setIdentityData] =
    useState<IdentityDashboardData | null>(null);

  const [platformData, setPlatformData] =
    useState<PlatformDashboardData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const currentUser = useMemo(() => getStoredUser(), []);

  const superAdminName =
    currentUser?.displayName?.trim() ||
    currentUser?.nombre?.trim() ||
    currentUser?.email?.split("@")[0]?.trim() ||
    currentUser?.correo?.split("@")[0]?.trim() ||
    "Super Admin";

  const loadDashboard = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError("");

      const [identityResponse, platformResponse] = await Promise.all([
        api.get<IdentityDashboardData>("/admin/identity/dashboard"),

        api.get<PlatformDashboardData>("/admin/dashboard"),
      ]);

      if (
        !identityResponse.data?.summary ||
        !identityResponse.data?.distributions
      ) {
        throw new Error(
          "El backend no devolvió los datos de identidad esperados.",
        );
      }

      if (!platformResponse.data?.summary || !platformResponse.data?.today) {
        throw new Error(
          "El backend no devolvió los datos globales esperados.",
        );
      }

      setIdentityData(identityResponse.data);

      setPlatformData(platformResponse.data);
    } catch (caughtError: unknown) {
      console.error(
        "Error al cargar el dashboard de Super Admin:",
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

      setIdentityData(null);
      setPlatformData(null);

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
      <section className="space-y-8 pb-8">
        <div className="h-56 animate-pulse rounded-3xl border border-slate-200 bg-slate-200/70 dark:border-white/10 dark:bg-white/5" />

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from(
            {
              length: 8,
            },
            (_, index) => index,
          ).map((item) => (
            <div
              key={item}
              className="h-44 animate-pulse rounded-3xl border border-slate-200 bg-slate-200/70 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error || !identityData || !platformData) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-6 dark:border-red-500/20 dark:bg-red-500/10 md:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-red-100 p-3 text-red-700 dark:bg-red-500/15 dark:text-red-300">
            <AlertTriangle size={24} />
          </div>

          <div>
            <h2 className="text-lg font-bold text-red-900 dark:text-red-200">
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

  const { users, administrators, superAdministrators, roles, sessions, audit } =
    identityData.summary;

  const { content, productivity, communication } = platformData.summary;

  const usersByRole = identityData.distributions.usersByRole ?? [];

  const recentUsers = identityData.recentUsers ?? [];

  const recentActivity = identityData.recentActivity ?? [];

  const currentDate = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <section className="space-y-8 pb-8 text-slate-900 dark:text-white">
      {/* CABECERA */}

      <article className="relative overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-100 via-white to-slate-50 p-6 shadow-xl shadow-slate-200/70 dark:border-violet-400/15 dark:from-violet-500/20 dark:via-[#1E293B] dark:to-[#0F172A] dark:shadow-violet-950/30 md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-fuchsia-300/25 blur-3xl dark:bg-fuchsia-500/20" />

        <div className="relative flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">
              Control global de VibeNotas
            </p>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white md:text-4xl">
              Hola, {superAdminName} 👋
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 md:text-base">
              Supervisa toda la plataforma, usuarios, contenido, comunicación,
              roles, sesiones y seguridad.
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
              onClick={() => navigate("/superadmin/administrators")}
              className="group flex items-center justify-between rounded-2xl border border-violet-200 bg-violet-100/80 p-4 text-left transition hover:-translate-y-1 hover:bg-violet-200/80 dark:border-violet-300/15 dark:bg-violet-500/15 dark:hover:bg-violet-500/25"
            >
              <div>
                <p className="text-sm font-bold">Administradores</p>

                <p className="mt-1 text-xs text-violet-700 dark:text-violet-200/80">
                  Roles y permisos
                </p>
              </div>

              <UserPlus
                size={21}
                className="text-violet-700 dark:text-violet-200"
              />
            </button>

            <button
              type="button"
              onClick={() => navigate("/superadmin/security")}
              className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 p-4 text-left transition hover:-translate-y-1 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <div>
                <p className="text-sm font-bold">Seguridad</p>

                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Sesiones y auditoría
                </p>
              </div>

              <ShieldAlert
                size={21}
                className="text-slate-600 dark:text-slate-300"
              />
            </button>
          </div>
        </div>
      </article>

      {/* ESTADO GENERAL */}

      <div className="grid gap-4 md:grid-cols-3">
        <article className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/15 dark:bg-emerald-500/[0.07]">
          <CheckCircle2 className="text-emerald-700 dark:text-emerald-300" />

          <div>
            <p className="text-sm font-bold">Plataforma conectada</p>

            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Datos globales recibidos
            </p>
          </div>
        </article>

        <article className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-500/15 dark:bg-violet-500/[0.07]">
          <Activity className="text-violet-700 dark:text-violet-300" />

          <div>
            <p className="text-sm font-bold">Sesiones activas</p>

            <p className="text-xs text-violet-700 dark:text-violet-300">
              {sessions.active} vigentes
            </p>
          </div>
        </article>

        <article className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/15 dark:bg-amber-500/[0.07]">
          <AlertTriangle className="text-amber-700 dark:text-amber-300" />

          <div>
            <p className="text-sm font-bold">Reportes pendientes</p>

            <p className="text-xs text-amber-700 dark:text-amber-300">
              {communication.pendingReports} por revisar
            </p>
          </div>
        </article>
      </div>

      {/* PLATAFORMA */}

      <div>
        <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
          Plataforma
        </p>

        <h2 className="mt-1 text-xl font-bold">Uso global de VibeNotas</h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Usuarios"
          value={users.total}
          description="Cuentas registradas"
          icon={<Users size={22} />}
          change={`${users.active} activos`}
        />

        <StatCard
          title="Notas"
          value={content.notes}
          description="Notas almacenadas"
          icon={<StickyNote size={22} />}
          change={`${platformData.today.notesCreated} creadas hoy`}
        />

        <StatCard
          title="Carpetas"
          value={content.folders}
          description="Carpetas creadas"
          icon={<Folder size={22} />}
          change={`${platformData.today.foldersCreated} creadas hoy`}
        />

        <StatCard
          title="Documentos"
          value={content.documents}
          description="Archivos almacenados"
          icon={<FileText size={22} />}
          change={`${platformData.today.documentsUploaded} subidos hoy`}
        />

        <StatCard
          title="Checklists"
          value={content.checklists}
          description="Listas creadas"
          icon={<ListChecks size={22} />}
          change={`${productivity.checklistItems.pending} elementos pendientes`}
        />

        <StatCard
          title="Conversaciones"
          value={communication.conversations}
          description="Chats registrados"
          icon={<MessagesSquare size={22} />}
          change={`${communication.activeToday} activas hoy`}
        />

        <StatCard
          title="Mensajes"
          value={communication.messages}
          description="Mensajes enviados"
          icon={<MessageCircle size={22} />}
          change={`${communication.messagesToday} enviados hoy`}
        />

        <StatCard
          title="Almacenamiento"
          value={formatBytes(content.storageBytes)}
          description="Documentos almacenados"
          icon={<HardDrive size={22} />}
          change={`${content.documents} archivos`}
        />
      </div>

      {/* SEGURIDAD */}

      <div>
        <p className="text-sm font-semibold text-fuchsia-700 dark:text-fuchsia-300">
          Seguridad y administración
        </p>

        <h2 className="mt-1 text-xl font-bold">Identidad y control</h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Administradores"
          value={administrators}
          description="Cuentas administrativas"
          icon={<ShieldCheck size={22} />}
          change={`${roles} roles registrados`}
        />

        <StatCard
          title="Superadministradores"
          value={superAdministrators}
          description="Máximo nivel de acceso"
          icon={<ShieldAlert size={22} />}
          change="Acceso crítico"
        />

        <StatCard
          title="MFA habilitado"
          value={users.mfaEnabled}
          description="Usuarios protegidos"
          icon={<KeyRound size={22} />}
          change={`${
            users.total > 0
              ? Math.round((users.mfaEnabled / users.total) * 100)
              : 0
          }% de adopción`}
        />

        <StatCard
          title="Sesiones activas"
          value={sessions.active}
          description="Sesiones vigentes"
          icon={<Activity size={22} />}
          change="Estado actual"
        />

        <StatCard
          title="Comprometidas"
          value={sessions.compromised}
          description="Sesiones en riesgo"
          icon={<AlertTriangle size={22} />}
          change={
            sessions.compromised > 0 ? "Requieren atención" : "Sin incidentes"
          }
        />

        <StatCard
          title="Eventos de hoy"
          value={audit.eventsToday}
          description="Eventos auditados"
          icon={<ListChecks size={22} />}
          change="Actividad de seguridad"
        />

        <StatCard
          title="Accesos denegados"
          value={audit.deniedToday}
          description="Eventos rechazados"
          icon={<LockKeyhole size={22} />}
          change={
            audit.deniedToday > 0 ? "Revisar auditoría" : "Sin denegaciones"
          }
        />

        <StatCard
          title="Usuarios suspendidos"
          value={users.suspended}
          description="Acceso bloqueado"
          icon={<UserX size={22} />}
          change={
            users.suspended > 0 ? "Requieren revisión" : "Sin suspendidos"
          }
        />
      </div>

      {/* ROLES Y USUARIOS */}

      <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1E293B]/80">
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
            Distribución
          </p>

          <h2 className="mt-1 text-xl font-bold">Usuarios por rol</h2>

          <div className="mt-6 space-y-3">
            {usersByRole.map((role) => {
              const percentage =
                users.total > 0
                  ? Math.round((role.totalUsers / users.total) * 100)
                  : 0;

              return (
                <div
                  key={role.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold">{role.name}</p>

                      <p className="text-xs text-slate-500">
                        {getRoleLabel(role.slug)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-extrabold text-violet-700 dark:text-violet-300">
                        {role.totalUsers}
                      </p>

                      <p className="text-[11px] text-slate-500">
                        {percentage}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500"
                      style={{
                        width: `${Math.min(percentage, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1E293B]/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">
                Identidad
              </p>

              <h2 className="mt-1 text-xl font-bold">Usuarios recientes</h2>
            </div>

            <button type="button" onClick={() => navigate("/superadmin/users")}>
              <ArrowRight size={20} />
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {recentUsers.slice(0, 5).map((user) => {
              const primaryRole = getPrimaryRole(user);

              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => navigate("/superadmin/users")}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left dark:border-white/5 dark:bg-white/[0.03]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar user={user} />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {user.displayName}
                      </p>

                      <p className="truncate text-xs text-slate-500">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="hidden text-right sm:block">
                    <div className="flex gap-1.5">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusStyle(
                          user.status,
                        )}`}
                      >
                        {getStatusLabel(user.status)}
                      </span>

                      {primaryRole && (
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${getRoleStyle(
                            primaryRole.slug,
                          )}`}
                        >
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
            })}
          </div>
        </article>
      </div>

      {/* AUDITORÍA */}

      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1E293B]/80">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-fuchsia-700 dark:text-fuchsia-300">
              Seguridad
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Actividad administrativa reciente
            </h2>
          </div>

          <button
            type="button"
            onClick={() => navigate("/superadmin/security")}
          >
            <ArrowRight size={20} />
          </button>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {recentActivity.length > 0 ? (
            recentActivity.slice(0, 8).map((activity) => (
              <div
                key={activity.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {formatEventType(activity.eventType)}
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {activity.actor
                      ? `${activity.actor.displayName} · ${activity.actor.email}`
                      : "Evento del sistema"}
                  </p>

                  <p className="mt-2 text-[11px] text-slate-500">
                    {formatDateTime(activity.occurredAt)}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${getOutcomeStyle(
                    activity.outcome,
                  )}`}
                >
                  {getOutcomeLabel(activity.outcome)}
                </span>
              </div>
            ))
          ) : (
            <p className="col-span-full py-8 text-center text-sm text-slate-500">
              No hay actividad reciente.
            </p>
          )}
        </div>
      </article>

      {/* ACCIONES */}

      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1E293B]/80">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
              Acciones rápidas
            </p>

            <h2 className="mt-1 text-xl font-bold">Gestionar VibeNotas</h2>
          </div>

          <Plus className="text-violet-600" />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => navigate("/superadmin/administrators")}
            className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-left"
          >
            <UserPlus className="text-violet-600" />

            <p className="mt-3 text-sm font-bold">Administradores</p>
          </button>

          <button
            type="button"
            onClick={() => navigate("/superadmin/users")}
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left"
          >
            <Users className="text-emerald-700" />

            <p className="mt-3 text-sm font-bold">Usuarios</p>
          </button>

          <button
            type="button"
            onClick={() => navigate("/superadmin/notifications")}
            className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-left"
          >
            <BellRing className="text-sky-700" />

            <p className="mt-3 text-sm font-bold">Notificaciones</p>
          </button>

          <button
            type="button"
            onClick={() => navigate("/superadmin/security")}
            className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left"
          >
            <ShieldAlert className="text-amber-700" />

            <p className="mt-3 text-sm font-bold">Seguridad</p>
          </button>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Datos globales: {formatDateTime(platformData.generatedAt)}
          {" · "}
          Seguridad: {formatDateTime(identityData.generatedAt)}
        </p>
      </article>
    </section>
  );
}
