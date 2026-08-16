import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  KeyRound,
  ListChecks,
  LockKeyhole,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import StatCard from "../components/StatCard";
import api from "../services/api";

type UserStatus =
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "SUSPENDED"
  | "DISABLED"
  | string;

type AuditOutcome =
  | "SUCCESS"
  | "FAILURE"
  | "DENIED"
  | string;

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

type DashboardData = {
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

type StoredUser = {
  id?: string;
  email?: string;
  displayName?: string;
  nombre?: string;
  correo?: string;
  roles?: string[];
  rol?: string;
};

type ApiErrorResponse = {
  message?: string | string[];
  error?: string;
  errors?: {
    detail?: string;
  };
};

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

function getRoleLabel(role: string): string {
  const normalizedRole = role.trim().toLowerCase();

  if (
    normalizedRole === "super_admin" ||
    normalizedRole === "superadmin"
  ) {
    return "Super Admin";
  }

  if (
    normalizedRole === "admin" ||
    normalizedRole === "administrator"
  ) {
    return "Administrador";
  }

  if (normalizedRole === "user") {
    return "Usuario";
  }

  return role || "Sin rol";
}

function getRoleStyle(role: string): string {
  const normalizedRole = role.trim().toLowerCase();

  if (
    normalizedRole === "super_admin" ||
    normalizedRole === "superadmin"
  ) {
    return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-400/20 dark:bg-fuchsia-500/10 dark:text-fuchsia-300";
  }

  if (
    normalizedRole === "admin" ||
    normalizedRole === "administrator"
  ) {
    return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300";
  }

  return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300";
}

function getPrimaryRole(user: RecentUser): Role | null {
  if (!user.roles?.length) {
    return null;
  }

  return [...user.roles]
    .sort((left, right) => right.role.priority - left.role.priority)
    .at(0)?.role ?? null;
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
      return outcome;
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
        "Verifica que NestJS esté ejecutándose en http://localhost:3000."
      );
    }

    if (error.response.status === 403) {
      return (
        "Tu usuario no tiene los permisos identity.users.read " +
        "y audit.events.read requeridos por este dashboard."
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

export default function SuperAdminDashboard() {
  const navigate = useNavigate();

  const [data, setData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadDashboard = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError("");

      /*
       * El interceptor de src/services/api.ts agrega:
       * Authorization: Bearer <accessToken>
       */
      const response =
        await api.get<DashboardData>(
          "/admin/identity/dashboard",
        );

      if (
        !response.data ||
        !response.data.summary ||
        !response.data.distributions
      ) {
        throw new Error(
          "El backend no devolvió el dashboard administrativo esperado.",
        );
      }

      /*
       * NestJS devuelve el objeto directamente.
       * No existe el envoltorio antiguo:
       * { success: true, data: ... }
       */
      setData(response.data);
    } catch (caughtError: unknown) {
      console.error(
        "Error al cargar el dashboard administrativo:",
        caughtError,
      );

      setData(null);
      setError(
        getApiErrorMessage(caughtError),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const currentUser = useMemo<StoredUser | null>(() => {
    const storedUser =
      localStorage.getItem("usuario");

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(
        storedUser,
      ) as StoredUser;
    } catch {
      return null;
    }
  }, []);

  const superAdminName =
    currentUser?.displayName ||
    currentUser?.nombre ||
    "Super Admin";

  if (loading) {
    return (
      <section className="space-y-8">
        <div className="h-52 animate-pulse rounded-3xl border border-slate-200 bg-slate-200/70 dark:border-white/10 dark:bg-white/5" />

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from(
            { length: 8 },
            (_, index) => index,
          ).map((item) => (
            <div
              key={item}
              className="h-44 animate-pulse rounded-3xl border border-slate-200 bg-slate-200/70 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-80 animate-pulse rounded-3xl border border-slate-200 bg-slate-200/70 dark:border-white/10 dark:bg-white/5" />
          <div className="h-80 animate-pulse rounded-3xl border border-slate-200 bg-slate-200/70 dark:border-white/10 dark:bg-white/5" />
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-6 md:p-8 dark:border-red-500/20 dark:bg-red-500/10">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-red-100 p-3 text-red-700 dark:bg-red-500/15 dark:text-red-300">
            <AlertTriangle size={24} />
          </div>

          <div>
            <h2 className="text-lg font-bold text-red-900 dark:text-red-200">
              No se pudo cargar el dashboard
            </h2>

            <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-200/80">
              {error ||
                "No hay datos disponibles."}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadDashboard()
              }
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-400"
            >
              <RefreshCw size={16} />
              Reintentar
            </button>
          </div>
        </div>
      </section>
    );
  }

  const {
    users,
    administrators,
    superAdministrators,
    roles,
    sessions,
    audit,
  } = data.summary;

  const usersByRole =
    data.distributions.usersByRole ?? [];

  const recentUsers =
    data.recentUsers ?? [];

  const recentActivity =
    data.recentActivity ?? [];

  const fechaActual =
    new Intl.DateTimeFormat("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());

  return (
    <section className="space-y-8 pb-8 text-slate-900 dark:text-white">
      {/* BIENVENIDA */}
      <article className="relative overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-100 via-white to-slate-50 p-6 shadow-xl shadow-slate-200/70 md:p-8 dark:border-violet-400/15 dark:from-violet-500/20 dark:via-[#1E293B] dark:to-[#0F172A] dark:shadow-2xl dark:shadow-violet-950/30">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-fuchsia-300/25 blur-3xl dark:bg-fuchsia-500/20" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-36 w-36 rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-500/20" />

        <div className="relative flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">
              Centro de identidad y seguridad
            </p>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white md:text-4xl">
              Hola, {superAdminName} 👋
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 md:text-base">
              Supervisa usuarios, roles, sesiones y eventos de auditoría
              del backend VibeNotas.
            </p>

            <p className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Clock3
                size={16}
                className="text-violet-600 dark:text-violet-300"
              />
              {fechaActual}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/superadmin/administrators",
                )
              }
              className="group flex items-center justify-between rounded-2xl border border-violet-200 bg-violet-100/80 p-4 text-left transition hover:-translate-y-1 hover:bg-violet-200/80 dark:border-violet-300/15 dark:bg-violet-500/15 dark:hover:bg-violet-500/25"
            >
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Administradores
                </p>
                <p className="mt-1 text-xs text-violet-700 dark:text-violet-200/80">
                  Gestiona roles administrativos
                </p>
              </div>

              <UserPlus
                size={21}
                className="text-violet-700 transition group-hover:translate-x-1 dark:text-violet-200"
              />
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/superadmin/security",
                )
              }
              className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 p-4 text-left transition hover:-translate-y-1 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Seguridad
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Revisa sesiones y accesos
                </p>
              </div>

              <ShieldAlert
                size={21}
                className="text-slate-600 transition group-hover:rotate-12 dark:text-slate-300"
              />
            </button>
          </div>
        </div>
      </article>

      {/* ESTADO DEL SISTEMA */}
      <div className="grid gap-4 md:grid-cols-3">
        <article className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/15 dark:bg-emerald-500/[0.07]">
          <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              API conectada
            </p>
            <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
              Dashboard recibido correctamente
            </p>
          </div>
        </article>

        <article className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-500/15 dark:bg-violet-500/[0.07]">
          <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
            <Activity size={20} />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Sesiones activas
            </p>
            <p className="mt-0.5 text-xs text-violet-700 dark:text-violet-300">
              {sessions.active} sesiones vigentes
            </p>
          </div>
        </article>

        <article className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-500/15 dark:bg-sky-500/[0.07]">
          <div className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
            <ListChecks size={20} />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Auditoría de hoy
            </p>
            <p className="mt-0.5 text-xs text-sky-700 dark:text-sky-300">
              {audit.eventsToday} eventos registrados
            </p>
          </div>
        </article>
      </div>

      {/* ESTADÍSTICAS REALES DEL BACKEND */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Usuarios totales"
          value={users.total}
          description="Cuentas registradas"
          icon={<Users size={22} />}
          change={`${recentUsers.length} usuarios recientes`}
        />

        <StatCard
          title="Usuarios activos"
          value={users.active}
          description="Cuentas disponibles"
          icon={<UserCheck size={22} />}
          change={`${users.total > 0 ? Math.round((users.active / users.total) * 100) : 0}% del total`}
        />

        <StatCard
          title="Pendientes"
          value={users.pendingVerification}
          description="Esperando verificación"
          icon={<Clock3 size={22} />}
          change={
            users.pendingVerification > 0
              ? "Requieren verificación"
              : "Sin cuentas pendientes"
          }
        />

        <StatCard
          title="Suspendidos"
          value={users.suspended}
          description="Acceso suspendido"
          icon={<UserX size={22} />}
          change={
            users.suspended > 0
              ? "Requieren revisión"
              : "Sin usuarios suspendidos"
          }
        />

        <StatCard
          title="Deshabilitados"
          value={users.disabled}
          description="Cuentas desactivadas"
          icon={<LockKeyhole size={22} />}
          change={`${users.disabled} fuera de servicio`}
        />

        <StatCard
          title="MFA habilitado"
          value={users.mfaEnabled}
          description="Usuarios con segundo factor"
          icon={<KeyRound size={22} />}
          change={`${users.total > 0 ? Math.round((users.mfaEnabled / users.total) * 100) : 0}% de adopción`}
        />

        <StatCard
          title="Administradores"
          value={administrators}
          description="Cuentas con rol admin"
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
          title="Sesiones activas"
          value={sessions.active}
          description="Sesiones vigentes"
          icon={<Activity size={22} />}
          change="Datos en tiempo real"
        />

        <StatCard
          title="Sesiones comprometidas"
          value={sessions.compromised}
          description="Sesiones marcadas en riesgo"
          icon={<AlertTriangle size={22} />}
          change={
            sessions.compromised > 0
              ? "Requieren atención inmediata"
              : "Sin sesiones comprometidas"
          }
        />

        <StatCard
          title="Eventos de hoy"
          value={audit.eventsToday}
          description="Actividad auditada"
          icon={<ListChecks size={22} />}
          change="Desde las 00:00 UTC"
        />

        <StatCard
          title="Accesos denegados"
          value={audit.deniedToday}
          description="Eventos denegados hoy"
          icon={<ShieldAlert size={22} />}
          change={
            audit.deniedToday > 0
              ? "Revisa la actividad reciente"
              : "Sin denegaciones hoy"
          }
        />
      </div>

      {/* ROLES + USUARIOS RECIENTES */}
      <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-[#1E293B]/80 dark:shadow-black/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                Distribución
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                Usuarios por rol
              </h2>
            </div>

            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 dark:border-violet-500/15 dark:bg-violet-500/10 dark:text-violet-300">
              {roles} roles
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {usersByRole.length > 0 ? (
              usersByRole.map((role) => {
                const percentage =
                  users.total > 0
                    ? Math.round(
                        (role.totalUsers /
                          users.total) *
                          100,
                      )
                    : 0;

                return (
                  <div
                    key={role.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {role.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                          {role.slug}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-extrabold text-violet-700 dark:text-violet-300">
                          {role.totalUsers}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {percentage}% del total
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500"
                        style={{
                          width: `${Math.min(
                            percentage,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center dark:border-white/10 dark:bg-transparent">
                <ShieldCheck
                  size={28}
                  className="mx-auto text-slate-400 dark:text-slate-600"
                />
                <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
                  No hay distribución de roles.
                </p>
              </div>
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-[#1E293B]/80 dark:shadow-black/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                Identidad
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                Usuarios recientes
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/superadmin/users")
              }
              className="rounded-xl p-2 text-violet-700 transition hover:bg-violet-50 hover:text-violet-900 dark:text-violet-300 dark:hover:bg-violet-500/10 dark:hover:text-white"
              title="Ver todos los usuarios"
            >
              <ArrowRight size={20} />
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {recentUsers.length > 0 ? (
              recentUsers
                .slice(0, 5)
                .map((user) => {
                  const primaryRole =
                    getPrimaryRole(user);

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() =>
                        navigate(
                          `/superadmin/users?buscar=${encodeURIComponent(
                            user.id,
                          )}`,
                        )
                      }
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:bg-slate-100 dark:border-white/5 dark:bg-white/[0.03] dark:hover:bg-white/[0.07]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-xs font-extrabold text-white">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getInitials(
                              user.displayName,
                            )
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {user.displayName}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-500">
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
                            {getStatusLabel(
                              user.status,
                            )}
                          </span>

                          {primaryRole && (
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${getRoleStyle(
                                primaryRole.slug,
                              )}`}
                            >
                              {getRoleLabel(
                                primaryRole.slug,
                              )}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-[10px] text-slate-500">
                          {formatDate(
                            user.createdAt,
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center dark:border-white/10 dark:bg-transparent">
                <Users
                  size={28}
                  className="mx-auto text-slate-400 dark:text-slate-600"
                />
                <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
                  No hay usuarios recientes.
                </p>
              </div>
            )}
          </div>

          {recentUsers.length > 0 && (
            <button
              type="button"
              onClick={() =>
                navigate("/superadmin/users")
              }
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
            >
              Ver todos los usuarios
              <ArrowRight size={16} />
            </button>
          )}
        </article>
      </div>

      {/* ACTIVIDAD RECIENTE */}
      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-[#1E293B]/80 dark:shadow-black/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
              Auditoría
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              Actividad reciente
            </h2>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/superadmin/security")
            }
            className="rounded-xl p-2 text-violet-700 transition hover:bg-violet-50 hover:text-violet-900 dark:text-violet-300 dark:hover:bg-violet-500/10 dark:hover:text-white"
            title="Revisar seguridad"
          >
            <ArrowRight size={20} />
          </button>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {recentActivity.length > 0 ? (
            recentActivity
              .slice(0, 8)
              .map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {formatEventType(
                        activity.eventType,
                      )}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-500">
                      {activity.actor
                        ? `${activity.actor.displayName} · ${activity.actor.email}`
                        : "Evento del sistema"}
                    </p>

                    <p className="mt-2 text-[11px] text-slate-500">
                      {formatDateTime(
                        activity.occurredAt,
                      )}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${getOutcomeStyle(
                      activity.outcome,
                    )}`}
                  >
                    {getOutcomeLabel(
                      activity.outcome,
                    )}
                  </span>
                </div>
              ))
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center dark:border-white/10 dark:bg-transparent">
              <Activity
                size={28}
                className="mx-auto text-slate-400 dark:text-slate-600"
              />
              <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
                No hay actividad reciente.
              </p>
            </div>
          )}
        </div>
      </article>

      {/* ACCIONES RÁPIDAS */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-[#1E293B]/80 dark:shadow-black/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                Acciones rápidas
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                Gestiona VibeNotas
              </h2>
            </div>

            <Plus
              size={22}
              className="text-violet-600 dark:text-violet-300"
            />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/superadmin/administrators",
                )
              }
              className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-left transition hover:-translate-y-1 hover:bg-violet-100 dark:border-violet-500/15 dark:bg-violet-500/10 dark:hover:bg-violet-500/20"
            >
              <UserPlus
                size={21}
                className="text-violet-600 dark:text-violet-300"
              />
              <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                Administradores
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Gestiona roles y permisos.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/superadmin/notifications",
                )
              }
              className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-left transition hover:-translate-y-1 hover:bg-sky-100 dark:border-sky-500/15 dark:bg-sky-500/10 dark:hover:bg-sky-500/20"
            >
              <BellRing
                size={21}
                className="text-sky-700 dark:text-sky-300"
              />
              <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                Notificaciones
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Informa a los usuarios.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/superadmin/users")
              }
              className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left transition hover:-translate-y-1 hover:bg-emerald-100 dark:border-emerald-500/15 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20"
            >
              <Users
                size={21}
                className="text-emerald-700 dark:text-emerald-300"
              />
              <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                Ver usuarios
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Consulta y administra cuentas.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/superadmin/security",
                )
              }
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:-translate-y-1 hover:bg-amber-100 dark:border-amber-500/15 dark:bg-amber-500/10 dark:hover:bg-amber-500/20"
            >
              <ShieldAlert
                size={21}
                className="text-amber-700 dark:text-amber-300"
              />
              <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                Revisar seguridad
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Controla sesiones y auditoría.
              </p>
            </button>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-[#1E293B]/80 dark:shadow-black/10">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <ShieldCheck size={22} />
            </div>

            <div>
              <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                Estado técnico
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                Servicios de identidad
              </h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {[
              "API Backend",
              "Autenticación JWT",
              "Base de datos PostgreSQL",
              "Auditoría administrativa",
            ].map((service) => (
              <div
                key={service}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/5 dark:bg-white/[0.03]"
              >
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {service}
                </span>

                <span className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/60" />
                  Operativo
                </span>
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            Última actualización del backend:{" "}
            {formatDateTime(data.generatedAt)}
          </p>
        </article>
      </div>
    </section>
  );
}