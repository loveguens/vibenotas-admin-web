import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  Megaphone,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";

  import api from "../services/api";
  import axios from "axios";

type CampaignStatus = "borrador" | "programada" | "enviada" | "cancelada";

type Campaign = {
  id: number;
  creador_id: number;
  creador_nombre: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  audiencia: string;
  usuario_destino_id: number | null;
  estado: CampaignStatus;
  programada_para: string | null;
  enviada_en: string | null;
  total_destinatarios: number;
  total_leidas: number;
  creado_en: string;
  actualizado_en: string;
};

type NotificationsResponse = {
  success: boolean;
  message: string;
  data?: {
    total: number;
    campanas: Campaign[];
  };
};

type AudienceSummary = {
  todos: number;
  free: number;
  vip: number;
  admins: number;
};

type AudienceSummaryResponse = {
  success: boolean;
  message: string;
  data?: AudienceSummary;
};

type CampaignForm = {
  titulo: string;
  mensaje: string;
  tipo: string;
  audiencia: string;
  usuario_destino_id: string;
  estado: "borrador" | "programada";
  programada_para: string;
};

const initialForm: CampaignForm = {
  titulo: "",
  mensaje: "",
  tipo: "informacion",
  audiencia: "todos",
  usuario_destino_id: "",
  estado: "borrador",
  programada_para: "",
};

function formatDate(date?: string | null) {
  if (!date) return "—";

  return new Date(date.replace(" ", "T")).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getStatusStyle(status: CampaignStatus) {
  if (status === "enviada") {
    return "bg-emerald-500/10 text-emerald-300 border-emerald-400/20";
  }

  if (status === "programada") {
    return "bg-sky-500/10 text-sky-300 border-sky-400/20";
  }

  if (status === "cancelada") {
    return "bg-red-500/10 text-red-300 border-red-400/20";
  }

  return "bg-amber-500/10 text-amber-300 border-amber-400/20";
}

function getTypeStyle(type: string) {
  if (type === "seguridad") {
    return "bg-red-500/10 text-red-300";
  }

  if (type === "mantenimiento") {
    return "bg-amber-500/10 text-amber-300";
  }

  if (type === "promocion") {
    return "bg-fuchsia-500/10 text-fuchsia-300";
  }

  return "bg-violet-500/10 text-violet-300";
}

function getAudienceLabel(audience: string) {
  const labels: Record<string, string> = {
    todos: "Todos los usuarios",
    free: "Usuarios Free",
    vip: "Usuarios VIP",
    admins: "Administradores",
    usuario_especifico: "Usuario específico",
  };

  return labels[audience] || audience;
}

export default function NotificationsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CampaignForm>(initialForm);
  
  const [audienceSummary, setAudienceSummary] = useState<AudienceSummary>({
  todos: 0,
  free: 0,
  vip: 0,
  admins: 0,
});

async function loadAudienceSummary() {
  try {
    const response = await api.get<AudienceSummaryResponse>(
      "/superadmin/notifications/summary"
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          "No se pudo cargar el resumen de destinatarios."
      );
    }

    setAudienceSummary(
      response.data.data ?? {
        todos: 0,
        free: 0,
        vip: 0,
        admins: 0,
      }
    );
  } catch {
    setAudienceSummary({
      todos: 0,
      free: 0,
      vip: 0,
      admins: 0,
    });
  }
}

  async function loadCampaigns() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<NotificationsResponse>(
        "/superadmin/notifications"
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "No se pudieron cargar las campañas."
        );
      }

      setCampaigns(response.data.data?.campanas ?? []);
      await loadAudienceSummary();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las campañas."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCampaigns();
    void loadAudienceSummary();
  }, []);

  const stats = useMemo(() => {
  return {
    total: campaigns.length,
    sent: campaigns.filter((item) => item.estado === "enviada").length,
    drafts: campaigns.filter((item) => item.estado === "borrador").length,
    scheduled: campaigns.filter((item) => item.estado === "programada").length,
    availableRecipients: audienceSummary.todos,
  };
}, [audienceSummary.todos, campaigns]);

  function openCreateModal() {
    setForm(initialForm);
    setModalOpen(true);
  }

  async function createCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.titulo.trim() || !form.mensaje.trim()) {
      setError("Escribe un título y un mensaje.");
      return;
    }

    if (form.estado === "programada" && !form.programada_para) {
      setError("Selecciona una fecha y hora para programar el envío.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
  const response = await api.post("/superadmin/notifications", {
  titulo: form.titulo.trim(),
  mensaje: form.mensaje.trim(),
  tipo: form.tipo,
  audiencia: form.audiencia,
  estado: form.estado,

  usuario_destino_id:
    form.audiencia === "usuario_especifico" && form.usuario_destino_id
      ? Number(form.usuario_destino_id)
      : null,

  programada_para:
    form.estado === "programada" && form.programada_para
      ? form.programada_para.replace("T", " ") + ":00"
      : null,
});

  if (!response.data?.success) {
    throw new Error(
      response.data?.message || "No se pudo crear la campaña."
    );
  }

  setSuccess("Campaña creada correctamente.");
  setModalOpen(false);
  await loadCampaigns();
} catch (error) {
  console.error("ERROR COMPLETO CREAR CAMPAÑA:", error);

  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    console.error("STATUS:", error.response?.status);
    console.error("RESPUESTA DEL BACKEND:", data);

    const detalle =
      data?.errors?.detail ||
      data?.error?.detail ||
      data?.detail ||
      data?.message ||
      "No se pudo crear la campaña de notificación";

    setError(detalle);
  } else {
    setError("Ocurrió un error inesperado.");
  }
}
  }

  async function sendCampaign(campaign: Campaign) {
    const confirmed = window.confirm(
      `¿Enviar "${campaign.titulo}" a ${getAudienceLabel(campaign.audiencia)}?`
    );

    if (!confirmed) return;

    setSendingId(campaign.id);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(
        `/superadmin/notifications/${campaign.id}/send`
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "No se pudo enviar la campaña."
        );
      }

      setSuccess(
        `Notificación enviada a ${
          response.data.data?.total_destinatarios ?? 0
        } destinatarios.`
      );

      await loadCampaigns();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo enviar la campaña."
      );
    } finally {
      setSendingId(null);
    }
  }

  async function deleteCampaign(campaign: Campaign) {
    const confirmed = window.confirm(
      `¿Eliminar el borrador "${campaign.titulo}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await api.delete(
        `/superadmin/notifications/${campaign.id}`
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "No se pudo eliminar la campaña."
        );
      }

      setSuccess("Campaña eliminada correctamente.");
      await loadCampaigns();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo eliminar la campaña."
      );
    }
  }

  return (
    <section role="superadmin">
      <section className="space-y-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">
              Comunicación global
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Notificaciones globales
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Crea borradores, programa avisos y envía información a los
              usuarios de VibeNotas.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadCampaigns}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20"
            >
              <RefreshCw size={18} />
              Actualizar
            </button>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:brightness-110"
            >
              <Plus size={18} />
              Nueva campaña
            </button>
          </div>
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="relative overflow-hidden rounded-3xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.16] via-[#1E293B]/90 to-[#1E293B]/90 p-5 shadow-xl shadow-black/20">
            <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-violet-400/10 blur-2xl" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-400">
                  Campañas totales
                </p>

                <div className="rounded-2xl bg-violet-500/15 p-2.5 text-violet-300">
                  <Megaphone size={18} />
                </div>
              </div>

              <p className="mt-5 text-3xl font-bold tracking-tight text-white">
                {stats.total}
              </p>

              <p className="mt-2 text-xs text-violet-200/70">
                Comunicaciones creadas
              </p>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-3xl border border-emerald-400/15 bg-gradient-to-br from-emerald-500/[0.13] via-[#1E293B]/90 to-[#1E293B]/90 p-5 shadow-xl shadow-black/20">
            <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-emerald-400/10 blur-2xl" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-400">Enviadas</p>

                <div className="rounded-2xl bg-emerald-500/15 p-2.5 text-emerald-300">
                  <CheckCircle2 size={18} />
                </div>
              </div>

              <p className="mt-5 text-3xl font-bold tracking-tight text-white">
                {stats.sent}
              </p>

              <p className="mt-2 text-xs text-emerald-200/70">
                Campañas completadas
              </p>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-3xl border border-amber-400/15 bg-gradient-to-br from-amber-500/[0.13] via-[#1E293B]/90 to-[#1E293B]/90 p-5 shadow-xl shadow-black/20">
            <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-amber-400/10 blur-2xl" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-400">Borradores</p>

                <div className="rounded-2xl bg-amber-500/15 p-2.5 text-amber-300">
                  <CalendarClock size={18} />
                </div>
              </div>

              <p className="mt-5 text-3xl font-bold tracking-tight text-white">
                {stats.drafts}
              </p>

              <p className="mt-2 text-xs text-amber-200/70">
                Pendientes de revisión
              </p>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-3xl border border-sky-400/15 bg-gradient-to-br from-sky-500/[0.13] via-[#1E293B]/90 to-[#1E293B]/90 p-5 shadow-xl shadow-black/20">
            <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-sky-400/10 blur-2xl" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-400">
                  Usuarios disponibles
                </p>

                <div className="rounded-2xl bg-sky-500/15 p-2.5 text-sky-300">
                  <Users size={18} />
                </div>
              </div>

              <p className="mt-5 text-3xl font-bold tracking-tight text-white">
                {stats.availableRecipients}
              </p>

              <p className="mt-2 text-xs text-sky-200/70">
                Cuentas activas actuales
              </p>
            </div>
          </article>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-3xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#1E293B]/80 shadow-xl shadow-black/10">
            <div className="border-b border-white/10 px-6 py-5">
              <p className="text-sm font-semibold text-violet-300">
                Historial de campañas
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">
                Avisos creados desde el panel
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-black/10 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Campaña</th>
                    <th className="px-6 py-4 font-semibold">Tipo</th>
                    <th className="px-6 py-4 font-semibold">Audiencia</th>
                    <th className="px-6 py-4 font-semibold">Estado</th>
                    <th className="px-6 py-4 font-semibold">Alcance</th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {campaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="border-t border-white/5 text-sm transition hover:bg-white/[0.035]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-2xl bg-violet-500/10 p-3 text-violet-300">
                            <BellRing size={18} />
                          </div>

                          <div className="max-w-md">
                            <p className="font-semibold text-white">
                              {campaign.titulo}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                              {campaign.mensaje}
                            </p>
                            <p className="mt-2 text-[11px] text-slate-600">
                              Creada por {campaign.creador_nombre} ·{" "}
                              {formatDate(campaign.creado_en)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getTypeStyle(
                            campaign.tipo
                          )}`}
                        >
                          {campaign.tipo}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-300">
                        {getAudienceLabel(campaign.audiencia)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            campaign.estado
                          )}`}
                        >
                          {campaign.estado}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-semibold text-white">
                          {campaign.total_destinatarios} enviados
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {campaign.total_leidas} leídas
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {campaign.estado !== "enviada" && (
                            <button
                              onClick={() => sendCampaign(campaign)}
                              disabled={sendingId === campaign.id}
                              className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-400 disabled:opacity-50"
                            >
                              <Send size={15} />
                              {sendingId === campaign.id
                                ? "Enviando..."
                                : "Enviar"}
                            </button>
                          )}

                          {campaign.estado !== "enviada" && (
                            <button
                              onClick={() => deleteCampaign(campaign)}
                              className="rounded-xl p-2 text-red-300 transition hover:bg-red-500/10"
                              title="Eliminar borrador"
                            >
                              <Trash2 size={17} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {campaigns.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-16 text-center text-slate-500"
                      >
                        No hay campañas creadas todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {modalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl shadow-black/50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-violet-300">
                    Comunicación de plataforma
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white">
                    Nueva campaña
                  </h2>
                </div>

                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={createCampaign} className="mt-6 space-y-4">
                <input
                  value={form.titulo}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      titulo: event.target.value,
                    }))
                  }
                  placeholder="Título de la notificación"
                  maxLength={160}
                  className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
                  required
                />

                <textarea
                  value={form.mensaje}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      mensaje: event.target.value,
                    }))
                  }
                  placeholder="Escribe el mensaje para los destinatarios..."
                  rows={5}
                  className="w-full resize-none rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
                  required
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <select
                    value={form.tipo}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        tipo: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="informacion">Información</option>
                    <option value="actualizacion">Actualización</option>
                    <option value="promocion">Promoción</option>
                    <option value="advertencia">Advertencia</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="seguridad">Seguridad</option>
                  </select>

                  <select
                    value={form.audiencia}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        audiencia: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="todos">Todos</option>
                    <option value="admins">Administradores</option>
                    <option value="free">Usuarios Free</option>
                    <option value="vip">Usuarios VIP</option>
                  </select>

                  <select
                    value={form.estado}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        estado: event.target.value as
                          | "borrador"
                          | "programada",
                      }))
                    }
                    className="rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="borrador">Guardar borrador</option>
                    <option value="programada">Programar envío</option>
                  </select>
                </div>

                <div className="rounded-2xl border border-violet-400/15 bg-violet-500/[0.08] px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-300">
                    Alcance estimado
                  </p>

                  <p className="mt-1 text-sm text-slate-300">
                    Esta campaña llegará aproximadamente a{" "}
                    <span className="font-bold text-white">
                      {form.audiencia === "todos"
                        ? audienceSummary.todos
                        : form.audiencia === "free"
                        ? audienceSummary.free
                        : form.audiencia === "vip"
                        ? audienceSummary.vip
                        : form.audiencia === "admins"
                        ? audienceSummary.admins
                        : 1}
                    </span>{" "}
                    destinatario(s) activos.
                  </p>
                </div>

                {form.estado === "programada" && (
                  <input
                    type="datetime-local"
                    value={form.programada_para}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        programada_para: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none"
                    required
                  />
                )}

                {(form.audiencia === "free" || form.audiencia === "vip") && (
                  <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                    Free y VIP quedarán guardados como campaña, pero el envío
                    se habilitará cuando conectemos tu tabla real de planes.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Crear campaña"}
                </button>
              </form>
            </div>
          </div>
        )}
      </section>
    </section>
  );
}