import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Edit3,
  LoaderCircle,
  RefreshCw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../../services/api";

type ScheduledMessageStatus = "pendiente" | "enviado" | "cancelado" | "fallido";

type ScheduledMessage = {
  id: number;
  conversacion_id: string;
  contenido: string;
  tipo: string;
  programado_para: string;
  estado: ScheduledMessageStatus;
  enviado_en: string | null;
  creado_en: string;
  actualizado_en: string;
  conversacion_tipo?: string;
  conversacion_titulo?: string | null;
};

type ScheduledMessagesModalProps = {
  open: boolean;
  conversationId: string | null;
  onClose: () => void;
  onToast: (message: string) => void;
  onError: (message: string) => void;
};

function toDateTimeLocal(value: string): string {
  if (!value) return "";

  const normalized = value.replace(" ", "T");
  return normalized.slice(0, 16);
}

function toMySqlDateTime(value: string): string {
  return `${value.replace("T", " ")}:00`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "â€”";

  const normalized = value.includes("T") ? value : value.replace(" ", "T");

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusLabel(status: ScheduledMessageStatus): string {
  const labels: Record<ScheduledMessageStatus, string> = {
    pendiente: "Pendiente",
    enviado: "Enviado",
    cancelado: "Cancelado",
    fallido: "Fallido",
  };

  return labels[status];
}

function getStatusClass(status: ScheduledMessageStatus): string {
  const classes: Record<ScheduledMessageStatus, string> = {
    pendiente: "border-amber-400/20 bg-amber-400/10 text-amber-200",
    enviado: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    cancelado: "border-slate-500/20 bg-slate-500/10 text-slate-300",
    fallido: "border-red-400/20 bg-red-400/10 text-red-200",
  };

  return classes[status];
}

export function ScheduledMessagesModal({
  open,
  conversationId,
  onClose,
  onToast,
  onError,
}: ScheduledMessagesModalProps) {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingDateTime, setEditingDateTime] = useState("");

  const filteredMessages = useMemo(() => {
    if (!conversationId) return [];

    return messages.filter(
      (message) => message.conversacion_id === conversationId,
    );
  }, [conversationId, messages]);

  const loadScheduledMessages = useCallback(async () => {
    if (!open || !conversationId) {
      return;
    }

    try {
      setLoading(true);

      const response = await api.get("/chat/scheduled-messages");
      const payload = response.data?.data ?? response.data;

      setMessages((payload?.mensajes_programados ?? []) as ScheduledMessage[]);
    } catch {
      onError("No se pudieron cargar los mensajes programados.");
    } finally {
      setLoading(false);
    }
  }, [conversationId, onError, open]);

  useEffect(() => {
    void loadScheduledMessages();
  }, [loadScheduledMessages]);

  function closeModal(): void {
    if (busyId !== null) return;

    setEditingId(null);
    setEditingContent("");
    setEditingDateTime("");
    onClose();
  }

  function startEdit(message: ScheduledMessage): void {
    setEditingId(message.id);
    setEditingContent(message.contenido);
    setEditingDateTime(toDateTimeLocal(message.programado_para));
  }

  function cancelEdit(): void {
    setEditingId(null);
    setEditingContent("");
    setEditingDateTime("");
  }

  async function saveEdit(id: number): Promise<void> {
    const contenido = editingContent.trim();

    if (!contenido) {
      onError("El mensaje no puede estar vacÃ­o.");
      return;
    }

    if (!editingDateTime) {
      onError("Selecciona una fecha y hora.");
      return;
    }

    const selectedDate = new Date(editingDateTime);

    if (Number.isNaN(selectedDate.getTime()) || selectedDate <= new Date()) {
      onError("La fecha programada debe ser futura.");
      return;
    }

    try {
      setBusyId(id);

      await api.put(`/chat/scheduled-messages/${id}`, {
        contenido,
        programado_para: toMySqlDateTime(editingDateTime),
      });

      setMessages((old) =>
        old.map((message) =>
          message.id === id
            ? {
                ...message,
                contenido,
                programado_para: toMySqlDateTime(editingDateTime),
              }
            : message,
        ),
      );

      cancelEdit();
      onToast("Mensaje programado actualizado.");
    } catch (requestError: unknown) {
      const responseError = requestError as {
        response?: {
          data?: {
            message?: string;
          };
        };
      };

      onError(
        responseError.response?.data?.message ??
          "No se pudo actualizar el mensaje programado.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function cancelScheduledMessage(id: number): Promise<void> {
    try {
      setBusyId(id);

      await api.put(`/chat/scheduled-messages/${id}/cancel`);

      setMessages((old) =>
        old.map((message) =>
          message.id === id
            ? {
                ...message,
                estado: "cancelado",
              }
            : message,
        ),
      );

      onToast("Mensaje programado cancelado.");
    } catch {
      onError("No se pudo cancelar el mensaje programado.");
    } finally {
      setBusyId(null);
    }
  }

  async function sendNow(id: number): Promise<void> {
    try {
      setBusyId(id);

      await api.post(`/chat/scheduled-messages/${id}/send-now`);

      setMessages((old) =>
        old.map((message) =>
          message.id === id
            ? {
                ...message,
                estado: "enviado",
                enviado_en: new Date().toISOString(),
              }
            : message,
        ),
      );

      onToast("Mensaje enviado correctamente.");
    } catch {
      onError("No se pudo enviar el mensaje ahora.");
    } finally {
      setBusyId(null);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10130] flex items-end bg-slate-950/75 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={closeModal}
        aria-label="Cerrar mensajes programados"
      />

      <section className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[30px] border border-slate-700 bg-[#111827] shadow-2xl sm:rounded-[30px]">
        <header className="flex items-start justify-between gap-4 border-b border-slate-800 p-5 sm:p-6">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
              <CalendarClock size={21} />
            </div>

            <h2 className="mt-3 text-xl font-bold text-white">
              Mensajes programados
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Administra los mensajes pendientes de esta conversaciÃ³n.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadScheduledMessages()}
              disabled={loading || busyId !== null}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-50"
              title="Actualizar"
              aria-label="Actualizar mensajes programados"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>

            <button
              type="button"
              onClick={closeModal}
              disabled={busyId !== null}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-400">
              <LoaderCircle
                size={19}
                className="animate-spin text-violet-300"
              />
              Cargando mensajes programados...
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-700 px-6 text-center">
              <Clock3 size={29} className="text-slate-600" />

              <p className="mt-4 font-bold text-slate-200">
                No hay mensajes programados
              </p>

              <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                Escribe un mensaje y usa el Ã­cono de reloj para programarlo.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMessages.map((message) => {
                const isPending = message.estado === "pendiente";
                const isBusy = busyId === message.id;
                const isEditing = editingId === message.id;

                return (
                  <article
                    key={message.id}
                    className="rounded-3xl border border-slate-800 bg-slate-900/55 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${getStatusClass(
                            message.estado,
                          )}`}
                        >
                          {getStatusLabel(message.estado)}
                        </span>

                        <p className="mt-3 text-xs font-semibold text-violet-300">
                          {isPending
                            ? "Se enviarÃ¡"
                            : message.estado === "enviado"
                              ? "Enviado"
                              : "Programado para"}{" "}
                          {formatDateTime(
                            isPending
                              ? message.programado_para
                              : (message.enviado_en ?? message.programado_para),
                          )}
                        </p>
                      </div>

                      {isBusy && (
                        <LoaderCircle
                          size={18}
                          className="shrink-0 animate-spin text-violet-300"
                        />
                      )}
                    </div>

                    {isEditing ? (
                      <div className="mt-4 space-y-3">
                        <textarea
                          value={editingContent}
                          maxLength={5000}
                          disabled={isBusy}
                          onChange={(event) =>
                            setEditingContent(event.target.value)
                          }
                          className="min-h-24 w-full resize-none rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400"
                        />

                        <input
                          type="datetime-local"
                          value={editingDateTime}
                          disabled={isBusy}
                          onChange={(event) =>
                            setEditingDateTime(event.target.value)
                          }
                          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400"
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={cancelEdit}
                            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                          >
                            Cancelar
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void saveEdit(message.id)}
                            className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-400 disabled:opacity-50"
                          >
                            Guardar cambios
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">
                          {message.contenido}
                        </p>

                        {isPending && (
                          <div className="mt-4 grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => startEdit(message)}
                              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                            >
                              <Edit3 size={14} />
                              Editar
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                void cancelScheduledMessage(message.id)
                              }
                              className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/25 px-3 py-2.5 text-xs font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                            >
                              <Trash2 size={14} />
                              Cancelar
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void sendNow(message.id)}
                              className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-500 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-violet-400 disabled:opacity-50"
                            >
                              <Send size={14} />
                              Enviar
                            </button>
                          </div>
                        )}

                        {message.estado === "enviado" && (
                          <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                            <CheckCircle2 size={15} />
                            Mensaje enviado.
                          </p>
                        )}

                        {message.estado === "fallido" && (
                          <p className="mt-4 text-xs font-medium text-red-300">
                            No se pudo enviar este mensaje.
                          </p>
                        )}
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <footer className="border-t border-slate-800 p-4 sm:px-6">
          <button
            type="button"
            onClick={closeModal}
            disabled={busyId !== null}
            className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            Cerrar
          </button>
        </footer>
      </section>
    </div>
  );
}
