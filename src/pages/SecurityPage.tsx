import { useEffect, useMemo, useState } from "react";
import {
  Clock3,
  Laptop,
  LockKeyhole,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserRoundX,
  X,
} from "lucide-react";
import api from "../services/api";

type ActiveSession = {
  id: number;
  usuario_id: number;
  usuario_nombre: string;
  usuario_correo: string;
  usuario_estado: string;
  ip: string | null;
  user_agent: string | null;
  estado: "activa" | "cerrada";
  creado_en: string;
  cerrado_en: string | null;
};

type LoginHistory = {
  id: number;
  usuario_id: number;
  usuario_nombre: string;
  usuario_correo: string;
  ip_address: string | null;
  user_agent: string | null;
  expira_en: string | null;
  revocado: number | boolean;
  creado_en: string;
};

type SecurityResponse = {
  success: boolean;
  message: string;
  data?: {
    resumen: {
      sesiones_activas: number;
      usuarios_suspendidos: number;
      tokens_revocados: number;
    };
    sesiones_activas: ActiveSession[];
    historial_login: LoginHistory[];
  };
};

type SecuritySummary = {
  sesiones_activas: number;
  usuarios_suspendidos: number;
  tokens_revocados: number;
};

function formatDate(date?: string | null) {
  if (!date) return "—";

  return new Date(date.replace(" ", "T")).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getDevice(userAgent?: string | null) {
  if (!userAgent) return "Dispositivo desconocido";

  const agent = userAgent.toLowerCase();

  if (agent.includes("curl")) return "Herramienta CMD / cURL";
  if (agent.includes("chrome")) return "Google Chrome";
  if (agent.includes("firefox")) return "Mozilla Firefox";
  if (agent.includes("safari")) return "Safari";
  if (agent.includes("edge")) return "Microsoft Edge";

  return "Navegador o dispositivo";
}

export default function SecurityPage() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [closingId, setClosingId] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<ActiveSession | null>(
    null
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadSecurity() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<SecurityResponse>("/superadmin/security");

      if (!response.data.success || !response.data.data) {
        throw new Error(
          response.data.message || "No se pudo cargar la información de seguridad."
        );
      }

      setSummary(response.data.data.resumen);
      setSessions(response.data.data.sesiones_activas ?? []);
      setLoginHistory(response.data.data.historial_login ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar la información de seguridad."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSecurity();
  }, []);

  const suspiciousSessions = useMemo(
    () =>
      sessions.filter(
        (session) =>
          session.usuario_estado === "suspendido" ||
          String(session.user_agent ?? "").toLowerCase().includes("curl")
      ),
    [sessions]
  );

  async function closeSession(session: ActiveSession) {
    const confirmed = window.confirm(
      `¿Cerrar la sesión de ${session.usuario_nombre}?\n\nIP: ${
        session.ip || "Sin IP"
      }`
    );

    if (!confirmed) return;

    setClosingId(session.id);
    setError("");
    setSuccess("");

    try {
      const response = await api.delete(
        `/superadmin/security/sessions/${session.id}`
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "No se pudo cerrar la sesión."
        );
      }

      setSuccess(`Sesión de ${session.usuario_nombre} cerrada correctamente.`);
      setSelectedSession(null);
      await loadSecurity();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cerrar la sesión."
      );
    } finally {
      setClosingId(null);
    }
  }

  return (
    
      <section className="space-y-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">
              Protección de plataforma
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Seguridad
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Revisa sesiones activas, accesos recientes y cuentas que requieren
              atención.
            </p>
          </div>

          <button
            onClick={loadSecurity}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20"
          >
            <RefreshCw size={18} />
            Actualizar seguridad
          </button>
        </div>

        {error && (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-red-200">
            <p className="font-semibold">Ocurrió un problema</p>
            <p className="mt-1 text-sm text-red-200/80">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-emerald-200">
            <p className="font-semibold">Acción completada</p>
            <p className="mt-1 text-sm text-emerald-200/80">{success}</p>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-5 shadow-xl shadow-black/10">
            <p className="text-sm text-slate-400">Sesiones activas</p>
            <p className="mt-3 text-3xl font-bold text-white">
              {summary?.sesiones_activas ?? 0}
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-emerald-300">
              <ShieldCheck size={16} />
              Accesos abiertos
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-5 shadow-xl shadow-black/10">
            <p className="text-sm text-slate-400">Usuarios suspendidos</p>
            <p className="mt-3 text-3xl font-bold text-white">
              {summary?.usuarios_suspendidos ?? 0}
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-red-300">
              <UserRoundX size={16} />
              Cuentas restringidas
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-5 shadow-xl shadow-black/10">
            <p className="text-sm text-slate-400">Sesiones a revisar</p>
            <p className="mt-3 text-3xl font-bold text-white">
              {suspiciousSessions.length}
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-amber-300">
              <ShieldAlert size={16} />
              Suspendidas o CMD
            </div>
          </article>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-3xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#1E293B]/80 shadow-xl shadow-black/10">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                <div>
                  <p className="text-sm font-semibold text-violet-300">
                    Control de acceso
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white">
                    Sesiones activas
                  </h2>
                </div>

                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400">
                  {sessions.length} sesiones
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left">
                  <thead className="bg-black/10 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Usuario</th>
                      <th className="px-6 py-4 font-semibold">Dispositivo</th>
                      <th className="px-6 py-4 font-semibold">IP</th>
                      <th className="px-6 py-4 font-semibold">Inicio</th>
                      <th className="px-6 py-4 font-semibold">Riesgo</th>
                      <th className="px-6 py-4 text-right font-semibold">
                        Acción
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sessions.map((session) => {
                      const isSuspended =
                        session.usuario_estado === "suspendido";

                      const isCurl = String(
                        session.user_agent ?? ""
                      ).toLowerCase().includes("curl");

                      const needsReview = isSuspended || isCurl;

                      return (
                        <tr
                          key={session.id}
                          className="border-t border-white/5 text-sm transition hover:bg-white/[0.035]"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 font-bold text-white">
                                {session.usuario_nombre
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <p className="font-semibold text-white">
                                  {session.usuario_nombre}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {session.usuario_correo}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-slate-300">
                              <Laptop size={16} className="text-slate-500" />
                              {getDevice(session.user_agent)}
                            </div>
                          </td>

                          <td className="px-6 py-4 font-mono text-xs text-slate-400">
                            {session.ip || "Sin IP"}
                          </td>

                          <td className="px-6 py-4 text-slate-500">
                            {formatDate(session.creado_en)}
                          </td>

                          <td className="px-6 py-4">
                            {needsReview ? (
                              <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                                {isSuspended
                                  ? "Usuario suspendido"
                                  : "Acceso CMD"}
                              </span>
                            ) : (
                              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                                Normal
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setSelectedSession(session)}
                              className="rounded-xl bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-300 transition hover:bg-violet-500/20"
                            >
                              Revisar
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {sessions.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-16 text-center text-slate-500"
                        >
                          No hay sesiones activas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-6 shadow-xl shadow-black/10">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-300">
                  <Clock3 size={20} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-violet-300">
                    Historial de acceso
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white">
                    Sesiones login registradas
                  </h2>
                </div>
              </div>

              {loginHistory.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                  No hay registros todavía en <code>sesiones_login</code>.
                </p>
              ) : (
                <div className="mt-6 space-y-3">
                  {loginHistory.slice(0, 8).map((login) => (
                    <div
                      key={login.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-black/10 p-4"
                    >
                      <div>
                        <p className="font-semibold text-white">
                          {login.usuario_nombre}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {login.usuario_correo} · {login.ip_address || "Sin IP"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          login.revocado
                            ? "bg-red-500/10 text-red-300"
                            : "bg-emerald-500/10 text-emerald-300"
                        }`}
                      >
                        {login.revocado ? "Revocado" : "Activo"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </>
        )}

        {selectedSession && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl shadow-black/50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-violet-300">
                    Detalle de sesión #{selectedSession.id}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white">
                    {selectedSession.usuario_nombre}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedSession.usuario_correo}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedSession(null)}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-6 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Dirección IP
                  </p>
                  <p className="mt-1 font-mono text-sm text-white">
                    {selectedSession.ip || "Sin IP"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Dispositivo
                  </p>
                  <p className="mt-1 text-sm text-white">
                    {getDevice(selectedSession.user_agent)}
                  </p>
                  <p className="mt-2 break-all text-xs text-slate-500">
                    {selectedSession.user_agent || "Sin información"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Inicio de sesión
                  </p>
                  <p className="mt-1 text-sm text-white">
                    {formatDate(selectedSession.creado_en)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => closeSession(selectedSession)}
                disabled={closingId === selectedSession.id}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LockKeyhole size={17} />
                {closingId === selectedSession.id
                  ? "Cerrando sesión..."
                  : "Cerrar esta sesión"}
              </button>
            </div>
          </div>
        )}
      </section>
    
  );
}