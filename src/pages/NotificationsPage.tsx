import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Filter,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

import api from "../services/api";

type CampaignStatus = "borrador" | "programada" | "enviada" | "cancelada";
type CampaignAudience = "todos" | "admins";
type CampaignPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
type EditableCampaignStatus = "borrador" | "programada";
type CampaignStatusFilter = "todas" | CampaignStatus;

type Campaign = {
  id: string;
  creador_id: string;
  creador_nombre: string | null;
  titulo: string;
  mensaje: string;
  tipo: string;
  prioridad: CampaignPriority;
  audiencia: CampaignAudience;
  estado: CampaignStatus;
  programada_para: string | null;
  enviada_en: string | null;
  cancelada_en?: string | null;
  total_destinatarios: number;
  total_leidas: number;
  creado_en: string;
  actualizado_en: string;
};

type CampaignListResponse = {
  success: boolean;
  message: string;
  data?: {
    total: number;
    campanas: Campaign[];
  };
};

type AudienceSummary = {
  todos: number;
  admins: number;
};

type AudienceSummaryResponse = {
  success: boolean;
  message: string;
  data?: AudienceSummary;
};

type CampaignMutationResponse = {
  success: boolean;
  message: string;
  data?: {
    campana?: {
      id: string;
      titulo?: string;
      mensaje?: string;
      tipo?: string;
      prioridad?: CampaignPriority;
      audiencia?: CampaignAudience;
      estado?: CampaignStatus;
      programada_para?: string | null;
      total_destinatarios?: number;
      enviada_en?: string | null;
      ya_enviada?: boolean;
    };
  };
};

type CampaignForm = {
  titulo: string;
  mensaje: string;
  tipo: string;
  audiencia: CampaignAudience;
  prioridad: CampaignPriority;
  estado: EditableCampaignStatus;
  programada_para: string;
};

const initialForm: CampaignForm = {
  titulo: "",
  mensaje: "",
  tipo: "informacion",
  audiencia: "todos",
  prioridad: "NORMAL",
  estado: "borrador",
  programada_para: "",
};

function formatDate(date?: string | null) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function toDateTimeLocal(date?: string | null) {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const pad = (value: number) => String(value).padStart(2, "0");

  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(
    parsed.getDate()
  )}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

function toApiScheduledDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("La fecha programada no es válida.");
  }

  return parsed.toISOString();
}

function getStatusStyle(status: CampaignStatus) {
  if (status === "enviada") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (status === "programada") {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300";
  }

  if (status === "cancelada") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-300";
  }

  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300";
}

function getTypeStyle(type: string) {
  if (type === "seguridad") {
    return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300";
  }

  if (type === "mantenimiento") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";
  }

  if (type === "promocion") {
    return "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300";
  }

  return "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300";
}

function getAudienceLabel(audience: CampaignAudience) {
  return audience === "todos" ? "Todos los usuarios" : "Administradores";
}

function getStatusLabel(status: CampaignStatus) {
  const labels: Record<CampaignStatus, string> = {
    borrador: "Borrador",
    programada: "Programada",
    enviada: "Enviada",
    cancelada: "Cancelada",
  };

  return labels[status];
}

function getPriorityLabel(priority: CampaignPriority) {
  const labels: Record<CampaignPriority, string> = {
    LOW: "Baja",
    NORMAL: "Normal",
    HIGH: "Alta",
    URGENT: "Urgente",
  };

  return labels[priority];
}

function getPriorityStyle(priority: CampaignPriority) {
  if (priority === "URGENT") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-300";
  }

  if (priority === "HIGH") {
    return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-400/20 dark:bg-orange-500/10 dark:text-orange-300";
  }

  if (priority === "LOW") {
    return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-400/20 dark:bg-slate-500/10 dark:text-slate-300";
  }

  return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300";
}

function getLocalDateTimeValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const responseData = error.response?.data as
    | {
        message?: string | string[];
        detail?: string;
        errors?: { detail?: string };
        error?: { detail?: string };
      }
    | undefined;

  if (Array.isArray(responseData?.message)) {
    return responseData.message.join(" ");
  }

  return (
    responseData?.errors?.detail ??
    responseData?.error?.detail ??
    responseData?.detail ??
    responseData?.message ??
    fallback
  );
}

export default function NotificationsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [form, setForm] = useState<CampaignForm>(initialForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<CampaignStatusFilter>("todas");
  const [audienceSummary, setAudienceSummary] = useState<AudienceSummary>({
    todos: 0,
    admins: 0,
  });

  async function loadAudienceSummary() {
    const response = await api.get<AudienceSummaryResponse>(
      "/superadmin/notifications/summary"
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || "No se pudo cargar el resumen de destinatarios."
      );
    }

    setAudienceSummary(
      response.data.data ?? {
        todos: 0,
        admins: 0,
      }
    );
  }

  async function loadCampaigns() {
    setLoading(true);
    setError("");

    try {
      const [campaignResponse] = await Promise.all([
        api.get<CampaignListResponse>("/superadmin/notifications"),
        loadAudienceSummary(),
      ]);

      if (!campaignResponse.data.success) {
        throw new Error(
          campaignResponse.data.message || "No se pudieron cargar las campañas."
        );
      }

      setCampaigns(campaignResponse.data.data?.campanas ?? []);
    } catch (loadError) {
      setError(
        getApiErrorMessage(loadError, "No se pudieron cargar las campañas.")
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCampaigns();
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

  const filteredCampaigns = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return campaigns.filter((campaign) => {
      const matchesStatus =
        statusFilter === "todas" || campaign.estado === statusFilter;

      const matchesSearch =
        query.length === 0 ||
        campaign.titulo.toLowerCase().includes(query) ||
        campaign.mensaje.toLowerCase().includes(query) ||
        campaign.tipo.toLowerCase().includes(query) ||
        getAudienceLabel(campaign.audiencia).toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [campaigns, searchTerm, statusFilter]);

  const nextScheduledCampaign = useMemo(() => {
    const now = Date.now();

    return [...campaigns]
      .filter((campaign) => {
        if (campaign.estado !== "programada" || !campaign.programada_para) {
          return false;
        }

        const scheduledAt = new Date(campaign.programada_para).getTime();

        return Number.isFinite(scheduledAt) && scheduledAt > now;
      })
      .sort(
        (left, right) =>
          new Date(left.programada_para as string).getTime() -
          new Date(right.programada_para as string).getTime()
      )[0];
  }, [campaigns]);

  const audiencePreview =
    form.audiencia === "todos"
      ? audienceSummary.todos
      : audienceSummary.admins;

  const scheduledPreview =
    form.estado === "programada" && form.programada_para
      ? formatDate(toApiScheduledDate(form.programada_para))
      : null;

  const minimumScheduleDate = getLocalDateTimeValue(
    new Date(Date.now() + 5 * 60 * 1000)
  );

  function setQuickSchedule(minutesFromNow: number) {
    const target = new Date(Date.now() + minutesFromNow * 60 * 1000);

    setForm((current) => ({
      ...current,
      estado: "programada",
      programada_para: getLocalDateTimeValue(target),
    }));
  }

  function setTomorrowMorning() {
    const target = new Date();
    target.setDate(target.getDate() + 1);
    target.setHours(9, 0, 0, 0);

    setForm((current) => ({
      ...current,
      estado: "programada",
      programada_para: getLocalDateTimeValue(target),
    }));
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingCampaign(null);
    setForm(initialForm);
  }

  function openCreateModal() {
    setError("");
    setSuccess("");
    setEditingCampaign(null);
    setForm(initialForm);
    setModalOpen(true);
  }

  function openEditModal(campaign: Campaign) {
    if (campaign.estado !== "borrador" && campaign.estado !== "programada") {
      setError("Solo se pueden editar campañas en borrador o programadas.");
      return;
    }

    setError("");
    setSuccess("");
    setEditingCampaign(campaign);
    setForm({
      titulo: campaign.titulo,
      mensaje: campaign.mensaje,
      tipo: campaign.tipo,
      audiencia: campaign.audiencia,
      prioridad: campaign.prioridad,
      estado: campaign.estado,
      programada_para: toDateTimeLocal(campaign.programada_para),
    });
    setModalOpen(true);
  }

  async function saveCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.titulo.trim() || !form.mensaje.trim()) {
      setError("Escribe un título y un mensaje.");
      return;
    }

    if (form.estado === "programada" && !form.programada_para) {
      setError("Selecciona una fecha y hora para guardar la programación.");
      return;
    }

    if (form.estado === "programada") {
      const scheduledAt = new Date(form.programada_para).getTime();

      if (!Number.isFinite(scheduledAt)) {
        setError("La fecha y hora programadas no son válidas.");
        return;
      }

      if (scheduledAt <= Date.now() + 60_000) {
        setError("Programa el envío para una hora futura.");
        return;
      }
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload: {
        titulo: string;
        mensaje: string;
        tipo: string;
        audiencia: CampaignAudience;
        prioridad: CampaignPriority;
        estado: EditableCampaignStatus;
        programada_para?: string;
      } = {
        titulo: form.titulo.trim(),
        mensaje: form.mensaje.trim(),
        tipo: form.tipo,
        audiencia: form.audiencia,
        prioridad: form.prioridad,
        estado: form.estado,
      };

      if (form.estado === "programada") {
        payload.programada_para = toApiScheduledDate(form.programada_para);
      }

      const response = editingCampaign
        ? await api.patch<CampaignMutationResponse>(
            `/superadmin/notifications/${editingCampaign.id}`,
            payload
          )
        : await api.post<CampaignMutationResponse>(
            "/superadmin/notifications",
            payload
          );

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            (editingCampaign
              ? "No se pudo actualizar la campaña."
              : "No se pudo crear la campaña.")
        );
      }

      setSuccess(
        form.estado === "programada"
          ? editingCampaign
            ? "Programación actualizada correctamente."
            : "Campaña programada correctamente."
          : editingCampaign
            ? "Campaña actualizada correctamente."
            : "Borrador creado correctamente."
      );
      setModalOpen(false);
      setEditingCampaign(null);
      setForm(initialForm);
      await loadCampaigns();
    } catch (saveError) {
      setError(
        getApiErrorMessage(
          saveError,
          editingCampaign
            ? "No se pudo actualizar la campaña."
            : "No se pudo crear la campaña."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function sendCampaign(campaign: Campaign) {
    if (campaign.estado !== "borrador" && campaign.estado !== "programada") {
      setError("Esta campaña ya no está disponible para envío.");
      return;
    }

    const confirmed = window.confirm(
      `¿Enviar "${campaign.titulo}" a ${getAudienceLabel(campaign.audiencia)}?`
    );

    if (!confirmed) return;

    setSendingId(campaign.id);
    setError("");
    setSuccess("");

    try {
      const response = await api.post<CampaignMutationResponse>(
        `/superadmin/notifications/${campaign.id}/send`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "No se pudo enviar la campaña.");
      }

      const sentCampaign = response.data.data?.campana;
      const recipients = sentCampaign?.total_destinatarios ?? 0;

      setSuccess(
        sentCampaign?.ya_enviada
          ? `La campaña ya había sido enviada. Conserva ${recipients} destinatario(s).`
          : `Campaña enviada a ${recipients} destinatario(s).`
      );

      await loadCampaigns();
    } catch (sendError) {
      setError(getApiErrorMessage(sendError, "No se pudo enviar la campaña."));
    } finally {
      setSendingId(null);
    }
  }

  async function deleteCampaign(campaign: Campaign) {
    if (campaign.estado === "enviada") {
      setError("Una campaña enviada no se puede eliminar.");
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar la campaña "${campaign.titulo}"? Esta acción la retirará del historial activo.`
    );

    if (!confirmed) return;

    setDeletingId(campaign.id);
    setError("");
    setSuccess("");

    try {
      const response = await api.delete<CampaignMutationResponse>(
        `/superadmin/notifications/${campaign.id}`
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "No se pudo eliminar la campaña."
        );
      }

      setSuccess("Campaña eliminada correctamente.");
      await loadCampaigns();
    } catch (deleteError) {
      setError(
        getApiErrorMessage(deleteError, "No se pudo eliminar la campaña.")
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-6 text-slate-900 dark:text-white">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
            Comunicación global
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Notificaciones globales
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Crea, edita y envía campañas globales usando destinatarios reales de
            VibeNotas.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void loadCampaigns()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-300/30 dark:shadow-violet-950/40 transition hover:brightness-110"
          >
            <Plus size={18} />
            Nueva campaña
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
          <p className="font-semibold">Ocurrió un problema</p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-200/80">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
          <p className="font-semibold">Acción completada</p>
          <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-200/80">{success}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="relative overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-slate-50 p-5 shadow-xl shadow-slate-200/50 dark:border-violet-400/15 dark:from-violet-500/[0.16] dark:via-[#1E293B]/90 dark:to-[#1E293B]/90 dark:shadow-black/20">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-violet-400/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Campañas totales</p>
              <div className="rounded-2xl bg-violet-100 p-2.5 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                <Megaphone size={18} />
              </div>
            </div>
            <p className="mt-5 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              {stats.total}
            </p>
            <p className="mt-2 text-xs text-violet-700 dark:text-violet-200/70">
              Comunicaciones activas
            </p>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-5 shadow-xl shadow-slate-200/50 dark:border-emerald-400/15 dark:from-emerald-500/[0.13] dark:via-[#1E293B]/90 dark:to-[#1E293B]/90 dark:shadow-black/20">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-emerald-400/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Enviadas</p>
              <div className="rounded-2xl bg-emerald-100 p-2.5 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <p className="mt-5 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              {stats.sent}
            </p>
            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-200/70">
              Campañas completadas
            </p>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-slate-50 p-5 shadow-xl shadow-slate-200/50 dark:border-amber-400/15 dark:from-amber-500/[0.13] dark:via-[#1E293B]/90 dark:to-[#1E293B]/90 dark:shadow-black/20">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-amber-400/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Pendientes</p>
              <div className="rounded-2xl bg-amber-100 p-2.5 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                <CalendarClock size={18} />
              </div>
            </div>
            <p className="mt-5 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              {stats.drafts + stats.scheduled}
            </p>
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-200/70">
              {stats.drafts} borrador(es) · {stats.scheduled} programada(s)
            </p>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-slate-50 p-5 shadow-xl shadow-slate-200/50 dark:border-sky-400/15 dark:from-sky-500/[0.13] dark:via-[#1E293B]/90 dark:to-[#1E293B]/90 dark:shadow-black/20">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-sky-400/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Usuarios disponibles
              </p>
              <div className="rounded-2xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                <Users size={18} />
              </div>
            </div>
            <p className="mt-5 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              {stats.availableRecipients}
            </p>
            <p className="mt-2 text-xs text-sky-700 dark:text-sky-200/70">
              Cuentas activas actuales
            </p>
          </div>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="relative overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-slate-50 p-5 shadow-xl shadow-slate-200/50 dark:border-sky-400/15 dark:from-sky-500/[0.12] dark:via-[#172033]/90 dark:to-[#111827]/90 dark:shadow-black/10">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300">
                <CalendarClock size={18} />
                <p className="text-xs font-black uppercase tracking-[0.18em]">
                  Centro de programación
                </p>
              </div>
              <h2 className="mt-2 text-lg font-bold text-slate-950 dark:text-white">
                {nextScheduledCampaign
                  ? nextScheduledCampaign.titulo
                  : "Sin campañas próximas"}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {nextScheduledCampaign
                  ? `Próxima fecha: ${formatDate(
                      nextScheduledCampaign.programada_para
                    )}`
                  : "Crea una campaña y elige Programar para reservar una fecha y hora."}
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700 transition hover:bg-sky-100 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:bg-sky-500/20"
            >
              <Clock3 size={17} />
              Programar aviso
            </button>
          </div>
        </article>

        <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-400/15 dark:bg-amber-500/[0.06]">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-amber-100 p-2.5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                Programación del backend
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-100/60">
                El backend actual conserva el estado y la fecha programada. El
                despacho automático por horario requiere el procesador de
                campañas programadas; hasta activarlo, el botón Enviar sigue
                siendo la ejecución manual segura.
              </p>
            </div>
          </div>
        </article>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-3xl border border-slate-200 bg-slate-200/70 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-[#1E293B]/80 dark:shadow-black/10">
          <div className="border-b border-slate-200 p-5 sm:p-6 dark:border-white/10">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                  Historial de campañas
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                  Centro de comunicaciones
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {filteredCampaigns.length} de {campaigns.length} campaña(s)
                  visibles
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(260px,1fr)_190px] xl:w-[570px]">
                <label className="relative block">
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar campaña, mensaje o tipo..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-violet-400 focus:bg-white dark:border-white/10 dark:bg-black/10 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-violet-400/40 dark:focus:bg-white/[0.03]"
                  />
                </label>

                <label className="relative block">
                  <Filter
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as CampaignStatusFilter)
                    }
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-violet-400 dark:border-white/10 dark:bg-[#172033] dark:text-slate-200 dark:focus:border-violet-400/40"
                  >
                    <option value="todas">Todos los estados</option>
                    <option value="borrador">Borradores</option>
                    <option value="programada">Programadas</option>
                    <option value="enviada">Enviadas</option>
                    <option value="cancelada">Canceladas</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-black/10">
                <tr>
                  <th className="px-6 py-4 font-semibold">Campaña</th>
                  <th className="px-6 py-4 font-semibold">Tipo</th>
                  <th className="px-6 py-4 font-semibold">Audiencia</th>
                  <th className="px-6 py-4 font-semibold">Estado</th>
                  <th className="px-6 py-4 font-semibold">Alcance</th>
                  <th className="px-6 py-4 text-right font-semibold">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredCampaigns.map((campaign) => {
                  const canEdit =
                    campaign.estado === "borrador" ||
                    campaign.estado === "programada";
                  const canSend = canEdit;
                  const canDelete = campaign.estado !== "enviada";

                  return (
                    <tr
                      key={campaign.id}
                      className="border-t border-slate-100 text-sm transition hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/[0.035]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-2xl bg-violet-100 p-3 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                            <BellRing size={18} />
                          </div>

                          <div className="max-w-md">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {campaign.titulo}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                              {campaign.mensaje}
                            </p>
                            <p className="mt-2 text-[11px] text-slate-600">
                              Creada por {campaign.creador_nombre || "Usuario"} ·{" "}
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
                        <p className="mt-2 text-[11px] font-semibold text-slate-500">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 ${getPriorityStyle(
                              campaign.prioridad
                            )}`}
                          >
                            {getPriorityLabel(campaign.prioridad)}
                          </span>
                        </p>
                      </td>

                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {getAudienceLabel(campaign.audiencia)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            campaign.estado
                          )}`}
                        >
                          {getStatusLabel(campaign.estado)}
                        </span>
                        {campaign.estado === "programada" && (
                          <p className="mt-2 text-[11px] text-slate-500">
                            {formatDate(campaign.programada_para)}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {campaign.total_destinatarios} enviados
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {campaign.total_leidas} leídas
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEditModal(campaign)}
                              className="rounded-xl p-2 text-sky-700 transition hover:bg-sky-100 dark:text-sky-300 dark:hover:bg-sky-500/10"
                              title="Editar campaña"
                            >
                              <Pencil size={17} />
                            </button>
                          )}

                          {canSend && (
                            <button
                              type="button"
                              onClick={() => void sendCampaign(campaign)}
                              disabled={sendingId === campaign.id}
                              className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Send size={15} />
                              {sendingId === campaign.id ? "Enviando..." : "Enviar"}
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => void deleteCampaign(campaign)}
                              disabled={deletingId === campaign.id}
                              className="rounded-xl p-2 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-500/10"
                              title="Eliminar campaña"
                            >
                              <Trash2 size={17} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredCampaigns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                      No hay campañas que coincidan con los filtros.
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
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-400/30 dark:border-white/10 dark:bg-[#1E293B] dark:shadow-black/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                  Comunicación de plataforma
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                  {editingCampaign ? "Editar campaña" : "Nueva campaña"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveCampaign} className="mt-6">
              <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
                <div className="space-y-5">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5 dark:border-white/10 dark:bg-black/10">
                    <div className="flex items-center gap-2">
                      <div className="rounded-xl bg-violet-100 p-2 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          Contenido
                        </p>
                        <p className="text-xs text-slate-500">
                          Define lo que verán los destinatarios.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      <label className="block">
                        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.13em] text-slate-500">
                          Título
                        </span>
                        <input
                          value={form.titulo}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              titulo: event.target.value,
                            }))
                          }
                          placeholder="Ej. Mantenimiento programado"
                          maxLength={180}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 dark:border-white/10 dark:bg-[#111827]/80 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-violet-400/50"
                          required
                        />
                        <div className="mt-1.5 flex justify-end text-[11px] text-slate-600">
                          {form.titulo.length}/180
                        </div>
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.13em] text-slate-500">
                          Mensaje
                        </span>
                        <textarea
                          value={form.mensaje}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              mensaje: event.target.value,
                            }))
                          }
                          placeholder="Escribe un mensaje claro y accionable..."
                          rows={6}
                          maxLength={10000}
                          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 dark:border-white/10 dark:bg-[#111827]/80 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-violet-400/50"
                          required
                        />
                        <div className="mt-1.5 flex justify-end text-[11px] text-slate-600">
                          {form.mensaje.length.toLocaleString("es-CL")}/10.000
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5 dark:border-white/10 dark:bg-black/10">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Clasificación y audiencia
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Ajusta el contexto, la urgencia y quién recibirá el aviso.
                    </p>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Tipo
                        </span>
                        <select
                          value={form.tipo}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              tipo: event.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 dark:border-white/10 dark:bg-[#172033] dark:text-white dark:focus:border-violet-400/40"
                        >
                          <option value="informacion">Información</option>
                          <option value="actualizacion">Actualización</option>
                          <option value="promocion">Promoción</option>
                          <option value="advertencia">Advertencia</option>
                          <option value="mantenimiento">Mantenimiento</option>
                          <option value="seguridad">Seguridad</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Prioridad
                        </span>
                        <select
                          value={form.prioridad}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              prioridad: event.target.value as CampaignPriority,
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 dark:border-white/10 dark:bg-[#172033] dark:text-white dark:focus:border-violet-400/40"
                        >
                          <option value="LOW">Baja</option>
                          <option value="NORMAL">Normal</option>
                          <option value="HIGH">Alta</option>
                          <option value="URGENT">Urgente</option>
                        </select>
                      </label>

                      <label className="block sm:col-span-2">
                        <span className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Audiencia
                        </span>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {(["todos", "admins"] as CampaignAudience[]).map(
                            (audience) => {
                              const selected = form.audiencia === audience;
                              const count =
                                audience === "todos"
                                  ? audienceSummary.todos
                                  : audienceSummary.admins;

                              return (
                                <button
                                  key={audience}
                                  type="button"
                                  onClick={() =>
                                    setForm((current) => ({
                                      ...current,
                                      audiencia: audience,
                                    }))
                                  }
                                  className={`rounded-2xl border p-4 text-left transition ${
                                    selected
                                      ? "border-violet-300 bg-violet-50 shadow-lg shadow-violet-200/40 dark:border-violet-400/35 dark:bg-violet-500/10 dark:shadow-violet-950/10"
                                      : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <p
                                      className={`text-sm font-bold ${
                                        selected ? "text-violet-700 dark:text-violet-200" : "text-slate-900 dark:text-white"
                                      }`}
                                    >
                                      {getAudienceLabel(audience)}
                                    </p>
                                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:bg-black/20 dark:text-slate-300">
                                      {count}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {audience === "todos"
                                      ? "Todas las cuentas activas elegibles."
                                      : "Solo administradores activos."}
                                  </p>
                                </button>
                              );
                            }
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5 dark:border-white/10 dark:bg-black/10">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Momento de entrega
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Guarda como borrador o reserva una fecha y hora.
                    </p>

                    <div className="mt-4 grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-[#111827]/80">
                      <button
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            estado: "borrador",
                            programada_para: "",
                          }))
                        }
                        className={`rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                          form.estado === "borrador"
                            ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-white/10 dark:text-white dark:ring-0"
                            : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                        }`}
                      >
                        Guardar borrador
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            estado: "programada",
                            programada_para:
                              current.programada_para || minimumScheduleDate,
                          }))
                        }
                        className={`rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                          form.estado === "programada"
                            ? "bg-sky-100 text-sky-700 shadow-sm dark:bg-sky-500/15 dark:text-sky-200"
                            : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                        }`}
                      >
                        Programar
                      </button>
                    </div>

                    {form.estado === "programada" && (
                      <div className="mt-4 space-y-3">
                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                            Fecha y hora local
                          </span>
                          <input
                            type="datetime-local"
                            value={form.programada_para}
                            min={minimumScheduleDate}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                programada_para: event.target.value,
                              }))
                            }
                            className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 dark:border-sky-400/20 dark:bg-[#111827]/80 dark:text-white dark:focus:border-sky-400/50"
                            required
                          />
                        </label>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setQuickSchedule(30)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.07]"
                          >
                            +30 min
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickSchedule(60)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.07]"
                          >
                            +1 hora
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickSchedule(24 * 60)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.07]"
                          >
                            +24 horas
                          </button>
                          <button
                            type="button"
                            onClick={setTomorrowMorning}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.07]"
                          >
                            Mañana 09:00
                          </button>
                        </div>

                        {scheduledPreview && (
                          <div className="flex items-start gap-2 rounded-2xl border border-sky-400/15 bg-sky-500/[0.07] p-3">
                            <Clock3
                              size={16}
                              className="mt-0.5 shrink-0 text-sky-700 dark:text-sky-300"
                            />
                            <p className="text-xs leading-5 text-sky-700 dark:text-sky-100/75">
                              Programada para{" "}
                              <strong className="text-sky-900 dark:text-sky-100">
                                {scheduledPreview}
                              </strong>
                              .
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <aside className="space-y-4 xl:sticky xl:top-0 xl:self-start">
                  <div className="overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-slate-50 p-5 shadow-xl shadow-slate-200/50 dark:border-violet-400/15 dark:from-violet-500/[0.12] dark:via-[#171f31] dark:to-[#111827] dark:shadow-black/20">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="rounded-xl bg-violet-500/15 p-2 text-violet-300">
                          <BellRing size={16} />
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700 dark:text-violet-200">
                          Vista previa
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${getPriorityStyle(
                          form.prioridad
                        )}`}
                      >
                        {getPriorityLabel(form.prioridad)}
                      </span>
                    </div>

                    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-black/15">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${getTypeStyle(
                          form.tipo
                        )}`}
                      >
                        {form.tipo}
                      </span>
                      <h3 className="mt-3 text-base font-bold text-slate-950 dark:text-white">
                        {form.titulo.trim() || "Título de la notificación"}
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {form.mensaje.trim() ||
                          "Aquí aparecerá una vista previa del mensaje que recibirán los usuarios."}
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                          Destinatarios
                        </p>
                        <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                          {audiencePreview}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                          Entrega
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                          {form.estado === "programada"
                            ? "Programada"
                            : "Borrador"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.025]">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Antes de guardar
                    </p>
                    <div className="mt-3 space-y-2 text-xs leading-5 text-slate-500">
                      <p>• Revisa el título y el mensaje.</p>
                      <p>• Confirma la audiencia y la prioridad.</p>
                      <p>
                        • Las fechas programadas se convierten a ISO antes de
                        enviarse al backend.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end dark:border-white/10">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50 dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/[0.05] dark:hover:text-white"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-300/30 dark:shadow-violet-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Guardando...
                    </>
                  ) : form.estado === "programada" ? (
                    <>
                      <CalendarClock size={16} />
                      {editingCampaign ? "Actualizar programación" : "Programar campaña"}
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      {editingCampaign ? "Guardar cambios" : "Crear borrador"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}