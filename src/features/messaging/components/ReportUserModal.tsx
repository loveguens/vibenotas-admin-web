import { Flag, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../../services/api";
import { API_ROUTES } from "../constants";
import { getErrorMessage } from "../utils";

type ReportReason = "SPAM" | "HARASSMENT" | "INAPPROPRIATE" | "SCAM" | "OTHER";

type ReportUserModalProps = {
  open: boolean;
  conversationId: string | null;
  userName: string;
  onClose: () => void;
  onToast: (message: string) => void;
  onError: (message: string) => void;
};

const REASONS: Array<{
  value: ReportReason;
  label: string;
  description: string;
}> = [
  {
    value: "SPAM",
    label: "Spam",
    description: "Mensajes repetitivos, publicidad o contenido no solicitado.",
  },
  {
    value: "HARASSMENT",
    label: "Acoso",
    description: "Insultos, amenazas, intimidación o comportamiento hostil.",
  },
  {
    value: "INAPPROPRIATE",
    label: "Contenido inapropiado",
    description:
      "Contenido ofensivo o que incumple las normas de la plataforma.",
  },
  {
    value: "SCAM",
    label: "Estafa",
    description: "Intentos de fraude, engaño o suplantación.",
  },
  {
    value: "OTHER",
    label: "Otro motivo",
    description: "Cualquier otro comportamiento que deba revisarse.",
  },
];

export function ReportUserModal({
  open,
  conversationId,
  userName,
  onClose,
  onToast,
  onError,
}: ReportUserModalProps) {
  const [reason, setReason] = useState<ReportReason>("OTHER");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setReason("OTHER");
    setDetails("");
    setBusy(false);
  }, [open, conversationId]);

  if (!open) {
    return null;
  }

  async function submitReport(): Promise<void> {
    if (!conversationId || busy) {
      return;
    }

    try {
      setBusy(true);
      onError("");

      const response = await api.post(
        API_ROUTES.reportConversationUser(conversationId),
        {
          reason,
          details: details.trim() || undefined,
        },
      );

      const alreadyReported = Boolean(
        response.data?.data?.ya_reportado ??
        response.data?.alreadyReported ??
        false,
      );

      onToast(
        alreadyReported
          ? "Ya habías reportado a este usuario en esta conversación."
          : "Usuario reportado correctamente.",
      );

      onClose();
    } catch (requestError) {
      onError(
        getErrorMessage(
          requestError,
          "No se pudo enviar el reporte del usuario.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  const selectedReason = REASONS.find((item) => item.value === reason);

  return (
    <div
      className="fixed inset-0 z-[10040] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm dark:bg-slate-950/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-user-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar reporte"
        disabled={busy}
        onClick={() => {
          if (!busy) {
            onClose();
          }
        }}
      />

      <section className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-[#111827] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 dark:text-red-300">
              <Flag size={21} />
            </div>

            <div className="min-w-0">
              <h3
                id="report-user-title"
                className="text-xl font-black tracking-tight text-slate-950 dark:text-white"
              >
                Reportar usuario
              </h3>

              <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                {userName}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Selecciona el motivo que mejor describa lo ocurrido. El reporte será
          enviado para revisión y no notificará al usuario reportado.
        </p>

        <div className="mt-5 space-y-2">
          {REASONS.map((item) => {
            const selected = item.value === reason;

            return (
              <button
                key={item.value}
                type="button"
                disabled={busy}
                onClick={() => setReason(item.value)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selected
                    ? "border-red-400 bg-red-500/10 ring-2 ring-red-500/10 dark:border-red-500/50"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
                      selected
                        ? "border-red-500 bg-red-500 shadow-[inset_0_0_0_3px_white] dark:shadow-[inset_0_0_0_3px_#111827]"
                        : "border-slate-400 dark:border-slate-600"
                    }`}
                  />

                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">
                      {item.label}
                    </span>

                    <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {item.description}
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="report-user-details"
              className="text-sm font-bold text-slate-800 dark:text-slate-200"
            >
              Detalles adicionales
            </label>

            <span className="text-xs text-slate-400">
              {details.length}/2000
            </span>
          </div>

          <textarea
            id="report-user-details"
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            maxLength={2000}
            disabled={busy}
            rows={4}
            placeholder="Describe brevemente lo ocurrido. Este campo es opcional."
            className="w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
          />

          {selectedReason && (
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Motivo seleccionado:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {selectedReason.label}
              </span>
            </p>
          )}
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={busy || !conversationId}
            onClick={() => {
              void submitReport();
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Flag size={16} />
                Enviar reporte
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
