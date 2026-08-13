import { Check, Clock3, X } from "lucide-react";
import { TEMPORARY_OPTIONS } from "../features/constants";
import type { TemporaryDuration } from "../features/types";

type TemporaryMessagesModalProps = {
  open: boolean;
  value: TemporaryDuration;
  onClose: () => void;
  onChange: (value: TemporaryDuration) => void;
};

export function TemporaryMessagesModal({
  open,
  value,
  onClose,
  onChange,
}: TemporaryMessagesModalProps) {
  if (!open) {
    return null;
  }

  function handleSelect(optionValue: TemporaryDuration) {
    onChange(optionValue);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[10020] flex items-end bg-slate-950/75 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Cerrar mensajes temporales"
      />

      <section className="relative w-full rounded-t-[32px] border border-slate-700 bg-[#111827] p-6 shadow-2xl shadow-black/60 sm:max-w-lg sm:rounded-[32px]">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-400">
              Privacidad
            </p>

            <h3 className="mt-1 text-xl font-bold text-white">
              Mensajes temporales
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              La eliminación automática se activará cuando conectemos la
              configuración con el backend.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-2">
          {TEMPORARY_OPTIONS.map((option) => {
            const selected = value === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 ${
                  selected
                    ? "border-violet-400/55 bg-violet-500/10"
                    : "border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800/70"
                }`}
                aria-pressed={selected}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                  <Clock3 size={18} />
                </span>

                <span className="min-w-0 flex-1">
                  <strong className="block text-sm text-white">
                    {option.label}
                  </strong>

                  <small className="mt-0.5 block text-xs leading-5 text-slate-500">
                    {option.description}
                  </small>
                </span>

                {selected && (
                  <Check
                    size={18}
                    className="shrink-0 text-violet-300"
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}