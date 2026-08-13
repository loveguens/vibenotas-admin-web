import {
  Activity,
  ArrowRight,
  BellRing,
  Clock3,
  DollarSign,
  FileText,
  FolderOpen,
  ShieldCheck,
  StickyNote,
  TrendingUp,
  UserRoundCheck,
  UserRoundX,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import StatCard from "../components/StatCard";
import api from "../services/api";

type ChartItem = {
  fecha: string;
  total: number;
};

type DashboardData = {
  usuarios_total: number;
  usuarios_activos: number;
  usuarios_suspendidos: number;
  notas_total: number;
  documentos_total: number;
  recordatorios_pendientes: number;
  carpetas_total: number;
  usuarios_por_dia?: ChartItem[];
  ingresos_total: number;
  ingresos_este_mes: number;
  pagos_pendientes: number;
  notas_por_dia?: ChartItem[];
  actividad_reciente?: Array<{
    id: number;
    accion: string;
    descripcion?: string;
    creado_en: string;
    usuario_nombre?: string;
  }>;
  usuarios_recientes?: Array<{
    id: number;
    nombre: string;
    correo: string;
    estado: string;
    creado_en: string;
  }>;
};

function formatDate(dateValue?: string) {
  if (!dateValue) return "Sin fecha";

  return new Date(dateValue).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatShortDate(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`);

  return date.toLocaleDateString("es-CL", {
    weekday: "short",
    day: "2-digit",
  });
}

function getActionLabel(action?: string) {
  const labels: Record<string, string> = {
    CREATE_USER: "Usuario creado",
    UPDATE_USER: "Usuario actualizado",
    UPDATE_USER_STATUS: "Estado de usuario actualizado",
    DELETE_USER: "Usuario eliminado",
    CREATE_NOTE: "Nota creada",
    UPDATE_NOTE: "Nota actualizada",
    DELETE_NOTE: "Nota eliminada",
    CREATE_DOCUMENT: "Documento subido",
    DELETE_DOCUMENT: "Documento eliminado",
    CHANGE_PASSWORD: "ContraseÃ±a actualizada",
  };

  return labels[action || ""] || action || "Actividad registrada";
}

function getLastSevenDaysData(
  usersByDay: ChartItem[] = [],
  notesByDay: ChartItem[] = []
) {
  const usersMap = new Map(usersByDay.map((item) => [item.fecha, Number(item.total)]));
  const notesMap = new Map(notesByDay.map((item) => [item.fecha, Number(item.total)]));

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const fecha = `${year}-${month}-${day}`;

    return {
      fecha,
      dia: formatShortDate(fecha),
      usuarios: usersMap.get(fecha) ?? 0,
      notas: notesMap.get(fecha) ?? 0,
    };
  });
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const usuario = useMemo(() => {
    try {
      const usuarioGuardado = localStorage.getItem("usuario");
      return usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
    } catch {
      return null;
    }
  }, []);

  const chartData = useMemo(() => {
    return getLastSevenDaysData(
      dashboard?.usuarios_por_dia,
      dashboard?.notas_por_dia
    );
  }, [dashboard]);

  const cargarDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/admin/dashboard");

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "No se pudieron cargar los datos del dashboard."
        );
      }

      setDashboard(response.data.data);
    } catch (err: any) {
      console.error("ERROR DASHBOARD ADMIN:", err);

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        navigate("/login", { replace: true });
        return;
      }

      setError(
        err.response?.data?.message ||
          err.message ||
          "OcurriÃ³ un problema al cargar el dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDashboard();
  }, []);

  const cerrarSesion = () => {
    navigate("/logout", {
      replace: true,
    });
  };

  return (
    <section className="space-y-7">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">
            AdministraciÃ³n
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Hola, {usuario?.nombre || "Administrador"} ðŸ‘‹
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
            Revisa la actividad, usuarios y contenido de VibeNotas desde un solo lugar.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            <Users size={18} />
            Gestionar usuarios
          </button>

          <button
            type="button"
            onClick={cerrarSesion}
            className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
          >
            Cerrar sesiÃ³n
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Ingresos"
          value={loading ? "..." : `$${Number(dashboard?.ingresos_total ?? 0).toLocaleString("es-CL")}`}
          description="Ingresos acumulados"
          icon={<DollarSign size={22} />}
        />

        <StatCard
          title="Usuarios totales"
          value={loading ? "..." : String(dashboard?.usuarios_total ?? 0)}
          description="Cuentas registradas"
          icon={<Users size={22} />}
        />

        <StatCard
          title="Usuarios activos"
          value={loading ? "..." : String(dashboard?.usuarios_activos ?? 0)}
          description="Cuentas habilitadas"
          icon={<UserRoundCheck size={22} />}
        />

        <StatCard
          title="Notas activas"
          value={loading ? "..." : String(dashboard?.notas_total ?? 0)}
          description="Notas disponibles"
          icon={<StickyNote size={22} />}
        />

        <StatCard
          title="Recordatorios"
          value={loading ? "..." : String(dashboard?.recordatorios_pendientes ?? 0)}
          description="Pendientes por completar"
          icon={<BellRing size={22} />}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Documentos PDF"
          value={loading ? "..." : String(dashboard?.documentos_total ?? 0)}
          description="Archivos subidos"
          icon={<FileText size={22} />}
        />

        <StatCard
          title="Carpetas"
          value={loading ? "..." : String(dashboard?.carpetas_total ?? 0)}
          description="Carpetas creadas"
          icon={<FolderOpen size={22} />}
        />

        <StatCard
          title="Suspendidos"
          value={loading ? "..." : String(dashboard?.usuarios_suspendidos ?? 0)}
          description="Usuarios restringidos"
          icon={<UserRoundX size={22} />}
        />

        <StatCard
          title="Seguridad"
          value="Activa"
          description="Sistema protegido"
          icon={<ShieldCheck size={22} />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-violet-400">
                <TrendingUp size={19} />
                <span className="text-sm font-semibold">Crecimiento</span>
              </div>

              <h2 className="mt-2 text-xl font-bold text-white">
                Usuarios registrados
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Ãšltimos 7 dÃ­as
              </p>
            </div>
          </div>

          <div className="mt-6 h-72">
            {loading ? (
              <p className="pt-24 text-center text-sm text-slate-500">
                Cargando grÃ¡fico...
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis
                    dataKey="dia"
                    stroke="#94a3b8"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke="#94a3b8"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(139, 92, 246, 0.08)" }}
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                    }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Bar
                    dataKey="usuarios"
                    name="Usuarios"
                    fill="#8b5cf6"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sky-400">
                <StickyNote size={19} />
                <span className="text-sm font-semibold">Contenido</span>
              </div>

              <h2 className="mt-2 text-xl font-bold text-white">
                Notas creadas
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Ãšltimos 7 dÃ­as
              </p>
            </div>
          </div>

          <div className="mt-6 h-72">
            {loading ? (
              <p className="pt-24 text-center text-sm text-slate-500">
                Cargando grÃ¡fico...
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis
                    dataKey="dia"
                    stroke="#94a3b8"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke="#94a3b8"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(56, 189, 248, 0.08)" }}
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                    }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Bar
                    dataKey="notas"
                    name="Notas"
                    fill="#38bdf8"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-violet-400">
                <Activity size={19} />
                <span className="text-sm font-semibold">Actividad reciente</span>
              </div>

              <h2 className="mt-2 text-xl font-bold text-white">
                Ãšltimos movimientos
              </h2>
            </div>

            <button
              type="button"
              onClick={() => navigate("/admin/logs")}
              className="inline-flex items-center gap-1 text-sm font-semibold text-violet-400 transition hover:text-violet-300"
            >
              Ver todo
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {loading ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Cargando actividad...
              </p>
            ) : dashboard?.actividad_reciente?.length ? (
              dashboard.actividad_reciente.slice(0, 6).map((activity) => (
                <div
                  key={activity.id}
                  className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                    <Clock3 size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-200">
                      {getActionLabel(activity.accion)}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      {activity.descripcion ||
                        activity.usuario_nombre ||
                        "Actividad registrada en el sistema."}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      {formatDate(activity.creado_en)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                AÃºn no hay actividad registrada.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sky-400">
                <Users size={19} />
                <span className="text-sm font-semibold">Usuarios recientes</span>
              </div>

              <h2 className="mt-2 text-xl font-bold text-white">
                Nuevas cuentas
              </h2>
            </div>

            <button
              type="button"
              onClick={() => navigate("/admin/users")}
              className="text-sm font-semibold text-sky-400 transition hover:text-sky-300"
            >
              Ver usuarios
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {loading ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Cargando usuarios...
              </p>
            ) : dashboard?.usuarios_recientes?.length ? (
              dashboard.usuarios_recientes.slice(0, 5).map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => navigate("/admin/users")}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-3 text-left transition hover:border-violet-500/40 hover:bg-slate-800/70"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-500 text-sm font-bold text-white">
                    {user.nombre?.charAt(0)?.toUpperCase() || "U"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-200">
                      {user.nombre}
                    </p>

                    <p className="truncate text-xs text-slate-500">
                      {user.correo}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      user.estado === "activo"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {user.estado === "activo" ? "Activo" : "Suspendido"}
                  </span>
                </button>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                AÃºn no hay usuarios recientes.
              </p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

