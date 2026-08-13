import {
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import api, {
  clearClientSession,
} from "../services/api";

type LogoutResponse = {
  message?: string;
  sessionId?: string;
  revoked?: boolean;
  revokedRefreshTokens?: number;
};

type ErrorResponse = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

/*
 * La operación vive fuera del componente.
 *
 * Esto evita que React.StrictMode o cualquier
 * remontaje de LogoutPage genere dos llamadas
 * POST /auth/logout para la misma sesión.
 */
let logoutPromise:
  | Promise<void>
  | null = null;

function getErrorMessage(
  error: unknown,
): string {
  if (
    axios.isAxiosError<ErrorResponse>(
      error,
    )
  ) {
    const message =
      error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(" ");
    }

    if (
      typeof message === "string" &&
      message.trim()
    ) {
      return message;
    }

    if (!error.response) {
      return (
        "No se pudo conectar con el backend. " +
        "La sesión no pudo cerrarse de forma segura."
      );
    }

    const backendError =
      error.response.data?.error;

    if (
      typeof backendError === "string" &&
      backendError.trim()
    ) {
      return backendError;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "No se pudo cerrar la sesión.";
}

function clearLocalAuthenticationState(): void {
  clearClientSession();

  localStorage.removeItem("token");
  localStorage.removeItem("user");

  sessionStorage.removeItem(
    "mfaChallengeToken",
  );

  sessionStorage.removeItem(
    "mfaChallengeExpiresAt",
  );
}

async function performLogout(): Promise<void> {
  if (logoutPromise) {
    return logoutPromise;
  }

  logoutPromise = (async () => {
    await api.post<LogoutResponse>(
      "/auth/logout",
    );

    clearLocalAuthenticationState();
  })();

  try {
    await logoutPromise;
  } catch (error: unknown) {
    /*
     * Si falló realmente, permitimos que el
     * botón "Intentar nuevamente" cree una
     * nueva petición.
     */
    logoutPromise = null;

    throw error;
  }
}

export default function LogoutPage() {
  const navigate = useNavigate();

  const [error, setError] =
    useState("");

  const [attempt, setAttempt] =
    useState(0);

  useEffect(() => {
    let active = true;

    async function execute(): Promise<void> {
      try {
        setError("");

        await performLogout();

        if (!active) {
          return;
        }

        navigate("/login", {
          replace: true,
        });
      } catch (
        caughtError: unknown
      ) {
        if (!active) {
          return;
        }

        setError(
          getErrorMessage(
            caughtError,
          ),
        );
      }
    }

    void execute();

    return () => {
      active = false;
    };
  }, [navigate, attempt]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-200/60">
          <h1 className="text-xl font-bold text-slate-900">
            No se pudo cerrar la sesión
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              setAttempt(
                (current) =>
                  current + 1,
              )
            }
            className="mt-6 w-full rounded-2xl bg-violet-600 px-4 py-3 font-bold text-white transition hover:bg-violet-700"
          >
            Intentar nuevamente
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow">
        Cerrando sesión...
      </div>
    </main>
  );
}