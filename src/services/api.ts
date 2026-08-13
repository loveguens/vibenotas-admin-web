import axios, {
  AxiosHeaders,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

type RefreshResponse = {
  accessToken: string;
};

type RetryableRequestConfig =
  InternalAxiosRequestConfig & {
    _retry?: boolean;
  };

const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3000";

/*
 * El access token vive únicamente
 * en memoria de JavaScript.
 *
 * Nunca se guarda en:
 * - localStorage
 * - sessionStorage
 * - cookies accesibles desde JS
 */
let accessToken: string | null = null;

/*
 * Solamente puede existir una renovación
 * de sesión al mismo tiempo.
 *
 * Si varias peticiones reciben 401
 * simultáneamente, todas esperan la misma
 * operación de refresh.
 */
let refreshPromise: Promise<string> | null =
  null;

export function setAccessToken(
  token: string | null,
): void {
  if (
    typeof token === "string" &&
    token.trim().length > 0
  ) {
    accessToken = token.trim();
    return;
  }

  accessToken = null;
}

export function getAccessToken():
  | string
  | null {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = null;
}

/*
 * Limpia el estado cliente de autenticación.
 *
 * El deviceIdentifier NO se elimina porque
 * identifica esta instalación/navegador y
 * debe mantenerse estable entre sesiones.
 */
export function clearClientSession(): void {
  clearAccessToken();

  localStorage.removeItem("usuario");

  /*
   * Limpieza de compatibilidad con la
   * implementación antigua.
   *
   * Nunca volvemos a guardar tokens aquí.
   */
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export function getStoredDeviceIdentifier():
  | string
  | null {
  const value = localStorage.getItem(
    "vibenotasDeviceIdentifier",
  );

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  return value.trim();
}

function isPublicAuthenticationRequest(
  requestUrl: string,
): boolean {
  return (
    requestUrl.includes("/auth/login") ||
    requestUrl.includes("/auth/register") ||
    requestUrl.includes(
      "/auth/verify-email",
    ) ||
    requestUrl.includes(
      "/auth/forgot-password",
    ) ||
    requestUrl.includes(
      "/auth/reset-password",
    ) ||
    requestUrl.includes(
      "/auth/mfa/complete-login",
    ) ||
    requestUrl.includes("/auth/refresh") ||
    requestUrl.includes("/auth/google")
  );
}

function redirectToLogin(): void {
  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

/*
 * Cliente principal.
 *
 * withCredentials es obligatorio porque
 * el refresh token vive en una cookie
 * HttpOnly administrada por el navegador.
 */
const api = axios.create({
  baseURL: API_URL,

  timeout: 15_000,

  withCredentials: true,

  headers: {
    Accept: "application/json",
  },
});

/*
 * Cliente independiente utilizado solamente
 * para renovar la sesión.
 *
 * No utiliza los interceptores de `api`,
 * evitando ciclos infinitos si
 * /auth/refresh devuelve 401.
 */
const refreshApi = axios.create({
  baseURL: API_URL,

  timeout: 15_000,

  withCredentials: true,

  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

/*
 * Renueva únicamente el access token.
 *
 * El refresh token:
 * - NO está disponible para JavaScript;
 * - NO viene en el JSON;
 * - NO se manda en el body;
 * - viaja automáticamente en la cookie
 *   HttpOnly.
 */
export async function refreshAccessToken():
  Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const deviceIdentifier =
      getStoredDeviceIdentifier();

    if (!deviceIdentifier) {
      throw new Error(
        "No existe un identificador de dispositivo para renovar la sesión.",
      );
    }

    const response =
      await refreshApi.post<RefreshResponse>(
        "/auth/refresh",
        {
          deviceIdentifier,
        },
      );

    const newAccessToken =
      response.data.accessToken;

    if (
      typeof newAccessToken !== "string" ||
      !newAccessToken.trim()
    ) {
      throw new Error(
        "El backend no devolvió un access token válido.",
      );
    }

    setAccessToken(newAccessToken);

    return newAccessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/*
 * REQUEST INTERCEPTOR
 *
 * Agrega el access token que existe
 * únicamente en memoria.
 */
api.interceptors.request.use(
  (
    config: InternalAxiosRequestConfig,
  ) => {
    config.headers = AxiosHeaders.from(
      config.headers,
    );

    const requestUrl =
      config.url ?? "";

    /*
     * Login, registro, MFA complete-login
     * y refresh no necesitan el access token.
     */
    if (
      isPublicAuthenticationRequest(
        requestUrl,
      )
    ) {
      config.headers.delete(
        "Authorization",
      );
    } else {
      const currentAccessToken =
        getAccessToken();

      if (currentAccessToken) {
        config.headers.set(
          "Authorization",
          `Bearer ${currentAccessToken}`,
        );
      } else {
        config.headers.delete(
          "Authorization",
        );
      }
    }

    /*
     * Axios debe generar automáticamente
     * Content-Type y boundary para FormData.
     */
    if (config.data instanceof FormData) {
      config.headers.delete(
        "Content-Type",
      );
    }

    return config;
  },

  (error: AxiosError) =>
    Promise.reject(error),
);

/*
 * RESPONSE INTERCEPTOR
 *
 * Si una petición protegida recibe 401:
 *
 * 1. intenta /auth/refresh;
 * 2. el navegador envía la cookie HttpOnly;
 * 3. guarda el nuevo access token en memoria;
 * 4. repite la petición original;
 * 5. si falla el refresh, finaliza la sesión.
 */
api.interceptors.response.use(
  (response) => response,

  async (
    error: AxiosError,
  ) => {
    const status =
      error.response?.status;

    const originalRequest =
      error.config as
        | RetryableRequestConfig
        | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl =
      originalRequest.url ?? "";

    /*
     * Un 401 generado directamente por
     * login, registro, refresh u otro
     * endpoint público de autenticación
     * se devuelve sin intentar otro refresh.
     */
    if (
      status !== 401 ||
      isPublicAuthenticationRequest(
        requestUrl,
      )
    ) {
      return Promise.reject(error);
    }

    /*
     * Impide ciclos infinitos.
     */
    if (originalRequest._retry) {
      clearClientSession();
      redirectToLogin();

      return Promise.reject(error);
    }

    const deviceIdentifier =
      getStoredDeviceIdentifier();

    if (!deviceIdentifier) {
      clearClientSession();
      redirectToLogin();

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newAccessToken =
        await refreshAccessToken();

      originalRequest.headers =
        AxiosHeaders.from(
          originalRequest.headers,
        );

      originalRequest.headers.set(
        "Authorization",
        `Bearer ${newAccessToken}`,
      );

      return api.request(
        originalRequest,
      );
    } catch (
      refreshError: unknown
    ) {
      clearClientSession();
      redirectToLogin();

      return Promise.reject(
        refreshError,
      );
    }
  },
);

export default api;