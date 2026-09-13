import { CalendarClock, Paperclip, Send, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { Message } from "../types/chat.types";

type ChatComposerProps = {
  value: string;
  replyTo: Message | null;
  sending: boolean;
  sendClass: string;
  onChange: (value: string) => void;
  onCancelReply: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSchedule: (scheduledFor: string) => Promise<void>;
};

function getMinimumDateTime(): string {
  const now = new Date();

  now.setMinutes(now.getMinutes() + 1);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function ChatComposer({
  value,
  replyTo,
  sending,
  sendClass,
  onChange,
  onCancelReply,
  onSubmit,
  onSchedule,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduledFor, setScheduledFor] = useState(getMinimumDateTime());
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [value]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (!value.trim() || sending) {
      return;
    }

    event.currentTarget.form?.requestSubmit();
  }

  function openScheduleModal(): void {
    if (!value.trim()) {
      setScheduleError("Escribe un mensaje antes de programarlo.");
      setIsScheduleOpen(true);
      return;
    }

    setScheduleError("");
    setScheduledFor(getMinimumDateTime());
    setIsScheduleOpen(true);
  }

  function closeScheduleModal(): void {
    if (scheduling) {
      return;
    }

    setIsScheduleOpen(false);
    setScheduleError("");
  }

  async function handleSchedule(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!value.trim()) {
      setScheduleError("Escribe un mensaje antes de programarlo.");
      return;
    }

    if (!scheduledFor) {
      setScheduleError("Selecciona una fecha y hora.");
      return;
    }

    const selectedDate = new Date(scheduledFor);

    if (Number.isNaN(selectedDate.getTime())) {
      setScheduleError("Selecciona una fecha válida.");
      return;
    }

    if (selectedDate <= new Date()) {
      setScheduleError("La fecha programada debe ser futura.");
      return;
    }

    try {
      setScheduling(true);
      setScheduleError("");

      await onSchedule(scheduledFor.replace("T", " ") + ":00");

      onChange("");
      setIsScheduleOpen(false);
      setScheduledFor(getMinimumDateTime());
    } catch {
      setScheduleError("No se pudo programar el mensaje.");
    } finally {
      setScheduling(false);
    }
  }

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="shrink-0 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#0d1526]/95 sm:px-5"
      >
        {replyTo && (
          <div className="mx-auto mb-2.5 flex max-w-3xl items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 dark:border-violet-400/20 dark:bg-violet-500/10">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black text-violet-700 dark:text-violet-300">
                Respondiendo a {replyTo.emisor_nombre}
              </p>

              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {replyTo.contenido}
              </p>
            </div>

            <button
              type="button"
              onClick={onCancelReply}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-[24px] border border-slate-200 bg-slate-50 p-1.5 shadow-sm transition focus-within:border-violet-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-500/5 dark:border-white/10 dark:bg-white/[0.04] dark:focus-within:border-violet-400/30 dark:focus-within:bg-white/[0.06]">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-violet-600 dark:hover:bg-white/10 dark:hover:text-violet-300"
            title="Adjuntar archivo"
          >
            <Paperclip size={18} />
          </button>

          <button
            type="button"
            disabled={sending}
            onClick={openScheduleModal}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-violet-600 disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-violet-300"
            title="Programar mensaje"
          >
            <CalendarClock size={18} />
          </button>

          <div className="relative min-w-0 flex-1">
            <textarea
              ref={textareaRef}
              rows={1}
              value={value}
              disabled={sending}
              maxLength={5000}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              className="max-h-[120px] min-h-10 w-full resize-none bg-transparent px-2 py-2.5 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={!value.trim() || sending}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 ${sendClass}`}
            aria-label={sending ? "Enviando mensaje" : "Enviar mensaje"}
          >
            <Send size={17} className={sending ? "animate-pulse" : ""} />
          </button>
        </div>

        <div className="mx-auto mt-1.5 flex max-w-3xl items-center justify-between px-2">
          <p className="hidden text-[9px] text-slate-400 sm:block">
            Enter para enviar · Shift + Enter para nueva línea
          </p>

          <span className="ml-auto text-[9px] text-slate-400">
            {value.length}/5000
          </span>
        </div>
      </form>

      {isScheduleOpen && (
        <div className="fixed inset-0 z-[10120] flex items-end bg-slate-950/35 p-0 backdrop-blur-sm dark:bg-slate-950/75 sm:items-center sm:justify-center sm:p-6">
          <button
            type="button"
            onClick={closeScheduleModal}
            className="absolute inset-0 cursor-default"
            aria-label="Cerrar programación"
          />

          <section className="relative w-full rounded-t-[30px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#111827] sm:max-w-md sm:rounded-[30px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                  <CalendarClock size={21} />
                </div>

                <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">
                  Programar mensaje
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Se enviará automáticamente en la fecha elegida.
                </p>
              </div>

              <button
                type="button"
                onClick={closeScheduleModal}
                disabled={scheduling}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSchedule} className="mt-6">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Fecha y hora de envío
              </label>

              <input
                type="datetime-local"
                value={scheduledFor}
                min={getMinimumDateTime()}
                disabled={scheduling}
                onChange={(event) => {
                  setScheduledFor(event.target.value);
                  setScheduleError("");
                }}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />

              <div className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
                <p className="text-xs font-bold text-violet-600 dark:text-violet-300">
                  Mensaje a programar
                </p>

                <p className="mt-1 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
                  {value || "Aún no escribiste un mensaje."}
                </p>
              </div>

              {scheduleError && (
                <p className="mt-3 text-sm text-red-500">{scheduleError}</p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closeScheduleModal}
                  disabled={scheduling}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={!value.trim() || scheduling}
                  className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {scheduling ? "Programando..." : "Programar"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
