import { useState } from "react";
import { Link, useNavigate, type NavigateFunction } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import axios from "axios";
import "./LoginPage.css";

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
   * OWNER tiene la jerarquía máxima.
   * Debe evaluarse antes que super_admin,
   * ya que una cuenta puede poseer ambos roles.
   */
  if (roles.includes("owner") || roles.includes("propietario")) {
    navigate("/owner/dashboard", {
      replace: true,
    });

    return;
  }
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
    <main className="vn-login">
      <div className="vn-login__shell">
        <aside className="vn-login__feature" aria-label="Presentación VibeNotas">
          <div className="vn-login__brand">
            <img src="/vibenotas-logo.png" alt="" className="vn-login__logo" />
            <div>
              <p className="vn-login__brand-name">VibeNotas</p>
              <p className="vn-login__brand-caption">ADMINISTRACIÓN</p>
            </div>
          </div>
          <div className="vn-login__feature-copy">
            <span className="vn-login__eyebrow">✦ TU ESPACIO DE CONTROL</span>
            <h2>Las ideas merecen un <span>buen hogar.</span></h2>
            <p>
              Administra tu comunidad, organiza el contenido y acompaña el
              crecimiento de VibeNotas.
            </p>
          </div>
          <div className="vn-login__feature-footer">
            <span className="vn-login__status-dot" aria-hidden="true" />
            Acceso reservado al equipo administrativo
          </div>
        </aside>
        <section className="vn-login__form-panel" aria-labelledby="vn-login-heading">
          <div className="vn-login__mobile-brand">
            <img src="/vibenotas-logo.png" alt="" className="vn-login__logo" />
            <span>VibeNotas</span>
          </div>
          <p className="vn-login__form-eyebrow">PANEL ADMINISTRATIVO</p>
          <h1 id="vn-login-heading">¡Bienvenido de nuevo!</h1>
          <p className="vn-login__subtitle">
            Ingresa tus credenciales para continuar.
          </p>

          {error && (
            <div role="alert" className="vn-login__error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="vn-login__form">
            <div>
              <label htmlFor="vn-login-identifier" className="vn-login__field-label">
                Correo electrónico o usuario
              </label>
              <div className="vn-login__input-wrap">
                <Mail size={19} className="vn-login__field-icon" aria-hidden="true" />
                <input
                  id="vn-login-identifier"
                  type="text"
                  name="identifier"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="ejemplo@correo.com o tu usuario"
                  autoComplete="username"
                  className="vn-login__input"
                  disabled={loading}
                  maxLength={320}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="vn-login-password" className="vn-login__field-label">
                Contraseña
              </label>
              <div className="vn-login__input-wrap">
                <LockKeyhole size={19} className="vn-login__field-icon" aria-hidden="true" />
                <input
                  id="vn-login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Escribe tu contraseña"
                  autoComplete="current-password"
                  className="vn-login__input"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((currentValue) => !currentValue)}
                  disabled={loading}
                  className="vn-login__visibility"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={showPassword}
                  aria-controls="vn-login-password"
                >
                  {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>
            </div>

            <div className="vn-login__actions">
              <Link to="/forgot-password" className="vn-login__forgot">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <button type="submit" disabled={loading} className="vn-login__submit">
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>
          <p className="vn-login__legal">Acceso seguro · VibeNotas Admin</p>
        </section>
      </div>
    </main>
  );
}
