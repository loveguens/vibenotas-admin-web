import { useEffect } from "react";

import api from "../../../services/api";

const FALLBACK_RETRY_MS = 30_000;

function unwrapPayload(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const root = value as Record<string, unknown>;

  if (typeof root.data === "object" && root.data !== null) {
    return root.data as Record<string, unknown>;
  }

  return root;
}

function readHeartbeatIntervalMs(value: unknown): number | null {
  const payload = unwrapPayload(value);

  if (!payload) {
    return null;
  }

  const intervalSeconds = Number(payload.heartbeatIntervalSeconds);

  if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
    return null;
  }

  return intervalSeconds * 1000;
}

export function useChatPresenceHeartbeat(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    let timerId: number | null = null;

    let lastIntervalMs: number | null = null;

    function schedule(delayMs: number): void {
      if (cancelled) {
        return;
      }

      if (timerId !== null) {
        window.clearTimeout(timerId);
      }

      timerId = window.setTimeout(() => {
        void sendHeartbeat();
      }, delayMs);
    }

    async function sendHeartbeat(): Promise<void> {
      try {
        const response = await api.put("/chat/presence/heartbeat");

        if (cancelled) {
          return;
        }

        const serverIntervalMs = readHeartbeatIntervalMs(response.data);

        if (serverIntervalMs !== null) {
          lastIntervalMs = serverIntervalMs;
        }

        schedule(lastIntervalMs ?? FALLBACK_RETRY_MS);
      } catch {
        /*
         * Presence no debe invalidar ni
         * bloquear una sesión válida.
         *
         * Si ya recibimos un intervalo del
         * backend lo reutilizamos. Si todavía
         * no existe, el fallback coincide con
         * el contrato actual de 30 segundos.
         */
        schedule(lastIntervalMs ?? FALLBACK_RETRY_MS);
      }
    }

    /*
     * Registramos inmediatamente la sesión
     * autenticada; no esperamos al primer
     * intervalo.
     */
    void sendHeartbeat();

    return () => {
      cancelled = true;

      if (timerId !== null) {
        window.clearTimeout(timerId);
      }

      /*
       * Importante:
       * desmontar una ruta privada NO equivale
       * a cerrar sesión, por eso aquí no hacemos
       * DELETE /chat/presence.
       */
    };
  }, [enabled]);
}
