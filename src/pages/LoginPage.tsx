import { useState } from "react";
import { Link, useNavigate, type NavigateFunction } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import axios from "axios";

import api, { clearClientSession, setAccessToken } from "../services/api";

type Usuario = {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  roles: string[];
};

type Session = {
  id: string;
  deviceId?: string;
  status: string;
  createdAt?: string;
  idleExpiresAt?: string;
  absoluteExpiresAt?: string;
};

type LoginSuccessResponse = {
  message: string;
  tokenType: "Bearer";
  accessToken: string;
  accessExpiresInSeconds: number;
  session: Session;
  user: Usuario;
};

type MfaChallengeResponse = {
  mfaRequired: true;
  challengeToken: string;
  challengeExpiresAt: string;
  challengeExpiresInSeconds: number;
};

type LoginResponse = LoginSuccessResponse | MfaChallengeResponse;

type ErrorResponse = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

const DEVICE_IDENTIFIER_KEY = "vibenotasDeviceIdentifier";

function getDeviceIdentifier(): string {
  const currentIdentifier = localStorage.getItem(DEVICE_IDENTIFIER_KEY);

  if (
    currentIdentifier &&
    currentIdentifier.length >= 16 &&
    currentIdentifier.length <= 255
  ) {
    return currentIdentifier;
  }

  const newIdentifier = crypto.randomUUID();

  /*
   * No es un token ni una credencial.
   * Identifica esta instalación del navegador.
   *
   * Debe mantenerse estable porque
   * /auth/refresh utiliza el mismo
   * deviceIdentifier.
   */
  localStorage.setItem(DEVICE_IDENTIFIER_KEY, newIdentifier);

  return newIdentifier;
}

function isMfaChallenge(
  response: LoginResponse,
): response is MfaChallengeResponse {
  return "mfaRequired" in response && response.mfaRequired === true;
}

function storeSession(response: LoginSuccessResponse): void {
  if (!response.accessToken || !response.user) {
    throw new Error("El backend devolvió una sesión incompleta.");
  }

  /*
   * El access token vive únicamente
   * en memoria de JavaScript.
   *
   * Nunca se guarda en localStorage
   * ni sessionStorage.
   */
  setAccessToken(response.accessToken);

  /*
   * Conservamos por ahora solamente
   * los datos públicos del usuario.
   *
   * No contiene accessToken ni
   * refreshToken.
   */
  localStorage.setItem("usuario", JSON.stringify(response.user));
}

function getRoleSlugs(user: Usuario): string[] {
  return (user.roles ?? [])
    .filter((role): role is string => typeof role === "string")
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean);
}

function redirectByRole(user: Usuario, navigate: NavigateFunction): void {
  const roles = getRoleSlugs(user);

  /*
   * super_admin debe evaluarse primero.
   *
   * Un superadministrador puede tener
   * también otros roles asignados.
   */
  if (roles.includes("super_admin") || roles.includes("superadmin")) {
    navigate("/superadmin/dashboard", {
      replace: true,
    });

    return;
  }

  if (roles.includes("admin") || roles.includes("administrator")) {
    navigate("/admin/dashboard", {
      replace: true,
    });

    return;
  }

  throw new Error(
    "Este usuario no tiene permisos para entrar al panel administrativo.",
  );
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ErrorResponse>(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(" ");
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    if (!error.response) {
      return (
        "No se pudo conectar con el backend. " +
        "Verifica que NestJS esté ejecutándose en http://localhost:3000."
      );
    }

    const backendError = error.response.data?.error;

    if (typeof backendError === "string" && backendError.trim()) {
      return backendError;
    }

    return "No se pudo iniciar sesión.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error inesperado.";
}

export default function LoginPage() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");

  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const normalizedIdentifier = identifier.trim();

    if (!normalizedIdentifier || !password) {
      setError("Completa tu correo o usuario y contraseña.");

      return;
    }

    try {
      setLoading(true);
      setError("");

      /*
       * Evita mantener credenciales de
       * una sesión anterior mientras
       * intentamos iniciar una nueva.
       */
      clearClientSession();

      const deviceIdentifier = getDeviceIdentifier();

      const response = await api.post<LoginResponse>("/auth/login", {
        identifier: normalizedIdentifier,

        password,

        deviceIdentifier,

        deviceName: "VibeNotas Web",

        platform: "web",
      });

      /*
       * Cuando MFA está habilitado,
       * /auth/login NO entrega tokens.
       *
       * El backend entrega un challenge
       * que posteriormente debe enviarse
       * a /auth/mfa/complete-login.
       */
      if (isMfaChallenge(response.data)) {
        sessionStorage.setItem(
          "mfaChallengeToken",
          response.data.challengeToken,
        );

        sessionStorage.setItem(
          "mfaChallengeExpiresAt",
          response.data.challengeExpiresAt,
        );

        setError(
          "Esta cuenta requiere verificación MFA. " +
            "La pantalla de verificación MFA debe completarse antes de entrar.",
        );

        return;
      }

      /*
       * Login normal:
       *
       * 1. guardamos los tokens;
       * 2. guardamos el usuario;
       * 3. después redirigimos.
       */
      storeSession(response.data);

      redirectByRole(response.data.user, navigate);
    } catch (caughtError: unknown) {
      console.error("Error al iniciar sesión:", caughtError);

      clearClientSession();

      setError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-xl font-bold text-white">
            V
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Panel VibeNotas</h1>

          <p className="mt-2 text-sm text-slate-500">
            Accede al panel administrativo.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Correo o nombre de usuario
            </span>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 transition focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100">
              <Mail size={18} className="shrink-0 text-slate-400" />

              <input
                type="text"
                name="identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="Correo o nombre de usuario"
                autoComplete="username"
                className="w-full bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
                disabled={loading}
                maxLength={320}
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Contraseña
            </span>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 transition focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100">
              <LockKeyhole size={18} className="shrink-0 text-slate-400" />

              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                className="w-full bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
                disabled={loading}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((currentValue) => !currentValue)}
                disabled={loading}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                title={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </label>

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm font-semibold text-violet-700 underline decoration-violet-300 underline-offset-4 transition hover:text-violet-900"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-violet-600 px-4 py-4 font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>
      </section>
    </main>
  );
}
