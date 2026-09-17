import { LoaderCircle, MessageCircle, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../../services/api";
import { adaptMessage } from "../adapters";
import { API_ROUTES } from "../constants";
import type {
  BackendChatMessage,
  ListMessagesResponse,
} from "../types/backend.types";
import type { Message } from "../types/chat.types";

type SearchMessagesModalProps = {
  open: boolean;
  conversationId: string | null;
  onClose: () => void;
};

function formatMessageDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function SearchMessagesModal({
  open,
  conversationId,
  onClose,
}: SearchMessagesModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  /*
   * Evita que una respuesta antigua reemplace
   * resultados de una búsqueda más reciente.
   */
  const requestSequenceRef = useRef(0);

  const search = useCallback(
    async (
      rawQuery: string,
      cursor: string | null = null,
      append = false,
    ): Promise<void> => {
      if (!conversationId) {
        return;
      }

      const normalizedQuery = rawQuery.trim();

      if (!normalizedQuery) {
        setResults([]);
        setNextCursor(null);
        setHasMore(false);
        setError("");
        return;
      }

      const requestSequence = ++requestSequenceRef.current;

      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
          setError("");
        }

        const response = await api.get(
          API_ROUTES.conversationMessages(conversationId),
          {
            params: {
              q: normalizedQuery,
              limit: 20,
              ...(cursor
                ? {
                    cursor,
                  }
                : {}),
            },
          },
        );

        if (requestSequence !== requestSequenceRef.current) {
          return;
        }

        const payload = (response.data?.data ??
          response.data) as ListMessagesResponse;

        const incoming = (
          (payload?.mensajes ?? []) as BackendChatMessage[]
        ).map(adaptMessage);

        setResults((current) => {
          if (!append) {
            return incoming;
          }

          const knownIds = new Set(current.map((message) => message.id));

          return [
            ...current,
            ...incoming.filter((message) => !knownIds.has(message.id)),
          ];
        });

        setNextCursor(payload?.siguiente_cursor ?? null);
        setHasMore(Boolean(payload?.hay_mas));
      } catch (requestError: unknown) {
        if (requestSequence !== requestSequenceRef.current) {
          return;
        }

        const responseError = requestError as {
          response?: {
            data?: {
              message?: string | string[];
            };
          };
        };

        const responseMessage = responseError.response?.data?.message;

        setError(
          Array.isArray(responseMessage)
            ? responseMessage.join(" ")
            : (responseMessage ?? "No se pudieron buscar los mensajes."),
        );

        if (!append) {
          setResults([]);
          setNextCursor(null);
          setHasMore(false);
        }
      } finally {
        if (requestSequence === requestSequenceRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [conversationId],
  );

  /*
   * Reiniciamos el modal cada vez que se abre
   * para otra conversación.
   */
  useEffect(() => {
    if (!open) {
      requestSequenceRef.current += 1;
      return;
    }

    setQuery("");
    setResults([]);
    setNextCursor(null);
    setHasMore(false);
    setError("");
    setLoading(false);
    setLoadingMore(false);
  }, [conversationId, open]);

  /*
   * Búsqueda automática con pequeño debounce.
   */
  useEffect(() => {
    if (!open || !conversationId) {
      return;
    }

    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      requestSequenceRef.current += 1;
      setResults([]);
      setNextCursor(null);
      setHasMore(false);
      setError("");
      setLoading(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void search(normalizedQuery);
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [conversationId, open, query, search]);

  if (!open) {
    return null;
  }

  const normalizedQuery = query.trim();

  return (
    <div className="fixed inset-0 z-[10030] flex items-end bg-slate-950/35 p-0 backdrop-blur-sm dark:bg-slate-950/75 sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Cerrar búsqueda de mensajes"
      />

      <section className="relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-[32px] border border-slate-300 bg-white shadow-2xl shadow-black/60 dark:border-slate-700 dark:bg-[#111827] sm:max-w-2xl sm:rounded-[32px]">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-6 dark:border-slate-800">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-400">
              Conversación
            </p>

            <h3 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              Buscar mensajes
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Busca texto dentro de los mensajes visibles de este chat.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </header>

        <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-6">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-900/70">
            <Search size={18} className="shrink-0 text-slate-400" />

            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Escribe una palabra o frase..."
              maxLength={200}
              className="h-12 min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:text-white"
            />

            {loading && (
              <LoaderCircle
                size={18}
                className="shrink-0 animate-spin text-violet-400"
              />
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {!normalizedQuery && (
            <div className="flex min-h-56 flex-col items-center justify-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400">
                <Search size={24} />
              </span>

              <p className="mt-4 font-semibold text-slate-800 dark:text-slate-200">
                Escribe para comenzar
              </p>

              <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                La búsqueda se realiza directamente en el servidor.
              </p>
            </div>
          )}

          {normalizedQuery && !loading && error && (
            <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-600 dark:text-red-200">
              {error}
            </div>
          )}

          {normalizedQuery && !loading && !error && results.length === 0 && (
            <div className="flex min-h-56 flex-col items-center justify-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                <MessageCircle size={24} />
              </span>

              <p className="mt-4 font-semibold text-slate-800 dark:text-slate-200">
                Sin resultados
              </p>

              <p className="mt-1 text-sm text-slate-500">
                No encontramos mensajes que contengan “{normalizedQuery}”.
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              {results.map((message) => (
                <article
                  key={message.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                        {message.emisor_nombre}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatMessageDate(message.creado_en)}
                      </p>
                    </div>

                    {message.es_mio && (
                      <span className="shrink-0 rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-400">
                        Tú
                      </span>
                    )}
                  </div>

                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
                    {message.contenido || "Mensaje sin texto"}
                  </p>

                  {message.tipo !== "texto" && (
                    <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      {message.tipo}
                    </p>
                  )}
                </article>
              ))}

              {hasMore && nextCursor && (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => {
                    void search(normalizedQuery, nextCursor, true);
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {loadingMore && (
                    <LoaderCircle size={16} className="animate-spin" />
                  )}

                  {loadingMore ? "Cargando..." : "Cargar más resultados"}
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
