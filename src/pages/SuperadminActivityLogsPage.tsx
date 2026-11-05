import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Eye,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";
import api from "../services/api";
import "./SuperadminActivityLogsPage.css";

type AuditOutcome = "SUCCESS" | "FAILURE" | "DENIED";
type OutcomeFilter = "ALL" | AuditOutcome;

type AuditEvent = {
  id: string;
  actorUserId: string | null;
  actor?: {
    id: string;
    displayName: string;
    email: string;
  } | null;
  eventType: string;
  outcome: AuditOutcome;
  targetType: string | null;
  targetId: string | null;
  requestId: string;
  traceId: string | null;
  ipHash: string | null;
  userAgentHash: string | null;
  metadata: unknown;
  occurredAt: string;
};

type AuditResponse = {
  items: AuditEvent[];
  nextCursor: string | null;
};

const OUTCOME_OPTIONS: { key: OutcomeFilter; label: string }[] = [
  { key: "ALL", label: "Todos" },
  { key: "SUCCESS", label: "Correctos" },
  { key: "FAILURE", label: "Fallidos" },
  { key: "DENIED", label: "Denegados" },
];

function outcomeLabel(value: AuditOutcome): string {
  if (value === "SUCCESS") return "Correcto";
  if (value === "FAILURE") return "Fallido";
  return "Denegado";
}

function formatEventType(value: string): string {
  return value.replaceAll("_", " ").toLocaleLowerCase("es-CL")
    .replace(/(^|\s)\S/g, (part) => part.toLocaleUpperCase("es-CL"));
}

function formatDate(value: string): string {
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

function actorLabel(event: AuditEvent): string {
  if (event.actor?.displayName?.trim()) return event.actor.displayName;
  return event.actorUserId ? "Usuario no disponible" : "Sistema";
}

function getLoadError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403) {
      return "Tu cuenta no tiene el permiso de lectura de auditoría.";
    }
    if (error.response?.status === 404) {
      return "El servicio de auditoría no está disponible en este backend.";
    }
    if (error.response?.status === 401) {
      return "La sesión necesita renovarse para consultar los eventos.";
    }
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return error instanceof Error
    ? error.message
    : "No se pudieron cargar los eventos de auditoría.";
}

function matchesSearch(event: AuditEvent, term: string): boolean {
  if (!term) return true;
  return [
    event.actor?.displayName,
    event.actor?.email,
    event.actorUserId,
    event.eventType,
    formatEventType(event.eventType),
    event.outcome,
    outcomeLabel(event.outcome),
    event.targetType,
    event.targetId,
    event.requestId,
    event.id,
  ].some((value) => (value ?? "").toLocaleLowerCase("es-CL").includes(term));
}

export default function SuperadminActivityLogsPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [outcome, setOutcome] = useState<OutcomeFilter>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [copiedRequest, setCopiedRequest] = useState("");

  const cursor = cursors[page] ?? null;

  useEffect(() => {
    let cancelled = false;
    const initialLoad = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError("");
        try {
          const response = await api.get<AuditResponse>("/audit/events", {
            params: {
              limit,
              ...(cursor ? { cursor } : {}),
              ...(outcome !== "ALL" ? { outcome } : {}),
            },
          });

          if (
            !Array.isArray(response.data?.items) ||
            (response.data.nextCursor !== null &&
              typeof response.data.nextCursor !== "string")
          ) {
            throw new Error("El backend devolvió una respuesta de auditoría inesperada.");
          }

          if (!cancelled) {
            setEvents(response.data.items);
            setNextCursor(response.data.nextCursor);
          }
        } catch (caughtError: unknown) {
          if (!cancelled) {
            setEvents([]);
            setNextCursor(null);
            setError(getLoadError(caughtError));
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(initialLoad);
    };
  }, [cursor, limit, outcome, reloadKey]);

  const filteredEvents = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es-CL");
    return events.filter((event) => matchesSearch(event, term));
  }, [events, search]);

  const uniqueActors = useMemo(
    () => new Set(events.map((event) => event.actorUserId).filter(Boolean)).size,
    [events],
  );

  const alertCount = useMemo(
    () => events.filter((event) => event.outcome !== "SUCCESS").length,
    [events],
  );

  function changeOutcome(value: OutcomeFilter) {
    setOutcome(value);
    setCursors([null]);
    setPage(0);
    setSearch("");
  }

  function changeLimit(value: number) {
    setLimit(value);
    setCursors([null]);
    setPage(0);
    setSearch("");
  }

  function nextPage() {
    if (!nextCursor || loading) return;
    setCursors((current) => [...current.slice(0, page + 1), nextCursor]);
    setPage((current) => current + 1);
    setSearch("");
  }

  function previousPage() {
    if (page === 0 || loading) return;
    setPage((current) => current - 1);
    setSearch("");
  }

  async function copyRequestId(requestId: string) {
    try {
      await navigator.clipboard.writeText(requestId);
      setCopiedRequest(requestId);
    } catch {
      setCopiedRequest("");
    }
  }

  return (
    <section className="vn-logs-page">
      <header className="vn-logs-hero">
        <div className="vn-logs-hero-copy">
          <p className="vn-logs-eyebrow">AUDITORÍA DEL SISTEMA</p>
          <h1>Logs de actividad</h1>
          <p className="vn-logs-description">
            Consulta los eventos de seguridad y actividad de VibeNotas,
            con trazabilidad y acceso administrativo protegido.
          </p>
        </div>
        <button
          type="button"
          className="vn-logs-refresh"
          disabled={loading}
          onClick={() => setReloadKey((current) => current + 1)}
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          Actualizar logs
        </button>
      </header>

      <div className="vn-logs-stats" aria-label="Indicadores de la página actual">
        <article className="vn-logs-stat">
          <div className="vn-logs-stat-top">
            <span>Eventos en esta página</span>
            <span className="vn-logs-stat-icon"><Activity size={20} /></span>
          </div>
          <strong>{loading ? "—" : error ? "—" : events.length}</strong>
          <p>Registros obtenidos del backend</p>
          <div className="vn-logs-stat-bars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </article>
        <article className="vn-logs-stat">
          <div className="vn-logs-stat-top">
            <span>Actores identificados</span>
            <span className="vn-logs-stat-icon"><UserRound size={20} /></span>
          </div>
          <strong>{loading ? "—" : error ? "—" : uniqueActors}</strong>
          <p>Usuarios distintos en esta página</p>
          <div className="vn-logs-stat-bars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </article>
        <article className="vn-logs-stat">
          <div className="vn-logs-stat-top">
            <span>Fallos y accesos denegados</span>
            <span className="vn-logs-stat-icon"><ShieldAlert size={20} /></span>
          </div>
          <strong>{loading ? "—" : error ? "—" : alertCount}</strong>
          <p>Eventos que requieren revisión</p>
          <div className="vn-logs-stat-bars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </article>
      </div>

      <section className="vn-logs-toolbar" aria-label="Buscar y filtrar eventos">
        <div className="vn-logs-search">
          <Search size={18} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar en esta página por actor, evento o solicitud..."
            aria-label="Buscar en la página actual de auditoría"
          />
          {search && (
            <button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearch("")}>
              <X size={15} />
            </button>
          )}
        </div>
        <div className="vn-logs-filters" role="group" aria-label="Filtrar por resultado">
          {OUTCOME_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={outcome === option.key}
              onClick={() => changeOutcome(option.key)}
              disabled={loading}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="vn-logs-limit">
          Por página
          <select
            value={limit}
            onChange={(event) => changeLimit(Number(event.target.value))}
            disabled={loading}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
      </section>

      {error && !loading && (
        <div className="vn-logs-error" role="alert">
          <AlertTriangle size={19} />
          <div>
            <strong>No se pudieron cargar los logs</strong>
            <p>{error}</p>
          </div>
          <button type="button" onClick={() => setReloadKey((current) => current + 1)}>
            Reintentar
          </button>
        </div>
      )}

      <section className="vn-logs-panel" aria-label="Eventos de auditoría">
        <div className="vn-logs-panel-heading">
          <div>
            <p className="vn-logs-panel-eyebrow">REGISTRO DE EVENTOS</p>
            <h2>Actividad reciente</h2>
            <p>
              {loading
                ? "Cargando registros..."
                : error
                  ? "No hay resultados disponibles."
                  : String(filteredEvents.length) + " de " + String(events.length) +
                    " eventos de la página " + String(page + 1) + "."}
            </p>
          </div>
          <span className="vn-logs-readonly"><CheckCircle2 size={14} /> Solo lectura</span>
        </div>

        {loading ? (
          <div className="vn-logs-loading" role="status" aria-live="polite">
            {[1, 2, 3, 4].map((item) => (
              <div className="vn-logs-skeleton" key={item} />
            ))}
          </div>
        ) : !error ? (
          <div className="vn-logs-table-scroll">
            <table className="vn-logs-table">
              <thead>
                <tr>
                  <th>Actor</th>
                  <th>Evento</th>
                  <th>Resultado</th>
                  <th>Fecha</th>
                  <th>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr key={event.id}>
                    <td data-label="Actor">
                      <div className="vn-logs-actor">
                        <span className="vn-logs-avatar">
                          {event.actorUserId ? <UserRound size={17} /> : <Activity size={17} />}
                        </span>
                        <span className="vn-logs-actor-copy">
                          <strong>{actorLabel(event)}</strong>
                          <small>{event.actor?.email || (event.actorUserId ? "Identidad no disponible" : "Evento automático")}</small>
                        </span>
                      </div>
                    </td>
                    <td data-label="Evento">
                      <strong className="vn-logs-event-name">{formatEventType(event.eventType)}</strong>
                      <small className="vn-logs-event-type">{event.eventType}</small>
                    </td>
                    <td data-label="Resultado">
                      <span className={"vn-logs-outcome vn-logs-outcome-" + event.outcome.toLowerCase()}>
                        {event.outcome === "SUCCESS" ? <CheckCircle2 size={14} /> :
                          event.outcome === "FAILURE" ? <AlertTriangle size={14} /> :
                            <ShieldAlert size={14} />}
                        {outcomeLabel(event.outcome)}
                      </span>
                    </td>
                    <td data-label="Fecha">
                      <span className="vn-logs-date"><Clock3 size={14} />{formatDate(event.occurredAt)}</span>
                    </td>
                    <td data-label="Detalles">
                      <button className="vn-logs-detail-button" type="button" onClick={() => setSelectedEvent(event)}>
                        <Eye size={15} /> Ver evento
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredEvents.length === 0 && (
                  <tr className="vn-logs-empty-row">
                    <td colSpan={5}>
                      <Activity size={27} />
                      <strong>{events.length === 0 ? "No hay eventos en esta página" : "Sin coincidencias"}</strong>
                      <span>{events.length === 0
                        ? "El backend no devolvió registros para este filtro."
                        : "Prueba con otro término de búsqueda."}</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="vn-logs-empty-error">La tabla estará disponible cuando se restablezca la conexión.</div>
        )}

        <footer className="vn-logs-pagination">
          <span>La búsqueda se aplica a los {limit} registros máximos de esta página.</span>
          <div className="vn-logs-page-actions">
            <button type="button" disabled={loading || page === 0} onClick={previousPage}>
              <ChevronLeft size={16} /> Anterior
            </button>
            <strong>Página {page + 1}</strong>
            <button type="button" disabled={loading || !nextCursor || !!error} onClick={nextPage}>
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      </section>

      {selectedEvent && (
        <div
          className="vn-logs-modal-backdrop"
          onKeyDown={(event) => {
            if (event.key === "Escape") setSelectedEvent(null);
          }}
        >
          <section className="vn-logs-modal" role="dialog" aria-modal="true" aria-labelledby="vn-logs-dialog-title">
            <div className="vn-logs-modal-header">
              <div>
                <p className="vn-logs-panel-eyebrow">DETALLE DE AUDITORÍA</p>
                <h2 id="vn-logs-dialog-title">{formatEventType(selectedEvent.eventType)}</h2>
                <p>{formatDate(selectedEvent.occurredAt)}</p>
              </div>
              <button type="button" autoFocus aria-label="Cerrar detalle" onClick={() => setSelectedEvent(null)}>
                <X size={20} />
              </button>
            </div>
            <dl className="vn-logs-detail-grid">
              <div><dt>Actor</dt><dd>{actorLabel(selectedEvent)}</dd></div>
              <div><dt>Resultado</dt><dd>{outcomeLabel(selectedEvent.outcome)}</dd></div>
              <div><dt>Tipo de evento</dt><dd>{selectedEvent.eventType}</dd></div>
              <div><dt>Identificador</dt><dd>{selectedEvent.id}</dd></div>
              <div><dt>Objetivo</dt><dd>{selectedEvent.targetType || "Sin objetivo"}</dd></div>
              <div><dt>ID de objetivo</dt><dd>{selectedEvent.targetId || "No disponible"}</dd></div>
              <div><dt>Huella de IP (SHA-256)</dt><dd>{selectedEvent.ipHash || "No registrada"}</dd></div>
              <div><dt>Solicitud</dt><dd className="vn-logs-request">
                <span>{selectedEvent.requestId}</span>
                <button type="button" onClick={() => void copyRequestId(selectedEvent.requestId)}
                  aria-label="Copiar identificador de solicitud"><Copy size={14} />
                  {copiedRequest === selectedEvent.requestId ? "Copiado" : "Copiar"}</button>
              </dd></div>
            </dl>
            <div className="vn-logs-meta">
              <h3>Metadatos de auditoría</h3>
              {selectedEvent.metadata == null ? (
                <p>Este evento no tiene metadatos adicionales.</p>
              ) : (
                <pre>{JSON.stringify(selectedEvent.metadata, null, 2)}</pre>
              )}
              <p>Los metadatos son depurados por el backend antes de mostrarse.</p>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
