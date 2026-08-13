import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  FileText,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import api from "../services/api";

type RoleChartItem = {
  rol: string;
  total: number | string;
};

type StatusChartItem = {
  estado: string;
  total: number | string;
};

type RecentLog = {
  id: number;
  accion: string;
  descripcion: string;
  creado_en: string;
  usuario_nombre?: string;
};

type StatsResponse = {
  success: boolean;
  message: string;
  data?: {
    resumen?: {
      usuarios_total?: number;
      usuarios_activos?: number;
      usuarios_inactivos?: number;
      usuarios_suspendidos?: number;
      usuarios_eliminados?: number;
      admins?: number;
      super_admins?: number;
      logs_hoy?: number;
      logs_total?: number;
    };
    graficos?: {
      usuarios_por_rol?: RoleChartItem[];
      usuarios_por_estado?: StatusChartItem[];
    };
    ultimos?: {
      logs?: RecentLog[];
    };
  };
};

type ActivityResponse = {
  success: boolean;
  message: string;
  data?: {
    total?: number;
    actividad?: RecentLog[];
    logs?: RecentLog[];
  };
};

function formatDate(date?: string) {
  if (!date) return "—";

  return new Date(date.replace(" ", "T")).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatAction(action?: string) {
  const translations: Record<string, string> = {
    SEND_NOTIFICATION_CAMPAIGN: "Envió una campaña de notificación",
    CREATE_NOTIFICATION_CAMPAIGN: "Creó una campaña de notificación",
    DELETE_NOTIFICATION_CAMPAIGN: "Eliminó una campaña de notificación",

    UPDATE_USER_STATUS: "Actualizó el estado de un usuario",
    CREATE_ADMIN: "Creó un administrador",
    DELETE_USER: "Eliminó un usuario",

    LOGIN: "Inició sesión",
    LOGOUT: "Cerró sesión",
    CREATE_NOTE: "Creó una nota",
    UPDATE_NOTE: "Actualizó una nota",
    DELETE_NOTE: "Eliminó una nota",
    RESTORE_NOTE: "Restauró una nota",

    CREATE_TAG: "Creó una etiqueta",
    UPDATE_TAG: "Actualizó una etiqueta",
    DELETE_TAG: "Eliminó una etiqueta",
  };

  if (!action) return "Acción del sistema";

  return (
    translations[action] ||
    action
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<StatsResponse["data"]>({});
  const [activity, setActivity] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAnalytics() {
    setLoading(true);
    setError("");

    try {
      const [statsResult, activityResult] = await Promise.all([
        api.get<StatsResponse>("/superadmin/stats"),
        api.get<ActivityResponse>("/analytics/activity"),
      ]);

      if (!statsResult.data.success) {
        throw new Error(
          statsResult.data.message || "No se pudieron cargar las estadísticas."
        );
      }

      setStats(statsResult.data.data ?? {});

      if (activityResult.data.success) {
        setActivity(
          activityResult.data.data?.actividad ??
            activityResult.data.data?.logs ??
            []
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las métricas."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  const resumen = stats?.resumen ?? {};
  const roles = stats?.graficos?.usuarios_por_rol ?? [];
  const estados = stats?.graficos?.usuarios_por_estado ?? [];
  const recentLogs = useMemo(
    () => activity.length > 0 ? activity : stats?.ultimos?.logs ?? [],
    [activity, stats]
  );

  return (
    <section role="superadmin">
      <section className="space-y-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">
              Inteligencia de plataforma
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Analytics
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Métricas reales de usuarios, roles, estados y actividad de
              VibeNotas.
            </p>
          </div>

          <button
            onClick={loadAnalytics}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20"
          >
            <RefreshCw size={18} />
            Actualizar métricas
          </button>
        </div>

        {error && (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
            <h2 className="font-bold">No se pudieron cargar los datos</h2>
            <p className="mt-2 text-sm text-red-200/80">{error}</p>
          </div>
        )}

        {loading && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-40 animate-pulse rounded-3xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-5 shadow-xl shadow-black/10">
                <p className="text-sm text-slate-400">Usuarios totales</p>
                <p className="mt-3 text-3xl font-bold text-white">
                  {resumen.usuarios_total ?? 0}
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm text-violet-300">
                  <Users size={16} />
                  Comunidad registrada
                </div>
              </article>

              <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-5 shadow-xl shadow-black/10">
                <p className="text-sm text-slate-400">Usuarios activos</p>
                <p className="mt-3 text-3xl font-bold text-white">
                  {resumen.usuarios_activos ?? 0}
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm text-emerald-300">
                  <ShieldCheck size={16} />
                  Acceso habilitado
                </div>
              </article>

              <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-5 shadow-xl shadow-black/10">
                <p className="text-sm text-slate-400">Suspendidos</p>
                <p className="mt-3 text-3xl font-bold text-white">
                  {resumen.usuarios_suspendidos ?? 0}
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm text-red-300">
                  <Users size={16} />
                  Cuentas restringidas
                </div>
              </article>

              <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-5 shadow-xl shadow-black/10">
                <p className="text-sm text-slate-400">Logs de hoy</p>
                <p className="mt-3 text-3xl font-bold text-white">
                  {resumen.logs_hoy ?? 0}
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm text-sky-300">
                  <Activity size={16} />
                  Eventos registrados
                </div>
              </article>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
  <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-6 shadow-xl shadow-black/10">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-violet-300">
          Distribución de roles
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
      {roles.map((item) => {
        const total = Number(item.total) || 0;
        const max = Math.max(
          ...roles.map((role) => Number(role.total) || 0),
          1
        );

        const percentage = Math.max((total / max) * 100, 4);

        return (
          <div key={item.rol}>
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-slate-300">
                {item.rol}
              </span>

              <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-bold text-violet-300">
                {total} usuarios
              </span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-black/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}

      {roles.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-500">
          No hay datos de roles disponibles.
        </p>
      )}
    </div>
  </article>

  <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-6 shadow-xl shadow-black/10">
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

    <div className="mt-7 grid gap-3 sm:grid-cols-2">
      {estados.map((item) => {
        const total = Number(item.total) || 0;
        const status = item.estado.toLowerCase();

        const style =
          status === "activo"
            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
            : status === "suspendido"
            ? "border-red-400/20 bg-red-500/10 text-red-300"
            : "border-amber-400/20 bg-amber-500/10 text-amber-300";

        return (
          <div
            key={item.estado}
            className={`rounded-2xl border p-4 ${style}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider opacity-70">
              {item.estado}
            </p>

            <p className="mt-2 text-3xl font-bold">{total}</p>

            <p className="mt-1 text-xs opacity-70">
              cuentas registradas
            </p>
          </div>
        );
      })}

      {estados.length === 0 && (
        <p className="col-span-full py-8 text-center text-sm text-slate-500">
          No hay datos de estados disponibles.
        </p>
      )}
    </div>
  </article>
</div>

            <article className="overflow-hidden rounded-3xl border border-white/10 bg-[#1E293B]/80 shadow-xl shadow-black/10">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                <div>
                  <p className="text-sm font-semibold text-violet-300">
                    Auditoría reciente
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white">
                    Actividad del sistema
                  </h2>
                </div>

                <BarChart3 className="text-violet-300" size={22} />
              </div>

              <div className="divide-y divide-white/5">
                {recentLogs.slice(0, 8).map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col gap-2 px-6 py-4 transition hover:bg-white/[0.03] md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="rounded-xl bg-violet-500/10 p-2 text-violet-300">
                        <FileText size={17} />
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-white">
                          {formatAction(log.accion)}
                        </p>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {log.descripcion}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {log.usuario_nombre || "Sistema"}
                        </p>
                      </div>
                    </div>

                    <p className="shrink-0 text-xs text-slate-500">
                      {formatDate(log.creado_en)}
                    </p>
                  </div>
                ))}

                {recentLogs.length === 0 && (
                  <div className="px-6 py-14 text-center text-slate-500">
                    Todavía no hay actividad para mostrar.
                  </div>
                )}
              </div>
            </article>
          </>
        )}
      </section>
    </section>
  );
}