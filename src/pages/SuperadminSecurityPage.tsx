import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Fingerprint,
  Laptop,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  UserRoundX,
  X,
} from "lucide-react";
import api from "../services/api";
import "./SuperadminSecurityPage.css";

type SessionStatus = "ACTIVE" | "REVOKED" | "EXPIRED" | "COMPROMISED";
type UserStatus = "ACTIVE" | "SUSPENDED" | "DISABLED" | "PENDING_VERIFICATION" | string;
type SessionFilter = "all" | "suspended" | "risk";

type SecuritySession = {
  id: string;
  status: SessionStatus;
  countryCode: string | null;
  riskScore: number;
  createdAt: string;
  lastActivityAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  user: {
    id: string;
    displayName: string;
    email: string;
    status: UserStatus;
  };
  device: {
    displayName: string;
    platform: string;
    appVersion: string | null;
    status: string;
  };
};

type SecurityEvent = {
  id: string;
  eventType: string;
  outcome: "SUCCESS" | "FAILURE" | "DENIED";
  occurredAt: string;
  actor: { id: string; displayName: string } | null;
};

type SecurityOverview = {
  generatedAt: string;
  summary: {
    activeSessions: number;
    compromisedSessions: number;
    suspendedUsers: number;
    deniedEventsToday: number;
  };
  sessions: SecuritySession[];
  recentEvents: SecurityEvent[];
  sessionsLimit: number;
};

const FILTER_OPTIONS: { value: SessionFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "suspended", label: "Cuentas suspendidas" },
  { value: "risk", label: "Con puntuación de riesgo" },
];

function formatDate(value: string | null | undefined): string {
  if (!value) return "No disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function friendlyEvent(value: string): string {
  return value.replaceAll("_", " ").toLocaleLowerCase("es-CL")
    .replace(/(^|\s)\S/g, (word) => word.toLocaleUpperCase("es-CL"));
}

function statusName(value: UserStatus): string {
  const names: Record<string, string> = {
    ACTIVE: "Activa",
    SUSPENDED: "Suspendida",
    DISABLED: "Deshabilitada",
    PENDING_VERIFICATION: "Pendiente de verificación",
  };
  return names[value] ?? value;
}

function serviceError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 404) return "El backend todavía no tiene disponible el servicio de seguridad administrativa.";
    if (status === 403) return "Tu cuenta no tiene los permisos necesarios para esta operación de seguridad.";
    if (status === 401) return "Necesitas iniciar sesión nuevamente para consultar seguridad.";
    const backendMessage = error.response?.data?.message;
    if (typeof backendMessage === "string" && backendMessage.trim()) return backendMessage;
    if (Array.isArray(backendMessage)) {
      const text = backendMessage.filter((v): v is string => typeof v === "string").join(". ");
      if (text) return text;
    }
  }
  return error instanceof Error ? error.message : fallback;
}

export default function SuperadminSecurityPage() {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SessionFilter>("all");
  const [selected, setSelected] = useState<SecuritySession | null>(null);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    let disposed = false;
    const start = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError("");
        try {
          const { data } = await api.get<SecurityOverview>("/admin/security");
          if (
            !data?.summary ||
            !Array.isArray(data.sessions) ||
            !Array.isArray(data.recentEvents) ||
            typeof data.summary.activeSessions !== "number"
          ) {
            throw new Error("El backend devolvió datos de seguridad no válidos.");
          }
          if (!disposed) setOverview(data);
        } catch (caught: unknown) {
          if (!disposed) {
            setOverview(null);
            setError(serviceError(caught, "No se pudo consultar la seguridad de la plataforma."));
          }
        } finally {
          if (!disposed) setLoading(false);
        }
      })();
    }, 0);

    return () => {
      disposed = true;
      window.clearTimeout(start);
    };
  }, [reload]);

  const filteredSessions = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es-CL");
    return (overview?.sessions ?? []).filter((session) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "suspended" && session.user.status === "SUSPENDED") ||
        (filter === "risk" && session.riskScore > 0);
      const matchesText =
        !term ||
        [
          session.user.displayName,
          session.user.email,
          session.user.id,
          session.device.displayName,
          session.device.platform,
          session.countryCode,
        ].some((value) =>
          (value ?? "").toLocaleLowerCase("es-CL").includes(term),
        );
      return matchesFilter && matchesText;
    });
  }, [overview, search, filter]);

  async function revokeUserSessions() {
    if (!selected || revoking) return;
    const session = selected;
    const confirmed = window.confirm(
      "¿Revocar TODAS las sesiones de " + session.user.displayName +
      "?\n\nSe cerrará la sesión de esta cuenta en TODOS sus dispositivos, no solamente la sesión seleccionada. Esta acción puede interrumpir el acceso del usuario.",
    );
    if (!confirmed) return;

    setRevoking(true);
    setError("");
    setSuccess("");

    try {
      const result = await api.post<{ message?: string; revokedSessions?: number }>(
        "/admin/identity/users/" + encodeURIComponent(session.user.id) +
        "/security/sessions/revoke-all",
      );
      setSuccess(
        result.data?.message ||
        "Las sesiones del usuario fueron revocadas correctamente.",
      );
      setSelected(null);
      setReload((current) => current + 1);
    } catch (caught: unknown) {
      setError(serviceError(caught, "No se pudieron revocar las sesiones del usuario."));
    } finally {
      setRevoking(false);
    }
  }

  const summary = overview?.summary;
  const sessionCount = overview?.sessions.length ?? 0;

  return (
    <section className="vn-security-page">
      <header className="vn-security-hero">
        <div className="vn-security-hero-copy">
          <p className="vn-security-kicker">PROTECCIÓN DE PLATAFORMA</p>
          <h1>Seguridad</h1>
          <p>Revisa las sesiones activas, las cuentas restringidas y los eventos de seguridad de VibeNotas.</p>
        </div>
        <button
          type="button"
          className="vn-security-refresh"
          onClick={() => setReload((current) => current + 1)}
          disabled={loading || revoking}
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          Actualizar seguridad
        </button>
      </header>

      {error && (
        <div className="vn-security-feedback vn-security-error" role="alert">
          <AlertTriangle size={18} />
          <div>
            <strong>Ocurrió un problema</strong>
            <p>{error}</p>
          </div>
        </div>
      )}
      {success && (
        <div className="vn-security-feedback vn-security-success" role="status">
          <CheckCircle2 size={18} />
          <div><strong>Acción completada</strong><p>{success}</p></div>
        </div>
      )}

      <div className="vn-security-stats" aria-label="Indicadores globales de seguridad">
        <article className="vn-security-stat">
          <div className="vn-security-stat-head">
            <p>Sesiones activas</p><span><ShieldCheck size={20} /></span>
          </div>
          <strong>{loading || !summary ? "—" : summary.activeSessions}</strong>
          <small>Sesiones vigentes de la plataforma</small>
          <div className="vn-security-bars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </article>
        <article className="vn-security-stat">
          <div className="vn-security-stat-head">
            <p>Usuarios suspendidos</p><span><UserRoundX size={20} /></span>
          </div>
          <strong>{loading || !summary ? "—" : summary.suspendedUsers}</strong>
          <small>Cuentas restringidas</small>
          <div className="vn-security-bars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </article>
        <article className="vn-security-stat">
          <div className="vn-security-stat-head">
            <p>Sesiones comprometidas</p><span><ShieldAlert size={20} /></span>
          </div>
          <strong>{loading || !summary ? "—" : summary.compromisedSessions}</strong>
          <small>Marcadas por el backend</small>
          <div className="vn-security-bars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </article>
        <article className="vn-security-stat">
          <div className="vn-security-stat-head">
            <p>Accesos denegados hoy</p><span><LockKeyhole size={20} /></span>
          </div>
          <strong>{loading || !summary ? "—" : summary.deniedEventsToday}</strong>
          <small>Eventos de auditoría (UTC)</small>
          <div className="vn-security-bars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </article>
      </div>

      <section className="vn-security-panel" aria-label="Sesiones recientes">
        <div className="vn-security-panel-heading">
          <div>
            <p className="vn-security-panel-kicker">CONTROL DE ACCESO</p>
            <h2>Sesiones activas recientes</h2>
            <p>
              {loading ? "Cargando..." : error && !overview
                ? "Sin datos disponibles"
                : "Mostrando " + filteredSessions.length + " de " + sessionCount +
                  " sesiones consultadas (máximo " + (overview?.sessionsLimit ?? 50) + ")."}
            </p>
          </div>
          <span className="vn-security-readonly"><Activity size={14} /> Datos reales</span>
        </div>

        <div className="vn-security-toolbar">
          <div className="vn-security-search">
            <Search size={18} aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar usuario, correo, dispositivo o país..."
              aria-label="Buscar entre las sesiones mostradas"
            />
            {search && (
              <button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearch("")}>
                <X size={15} />
              </button>
            )}
          </div>
          <div className="vn-security-filters" role="group" aria-label="Filtrar sesiones">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                aria-pressed={filter === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="vn-security-skeletons" role="status" aria-live="polite">
            {[1, 2, 3].map((num) => <div className="vn-security-skeleton" key={num} />)}
          </div>
        ) : !overview ? (
          <div className="vn-security-empty">No se pueden mostrar sesiones hasta que el servicio responda.</div>
        ) : (
          <div className="vn-security-table-scroll">
            <table className="vn-security-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Dispositivo</th>
                  <th>Actividad reciente</th>
                  <th>Cuenta</th>
                  <th>Puntuación de riesgo</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => (
                  <tr key={session.id}>
                    <td data-label="Usuario">
                      <div className="vn-security-person">
                        <span className="vn-security-avatar"><UserRound size={18} /></span>
                        <span><strong>{session.user.displayName}</strong><small>{session.user.email}</small></span>
                      </div>
                    </td>
                    <td data-label="Dispositivo">
                      <div className="vn-security-device"><Laptop size={16} />
                        <span>{session.device.displayName || session.device.platform}</span>
                      </div>
                      <small className="vn-security-detail-muted">{session.device.platform}</small>
                    </td>
                    <td data-label="Actividad reciente"><span className="vn-security-date">
                      <Clock3 size={14} />{formatDate(session.lastActivityAt)}
                    </span></td>
                    <td data-label="Cuenta">
                      <span className={"vn-security-status " + (session.user.status === "ACTIVE" ? "vn-security-status-good" : "vn-security-status-alert")}>
                        {statusName(session.user.status)}
                      </span>
                    </td>
                    <td data-label="Puntuación de riesgo">
                      <span className={"vn-security-risk " + (session.riskScore > 0 ? "vn-security-risk-marked" : "")}>
                        {session.riskScore}
                      </span>
                    </td>
                    <td data-label="Acción">
                      <button className="vn-security-view" type="button" onClick={() => setSelected(session)}>
                        Revisar
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSessions.length === 0 && (
                  <tr className="vn-security-empty-row"><td colSpan={6}>
                    No hay sesiones que coincidan con la búsqueda o los filtros.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="vn-security-panel vn-security-events">
        <div className="vn-security-panel-heading">
          <div>
            <p className="vn-security-panel-kicker">SEGUIMIENTO</p>
            <h2>Eventos recientes de seguridad</h2>
            <p>Últimos eventos de autenticación y accesos denegados, hasta 10 registros.</p>
          </div>
          <span className="vn-security-readonly"><Fingerprint size={14} /> Auditoría</span>
        </div>
        {loading ? (
          <div className="vn-security-skeletons"><div className="vn-security-skeleton" /></div>
        ) : !overview ? (
          <div className="vn-security-empty">No hay información de auditoría disponible.</div>
        ) : overview.recentEvents.length === 0 ? (
          <div className="vn-security-empty">No se registraron eventos de seguridad recientes.</div>
        ) : (
          <div className="vn-security-event-list">
            {overview.recentEvents.map((event) => (
              <article className="vn-security-event" key={event.id}>
                <span className="vn-security-event-icon">
                  {event.outcome === "SUCCESS" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                </span>
                <div className="vn-security-event-main">
                  <strong>{friendlyEvent(event.eventType)}</strong>
                  <small>{event.actor?.displayName || "Sistema o actor no disponible"} · {formatDate(event.occurredAt)}</small>
                </div>
                <span className={"vn-security-event-result vn-security-event-" + event.outcome.toLowerCase()}>
                  {event.outcome === "SUCCESS" ? "Correcto" : event.outcome === "DENIED" ? "Denegado" : "Fallido"}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div className="vn-security-modal-overlay" onKeyDown={(event) => {
          if (event.key === "Escape" && !revoking) setSelected(null);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="vn-security-dialog-title" className="vn-security-modal">
            <div className="vn-security-modal-head">
              <div>
                <p className="vn-security-panel-kicker">DETALLE DE SESIÓN</p>
                <h2 id="vn-security-dialog-title">{selected.user.displayName}</h2>
                <p>{selected.user.email}</p>
              </div>
              <button type="button" autoFocus disabled={revoking}
                aria-label="Cerrar detalle de sesión" onClick={() => setSelected(null)}>
                <X size={19} />
              </button>
            </div>
            <dl className="vn-security-fields">
              <div><dt>Cuenta</dt><dd>{statusName(selected.user.status)}</dd></div>
              <div><dt>Dispositivo</dt><dd>{selected.device.displayName || selected.device.platform}</dd></div>
              <div><dt>Plataforma</dt><dd>{selected.device.platform}</dd></div>
              <div><dt>País</dt><dd>{selected.countryCode || "No registrado"}</dd></div>
              <div><dt>Puntuación de riesgo</dt><dd>{selected.riskScore}</dd></div>
              <div><dt>Última actividad</dt><dd>{formatDate(selected.lastActivityAt)}</dd></div>
              <div><dt>Creada</dt><dd>{formatDate(selected.createdAt)}</dd></div>
              <div><dt>Expiración absoluta</dt><dd>{formatDate(selected.absoluteExpiresAt)}</dd></div>
            </dl>
            <div className="vn-security-revoke-notice">
              <ShieldAlert size={18} />
              <p>Esta acción administrativa revoca <strong>todas las sesiones</strong> de la cuenta y no solamente la seleccionada. El backend verifica tu jerarquía y registra una auditoría.</p>
            </div>
            <button type="button" className="vn-security-revoke" disabled={revoking}
              onClick={() => void revokeUserSessions()}>
              <LockKeyhole size={17} />
              {revoking ? "Revocando sesiones..." : "Revocar todas las sesiones del usuario"}
            </button>
          </section>
        </div>
      )}
    </section>
  );
}
