import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Clock3,
  Eye,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from "lucide-react";

import api from "../services/api";

type RoleSlug = "owner" | "super_admin" | "admin" | "user" | string;

type UserRole = {
  id: string;
  name: string;
  slug: RoleSlug;
  priority: number;
};

type ManagedUser = {
  id: string;
  email: string;
  displayName: string;
  status: string;
  roles: UserRole[];
};

type AuditOutcome = "SUCCESS" | "FAILURE" | "DENIED";

type AuditEvent = {
  id: string;
  actorUserId: string | null;
  sessionId: string | null;
  eventType: string;
  outcome: AuditOutcome;
  targetType: string | null;
  targetId: string | null;
  requestId?: string | null;
  metadata?: unknown;
  occurredAt: string;
};

type AuditPage = {
  items: AuditEvent[];
  nextCursor: string | null;
};

type SecurityDetail = {
  generatedAt: string;
  user: {
    id: string;
    displayName: string;
    email: string;
    status: string;
    lastLoginAt: string | null;
  };
  security: {
    mfaEnabled: boolean;
    failedLoginAttempts: number;
    accountLocked: boolean;
    activeSessions: number;
    totalSessions: number;
    activeDevices: number;
    totalDevices: number;
    lastActivityAt: string | null;
    maximumSessionRiskScore: number;
  };
  roles: UserRole[];
};

type ApiError = {
  message?: string | string[];
  error?: string;
};

type RoleFilter = "all" | "super_admin" | "admin";

type OutcomeFilter = "all" | AuditOutcome;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRole(value: unknown): UserRole | null {
  if (!isRecord(value)) {
    return null;
  }

  const source = isRecord(value.role) ? value.role : value;

  const id = typeof source.id === "string" ? source.id : "";

  const slug = typeof source.slug === "string" ? source.slug : "";

  if (!id || !slug) {
    return null;
  }

  return {
    id,
    slug,
    name: typeof source.name === "string" ? source.name : slug,
    priority: typeof source.priority === "number" ? source.priority : 0,
  };
}

function normalizeUser(value: unknown): ManagedUser | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id : "";

  const email =
    typeof value.email === "string"
      ? value.email
      : typeof value.correo === "string"
        ? value.correo
        : "";

  if (!id || !email) {
    return null;
  }

  const rawRoles = Array.isArray(value.roles) ? value.roles : [];

  const roles = rawRoles
    .map(normalizeRole)
    .filter((role): role is UserRole => role !== null);

  return {
    id,
    email,
    displayName:
      typeof value.displayName === "string"
        ? value.displayName
        : typeof value.nombre === "string"
          ? value.nombre
          : email,
    status: typeof value.status === "string" ? value.status : "UNKNOWN",
    roles,
  };
}

function extractUsers(value: unknown): ManagedUser[] {
  if (Array.isArray(value)) {
    return value
      .map(normalizeUser)
      .filter((user): user is ManagedUser => user !== null);
  }

  if (!isRecord(value)) {
    return [];
  }

  const candidates = [value.users, value.items, value.results, value.data];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return extractUsers(candidate);
    }

    if (isRecord(candidate)) {
      const nested = extractUsers(candidate);

      if (nested.length > 0) {
        return nested;
      }
    }
  }

  return [];
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(" ");
    }

    if (typeof message === "string") {
      return message;
    }

    return (
      error.response?.data?.error || `Error ${error.response?.status ?? ""}`
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error inesperado.";
}

function roleLabel(slug: RoleSlug): string {
  switch (slug) {
    case "owner":
      return "Owner";
    case "super_admin":
      return "Super Admin";
    case "admin":
      return "Admin";
    case "user":
      return "Usuario";
    default:
      return slug;
  }
}

function getHighestRole(user: ManagedUser): UserRole | null {
  return (
    [...user.roles].sort((left, right) => right.priority - left.priority)[0] ??
    null
  );
}

function formatEvent(value: string): string {
  const known: Record<string, string> = {
    IDENTITY_USER_ROLE_ASSIGNED: "Rol asignado",

    IDENTITY_USER_ROLE_REVOKED: "Rol revocado",

    IDENTITY_USER_STATUS_UPDATED: "Estado de usuario modificado",

    IDENTITY_ADMIN_USER_SECURITY_VIEWED: "Consultó seguridad de usuario",

    AUTH_LOGIN: "Inicio de sesión",

    AUTH_LOGOUT: "Cierre de sesión",

    IDENTITY_LOGIN_SUCCEEDED: "Inicio de sesión",

    IDENTITY_PROFILE_UPDATED: "Perfil modificado",
  };

  return (
    known[value] ??
    value
      .toLowerCase()
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Sin actividad";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function outcomeLabel(outcome: AuditOutcome): string {
  switch (outcome) {
    case "SUCCESS":
      return "Correcto";

    case "FAILURE":
      return "Fallido";

    case "DENIED":
      return "Denegado";
  }
}

function outcomeStyle(outcome: AuditOutcome): string {
  switch (outcome) {
    case "SUCCESS":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";

    case "FAILURE":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";

    case "DENIED":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }
}

function dateToIso(value: string, endOfDay = false): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`,
  );

  return date.toISOString();
}

export default function OwnerSupervisionPage() {
  const [administrators, setAdministrators] = useState<ManagedUser[]>([]);

  const [events, setEvents] = useState<AuditEvent[]>([]);

  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState("");

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");

  const [actionSearch, setActionSearch] = useState("");

  const [from, setFrom] = useState("");

  const [to, setTo] = useState("");

  const [loadingUsers, setLoadingUsers] = useState(true);

  const [loadingEvents, setLoadingEvents] = useState(true);

  const [loadingMore, setLoadingMore] = useState(false);

  const [securityLoading, setSecurityLoading] = useState(false);

  const [securityDetail, setSecurityDetail] = useState<SecurityDetail | null>(
    null,
  );

  const [eventDetail, setEventDetail] = useState<AuditEvent | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);

  const [error, setError] = useState("");

  const administratorIds = useMemo(
    () => new Set(administrators.map((user) => user.id)),
    [administrators],
  );

  const administratorsById = useMemo(
    () => new Map(administrators.map((user) => [user.id, user])),
    [administrators],
  );

  const visibleAdministrators = useMemo(() => {
    if (roleFilter === "all") {
      return administrators;
    }

    return administrators.filter((user) =>
      user.roles.some((role) => role.slug === roleFilter),
    );
  }, [administrators, roleFilter]);

  const selectedUser = useMemo(
    () => administratorsById.get(selectedUserId) ?? null,
    [administratorsById, selectedUserId],
  );

  const superAdminCount = administrators.filter((user) =>
    user.roles.some((role) => role.slug === "super_admin"),
  ).length;

  const adminCount = administrators.filter((user) =>
    user.roles.some((role) => role.slug === "admin"),
  ).length;

  const loadAdministrators = useCallback(async (): Promise<void> => {
    try {
      setLoadingUsers(true);
      setError("");

      const [adminsResponse, superAdminsResponse] = await Promise.all([
        api.get<unknown>("/users", {
          params: {
            role: "admin",
            page: 1,
            limit: 100,
          },
        }),

        api.get<unknown>("/users", {
          params: {
            role: "super_admin",
            page: 1,
            limit: 100,
          },
        }),
      ]);

      const combined = [
        ...extractUsers(adminsResponse.data),
        ...extractUsers(superAdminsResponse.data),
      ];

      const unique = Array.from(
        new Map(combined.map((user) => [user.id, user])).values(),
      );

      setAdministrators(
        unique.sort((left, right) => {
          const leftRole = getHighestRole(left);

          const rightRole = getHighestRole(right);

          return (rightRole?.priority ?? 0) - (leftRole?.priority ?? 0);
        }),
      );
    } catch (caughtError: unknown) {
      setError(getErrorMessage(caughtError));
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadEvents = useCallback(
    async (cursor?: string, append = false): Promise<void> => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoadingEvents(true);
          setEvents([]);
        }

        setError("");

        const params: Record<string, string | number> = {
          limit: 100,
        };

        if (selectedUserId) {
          params.actorUserId = selectedUserId;
        }

        if (outcomeFilter !== "all") {
          params.outcome = outcomeFilter;
        }

        const fromIso = dateToIso(from);

        const toIso = dateToIso(to, true);

        if (fromIso) {
          params.from = fromIso;
        }

        if (toIso) {
          params.to = toIso;
        }

        if (cursor) {
          params.cursor = cursor;
        }

        const response = await api.get<AuditPage>("/audit/events", {
          params,
        });

        const incoming = Array.isArray(response.data.items)
          ? response.data.items
          : [];

        setEvents((current) => (append ? [...current, ...incoming] : incoming));

        setNextCursor(response.data.nextCursor ?? null);
      } catch (caughtError: unknown) {
        setError(getErrorMessage(caughtError));
      } finally {
        setLoadingEvents(false);
        setLoadingMore(false);
      }
    },
    [from, outcomeFilter, selectedUserId, to],
  );

  useEffect(() => {
    void loadAdministrators();
  }, [loadAdministrators]);

  useEffect(() => {
    if (loadingUsers) {
      return;
    }

    void loadEvents();
  }, [loadingUsers, loadEvents]);

  useEffect(() => {
    setSecurityDetail(null);
  }, [selectedUserId]);

  const filteredEvents = useMemo(() => {
    const search = actionSearch.trim().toLowerCase();

    return events.filter((event) => {
      /*
       * Si no elegimos una persona,
       * mostramos solamente acciones
       * realizadas por Admin o
       * Super Admin.
       */
      if (
        !selectedUserId &&
        (!event.actorUserId || !administratorIds.has(event.actorUserId))
      ) {
        return false;
      }

      if (roleFilter !== "all" && event.actorUserId) {
        const actor = administratorsById.get(event.actorUserId);

        if (!actor?.roles.some((role) => role.slug === roleFilter)) {
          return false;
        }
      }

      if (!search) {
        return true;
      }

      const actor = event.actorUserId
        ? administratorsById.get(event.actorUserId)
        : null;

      const haystack = [
        event.eventType,
        formatEvent(event.eventType),
        event.targetType ?? "",
        event.targetId ?? "",
        actor?.displayName ?? "",
        actor?.email ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [
    actionSearch,
    administratorIds,
    administratorsById,
    events,
    roleFilter,
    selectedUserId,
  ]);

  const deniedVisible = filteredEvents.filter(
    (event) => event.outcome === "DENIED",
  ).length;

  async function openEventDetail(id: string): Promise<void> {
    try {
      setDetailLoading(true);
      setError("");

      const response = await api.get<AuditEvent>(`/audit/events/${id}`);

      setEventDetail(response.data);
    } catch (caughtError: unknown) {
      setError(getErrorMessage(caughtError));
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadSecurityDetail(): Promise<void> {
    if (!selectedUserId) {
      return;
    }

    try {
      setSecurityLoading(true);
      setError("");

      const response = await api.get<SecurityDetail>(
        `/admin/identity/users/${selectedUserId}`,
      );

      setSecurityDetail(response.data);
    } catch (caughtError: unknown) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSecurityLoading(false);
    }
  }

  return (
    <section className="space-y-7 pb-8 text-slate-900 dark:text-white">
      <article className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-6 shadow-sm dark:border-violet-500/15 dark:from-violet-500/10 dark:via-[#172033] dark:to-sky-950/20 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
              <Eye size={20} />

              <span className="text-xs font-black uppercase tracking-[0.16em]">
                Owner
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-black">
              Supervisión administrativa
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Revisa qué hacen los Super Admins y Admins, cuándo actuaron y cuál
              fue el resultado.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadAdministrators();
              void loadEvents();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/5"
          >
            <RefreshCw size={17} />
            Actualizar
          </button>
        </div>
      </article>

      {error && (
        <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <AlertTriangle size={19} className="shrink-0" />

          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#172033]">
          <ShieldCheck className="text-fuchsia-600 dark:text-fuchsia-300" />
          <p className="mt-3 text-3xl font-black">{superAdminCount}</p>
          <p className="text-sm font-bold">Super Admins</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#172033]">
          <UserCog className="text-violet-600 dark:text-violet-300" />
          <p className="mt-3 text-3xl font-black">{adminCount}</p>
          <p className="text-sm font-bold">Admins</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#172033]">
          <Activity className="text-sky-600 dark:text-sky-300" />
          <p className="mt-3 text-3xl font-black">{filteredEvents.length}</p>
          <p className="text-sm font-bold">Eventos visibles</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#172033]">
          <ShieldAlert className="text-amber-600 dark:text-amber-300" />
          <p className="mt-3 text-3xl font-black">{deniedVisible}</p>
          <p className="text-sm font-bold">Denegados</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#172033]">
          <div className="flex items-center gap-2">
            <Users size={19} />
            <h2 className="font-black">Administradores</h2>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {(
              [
                ["all", "Todos"],
                ["super_admin", "Super"],
                ["admin", "Admin"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setRoleFilter(value);
                  setSelectedUserId("");
                }}
                className={`rounded-xl px-2 py-2 text-xs font-bold ${
                  roleFilter === value
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSelectedUserId("")}
            className={`mt-4 flex w-full items-center justify-between rounded-2xl p-3 text-left ${
              !selectedUserId
                ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                : "hover:bg-slate-50 dark:hover:bg-white/5"
            }`}
          >
            <div>
              <p className="text-sm font-black">Todos</p>
              <p className="text-[11px] opacity-70">Actividad administrativa</p>
            </div>

            <ChevronRight size={16} />
          </button>

          <div className="mt-2 max-h-[540px] space-y-1 overflow-y-auto">
            {loadingUsers ? (
              <p className="p-4 text-center text-sm text-slate-500">
                Cargando...
              </p>
            ) : (
              visibleAdministrators.map((user) => {
                const role = getHighestRole(user);

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full rounded-2xl p-3 text-left transition ${
                      selectedUserId === user.id
                        ? "bg-violet-50 dark:bg-violet-500/10"
                        : "hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <p className="truncate text-sm font-black">
                      {user.displayName}
                    </p>

                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {user.email}
                    </p>

                    <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold dark:bg-white/5">
                      {role ? roleLabel(role.slug) : "Sin rol"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="space-y-5">
          {selectedUser && (
            <article className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#172033]">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-lg font-black">
                    {selectedUser.displayName}
                  </p>

                  <p className="text-xs text-slate-500">{selectedUser.email}</p>
                </div>

                <button
                  type="button"
                  disabled={securityLoading}
                  onClick={() => void loadSecurityDetail()}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
                >
                  <ShieldCheck size={16} />
                  {securityLoading ? "Cargando..." : "Ver seguridad"}
                </button>
              </div>

              {securityDetail && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
                    <p className="text-xs text-slate-500">MFA</p>
                    <p className="mt-1 font-black">
                      {securityDetail.security.mfaEnabled
                        ? "Activado"
                        : "Desactivado"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
                    <p className="text-xs text-slate-500">Sesiones</p>
                    <p className="mt-1 font-black">
                      {securityDetail.security.activeSessions}
                      {" / "}
                      {securityDetail.security.totalSessions}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
                    <p className="text-xs text-slate-500">Riesgo máximo</p>
                    <p className="mt-1 font-black">
                      {securityDetail.security.maximumSessionRiskScore}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
                    <p className="text-xs text-slate-500">Última actividad</p>
                    <p className="mt-1 text-xs font-black">
                      {formatDateTime(securityDetail.security.lastActivityAt)}
                    </p>
                  </div>
                </div>
              )}
            </article>
          )}

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#172033]">
            <div className="flex items-center gap-2">
              <Filter size={18} />
              <h2 className="font-black">Filtros</h2>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={actionSearch}
                  onChange={(event) => setActionSearch(event.target.value)}
                  placeholder="Buscar acción..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-white/10 dark:bg-slate-900"
                />
              </div>

              <select
                value={outcomeFilter}
                onChange={(event) =>
                  setOutcomeFilter(event.target.value as OutcomeFilter)
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-slate-900"
              >
                <option value="all">Todos los resultados</option>
                <option value="SUCCESS">Correcto</option>
                <option value="DENIED">Denegado</option>
                <option value="FAILURE">Fallido</option>
              </select>

              <div className="relative">
                <CalendarDays
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-white/10 dark:bg-slate-900"
                />
              </div>

              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-slate-900"
              />
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#172033]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-violet-700 dark:text-violet-300">
                  Historial
                </p>

                <h2 className="mt-1 text-xl font-black">
                  {selectedUser
                    ? `Actividad de ${selectedUser.displayName}`
                    : "Actividad administrativa reciente"}
                </h2>
              </div>

              <Clock3 className="text-slate-400" />
            </div>

            <div className="mt-5 space-y-2">
              {loadingEvents ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  Cargando actividad...
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  No hay eventos con estos filtros.
                </div>
              ) : (
                filteredEvents.map((event) => {
                  const actor = event.actorUserId
                    ? administratorsById.get(event.actorUserId)
                    : null;

                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => void openEventDetail(event.id)}
                      className="flex w-full flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-left transition hover:border-violet-200 hover:bg-violet-50/40 dark:border-white/5 dark:bg-white/[0.025] dark:hover:bg-violet-500/[0.05] md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-black">
                          {formatEvent(event.eventType)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {actor
                            ? `${actor.displayName} · ${actor.email}`
                            : "Actor no identificado"}
                        </p>

                        {(event.targetType || event.targetId) && (
                          <p className="mt-1 truncate text-[11px] text-slate-400">
                            Objetivo: {event.targetType ?? "—"}
                            {" · "}
                            {event.targetId ?? "—"}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-right">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${outcomeStyle(
                              event.outcome,
                            )}`}
                          >
                            {outcomeLabel(event.outcome)}
                          </span>

                          <p className="mt-1 text-[10px] text-slate-400">
                            {formatDateTime(event.occurredAt)}
                          </p>
                        </div>

                        <ChevronRight size={17} className="text-slate-400" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {nextCursor && (
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void loadEvents(nextCursor, true)}
                className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                {loadingMore ? "Cargando..." : "Cargar más actividad"}
              </button>
            )}
          </article>
        </div>
      </div>

      {(eventDetail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#172033]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-violet-700 dark:text-violet-300">
                  Auditoría
                </p>

                <h2 className="mt-1 text-xl font-black">Detalle del evento</h2>
              </div>

              <button
                type="button"
                onClick={() => setEventDetail(null)}
                className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <X size={20} />
              </button>
            </div>

            {detailLoading || !eventDetail ? (
              <p className="py-12 text-center text-sm text-slate-500">
                Cargando detalle...
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/[0.03]">
                  <p className="text-xs text-slate-500">Acción</p>

                  <p className="mt-1 font-black">
                    {formatEvent(eventDetail.eventType)}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/[0.03]">
                    <p className="text-xs text-slate-500">Resultado</p>

                    <p className="mt-1 font-black">
                      {outcomeLabel(eventDetail.outcome)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/[0.03]">
                    <p className="text-xs text-slate-500">Fecha</p>

                    <p className="mt-1 text-sm font-black">
                      {formatDateTime(eventDetail.occurredAt)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/[0.03]">
                    <p className="text-xs text-slate-500">Tipo de objetivo</p>

                    <p className="mt-1 break-all text-sm font-black">
                      {eventDetail.targetType ?? "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/[0.03]">
                    <p className="text-xs text-slate-500">ID objetivo</p>

                    <p className="mt-1 break-all text-xs font-black">
                      {eventDetail.targetId ?? "—"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-950 p-4 text-slate-100">
                  <p className="text-xs font-bold text-slate-400">Metadata</p>

                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs">
                    {JSON.stringify(eventDetail.metadata ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
