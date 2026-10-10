import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Archive,
  CheckSquare,
  Database,
  FileText,
  Folder,
  Heart,
  Pin,
  RefreshCw,
  ShieldCheck,
  StickyNote,
} from "lucide-react";

import api from "../services/api";

type ContentTotals = {
  folders: number;
  notes: number;
  checklists: number;
  documents: number;
  reminders: number;
  total: number;
};

type ActivityDay = {
  date: string;
  created: number;
  updated: number;
};

type AdminContentResponse = {
  totals: ContentTotals;
  activity: {
    createdLast7Days: number;
    updatedLast7Days: number;
    byDay: ActivityDay[];
  };
  state: {
    archived: number;
    favorites: number;
    pinned: number;
  };
  storage: {
    documentBytes: number;
  };
  checklistProgress: {
    totalItems: number;
    completedItems: number;
  };
};

const emptyTotals: ContentTotals = {
  folders: 0,
  notes: 0,
  checklists: 0,
  documents: 0,
  reminders: 0,
  total: 0,
};

function formatBytes(bytes: number) {
  if (!bytes || bytes <= 0) {
    return "0 KB";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      message?: unknown;
      response?: {
        data?: {
          message?: unknown;
        };
      };
    };

    const apiMessage = candidate.response?.data?.message;

    if (typeof apiMessage === "string" && apiMessage.trim()) {
      return apiMessage;
    }

    if (
      typeof candidate.message === "string" &&
      candidate.message.trim()
    ) {
      return candidate.message;
    }
  }

  return "No se pudo cargar el resumen de contenido.";
}

function formatDayLabel(dateKey: string) {
  const day = new Date(`${dateKey}T00:00:00Z`);

  if (Number.isNaN(day.getTime())) {
    return dateKey;
  }

  return day
    .toLocaleDateString("es-CL", {
      weekday: "short",
      timeZone: "UTC",
    })
    .replace(".", "");
}

export default function ContentPage() {
  const [content, setContent] = useState<AdminContentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadContent() {
    setLoading(true);
    setError("");

    try {
      const response =
        await api.get<AdminContentResponse>("/admin/content");

      const payload = response.data;

      if (
        !payload?.totals ||
        !payload.activity ||
        !Array.isArray(payload.activity.byDay) ||
        !payload.state ||
        !payload.storage ||
        !payload.checklistProgress
      ) {
        throw new Error(
          "El backend aún no devuelve el resumen agregado de contenido.",
        );
      }

      setContent(payload);
    } catch (caughtError: unknown) {
      setContent(null);
      setError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadContent();
  }, []);

  const totals = content?.totals ?? emptyTotals;

  const analytics = useMemo(() => {
    const days = (content?.activity.byDay ?? []).map((day) => ({
      key: day.date,
      label: formatDayLabel(day.date),
      created: day.created,
      updated: day.updated,
    }));

    const totalItems = content?.checklistProgress.totalItems ?? 0;
    const completedItems = content?.checklistProgress.completedItems ?? 0;

    return {
      createdLast7Days: content?.activity.createdLast7Days ?? 0,
      updatedLast7Days: content?.activity.updatedLast7Days ?? 0,
      archived: content?.state.archived ?? 0,
      favorites: content?.state.favorites ?? 0,
      pinned: content?.state.pinned ?? 0,
      storageBytes: content?.storage.documentBytes ?? 0,
      checklistProgress:
        totalItems > 0
          ? Math.round((completedItems / totalItems) * 100)
          : 0,
      days,
      maxDailyActivity: Math.max(
        1,
        ...days.map((day) => day.created + day.updated),
      ),
    };
  }, [content]);

  const distribution = useMemo(() => {
    const entries = [
      {
        label: "Notas activas",
        value: totals.notes,
        bar: "bg-violet-500",
      },
      {
        label: "Checklists",
        value: totals.checklists,
        bar: "bg-sky-500",
      },
      {
        label: "Documentos PDF",
        value: totals.documents,
        bar: "bg-amber-500",
      },
      {
        label: "Carpetas",
        value: totals.folders,
        bar: "bg-emerald-500",
      },
    ];

    const total = Math.max(
      1,
      entries.reduce(
        (sum, entry) => sum + entry.value,
        0,
      ),
    );

    return entries.map((entry) => ({
      ...entry,
      percentage: Math.round((entry.value / total) * 100),
    }));
  }, [totals]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
            Visibilidad administrativa
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Resumen de contenido
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Supervisa el uso de contenido mediante métricas
            agregadas sin exponer títulos, correos ni información
            privada de los usuarios.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadContent()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20"
        >
          <RefreshCw
            size={18}
            className={loading ? "animate-spin" : ""}
          />
          Actualizar métricas
        </button>
      </div>

      {loading && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-36 animate-pulse rounded-3xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
          <h2 className="font-bold">
            No se pudieron cargar las métricas
          </h2>

          <p className="mt-2 text-sm text-red-700 dark:text-red-200/80">
            {error}
          </p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1E293B]/80 dark:shadow-black/10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Notas activas
                  </p>

                  <p className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">
                    {totals.notes}
                  </p>
                </div>

                <div className="rounded-2xl bg-violet-50 p-3 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                  <StickyNote size={21} />
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Excluye las notas en papelera.
              </p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1E293B]/80 dark:shadow-black/10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Checklists
                  </p>

                  <p className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">
                    {totals.checklists}
                  </p>
                </div>

                <div className="rounded-2xl bg-sky-50 p-3 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                  <CheckSquare size={21} />
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                {analytics.checklistProgress}% de ítems completados.
              </p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1E293B]/80 dark:shadow-black/10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Documentos PDF
                  </p>

                  <p className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">
                    {totals.documents}
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50 p-3 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  <FileText size={21} />
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                {formatBytes(analytics.storageBytes)} almacenados.
              </p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1E293B]/80 dark:shadow-black/10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Carpetas
                  </p>

                  <p className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">
                    {totals.folders}
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <Folder size={21} />
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Organización agregada del contenido.
              </p>
            </article>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1E293B]/80 dark:shadow-black/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                    <Activity size={18} />

                    <p className="text-xs font-bold uppercase tracking-[0.16em]">
                      Actividad agregada
                    </p>
                  </div>

                  <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
                    Últimos 7 días
                  </h2>
                </div>

                <div className="flex gap-4 text-xs font-semibold">
                  <span className="text-violet-700 dark:text-violet-300">
                    {analytics.createdLast7Days} creados
                  </span>

                  <span className="text-sky-700 dark:text-sky-300">
                    {analytics.updatedLast7Days} actualizados
                  </span>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-7 gap-2 sm:gap-4">
                {analytics.days.map((day) => {
                  const total = day.created + day.updated;

                  const height =
                    total === 0
                      ? 4
                      : Math.max(
                          12,
                          Math.round(
                            (total /
                              analytics.maxDailyActivity) *
                              120,
                          ),
                        );

                  return (
                    <div
                      key={day.key}
                      className="flex min-w-0 flex-col items-center"
                    >
                      <div className="flex h-36 w-full items-end justify-center">
                        <div
                          className="w-full max-w-8 rounded-t-xl bg-gradient-to-t from-violet-600 to-sky-400 opacity-90"
                          style={{
                            height: `${height}px`,
                          }}
                          title={`${total} movimientos`}
                        />
                      </div>

                      <p className="mt-2 text-xs font-semibold capitalize text-slate-500">
                        {day.label}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {total}
                      </p>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1E293B]/80 dark:shadow-black/10">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Database size={18} />

                <p className="text-xs font-bold uppercase tracking-[0.16em]">
                  Estado agregado
                </p>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-black/10">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Archive size={17} />
                    <span className="text-sm font-medium">
                      Archivados
                    </span>
                  </div>

                  <strong className="text-slate-950 dark:text-white">
                    {analytics.archived}
                  </strong>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-black/10">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Heart size={17} />
                    <span className="text-sm font-medium">
                      Favoritos
                    </span>
                  </div>

                  <strong className="text-slate-950 dark:text-white">
                    {analytics.favorites}
                  </strong>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-black/10">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Pin size={17} />
                    <span className="text-sm font-medium">
                      Fijados
                    </span>
                  </div>

                  <strong className="text-slate-950 dark:text-white">
                    {analytics.pinned}
                  </strong>
                </div>
              </div>
            </article>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1E293B]/80 dark:shadow-black/10">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
                Distribución
              </p>

              <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
                Contenido por tipo
              </h2>

              <div className="mt-6 space-y-5">
                {distribution.map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {item.label}
                      </span>

                      <span className="text-sm font-bold text-slate-950 dark:text-white">
                        {item.value}
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                      <div
                        className={`h-full rounded-full ${item.bar}`}
                        style={{
                          width: `${item.percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-500/[0.06]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <ShieldCheck size={23} />
              </div>

              <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                Privacidad administrativa
              </p>

              <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
                Métricas sin explorar contenido personal
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Esta vista no presenta títulos de notas,
                descripciones, nombres de archivos, nombres de
                usuarios ni correos electrónicos. La moderación
                detallada debe realizarse únicamente cuando exista
                una razón administrativa justificada.
              </p>
            </article>
          </div>
        </>
      )}
    </section>
  );
}
