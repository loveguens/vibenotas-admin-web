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

    if (!textarea) return;

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [value]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
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
    if (scheduling) return;

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

      const mysqlDateTime = scheduledFor.replace("T", " ") + ":00";

      await onSchedule(mysqlDateTime);

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
        className="border-t border-slate-800 bg-slate-950/85 p-3 backdrop-blur-xl sm:p-4 sm:px-6"
      >
        {replyTo && (
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-slate-800 border-l-2 border-l-violet-400 bg-slate-900/80 px-3 py-2.5 shadow-lg shadow-black/10">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-violet-300">
                Respondiendo a {replyTo.emisor_nombre}
              </p>

              <p className="mt-0.5 truncate text-xs text-slate-400">
                {replyTo.contenido}
              </p>
            </div>

            <button
              type="button"
              onClick={onCancelReply}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title="Cancelar respuesta"
              aria-label="Cancelar respuesta"
            >
              <X size={17} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 sm:gap-3">
          <button
            type="button"
            className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-violet-300"
            title="Adjuntar archivo próximamente"
            aria-label="Adjuntar archivo"
          >
            <Paperclip size={18} />
          </button>

          <button
            type="button"
            disabled={sending}
            onClick={openScheduleModal}
            className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-50"
            title="Programar mensaje"
            aria-label="Programar mensaje"
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
              className="max-h-32 min-h-11 w-full resize-none rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 pr-12 text-sm leading-5 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <span className="pointer-events-none absolute bottom-2.5 right-3 text-[10px] text-slate-600">
              {value.length}/5000
            </span>
          </div>

          <button
            type="submit"
            disabled={!value.trim() || sending}
            className={`mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 ${sendClass}`}
            aria-label={sending ? "Enviando mensaje" : "Enviar mensaje"}
            title={sending ? "Enviando..." : "Enviar mensaje"}
          >
            <Send size={18} className={sending ? "animate-pulse" : ""} />
          </button>
        </div>

        <p className="mt-2 pl-1 text-[10px] text-slate-600">
          Presiona Enter para enviar · Shift + Enter para nueva línea
        </p>
      </form>

      {isScheduleOpen && (
        <div className="fixed inset-0 z-[10120] flex items-end bg-slate-950/75 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
          <button
            type="button"
            onClick={closeScheduleModal}
            className="absolute inset-0 cursor-default"
            aria-label="Cerrar programación"
          />

          <section className="relative w-full rounded-t-[30px] border border-slate-700 bg-[#111827] p-6 shadow-2xl sm:max-w-md sm:rounded-[30px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                  <CalendarClock size={21} />
                </div>

                <h2 className="mt-4 text-xl font-bold text-white">
                  Programar mensaje
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-400">
                  El mensaje se enviará automáticamente en la fecha elegida.
                </p>
              </div>

              <button
                type="button"
                onClick={closeScheduleModal}
                disabled={scheduling}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
                aria-label="Cerrar"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSchedule} className="mt-6">
              <label className="block text-sm font-semibold text-slate-200">
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
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                <p className="text-xs font-bold text-violet-300">
                  Mensaje a programar
                </p>

                <p className="mt-1 line-clamp-3 text-sm text-slate-300">
                  {value || "Aún no escribiste un mensaje."}
                </p>
              </div>

              {scheduleError && (
                <p className="mt-3 text-sm text-red-300">{scheduleError}</p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closeScheduleModal}
                  disabled={scheduling}
                  className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={!value.trim() || scheduling}
                  className="rounded-xl bg-violet-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
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
