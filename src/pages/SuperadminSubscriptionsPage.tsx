import { useEffect, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  Crown,
  Database,
  FileCheck2,
  LockKeyhole,
  RefreshCw,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import api from "../services/api";
import "./SuperadminSubscriptionsPage.css";

type BillingCapabilities = {
  planCatalog: boolean;
  subscriptionLedger: boolean;
  paymentLedger: boolean;
  paymentProvider: boolean;
  verifiedWebhooks: boolean;
  manualPaymentConfirmation: boolean;
  subscriptionRenewal: boolean;
};

type BillingOverview = {
  status: "NOT_CONFIGURED";
  generatedAt: string;
  provider: null;
  currency: null;
  summary: null;
  subscriptions: null;
  payments: null;
  capabilities: BillingCapabilities;
  message: string;
};

type RecordTab = "subscriptions" | "payments";

type PlannedTier = {
  name: string;
  caption: string;
  icon: typeof Crown;
};

const PLANNED_TIERS: PlannedTier[] = [
  { name: "Free", caption: "Nivel mencionado en el panel anterior", icon: ShieldCheck },
  { name: "Premium", caption: "Nivel previsto, aún sin precio oficial", icon: BadgeCheck },
  { name: "Pro", caption: "Nivel previsto, aún sin precio oficial", icon: Crown },
];

function readableError(caught: unknown): string {
  if (axios.isAxiosError(caught)) {
    const status = caught.response?.status;
    if (status === 401) return "Tu sesión expiró. Vuelve a iniciar sesión.";
    if (status === 403) return "No tienes permiso para consultar el estado administrativo de facturación.";
    if (status === 404) return "Este backend todavía no tiene publicado el diagnóstico de facturación.";
    const message = caught.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
    if (Array.isArray(message)) {
      const parts = message.filter((part): part is string => typeof part === "string");
      if (parts.length) return parts.join(". ");
    }
  }
  return caught instanceof Error
    ? caught.message
    : "No fue posible consultar el estado de facturación.";
}

function hasSafeContract(value: unknown): value is BillingOverview {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<BillingOverview>;
  if (
    result.status !== "NOT_CONFIGURED" ||
    result.summary !== null ||
    result.subscriptions !== null ||
    result.payments !== null ||
    result.provider !== null ||
    result.currency !== null ||
    typeof result.generatedAt !== "string" ||
    !result.capabilities
  ) {
    return false;
  }
  return Object.values(result.capabilities).every((enabled) => enabled === false);
}

function formatCheckedAt(value: string | undefined): string {
  if (!value) return "Sin conexión verificada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin conexión verificada";
  return date.toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function SuperadminSubscriptionsPage() {
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState<RecordTab>("subscriptions");

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError("");
        try {
          const { data } = await api.get<unknown>("/admin/billing/overview");
          if (!hasSafeContract(data)) {
            throw new Error("El backend devolvió un estado de facturación desconocido. No se muestran cifras.");
          }
          if (!cancelled) setOverview(data);
        } catch (caught: unknown) {
          if (!cancelled) {
            setOverview(null);
            setError(readableError(caught));
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [refreshKey]);

  const connected = Boolean(overview) && !error && !loading;

  const metrics = [
    {
      title: "Suscripciones activas",
      icon: Crown,
      caption: "Sin registro de suscripciones disponible",
    },
    {
      title: "Ingresos verificados",
      icon: Banknote,
      caption: "No hay proveedor ni cobros conciliados",
    },
    {
      title: "Pagos pendientes",
      icon: CreditCard,
      caption: "No existe un registro de pagos",
    },
    {
      title: "Renovaciones",
      icon: CalendarClock,
      caption: "Sin vencimientos administrables",
    },
  ];

  const capabilities = [
    {
      title: "Catálogo y precios",
      description: "Definir planes, moneda, precios, vigencia y condiciones.",
      ready: overview?.capabilities.planCatalog ?? false,
      icon: Crown,
    },
    {
      title: "Registro de suscripciones y pagos",
      description: "Guardar derechos de acceso y movimientos verificables.",
      ready: Boolean(overview?.capabilities.subscriptionLedger && overview.capabilities.paymentLedger),
      icon: Database,
    },
    {
      title: "Proveedor y confirmación segura",
      description: "Conectar cobros y validar webhooks firmados e idempotentes.",
      ready: Boolean(overview?.capabilities.paymentProvider && overview.capabilities.verifiedWebhooks),
      icon: Wallet,
    },
    {
      title: "Renovaciones y auditoría",
      description: "Autorizar cambios de estado y trazarlos antes de activarlos.",
      ready: Boolean(overview?.capabilities.subscriptionRenewal && overview.capabilities.manualPaymentConfirmation),
      icon: FileCheck2,
    },
  ];

  return (
    <section className="vn-billing-page">
      <header className="vn-billing-hero">
        <div className="vn-billing-hero-copy">
          <p className="vn-billing-eyebrow">PLANES Y FACTURACIÓN</p>
          <h1>Suscripciones</h1>
          <p>Consulta el estado de los planes, los pagos y la integración financiera de VibeNotas.</p>
        </div>
        <button
          type="button"
          className="vn-billing-refresh"
          disabled={loading}
          onClick={() => setRefreshKey((current) => current + 1)}
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          {loading ? "Consultando..." : "Actualizar estado"}
        </button>
      </header>

      <section
        className={"vn-billing-readiness " + (connected ? "vn-billing-readiness-connected" : "")}
        aria-label="Estado real de facturación"
      >
        <span className="vn-billing-readiness-icon">
          {connected ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
        </span>
        <div className="vn-billing-readiness-copy">
          <div className="vn-billing-readiness-title">
            <strong>Facturación aún no configurada</strong>
            <span className="vn-billing-state-pill">Sin cobros habilitados</span>
          </div>
          <p>
            VibeNotas todavía no tiene catálogo de planes, sistema de suscripciones ni
            procesador de pagos integrado. Por seguridad, no se muestran montos
            inventados ni se permiten confirmaciones o renovaciones.
          </p>
          {connected && (
            <small>
              <CheckCircle2 size={14} aria-hidden="true" />
              Estado confirmado por el backend protegido
            </small>
          )}
        </div>
      </section>

      {error && !loading && (
        <div className="vn-billing-error" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>No se pudo consultar el backend</strong>
            <p>{error}</p>
          </div>
          <button type="button" onClick={() => setRefreshKey((current) => current + 1)}>
            Reintentar
          </button>
        </div>
      )}

      <div className="vn-billing-stats" aria-label="Indicadores de facturación no disponibles">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <article className="vn-billing-stat" key={item.title}>
              <div className="vn-billing-stat-heading">
                <span>{item.title}</span>
                <span className="vn-billing-stat-icon"><Icon size={20} aria-hidden="true" /></span>
              </div>
              <strong title="No hay datos financieros disponibles">—</strong>
              <small>{item.caption}</small>
              <div className="vn-billing-bars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
            </article>
          );
        })}
      </div>

      <div className="vn-billing-columns">
        <section className="vn-billing-panel" aria-labelledby="vn-billing-plans-title">
          <div className="vn-billing-panel-heading">
            <div>
              <p className="vn-billing-section-eyebrow">CATÁLOGO DE PLANES</p>
              <h2 id="vn-billing-plans-title">Planes previstos</h2>
              <p>Referencias del panel anterior. No son tarifas ni productos activados.</p>
            </div>
            <span className="vn-billing-heading-icon"><Crown size={19} aria-hidden="true" /></span>
          </div>

          <div className="vn-billing-tiers">
            {PLANNED_TIERS.map((tier) => {
              const Icon = tier.icon;
              return (
                <div className="vn-billing-tier" key={tier.name}>
                  <span className="vn-billing-tier-icon"><Icon size={18} aria-hidden="true" /></span>
                  <div>
                    <strong>{tier.name}</strong>
                    <small>{tier.caption}</small>
                  </div>
                  <span className="vn-billing-unavailable">Sin configurar</span>
                </div>
              );
            })}
          </div>

          <p className="vn-billing-panel-footnote">
            <LockKeyhole size={15} aria-hidden="true" />
            Los precios y beneficios deben definirse antes de ofrecer un plan.
          </p>
        </section>

        <section className="vn-billing-panel" aria-labelledby="vn-billing-integration-title">
          <div className="vn-billing-panel-heading">
            <div>
              <p className="vn-billing-section-eyebrow">PREPARACIÓN DEL SISTEMA</p>
              <h2 id="vn-billing-integration-title">Integración de cobros</h2>
              <p>Capacidades comprobadas por el backend, aún no habilitadas.</p>
            </div>
            <span className="vn-billing-heading-icon"><ShieldCheck size={19} aria-hidden="true" /></span>
          </div>

          <div className="vn-billing-capabilities">
            {capabilities.map((item) => {
              const Icon = item.icon;
              return (
                <div className="vn-billing-capability" key={item.title}>
                  <span className="vn-billing-capability-icon"><Icon size={18} aria-hidden="true" /></span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                  </div>
                  <span className={item.ready ? "vn-billing-ready" : "vn-billing-pending"}>
                    {item.ready ? "Listo" : "Pendiente"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="vn-billing-panel vn-billing-register" aria-labelledby="vn-billing-register-title">
        <div className="vn-billing-panel-heading vn-billing-register-heading">
          <div>
            <p className="vn-billing-section-eyebrow">OPERACIONES FINANCIERAS</p>
            <h2 id="vn-billing-register-title">Registros administrativos</h2>
            <p>Solo se mostrarán transacciones verificadas cuando exista un sistema de cobros.</p>
          </div>
          <span className="vn-billing-readonly"><LockKeyhole size={14} aria-hidden="true" /> Sin operaciones de escritura</span>
        </div>

        <div className="vn-billing-tabs" role="tablist" aria-label="Tipo de registros">
          <button
            type="button"
            role="tab"
            id="vn-billing-tab-subscriptions"
            aria-selected={tab === "subscriptions"}
            aria-controls="vn-billing-record-content"
            onClick={() => setTab("subscriptions")}
          >
            <Crown size={16} aria-hidden="true" /> Suscripciones
          </button>
          <button
            type="button"
            role="tab"
            id="vn-billing-tab-payments"
            aria-selected={tab === "payments"}
            aria-controls="vn-billing-record-content"
            onClick={() => setTab("payments")}
          >
            <ReceiptText size={16} aria-hidden="true" /> Pagos
          </button>
        </div>

        <div
          id="vn-billing-record-content"
          className="vn-billing-empty"
          role="tabpanel"
          aria-labelledby={tab === "subscriptions" ? "vn-billing-tab-subscriptions" : "vn-billing-tab-payments"}
        >
          <span className="vn-billing-empty-icon">
            {tab === "subscriptions" ? <Crown size={25} /> : <CreditCard size={25} />}
          </span>
          <h3>{tab === "subscriptions" ? "Sin registro de suscripciones" : "Sin registro de pagos"}</h3>
          <p>
            {tab === "subscriptions"
              ? "El backend aún no dispone de un modelo de suscripciones. No hay datos para listar, renovar o cancelar."
              : "No existe un libro de pagos ni proveedor conectado. No se pueden confirmar, cobrar o reembolsar transacciones."}
          </p>
          <span className="vn-billing-empty-status">
            <Clock3 size={14} aria-hidden="true" /> Integración pendiente
          </span>
        </div>
      </section>

      <footer className="vn-billing-footer">
        <span>
          {connected ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {connected ? "Diagnóstico recibido del backend" : loading ? "Consultando el estado de la API" : "Sin diagnóstico confirmado"}
        </span>
        <span>Última consulta: {formatCheckedAt(overview?.generatedAt)}</span>
      </footer>
    </section>
  );
}
