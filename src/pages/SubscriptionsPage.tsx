import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Crown,
  CreditCard,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import api from "../services/api";

type PaymentStatus = "pendiente" | "pagado" | "fallido" | "reembolsado";

type Plan = "FREE" | "PREMIUM" | "PRO";

type PaymentFilter = "todos" | PaymentStatus;

type Payment = {
  id: number;
  usuario_id: number;
  suscripcion_id?: number | null;
  usuario_nombre: string;
  usuario_correo: string;
  plan: Plan;
  proveedor: string;
  referencia_pago?: string | null;
  monto: number | string;
  moneda: string;
  estado: PaymentStatus;
  pagado_en?: string | null;
  creado_en: string;
};

type Subscription = {
  id: number;
  usuario_id: number;
  usuario_nombre: string;
  usuario_correo: string;
  plan: Plan;
  estado: "activa" | "inactiva" | "cancelada" | "expirada";
  inicia_en: string;
  termina_en?: string | null;
};

type PaymentsResponse = {
  success: boolean;
  message: string;
  data?: {
    pagos?: Payment[];
    total?: number;
  };
};

type SubscriptionsResponse = {
  success: boolean;
  message: string;
  data?: {
    suscripciones?: Subscription[];
    total?: number;
  };
};

type PaymentsSummaryResponse = {
  success: boolean;
  message: string;
  data?: {
    resumen?: {
      ingresos_total: number;
      ingresos_este_mes: number;
      pagos_pendientes: number;
      pagos_fallidos: number;
      pagos_reembolsados: number;
      premium_activos: number;
      pro_activos: number;
    };
  };
};

type PaymentsSummary = {
  ingresos_total: number;
  ingresos_este_mes: number;
  pagos_pendientes: number;
  pagos_fallidos: number;
  pagos_reembolsados: number;
  premium_activos: number;
  pro_activos: number;
};

const EMPTY_SUMMARY: PaymentsSummary = {
  ingresos_total: 0,
  ingresos_este_mes: 0,
  pagos_pendientes: 0,
  pagos_fallidos: 0,
  pagos_reembolsados: 0,
  premium_activos: 0,
  pro_activos: 0,
};

function formatMoney(value: number | string, currency = "CLP") {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value?: string | null, withTime = false) {
  if (!value) return "â€”";

  const date = new Date(value.replace(" ", "T"));

  if (Number.isNaN(date.getTime())) return "â€”";

  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  });
}

function getInitials(name: string) {
  return name
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function normalizePlan(plan?: string): Plan {
  const normalized = String(plan ?? "").trim().toUpperCase();

  if (normalized === "PREMIUM") return "PREMIUM";

  if (normalized === "PRO") return "PRO";

  return "FREE";
}

function getPlanLabel(plan: Plan) {
  const labels: Record<Plan, string> = {
    FREE: "Free",
    PREMIUM: "Premium",
    PRO: "Pro",
  };

  return labels[plan];
}

function getPlanStyle(plan: Plan) {
  const styles: Record<Plan, string> = {
    FREE: "border-sky-400/20 bg-sky-500/10 text-sky-300",
    PREMIUM: "border-amber-400/20 bg-amber-500/10 text-amber-300",
    PRO: "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-300",
  };

  return styles[plan];
}

function getStatusStyle(status: PaymentStatus) {
  const styles: Record<PaymentStatus, string> = {
    pendiente: "border-amber-400/20 bg-amber-500/10 text-amber-300",
    pagado: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    fallido: "border-red-400/20 bg-red-500/10 text-red-300",
    reembolsado: "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-300",
  };

  return styles[status];
}

function getStatusLabel(status: PaymentStatus) {
  const labels: Record<PaymentStatus, string> = {
    pendiente: "Pendiente",
    pagado: "Pagado",
    fallido: "Fallido",
    reembolsado: "Reembolsado",
  };

  return labels[status];
}
export default function SubscriptionsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [summary, setSummary] = useState<PaymentsSummary>(EMPTY_SUMMARY);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentFilter>("todos");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [paymentToConfirm, setPaymentToConfirm] = useState<Payment | null>(
    null
  );

  const [renewSubscription, setRenewSubscription] =
    useState<Subscription | null>(null);

  const [renewAmount, setRenewAmount] = useState("4990");
  const [renewMonths, setRenewMonths] = useState("1");
  const [renewReference, setRenewReference] = useState("");
  const [renewProvider, setRenewProvider] = useState("manual");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [paymentsResult, subscriptionsResult, summaryResult] =
        await Promise.all([
          api.get<PaymentsResponse>("/superadmin/payments"),
          api.get<SubscriptionsResponse>("/superadmin/subscriptions"),
          api.get<PaymentsSummaryResponse>("/superadmin/payments/summary"),
        ]);

      if (!paymentsResult.data.success) {
        throw new Error(
          paymentsResult.data.message || "No se pudieron cargar los pagos."
        );
      }

      if (!subscriptionsResult.data.success) {
        throw new Error(
          subscriptionsResult.data.message ||
            "No se pudieron cargar las suscripciones."
        );
      }

      if (!summaryResult.data.success) {
        throw new Error(
          summaryResult.data.message ||
            "No se pudo cargar el resumen financiero."
        );
      }

      const apiPayments = paymentsResult.data.data?.pagos ?? [];
      const apiSubscriptions =
        subscriptionsResult.data.data?.suscripciones ?? [];

      setPayments(
        apiPayments.map((payment) => ({
          ...payment,
          plan: normalizePlan(payment.plan),
          estado: payment.estado.toLowerCase() as PaymentStatus,
        }))
      );

      setSubscriptions(
        apiSubscriptions.map((subscription) => ({
          ...subscription,
          plan: normalizePlan(subscription.plan),
        }))
      );

      setSummary(summaryResult.data.data?.resumen ?? EMPTY_SUMMARY);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los datos financieros."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredPayments = useMemo(() => {
    const text = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const matchesSearch =
        !text ||
        payment.usuario_nombre.toLowerCase().includes(text) ||
        payment.usuario_correo.toLowerCase().includes(text) ||
        String(payment.referencia_pago ?? "")
          .toLowerCase()
          .includes(text) ||
        payment.proveedor.toLowerCase().includes(text);

      const matchesStatus =
        statusFilter === "todos" || payment.estado === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [payments, search, statusFilter]);

  function openRenewModal(subscription: Subscription) {
  if (subscription.plan === "FREE") {
    setError(
      "Primero debes cambiar este usuario a Premium o Pro antes de registrar un pago."
    );
    return;
  }

  setError("");
  setSuccess("");

  setRenewSubscription(subscription);

  setRenewAmount(subscription.plan === "PRO" ? "9990" : "4990");
  setRenewMonths("1");
  setRenewReference("");
  setRenewProvider("manual");
}

async function confirmPayment() {
  if (!paymentToConfirm) return;

  setSaving(true);
  setError("");
  setSuccess("");

  try {
    const response = await api.post(
      `/superadmin/payments/${paymentToConfirm.id}/confirm`,
      {}
    );

    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "No se pudo confirmar el pago."
      );
    }

    setSuccess(
      `Pago de ${paymentToConfirm.usuario_nombre} confirmado correctamente.`
    );

    setPaymentToConfirm(null);
    await loadData();
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "No se pudo confirmar el pago."
    );
  } finally {
    setSaving(false);
  }
}

async function renewPaidSubscription() {
  if (!renewSubscription) return;

  if (
    renewSubscription.plan !== "PREMIUM" &&
    renewSubscription.plan !== "PRO"
  ) {
    setError("Solo se pueden renovar planes Premium o Pro.");
    return;
  }

  const amount = Number(renewAmount);
  const months = Number(renewMonths);

  if (!Number.isFinite(amount) || amount <= 0) {
    setError("El monto debe ser mayor a $0.");
    return;
  }

  if (!Number.isInteger(months) || months < 1 || months > 12) {
    setError("Selecciona entre 1 y 12 meses.");
    return;
  }

  setSaving(true);
  setError("");
  setSuccess("");

  try {
    const response = await api.post("/superadmin/subscriptions/renew", {
      usuario_id: renewSubscription.usuario_id,
      suscripcion_id: renewSubscription.id,
      plan: renewSubscription.plan,
      monto: amount,
      moneda: "CLP",
      meses: months,
      proveedor: renewProvider.trim() || "manual",
      referencia_pago: renewReference.trim() || null,
    });

    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "No se pudo renovar la suscripciÃ³n."
      );
    }

    setSuccess(
      `SuscripciÃ³n ${getPlanLabel(
        renewSubscription.plan
      )} renovada para ${renewSubscription.usuario_nombre}.`
    );

    setRenewSubscription(null);
    await loadData();
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "No se pudo renovar la suscripciÃ³n."
    );
  } finally {
    setSaving(false);
  }
}

  return (
    <section className="space-y-6 pb-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">
            MonetizaciÃ³n y control
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Pagos y suscripciones
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Gestiona cobros reales, pagos manuales, renovaciones VIP y el
            estado de las suscripciones de VibeNotas.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Actualizar datos
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          <p className="font-bold">OcurriÃ³ un problema</p>
          <p className="mt-1 text-red-200/80">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
          <p className="font-bold">OperaciÃ³n completada</p>
          <p className="mt-1 text-emerald-200/80">{success}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-emerald-400/15 bg-emerald-500/[0.07] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">
              Ingresos este mes
            </p>
            <CircleDollarSign size={19} className="text-emerald-300" />
          </div>

          <p className="mt-3 text-3xl font-bold text-emerald-200">
            {formatMoney(summary.ingresos_este_mes)}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Pagos confirmados del mes actual.
          </p>
        </article>

        <article className="rounded-3xl border border-violet-400/15 bg-violet-500/[0.07] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">
              Ingresos histÃ³ricos
            </p>
            <CreditCard size={19} className="text-violet-300" />
          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            {formatMoney(summary.ingresos_total)}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Solo pagos reales marcados como pagados.
          </p>
        </article>

        <article className="rounded-3xl border border-amber-400/15 bg-amber-500/[0.07] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">
              Pagos pendientes
            </p>
            <Clock3 size={19} className="text-amber-300" />
          </div>

          <p className="mt-3 text-3xl font-bold text-amber-200">
            {summary.pagos_pendientes}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Requieren confirmaciÃ³n o revisiÃ³n.
          </p>
        </article>

        <article className="rounded-3xl border border-fuchsia-400/15 bg-fuchsia-500/[0.07] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">
              Premium activos
            </p>
            <Crown size={19} className="text-fuchsia-300" />
          </div>

          <p className="mt-3 text-3xl font-bold text-fuchsia-200">
            {summary.premium_activos}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Suscripciones Premium actualmente activas.
          </p>
        </article>
      </div>

      <article className="rounded-3xl border border-sky-400/15 bg-sky-500/[0.07] p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-400">
            Pro activos
          </p>

          <Crown size={19} className="text-sky-300" />
        </div>

        <p className="mt-3 text-3xl font-bold text-sky-200">
          {summary.pro_activos}
        </p>

        <p className="mt-2 text-xs text-slate-500">
          Suscripciones Pro con pago confirmado.
        </p>
      </article>

      <div className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-4 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
            <Search size={19} className="shrink-0 text-slate-500" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por usuario, correo, proveedor o referencia..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="rounded-lg p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
                aria-label="Limpiar bÃºsqueda"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {(
              [
                ["todos", "Todos"],
                ["pendiente", "Pendientes"],
                ["pagado", "Pagados"],
                ["fallido", "Fallidos"],
                ["reembolsado", "Reembolsados"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  statusFilter === key
                    ? "bg-violet-500 text-white"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#1E293B]/80 shadow-xl shadow-black/10">
          <div className="flex flex-col justify-between gap-3 border-b border-white/10 px-6 py-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-violet-300">
                Historial financiero
              </p>

              <h2 className="mt-1 text-xl font-bold text-white">
                Pagos registrados
              </h2>
            </div>

            <p className="text-sm text-slate-500">
              Mostrando {filteredPayments.length} de {payments.length} pagos.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="bg-black/10 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Usuario</th>
                  <th className="px-6 py-4 font-semibold">Plan</th>
                  <th className="px-6 py-4 font-semibold">Monto</th>
                  <th className="px-6 py-4 font-semibold">Proveedor</th>
                  <th className="px-6 py-4 font-semibold">Referencia</th>
                  <th className="px-6 py-4 font-semibold">Fecha</th>
                  <th className="px-6 py-4 font-semibold">Estado</th>
                  <th className="px-6 py-4 text-right font-semibold">
                    AcciÃ³n
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.map((payment) => {
                  const isPaidPlan =
                    payment.plan === "PREMIUM" || payment.plan === "PRO";

                  return (
                    <tr
                      key={payment.id}
                      className="border-t border-white/5 text-sm transition hover:bg-white/[0.035]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-sm font-bold text-white">
                            {getInitials(payment.usuario_nombre || "Usuario")}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">
                              {payment.usuario_nombre}
                            </p>

                            <p className="truncate text-xs text-slate-500">
                              {payment.usuario_correo}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getPlanStyle(
                            payment.plan
                          )}`}
                        >
                          {isPaidPlan && <Crown size={13} className="mr-1" />}
                          {getPlanLabel(payment.plan)}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-semibold text-white">
                        {formatMoney(payment.monto, payment.moneda)}
                      </td>

                      <td className="px-6 py-4 text-slate-300">
                        {payment.proveedor || "Manual"}
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {payment.referencia_pago || "â€”"}
                      </td>

                      <td className="px-6 py-4 text-slate-400">
                        {formatDate(payment.pagado_en || payment.creado_en, true)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            payment.estado
                          )}`}
                        >
                          {payment.estado === "pagado" ? (
                            <CheckCircle2 size={13} className="mr-1" />
                          ) : payment.estado === "fallido" ? (
                            <XCircle size={13} className="mr-1" />
                          ) : (
                            <Clock3 size={13} className="mr-1" />
                          )}

                          {getStatusLabel(payment.estado)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {payment.estado === "pendiente" ? (
                          <button
                            type="button"
                            onClick={() => setPaymentToConfirm(payment)}
                            className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20"
                          >
                            Confirmar pago
                          </button>
                        ) : (
                          <span className="text-xs text-slate-600">Sin acciÃ³n</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredPayments.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-16 text-center text-slate-500"
                    >
                      <CreditCard size={30} className="mx-auto mb-3" />
                      No hay pagos que coincidan con los filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#1E293B]/80 shadow-xl shadow-black/10">
        <div className="flex flex-col justify-between gap-3 border-b border-white/10 px-6 py-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-violet-300">
              Suscripciones activas
            </p>

            <h2 className="mt-1 text-xl font-bold text-white">
              RenovaciÃ³n de planes Premium y Pro
            </h2>
          </div>

          <p className="text-sm text-slate-500">
            Registra pagos reales y extiende las suscripciones pagadas.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-black/10 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Usuario</th>
                <th className="px-6 py-4 font-semibold">Plan</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                <th className="px-6 py-4 font-semibold">Vencimiento</th>
                <th className="px-6 py-4 text-right font-semibold">AcciÃ³n</th>
              </tr>
            </thead>

            <tbody>
              {subscriptions.map((subscription) => {
                const isPaidPlan =
                  subscription.plan === "PREMIUM" ||
                  subscription.plan === "PRO";

                const isActive = subscription.estado === "activa";

                return (
                  <tr
                    key={subscription.id}
                    className="border-t border-white/5 text-sm transition hover:bg-white/[0.035]"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-sm font-bold text-white">
                          {getInitials(subscription.usuario_nombre || "Usuario")}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">
                            {subscription.usuario_nombre}
                          </p>

                          <p className="truncate text-xs text-slate-500">
                            {subscription.usuario_correo}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getPlanStyle(
                          subscription.plan
                        )}`}
                      >
                        {isPaidPlan && <Crown size={13} className="mr-1" />}
                        {getPlanLabel(subscription.plan)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          isActive
                            ? "bg-emerald-500/10 text-emerald-300"
                            : subscription.estado === "cancelada" ||
                              subscription.estado === "expirada"
                            ? "bg-red-500/10 text-red-300"
                            : "bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        {subscription.estado}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-400">
                      {subscription.plan === "FREE"
                        ? "Sin vencimiento"
                        : formatDate(subscription.termina_en)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {isPaidPlan ? (
                        <button
                          type="button"
                          onClick={() => openRenewModal(subscription)}
                          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                            subscription.plan === "PRO"
                              ? "bg-fuchsia-500/10 text-fuchsia-300 hover:bg-fuchsia-500/20"
                              : "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                          }`}
                        >
                          <Crown size={15} />
                          Renovar {getPlanLabel(subscription.plan)}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-600">
                          Plan gratuito
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

            {subscriptions.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-14 text-center text-slate-500"
                >
                  No hay suscripciones disponibles.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

      {paymentToConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setPaymentToConfirm(null)}
            aria-label="Cerrar confirmaciÃ³n"
          />

          <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl shadow-black/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-300">
                  Confirmar pago manual
                </p>

                <h2 className="mt-1 text-xl font-bold text-white">
                  {paymentToConfirm.usuario_nombre}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {formatMoney(
                    paymentToConfirm.monto,
                    paymentToConfirm.moneda
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPaymentToConfirm(null)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
              Al confirmar, este pago contarÃ¡ como ingreso real y quedarÃ¡
              registrado con la fecha actual.
            </div>

            <button
              type="button"
              onClick={confirmPayment}
              disabled={saving}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <BadgeCheck size={18} />
              {saving ? "Confirmando..." : "Confirmar pago"}
            </button>
          </div>
        </div>
      )}

      {paymentToConfirm && (
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
    <button
      type="button"
      className="absolute inset-0"
      onClick={() => setPaymentToConfirm(null)}
      aria-label="Cerrar confirmaciÃ³n"
    />

    <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl shadow-black/60">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-300">
            Confirmar pago manual
          </p>

          <h2 className="mt-1 text-xl font-bold text-white">
            {paymentToConfirm.usuario_nombre}
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            {getPlanLabel(paymentToConfirm.plan)} Â·{" "}
            {formatMoney(
              paymentToConfirm.monto,
              paymentToConfirm.moneda
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPaymentToConfirm(null)}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
        Al confirmar, este pago contarÃ¡ como ingreso real y quedarÃ¡ registrado
        con la fecha actual.
      </div>

      <button
        type="button"
        onClick={confirmPayment}
        disabled={saving}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <BadgeCheck size={18} />
        {saving ? "Confirmando..." : "Confirmar pago"}
      </button>
    </div>
  </div>
)}

{renewSubscription && (
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
    <button
      type="button"
      className="absolute inset-0"
      onClick={() => setRenewSubscription(null)}
      aria-label="Cerrar renovaciÃ³n"
    />

    <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl shadow-black/60">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`text-sm font-semibold ${
              renewSubscription.plan === "PRO"
                ? "text-fuchsia-300"
                : "text-amber-300"
            }`}
          >
            RenovaciÃ³n {getPlanLabel(renewSubscription.plan)}
          </p>

          <h2 className="mt-1 text-xl font-bold text-white">
            {renewSubscription.usuario_nombre}
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            {renewSubscription.usuario_correo}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRenewSubscription(null)}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>
      </div>

      <div
        className={`mt-6 rounded-2xl border p-4 ${
          renewSubscription.plan === "PRO"
            ? "border-fuchsia-400/20 bg-fuchsia-500/10"
            : "border-amber-400/20 bg-amber-500/10"
        }`}
      >
        <div className="flex items-center gap-3">
          <Crown
            size={20}
            className={
              renewSubscription.plan === "PRO"
                ? "text-fuchsia-300"
                : "text-amber-300"
            }
          />

          <div>
            <p className="font-bold text-white">
              Plan {getPlanLabel(renewSubscription.plan)}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              El pago quedarÃ¡ asociado a este plan.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-300">
          Monto cobrado
          <input
            type="number"
            min="1"
            value={renewAmount}
            onChange={(event) => setRenewAmount(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400/60"
          />
        </label>

        <label className="text-sm font-semibold text-slate-300">
          DuraciÃ³n
          <select
            value={renewMonths}
            onChange={(event) => setRenewMonths(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400/60"
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map(
              (month) => (
                <option key={month} value={month}>
                  {month} {month === 1 ? "mes" : "meses"}
                </option>
              )
            )}
          </select>
        </label>
      </div>

      <label className="mt-4 block text-sm font-semibold text-slate-300">
        Proveedor de pago
        <input
          value={renewProvider}
          onChange={(event) => setRenewProvider(event.target.value)}
          placeholder="Ejemplo: transferencia, Mercado Pago o manual"
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400/60"
        />
      </label>

      <label className="mt-4 block text-sm font-semibold text-slate-300">
        Referencia del pago
        <input
          value={renewReference}
          onChange={(event) => setRenewReference(event.target.value)}
          placeholder="Opcional: nÃºmero de operaciÃ³n o comprobante"
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400/60"
        />
      </label>

      <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
        Se registrarÃ¡ un pago real confirmado y se extenderÃ¡ la suscripciÃ³n{" "}
        <strong>{getPlanLabel(renewSubscription.plan)}</strong> del usuario.
      </div>

      <button
        type="button"
        onClick={renewPaidSubscription}
        disabled={saving}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Crown size={18} />
        {saving
          ? "Registrando renovaciÃ³n..."
          : `Registrar pago y renovar ${getPlanLabel(
              renewSubscription.plan
            )}`}
      </button>
    </div>
  </div>
)}
    </section>
  );
}


