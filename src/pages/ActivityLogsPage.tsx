import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Copy,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import api from "../services/api";

type ActivityLog = {
  id: number;
  usuario_id: number;
  usuario_nombre: string;
  usuario_correo: string;
  accion: string;
  descripcion: string;
  ip: string | null;
  creado_en: string;
};

type LogsResponse = {
  success: boolean;
  message: string;
  data?: {
    total: number;
    logs: ActivityLog[];
  };
};

function formatAction(action: string) {
  return action
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(dateString: string) {
  const date = new Date(dateString.replace(" ", "T"));

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getActionStyle(action: string) {
  const value = action.toLowerCase();

  if (value.includes("delete") || value.includes("suspend")) {
    return "bg-red-500/10 text-red-300 border-red-400/20";
  }

  if (value.includes("login") || value.includes("security")) {
    return "bg-amber-500/10 text-amber-300 border-amber-400/20";
  }

  if (value.includes("create") || value.includes("activate")) {
    return "bg-emerald-500/10 text-emerald-300 border-emerald-400/20";
  }

  return "bg-violet-500/10 text-violet-300 border-violet-400/20";
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedIp, setCopiedIp] = useState<number | null>(null);

  async function loadLogs() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<LogsResponse>("/superadmin/logs");

      if (!response.data.success) {
        throw new Error(response.data.message || "No se pudieron cargar los logs.");
      }

      setLogs(response.data.data?.logs ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los logs de actividad."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const text = search.trim().toLowerCase();

    if (!text) return logs;

    return logs.filter((log) => {
      return (
        log.usuario_nombre.toLowerCase().includes(text) ||
        log.usuario_correo.toLowerCase().includes(text) ||
        log.accion.toLowerCase().includes(text) ||
        log.descripcion.toLowerCase().includes(text) ||
        (log.ip ?? "").toLowerCase().includes(text)
      );
    });
  }, [logs, search]);

  async function copyIp(log: ActivityLog) {
    if (!log.ip) return;

    await navigator.clipboard.writeText(log.ip);
    setCopiedIp(log.id);

    window.setTimeout(() => setCopiedIp(null), 1500);
  }

  return (
    <section role="superadmin">
      <section className="space-y-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">
              Auditoría del sistema
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Logs de actividad
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Revisa las acciones importantes realizadas dentro de VibeNotas.
            </p>
          </div>

          <button
            onClick={loadLogs}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20"
          >
            <RefreshCw size={18} />
            Actualizar logs
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
            <p className="text-sm text-slate-400">Eventos registrados</p>
            <p className="mt-3 text-3xl font-bold text-white">{logs.length}</p>
            <div className="mt-4 flex items-center gap-2 text-sm text-violet-300">
              <Activity size={16} />
              Actividad del sistema
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
            <p className="text-sm text-slate-400">Usuarios involucrados</p>
            <p className="mt-3 text-3xl font-bold text-white">
              {new Set(logs.map((log) => log.usuario_id)).size}
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-sky-300">
              <UserRound size={16} />
              Acciones identificadas
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
            <p className="text-sm text-slate-400">Eventos críticos</p>
            <p className="mt-3 text-3xl font-bold text-white">
              {
                logs.filter((log) => {
                  const action = log.accion.toLowerCase();

                  return action.includes("delete") || action.includes("suspend");
                }).length
              }
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-red-300">
              <ShieldAlert size={16} />
              Requieren atención
            </div>
          </article>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-4 shadow-xl shadow-black/10 backdrop-blur-xl">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
            <Search size={19} className="text-slate-500" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por usuario, acción, descripción o IP..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-3xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
            <h2 className="font-bold">No se pudieron cargar los logs</h2>
            <p className="mt-2 text-sm text-red-200/80">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#1E293B]/80 shadow-xl shadow-black/10 backdrop-blur-xl">
            <div className="border-b border-white/10 px-6 py-5">
              <h2 className="font-bold text-white">Actividad reciente</h2>
              <p className="mt-1 text-sm text-slate-500">
                Mostrando {filteredLogs.length} de {logs.length} eventos.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-black/10 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Usuario</th>
                    <th className="px-6 py-4 font-semibold">Acción</th>
                    <th className="px-6 py-4 font-semibold">Descripción</th>
                    <th className="px-6 py-4 font-semibold">IP</th>
                    <th className="px-6 py-4 font-semibold">Fecha</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-t border-white/5 text-sm transition hover:bg-white/[0.035]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 font-bold text-white">
                            {log.usuario_nombre.slice(0, 1).toUpperCase()}
                          </div>

                          <div>
                            <p className="font-semibold text-white">
                              {log.usuario_nombre}
                            </p>
                            <p className="text-xs text-slate-500">
                              {log.usuario_correo}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getActionStyle(
                            log.accion
                          )}`}
                        >
                          {formatAction(log.accion)}
                        </span>
                      </td>

                      <td className="max-w-md px-6 py-4 text-slate-400">
                        {log.descripcion}
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() => copyIp(log)}
                          disabled={!log.ip}
                          className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 font-mono text-xs text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {log.ip || "Sin IP"}
                          <Copy size={14} />
                          {copiedIp === log.id ? "Copiada" : ""}
                        </button>
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {formatDate(log.creado_en)}
                      </td>
                    </tr>
                  ))}

                  {filteredLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-16 text-center text-slate-500"
                      >
                        No hay actividad que coincida con tu búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </section>
  );
}