import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import api, {
  clearClientSession,
  getAccessToken,
  refreshAccessToken,
} from "../services/api";

type ProtectedRole = "admin" | "super_admin";

type ProtectedRouteProps = {
  allowedRoles?: ProtectedRole[];
};

type SessionState =
  | {
      status: "loading";
      user: null;
    }
  | {
      status: "authenticated";
      user: Record<string, unknown>;
    }
  | {
      status: "unauthenticated";
      user: null;
    };

function extractUser(parsed: unknown): Record<string, unknown> | null {
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const root = parsed as Record<string, unknown>;

  const data =
    typeof root.data === "object" && root.data !== null
      ? (root.data as Record<string, unknown>)
      : null;

  const candidate =
    data?.usuario ??
    data?.user ??
    root.usuario ??
    root.user ??
    root.data ??
    root;

  if (typeof candidate !== "object" || candidate === null) {
    return null;
  }

  return candidate as Record<string, unknown>;
}

function normalizeRole(value: unknown): ProtectedRole | null {
  const role = String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");

  if (
    role === "super_admin" ||
    role === "superadmin" ||
    role === "super_administrador"
  ) {
    return "super_admin";
  }

  if (
    role === "admin" ||
    role === "administrator" ||
    role === "administrador"
  ) {
    return "admin";
  }

  return null;
}

function extractRoleSlug(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.slug === "string" && record.slug.trim()) {
    return record.slug;
  }

  if (typeof record.role === "object" && record.role !== null) {
    const nestedRole = record.role as Record<string, unknown>;

    if (typeof nestedRole.slug === "string" && nestedRole.slug.trim()) {
      return nestedRole.slug;
    }
  }

  return null;
}

function resolveRole(user: Record<string, unknown>): ProtectedRole | null {
  const candidates: unknown[] = [user.rol, user.rol_slug, user.role, user.slug];

  if (Array.isArray(user.roleSlugs)) {
    candidates.push(...user.roleSlugs);
  }

  if (Array.isArray(user.roles)) {
    candidates.push(...user.roles);
  }

  let adminDetected = false;

  for (const candidate of candidates) {
    const role = normalizeRole(extractRoleSlug(candidate) ?? candidate);

    if (role === "super_admin") {
      return "super_admin";
    }

    if (role === "admin") {
      adminDetected = true;
    }
  }

  return adminDetected ? "admin" : null;
}

function getUserId(user: Record<string, unknown>): string | null {
  const rawId = user.id ?? user.usuario_id;

  if (typeof rawId !== "string" && typeof rawId !== "number") {
    return null;
  }

  const id = String(rawId).trim();

  return id || null;
}

function persistPublicUser(user: Record<string, unknown>): void {
  localStorage.setItem("usuario", JSON.stringify(user));

  /*
   * Limpieza de compatibilidad con
   * implementaciones anteriores.
   */
  localStorage.removeItem("user");
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();

  const [session, setSession] = useState<SessionState>({
    status: "loading",
    user: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession(): Promise<void> {
      try {
        /*
         * Después de un F5 el access token
         * desaparece porque vive solamente
         * en memoria.
         *
         * La cookie HttpOnly del refresh
         * continúa en el navegador.
         */
        if (!getAccessToken()) {
          await refreshAccessToken();
        }

        /*
         * Verificamos la sesión contra el
         * backend y obtenemos datos actuales
         * del usuario.
         */
        const response = await api.get<unknown>("/auth/me");

        const user = extractUser(response.data);

        if (!user) {
          throw new Error("El backend no devolvió un usuario válido.");
        }

        const userId = getUserId(user);

        const role = resolveRole(user);

        if (!userId || !role) {
          throw new Error(
            "La sesión no contiene un usuario administrativo válido.",
          );
        }

        persistPublicUser(user);

        if (!cancelled) {
          setSession({
            status: "authenticated",
            user,
          });
        }
      } catch {
        clearClientSession();

        localStorage.removeItem("user");

        if (!cancelled) {
          setSession({
            status: "unauthenticated",
            user: null,
          });
        }
      }
    }

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, []);

  if (session.status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow">
          Verificando sesión...
        </div>
      </main>
    );
  }

  if (session.status === "unauthenticated") {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  const user = session.user;

  const role = resolveRole(user);

  if (!role) {
    clearClientSession();

    return <Navigate to="/login" replace />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    const dashboard =
      role === "super_admin" ? "/superadmin/dashboard" : "/admin/dashboard";

    return <Navigate to={dashboard} replace />;
  }

  return <Outlet />;
}
