import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import type { ConfirmAction } from "../types/chat.types";

type ConfirmActionModalProps = {
  action: ConfirmAction | null;
  busy: boolean;
  onClose: () => void;
};

type ToneConfig = {
  icon: typeof AlertTriangle;
  iconClass: string;
  buttonClass: string;
};

function getToneConfig(tone: "primary" | "warning" | "danger"): ToneConfig {
  const configs: Record<"primary" | "warning" | "danger", ToneConfig> = {
    primary: {
      icon: CheckCircle2,
      iconClass: "bg-violet-500/10 text-violet-300",
      buttonClass:
        "bg-violet-500 text-white hover:bg-violet-400 focus-visible:ring-violet-400/50",
    },
    warning: {
      icon: AlertTriangle,
      iconClass: "bg-amber-400/10 text-amber-300",
      buttonClass:
        "bg-amber-400 text-slate-950 hover:bg-amber-300 focus-visible:ring-amber-300/50",
    },
    danger: {
      icon: AlertTriangle,
      iconClass: "bg-red-500/10 text-red-300",
      buttonClass:
        "bg-red-500 text-white hover:bg-red-400 focus-visible:ring-red-400/50",
    },
  };

  return configs[tone];
}

export function ConfirmActionModal({
  action,
  busy,
  onClose,
}: ConfirmActionModalProps) {
  if (!action) {
    return null;
  }

  const tone = action.tone ?? "primary";
  const { icon: Icon, iconClass, buttonClass } = getToneConfig(tone);

  function handleConfirm() {
    if (busy || !action) {
      return;
    }

    void action.onConfirm();
  }

  return (
    <div
      className="fixed inset-0 z-[10030] flex items-center justify-center bg-slate-950/75 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-action-title"
      aria-describedby="confirm-action-description"
    >
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar confirmaciÃ³n"
      />

      <section className="relative w-full max-w-md rounded-[28px] border border-slate-700 bg-[#111827] p-6 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
          >
            <Icon size={22} />
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            title="Cerrar"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <h3
          id="confirm-action-title"
          className="mt-5 text-xl font-bold text-white"
        >
          {action.title}
        </h3>

        <p
          id="confirm-action-description"
          className="mt-2 text-sm leading-6 text-slate-400"
        >
          {action.description}
        </p>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${buttonClass}`}
          >
            {busy ? "Procesando..." : action.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
