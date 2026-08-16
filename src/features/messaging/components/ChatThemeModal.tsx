import { Check, X } from "lucide-react";
import { CHAT_THEMES } from "../constants";
import type { ChatThemeId } from "../types/chat.types";

type ChatThemeModalProps = {
  open: boolean;
  value: ChatThemeId;
  onClose: () => void;
  onChange: (theme: ChatThemeId) => void;
};

export function ChatThemeModal({
  open,
  value,
  onClose,
  onChange,
}: ChatThemeModalProps) {
  if (!open) {
    return null;
  }

  function handleSelectTheme(themeId: ChatThemeId) {
    onChange(themeId);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[10020] flex items-end bg-slate-950/75 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Cerrar selector de tema"
      />

      <section className="relative w-full rounded-t-[32px] border border-slate-700 bg-[#111827] p-6 shadow-2xl sm:max-w-lg sm:rounded-[32px]">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-400">
              Personalización
            </p>

            <h3 className="mt-1 text-xl font-bold text-white">Tema del chat</h3>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              El tema se guarda solo para tu cuenta en este dispositivo.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Cerrar"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          {CHAT_THEMES.map((theme) => {
            const isSelected = value === theme.id;

            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleSelectTheme(theme.id)}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:ring-2 focus-visible:ring-violet-400/50 ${
                  isSelected
                    ? "border-violet-400/55 bg-violet-500/10 shadow-lg shadow-violet-500/10"
                    : "border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800/80"
                }`}
                aria-pressed={isSelected}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${theme.mineBubble}`}
                  aria-hidden="true"
                >
                  <span className="h-3 w-5 rounded-full bg-white/25" />
                </span>

                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm text-white">
                    {theme.label}
                  </strong>

                  <small className="mt-0.5 block text-xs leading-5 text-slate-500">
                    {theme.description}
                  </small>
                </span>

                {isSelected && (
                  <Check
                    size={18}
                    className="shrink-0 text-violet-300"
                    aria-label="Tema seleccionado"
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
