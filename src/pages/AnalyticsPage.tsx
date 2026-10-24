import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  FileText,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import api from "../services/api";

type AnalyticsPeriod = "7d" | "30d" | "90d";

type AnalyticsOverview = {
  generatedAt: string;
  period: {
    key: AnalyticsPeriod;
    from: string;
    to: string;
  };
  summary: {
    users: {
      total: number;
      active: number;
      pendingVerification: number;
      suspended: number;
      disabled: number;
      createdInPeriod: number;
    };
    audit: {
      eventsToday: number;
      eventsInPeriod: number;
    };
  };
  distributions: {
    usersByStatus: Array<{
      status: string;
      total: number;
    }>;
    usersByRole: Array<{
      id: string;
      name: string;
      slug: string;
      priority: number;
      totalUsers: number;
    }>;
  };
  trends: {
    userRegistrations: Array<{
      date: string;
      total: number;
    }>;
  };
  recentActivity: Array<{
    id: string;
    eventType: string;
    outcome: string;
    targetType: string | null;
    targetId: string | null;
    occurredAt: string;
    actor: {
      id: string;
      email: string;
      displayName: string;
    } | null;
  }>;
};

const PERIOD_OPTIONS: Array<{
  value: AnalyticsPeriod;
  label: string;
}> = [
  { value: "7d", label: "7 d\u00edas" },
  { value: "30d", label: "30 d\u00edas" },
  { value: "90d", label: "90 d\u00edas" },
];

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activos",
  PENDING_VERIFICATION: "Pendientes",
  SUSPENDED: "Suspendidos",
  DISABLED: "Deshabilitados",
};

function formatDate(date?: string) {
  if (!date) {
    return "\u2014";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "\u2014";
  }

  return parsed.toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatShortDate(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

function formatAction(action?: string) {
  const translations: Record<string, string> = {
    SEND_NOTIFICATION_CAMPAIGN:
      "Envi\u00f3 una campa\u00f1a de notificaci\u00f3n",
    CREATE_NOTIFICATION_CAMPAIGN:
      "Cre\u00f3 una campa\u00f1a de notificaci\u00f3n",
    DELETE_NOTIFICATION_CAMPAIGN:
      "Elimin\u00f3 una campa\u00f1a de notificaci\u00f3n",
    UPDATE_USER_STATUS: "Actualiz\u00f3 el estado de un usuario",
    CREATE_ADMIN: "Cre\u00f3 un administrador",
    DELETE_USER: "Elimin\u00f3 un usuario",
    LOGIN: "Inici\u00f3 sesi\u00f3n",
    LOGOUT: "Cerr\u00f3 sesi\u00f3n",
    CREATE_NOTE: "Cre\u00f3 una nota",
    UPDATE_NOTE: "Actualiz\u00f3 una nota",
    DELETE_NOTE: "Elimin\u00f3 una nota",
    RESTORE_NOTE: "Restaur\u00f3 una nota",
    CREATE_TAG: "Cre\u00f3 una etiqueta",
    UPDATE_TAG: "Actualiz\u00f3 una etiqueta",
    DELETE_TAG: "Elimin\u00f3 una etiqueta",
  };

  if (!action) {
    return "Acci\u00f3n del sistema";
  }

  return (
    translations[action] ??
    action
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function formatStatus(status: string) {
  return (
    STATUS_LABELS[status] ??
    status
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function statusStyle(status: string) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300";

    case "SUSPENDED":
      return "border-red-300 bg-red-50 text-red-800 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-300";

    case "DISABLED":
      return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-400/20 dark:bg-slate-500/10 dark:text-slate-300";

    default:
      return "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300";
  }
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);

  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async (selectedPeriod: AnalyticsPeriod) => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<AnalyticsOverview>("/analytics/overview", {
        params: {
          period: selectedPeriod,
        },
      });

      setAnalytics(response.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las m\u00e9tricas.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadForPeriod = window.setTimeout(() => {
      void loadAnalytics(period);
    }, 0);

    return () => window.clearTimeout(loadForPeriod);
  }, [period, loadAnalytics]);

  const maxRoleTotal = useMemo(() => {
    if (!analytics) {
      return 1;
    }

    return Math.max(
      ...analytics.distributions.usersByRole.map((role) => role.totalUsers),
      1,
    );
  }, [analytics]);

  const periodLabel =
    PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? period;

  return (
    <section aria-labelledby="analytics-title" className="vn-final-page vn-analytics-overview space-y-4 sm:space-y-6">
      <header className="vn-final-hero vn-analytics-hero">
        <div className="vn-analytics-hero-main">
          <span className="vn-analytics-hero-icon" aria-hidden="true">
            <BarChart3 size={26} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="vn-analytics-eyebrow">CENTRO DE INTELIGENCIA</p>
            <h1 id="analytics-title" className="vn-analytics-display">
              Analíticas <span>de VibeNotas</span>
            </h1>
            <p className="vn-analytics-hero-description">
              Una vista clara del crecimiento, la comunidad y la actividad de tu plataforma.
            </p>
          </div>
        </div>

        <div className="vn-analytics-controls">
          <div className="vn-analytics-periods" role="group" aria-label="Período de análisis">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                aria-pressed={period === option.value}
                className={`vn-analytics-period ${period === option.value ? "is-active" : ""}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void loadAnalytics(period)}
            disabled={loading}
            className="vn-analytics-refresh"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>

        <div className="vn-analytics-hero-footer">
          <span className="vn-analytics-live"><span aria-hidden="true" /> Datos de la plataforma</span>
          <span>
            {analytics
              ? `Última actualización: ${formatDate(analytics.generatedAt)}`
              : "Resumen de actividad administrativa"}
          </span>
        </div>
      </header>

      {error && (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          <h2 className="font-bold">No se pudieron cargar los datos</h2>

          <p className="mt-2 text-sm text-red-200/80">{error}</p>
        </div>
      )}

      {loading && !analytics && (
        <div className="grid grid-cols-2 gap-3 max-[359px]:grid-cols-1 sm:gap-4 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-40 animate-pulse rounded-3xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      )}

      {analytics && (
        <>
          <div className="vn-analytics-section-label">
            <div>
              <span>01 / PANORAMA</span>
              <h2>Indicadores principales</h2>
            </div>
            <span className="vn-analytics-period-label">Período seleccionado: {periodLabel}</span>
          </div>

          <div className="vn-analytics-overview-grid">
            <article className="vn-final-card vn-analytics-kpi vn-analytics-stat" data-tone="violet">
              <div className="vn-analytics-stat-top">
                <span className="vn-analytics-stat-number">01</span>
                <span className="vn-analytics-stat-icon" aria-hidden="true"><Users size={21} /></span>
              </div>
              <p className="vn-analytics-stat-name">Usuarios registrados</p>
              <p className="vn-analytics-stat-value">{analytics.summary.users.total}</p>
              <p className="vn-analytics-stat-note">Comunidad de VibeNotas</p>
            </article>
            <article className="vn-final-card vn-analytics-kpi vn-analytics-stat" data-tone="pink">
              <div className="vn-analytics-stat-top">
                <span className="vn-analytics-stat-number">02</span>
                <span className="vn-analytics-stat-icon" aria-hidden="true"><UserPlus size={21} /></span>
              </div>
              <p className="vn-analytics-stat-name">Nuevos usuarios</p>
              <p className="vn-analytics-stat-value">{analytics.summary.users.createdInPeriod}</p>
              <p className="vn-analytics-stat-note">Registros en el período</p>
            </article>
            <article className="vn-final-card vn-analytics-kpi vn-analytics-stat" data-tone="green">
              <div className="vn-analytics-stat-top">
                <span className="vn-analytics-stat-number">03</span>
                <span className="vn-analytics-stat-icon" aria-hidden="true"><ShieldCheck size={21} /></span>
              </div>
              <p className="vn-analytics-stat-name">Cuentas activas</p>
              <p className="vn-analytics-stat-value">{analytics.summary.users.active}</p>
              <p className="vn-analytics-stat-note">Acceso habilitado</p>
            </article>
            <article className="vn-final-card vn-analytics-kpi vn-analytics-stat" data-tone="blue">
              <div className="vn-analytics-stat-top">
                <span className="vn-analytics-stat-number">04</span>
                <span className="vn-analytics-stat-icon" aria-hidden="true"><Activity size={21} /></span>
              </div>
              <p className="vn-analytics-stat-name">Eventos de hoy</p>
              <p className="vn-analytics-stat-value">{analytics.summary.audit.eventsToday}</p>
              <p className="vn-analytics-stat-note">Actividad registrada</p>
            </article>
          </div>

          <div className="vn-analytics-section-label">
            <div>
              <span>02 / EVOLUCIÓN</span>
              <h2>Crecimiento y composición</h2>
            </div>
            <span className="vn-analytics-period-label">Datos del período: {periodLabel}</span>
          </div>
          <div className="vn-analytics-insight-grid">
            <article className="vn-final-card vn-analytics-chart rounded-3xl border border-white/10 bg-[#1E293B]/80 p-6 shadow-xl shadow-black/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-violet-300">
                    Crecimiento de usuarios
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-white">
                    Registros durante {periodLabel}
                  </h2>
                </div>

                <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-300">
                  <TrendingUp size={20} />
                </div>
              </div>

              <div className="mt-7 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={analytics.trends.userRegistrations}
                    margin={{
                      top: 10,
                      right: 10,
                      left: -20,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148, 163, 184, 0.12)"
                    />

                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      minTickGap={24}
                      tick={{
                        fill: "#94a3b8",
                        fontSize: 12,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      allowDecimals={false}
                      tick={{
                        fill: "#94a3b8",
                        fontSize: 12,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip
                      labelFormatter={(label) => formatShortDate(String(label))}
                      formatter={(value) => [Number(value), "Usuarios"]}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                      }}
                      labelStyle={{
                        color: "#e2e8f0",
                      }}
                    />

                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{
                        r: 5,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
            <article className="vn-final-card vn-analytics-roles rounded-3xl border border-white/10 bg-[#1E293B]/80 p-6 shadow-xl shadow-black/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-violet-300">
                    Distribuci&oacute;n de roles
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-white">
                    Equipo y comunidad
                  </h2>
                </div>

                <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-300">
                  <Users size={20} />
                </div>
              </div>

              <div className="mt-7 space-y-4">
                {analytics.distributions.usersByRole.map((item) => {
                  const percentage = Math.max(
                    (item.totalUsers / maxRoleTotal) * 100,
                    item.totalUsers > 0 ? 4 : 0,
                  );

                  return (
                    <div key={item.id}>
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {item.name}
                        </span>

                        <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                          {item.totalUsers} usuarios
                        </span>
                      </div>

                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-black/20">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400 transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                {analytics.distributions.usersByRole.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No hay datos de roles disponibles.
                  </p>
                )}
              </div>
            </article>
          </div>

          <div className="vn-analytics-section-label">
            <div>
              <span>03 / ESTADO</span>
              <h2>Salud de la comunidad</h2>
            </div>
            <span className="vn-analytics-period-label">Situación de las cuentas</span>
          </div>
          <article className="vn-final-card vn-analytics-health rounded-3xl border border-white/10 bg-[#1E293B]/80 p-6 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-violet-300">
                  Estado de cuentas
                </p>

                <h2 className="mt-1 text-xl font-bold text-white">
                  Salud de la plataforma
                </h2>
              </div>

              <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-300">
                <ShieldCheck size={20} />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 max-[359px]:grid-cols-1 lg:grid-cols-4">
              {analytics.distributions.usersByStatus.map((item) => (
                <div
                  key={item.status}
                  className={`rounded-2xl border p-4 ${statusStyle(
                    item.status,
                  )}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-70">
                    {formatStatus(item.status)}
                  </p>

                  <p className="mt-2 text-3xl font-bold">{item.total}</p>

                  <p className="mt-1 text-xs opacity-70">
                    cuentas registradas
                  </p>
                </div>
              ))}

              {analytics.distributions.usersByStatus.length === 0 && (
                <p className="col-span-full py-8 text-center text-sm text-slate-500">
                  No hay datos de estados disponibles.
                </p>
              )}
            </div>
        </article>

        <div className="vn-analytics-section-label">
            <div>
              <span>04 / AUDITORÍA</span>
              <h2>Movimientos recientes</h2>
            </div>
            <span className="vn-analytics-period-label">{analytics.summary.audit.eventsInPeriod} eventos durante {periodLabel}</span>
          </div>
          <article className="vn-final-card vn-analytics-audit overflow-hidden rounded-3xl border border-white/10 bg-[#1E293B]/80 shadow-xl shadow-black/10">
            <div className="flex flex-col gap-3 border-b border-white/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-violet-300">
                  Auditor&iacute;a reciente
                </p>

                <h2 className="mt-1 text-xl font-bold text-white">
                  Actividad del sistema
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {analytics.summary.audit.eventsInPeriod} eventos durante{" "}
                  {periodLabel}
                </p>
              </div>

              <BarChart3 className="text-violet-300" size={22} />
            </div>

            <div className="divide-y divide-white/5">
              {analytics.recentActivity.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="vn-analytics-audit-row flex flex-col gap-2 px-6 py-4 transition md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-xl bg-violet-500/10 p-2 text-violet-300">
                      <FileText size={17} />
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-white">
                        {formatAction(event.eventType)}
                      </p>

                      <p className="mt-1 truncate text-sm text-slate-500">
                        {event.targetType
                          ? `${event.targetType}${
                              event.targetId ? ` · ${event.targetId}` : ""
                            }`
                          : "Evento de plataforma"}
                      </p>

                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {event.actor?.displayName ||
                          event.actor?.email ||
                          "Sistema"}
                        {" · "}
                        {event.outcome}
                      </p>
                    </div>
                  </div>

                  <p className="shrink-0 text-xs text-slate-500">
                    {formatDate(event.occurredAt)}
                  </p>
                </div>
              ))}

              {analytics.recentActivity.length === 0 && (
                <div className="px-6 py-14 text-center text-slate-500">
                  Todav&iacute;a no hay actividad para mostrar.
                </div>
              )}
            </div>
          </article>

          <p className="text-right text-xs text-slate-600 dark:text-slate-400">
            Actualizado: {formatDate(analytics.generatedAt)}
          </p>
        </>
      )}
    </section>
  );
}
