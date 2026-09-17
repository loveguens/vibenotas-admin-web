import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BellRing,
  Clock3,
  Crown,
  FileText,
  Folder,
  HardDrive,
  ListChecks,
  MessageCircle,
  RefreshCw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  StickyNote,
  UserCog,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import StatCard from "../components/StatCard";
import api from "../services/api";

type AuditOutcome = "SUCCESS" | "FAILURE" | "DENIED" | string;

type RoleDistribution = {
  id: string;
  name: string;
  slug: string;
  priority: number;
  totalUsers: number;
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

type IdentityDashboard = {
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
    usersByRole: RoleDistribution[];
  };

  recentActivity: RecentActivity[];
};

type PlatformDashboard = {
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
};

type StoredUser = {
  displayName?: string;
  nombre?: string;
  email?: string;
  correo?: string;
};

type ApiError = {
  message?: string | string[];
  error?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem("usuario");

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) {
      return null;
    }

    return parsed as StoredUser;
  } catch {
    return null;
  }
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];

  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  const value = bytes / 1024 ** index;

  return `${value.toLocaleString("es-CL", {
    maximumFractionDigits: value >= 10 ? 1 : 2,
  })} ${units[index]}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatEventType(eventType: string): string {
  const events: Record<string, string> = {
    AUTH_LOGIN: "Inicio de sesión",

    AUTH_LOGOUT: "Cierre de sesión",

    IDENTITY_USER_STATUS_UPDATED: "Estado de usuario modificado",

    IDENTITY_USER_ROLE_ASSIGNED: "Rol asignado",

    IDENTITY_USER_ROLE_REVOKED: "Rol revocado",

    IDENTITY_PROFILE_UPDATED: "Perfil actualizado",

    IDENTITY_LOGIN_SUCCEEDED: "Inicio de sesión",
  };

  return (
    events[eventType] ??
    eventType
      .toLowerCase()
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
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

function getOutcomeStyle(outcome: AuditOutcome): string {
  switch (outcome) {
    case "SUCCESS":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";

    case "DENIED":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";

    case "FAILURE":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300";
  }
}

function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(" ");
    }

    if (typeof message === "string") {
      return message;
    }

    return (
      error.response?.data?.error ||
      `Error ${error.response?.status ?? ""} al cargar el dashboard.`
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "No se pudo cargar el dashboard.";
}

export default function OwnerDashboard() {
  const navigate = useNavigate();

  const [identity, setIdentity] = useState<IdentityDashboard | null>(null);

  const [platform, setPlatform] = useState<PlatformDashboard | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const currentUser = useMemo(() => getStoredUser(), []);

  const ownerName =
    currentUser?.displayName ||
    currentUser?.nombre ||
    currentUser?.email?.split("@")[0] ||
    currentUser?.correo?.split("@")[0] ||
    "Owner";

  const loadDashboard = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError("");

      const [identityResponse, platformResponse] = await Promise.all([
        api.get<IdentityDashboard>("/admin/identity/dashboard"),

        api.get<PlatformDashboard>("/admin/dashboard"),
      ]);

      setIdentity(identityResponse.data);

      setPlatform(platformResponse.data);
    } catch (caughtError: unknown) {
      console.error("Error cargando Owner Dashboard:", caughtError);

      setError(getApiErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <section className="space-y-6 pb-8">
        <div className="h-48 animate-pulse rounded-3xl bg-slate-200 dark:bg-white/5" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-3xl bg-slate-200 dark:bg-white/5"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error || !identity || !platform) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-7 dark:border-red-500/20 dark:bg-red-500/10">
        <div className="flex gap-4">
          <AlertTriangle className="shrink-0 text-red-600" />

          <div>
            <h2 className="font-bold text-red-900 dark:text-red-200">
              No se pudo cargar el panel Owner
            </h2>

            <p className="mt-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white"
            >
              <RefreshCw size={16} />
              Reintentar
            </button>
          </div>
        </div>
      </section>
    );
  }

  const users = identity.summary.users;

  const content = platform.summary.content;

  const productivity = platform.summary.productivity;

  const communication = platform.summary.communication;

  const sessions = identity.summary.sessions;

  const audit = identity.summary.audit;

  const recentActivity = identity.recentActivity ?? [];

  const ownerRole = identity.distributions.usersByRole.find(
    (role) => role.slug.trim().toLowerCase() === "owner",
  );

  const ownerCount = ownerRole?.totalUsers ?? 0;

  const currentDate = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const attentionItems = [
    {
      label: "Sesiones comprometidas",
      value: sessions.compromised,
      description: "Sesiones marcadas como riesgo",
      icon: ShieldAlert,
      path: "/owner/security",
      critical: sessions.compromised > 0,
    },
    {
      label: "Reportes pendientes",
      value: communication.pendingReports,
      description: "Reportes del chat por revisar",
      icon: BellRing,
      path: "/owner/reports",
      critical: communication.pendingReports > 0,
    },
    {
      label: "Accesos denegados",
      value: audit.deniedToday,
      description: "Eventos denegados hoy",
      icon: AlertTriangle,
      path: "/owner/logs",
      critical: audit.deniedToday > 0,
    },
    {
      label: "Usuarios pendientes",
      value: users.pendingVerification,
      description: "Cuentas por verificar",
      icon: Clock3,
      path: "/owner/users",
      critical: false,
    },
  ];

  return (
    <section className="space-y-7 pb-8 text-slate-900 dark:text-white">
      {/* CABECERA */}

      <article className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-violet-50 p-6 shadow-lg shadow-slate-200/50 dark:border-amber-400/15 dark:from-amber-500/10 dark:via-[#172033] dark:to-violet-950/30 dark:shadow-black/20 md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-500/10" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                <Crown size={14} />
                Owner
              </span>

              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                {ownerCount}/2 propietarios
              </span>

              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                Sistema conectado
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
              Hola, {ownerName}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Control global de VibeNotas. Supervisa usuarios, administradores,
              seguridad, contenido y actividad de la plataforma.
            </p>

            <p className="mt-3 text-xs capitalize text-slate-500">
              {currentDate}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/owner/administrators")}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950"
            >
              <UserCog size={17} />
              Administradores
            </button>

            <button
              type="button"
              onClick={() => navigate("/owner/security")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <ShieldCheck size={17} />
              Seguridad
            </button>
          </div>
        </div>
      </article>

      {/* INDICADORES PRINCIPALES */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Usuarios"
          value={users.total}
          description="Cuentas registradas"
          icon={<Users size={22} />}
          change={`${users.active} activos`}
        />

        <StatCard
          title="Super Admins"
          value={identity.summary.superAdministrators}
          description="Administración superior"
          icon={<ShieldCheck size={22} />}
          change={`${ownerCount}/2 Owners`}
        />

        <StatCard
          title="Administradores"
          value={identity.summary.administrators}
          description="Administración operativa"
          icon={<UserCog size={22} />}
          change={`${identity.summary.roles} roles`}
        />

        <StatCard
          title="Reportes pendientes"
          value={communication.pendingReports}
          description="Revisión administrativa"
          icon={<ShieldAlert size={22} />}
          change={
            communication.pendingReports > 0
              ? "Requieren atención"
              : "Sin pendientes"
          }
        />
      </div>

      {/* ACTIVIDAD + ATENCION */}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#172033]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-violet-700 dark:text-violet-300">
                Supervisión
              </p>

              <h2 className="mt-1 text-xl font-black">
                Actividad administrativa
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Acciones recientes de administradores y del sistema.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/owner/logs")}
              className="rounded-xl p-2 text-violet-700 transition hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10"
            >
              <ArrowRight size={20} />
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 7).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-white/5 dark:bg-white/[0.025]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {formatEventType(activity.eventType)}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {activity.actor
                        ? `${activity.actor.displayName} · ${activity.actor.email}`
                        : "Evento del sistema"}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${getOutcomeStyle(
                        activity.outcome,
                      )}`}
                    >
                      {getOutcomeLabel(activity.outcome)}
                    </span>

                    <p className="mt-1 text-[10px] text-slate-400">
                      {formatDateTime(activity.occurredAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-sm text-slate-500">
                No hay actividad reciente.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#172033]">
          <div>
            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
              Atención
            </p>

            <h2 className="mt-1 text-xl font-black">Requiere revisión</h2>
          </div>

          <div className="mt-5 space-y-3">
            {attentionItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:bg-slate-100 dark:border-white/5 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                >
                  <div
                    className={`rounded-xl p-2.5 ${
                      item.critical
                        ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                        : "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                    }`}
                  >
                    <Icon size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{item.label}</p>

                    <p className="truncate text-[11px] text-slate-500">
                      {item.description}
                    </p>
                  </div>

                  <span className="text-lg font-black">{item.value}</span>
                </button>
              );
            })}
          </div>
        </article>
      </div>

      {/* USO DE VIBENOTAS */}

      <div>
        <p className="text-sm font-bold text-sky-700 dark:text-sky-300">
          Plataforma
        </p>

        <h2 className="mt-1 text-xl font-black">Uso global de VibeNotas</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          {
            label: "Notas",
            value: content.notes,
            detail: `${platform.today.notesCreated} hoy`,
            icon: StickyNote,
          },
          {
            label: "Carpetas",
            value: content.folders,
            detail: `${platform.today.foldersCreated} hoy`,
            icon: Folder,
          },
          {
            label: "Documentos",
            value: content.documents,
            detail: `${platform.today.documentsUploaded} hoy`,
            icon: FileText,
          },
          {
            label: "Checklists",
            value: content.checklists,
            detail: `${productivity.checklistItems.pending} pendientes`,
            icon: ListChecks,
          },
          {
            label: "Mensajes",
            value: communication.messages,
            detail: `${communication.messagesToday} hoy`,
            icon: MessageCircle,
          },
          {
            label: "Almacenamiento",
            value: formatBytes(content.storageBytes),
            detail: `${content.documents} archivos`,
            icon: HardDrive,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#172033]"
            >
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-600 dark:bg-white/5 dark:text-slate-300">
                  <Icon size={18} />
                </div>
              </div>

              <p className="mt-4 text-2xl font-black">{item.value}</p>

              <p className="mt-1 text-sm font-bold">{item.label}</p>

              <p className="mt-1 text-[11px] text-slate-500">{item.detail}</p>
            </div>
          );
        })}
      </div>

      {/* SEGURIDAD */}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#172033]">
          <Activity className="text-violet-600 dark:text-violet-300" />

          <p className="mt-3 text-2xl font-black">{sessions.active}</p>

          <p className="text-sm font-bold">Sesiones activas</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#172033]">
          <ShieldAlert className="text-red-600 dark:text-red-300" />

          <p className="mt-3 text-2xl font-black">{sessions.compromised}</p>

          <p className="text-sm font-bold">Comprometidas</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#172033]">
          <ListChecks className="text-sky-600 dark:text-sky-300" />

          <p className="mt-3 text-2xl font-black">{audit.eventsToday}</p>

          <p className="text-sm font-bold">Eventos hoy</p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/owner/settings")}
          className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-1 dark:border-white/10 dark:bg-[#172033]"
        >
          <Settings className="text-slate-600 dark:text-slate-300" />

          <p className="mt-3 text-sm font-black">Configuración global</p>

          <p className="mt-1 text-xs text-slate-500">Control de VibeNotas</p>
        </button>
      </div>
    </section>
  );
}
