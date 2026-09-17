import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";

import api, {
  clearClientSession,
  getAccessToken,
  refreshAccessToken,
} from "./services/api";

import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerOwnersPage from "./pages/OwnerOwnersPage";
import OwnerSupervisionPage from "./pages/OwnerSupervisionPage";
import UsersPage from "./pages/UsersPage";
import AdministratorsPage from "./pages/AdministratorsPage";
import ActivityLogsPage from "./pages/ActivityLogsPage";
import ContentPage from "./pages/ContentPage";
import TagsPage from "./pages/TagsPage";
import NotificationsPage from "./pages/NotificationsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import ReportsPage from "./pages/ReportsPage";
import SecurityPage from "./pages/SecurityPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import LogoutPage from "./pages/LogoutPage";
import ChatPage from "./pages/ChatPage";
import MyNotificationsPage from "./pages/MyNotificationsPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./layouts/AdminLayout";

type StoredRole = "admin" | "super_admin" | "owner" | null;

function normalizeRole(value: unknown): StoredRole {
  const role = String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");

  if (role === "owner" || role === "propietario") {
    return "owner";
  }
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

function resolveRoleFromUser(value: unknown): StoredRole {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const user = value as Record<string, unknown>;

  const candidates: unknown[] = [user.rol, user.rol_slug, user.role, user.slug];

  if (Array.isArray(user.roleSlugs)) {
    candidates.push(...user.roleSlugs);
  }

  if (Array.isArray(user.roles)) {
    candidates.push(...user.roles);
  }

  let ownerDetected = false;
  let superAdminDetected = false;
  let adminDetected = false;

  for (const candidate of candidates) {
    const role = normalizeRole(extractRoleSlug(candidate) ?? candidate);

    if (role === "owner") {
      ownerDetected = true;
      continue;
    }

    if (role === "super_admin") {
      superAdminDetected = true;
      continue;
    }

    if (role === "admin") {
      adminDetected = true;
    }
  }

  if (ownerDetected) {
    return "owner";
  }

  if (superAdminDetected) {
    return "super_admin";
  }

  return adminDetected ? "admin" : null;
}

function extractSessionUser(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const root = value as Record<string, unknown>;

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

type DashboardRedirectState =
  | {
      status: "loading";
      path: null;
    }
  | {
      status: "ready";
      path: string;
    };

function DashboardRedirect() {
  const [state, setState] = useState<DashboardRedirectState>({
    status: "loading",
    path: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function resolveSession(): Promise<void> {
      try {
        /*
         * Después de recargar la aplicación
         * el access token ya no existe porque
         * vive únicamente en memoria.
         *
         * La cookie HttpOnly de refresh sí
         * continúa disponible.
         */
        if (!getAccessToken()) {
          await refreshAccessToken();
        }

        /*
         * Consultamos al backend para no
         * confiar en datos antiguos guardados
         * en localStorage.
         */
        const response = await api.get<unknown>("/auth/me");

        const user = extractSessionUser(response.data);

        if (!user) {
          throw new Error("No se pudo recuperar el usuario de la sesión.");
        }

        const role = resolveRoleFromUser(user);

        let destination: string;

        if (role === "owner") {
          destination = "/owner/dashboard";
        } else if (role === "super_admin") {
          destination = "/superadmin/dashboard";
        } else if (role === "admin") {
          destination = "/admin/dashboard";
        } else {
          throw new Error("El usuario no posee un rol administrativo válido.");
        }

        /*
         * Guardamos solamente información
         * pública del usuario.
         *
         * Nunca guardamos accessToken ni
         * refreshToken.
         */
        localStorage.setItem("usuario", JSON.stringify(user));

        localStorage.removeItem("user");

        if (!cancelled) {
          setState({
            status: "ready",
            path: destination,
          });
        }
      } catch {
        clearClientSession();

        localStorage.removeItem("user");

        if (!cancelled) {
          setState({
            status: "ready",
            path: "/login",
          });
        }
      }
    }

    void resolveSession();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow">
          Verificando sesión...
        </div>
      </main>
    );
  }

  return <Navigate to={state.path} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Inicio inteligente según sesión y rol */}
        <Route path="/" element={<DashboardRedirect />} />

        {/* Rutas públicas */}
        <Route path="/login" element={<LoginPage />} />

        <Route path="/logout" element={<LogoutPage />} />

        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Panel Owner */}
        <Route element={<ProtectedRoute allowedRoles={["owner"]} />}>
          <Route element={<AdminLayout role="owner" />}>
            <Route path="/owner/dashboard" element={<OwnerDashboard />} />
            <Route path="/owner/owners" element={<OwnerOwnersPage />} />
            <Route
              path="/owner/supervision"
              element={<OwnerSupervisionPage />}
            />

            <Route
              path="/owner/users"
              element={<UsersPage role="superadmin" />}
            />

            <Route
              path="/owner/administrators"
              element={<AdministratorsPage />}
            />

            <Route path="/owner/logs" element={<ActivityLogsPage />} />

            <Route path="/owner/content" element={<ContentPage />} />

            <Route path="/owner/tags" element={<TagsPage />} />

            <Route
              path="/owner/notifications"
              element={<NotificationsPage />}
            />

            <Route
              path="/owner/subscriptions"
              element={<SubscriptionsPage />}
            />

            <Route
              path="/owner/reports"
              element={<ReportsPage role="superadmin" />}
            />

            <Route path="/owner/security" element={<SecurityPage />} />

            <Route path="/owner/settings" element={<SettingsPage />} />

            <Route path="/owner/analytics" element={<AnalyticsPage />} />

            <Route path="/owner/profile" element={<ProfilePage />} />

            <Route path="/owner/chat" element={<ChatPage />} />

            <Route path="/owner/chat/:conversacionId" element={<ChatPage />} />
          </Route>
        </Route>
        {/* Panel Superadministrador */}
        <Route
          element={<ProtectedRoute allowedRoles={["owner", "super_admin"]} />}
        >
          <Route element={<AdminLayout role="superadmin" />}>
            <Route
              path="/superadmin/dashboard"
              element={<SuperAdminDashboard />}
            />

            <Route
              path="/superadmin/users"
              element={<UsersPage role="superadmin" />}
            />

            <Route
              path="/superadmin/administrators"
              element={<AdministratorsPage />}
            />

            <Route path="/superadmin/logs" element={<ActivityLogsPage />} />

            <Route path="/superadmin/content" element={<ContentPage />} />

            <Route path="/superadmin/tags" element={<TagsPage />} />

            <Route
              path="/superadmin/notifications"
              element={<NotificationsPage />}
            />

            <Route
              path="/superadmin/subscriptions"
              element={<SubscriptionsPage />}
            />

            <Route
              path="/superadmin/reports"
              element={<ReportsPage role="superadmin" />}
            />

            <Route path="/superadmin/security" element={<SecurityPage />} />

            <Route path="/superadmin/settings" element={<SettingsPage />} />

            <Route path="/superadmin/analytics" element={<AnalyticsPage />} />

            <Route path="/superadmin/profile" element={<ProfilePage />} />

            <Route path="/superadmin/chat" element={<ChatPage />} />

            <Route
              path="/superadmin/chat/:conversacionId"
              element={<ChatPage />}
            />
          </Route>
        </Route>

        {/* Panel Administrador */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route element={<AdminLayout role="admin" />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />

            <Route path="/admin/users" element={<UsersPage role="admin" />} />

            <Route path="/admin/content" element={<ContentPage />} />

            <Route path="/admin/tags" element={<TagsPage />} />

            <Route
              path="/admin/notifications"
              element={<NotificationsPage />}
            />

            <Route
              path="/admin/reports"
              element={<ReportsPage role="admin" />}
            />

            <Route path="/admin/settings" element={<SettingsPage />} />

            <Route path="/admin/profile" element={<ProfilePage />} />

            <Route path="/admin/chat" element={<ChatPage />} />

            <Route path="/admin/chat/:conversacionId" element={<ChatPage />} />
          </Route>
        </Route>

        {/* Rutas privadas para ambos roles */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["admin", "super_admin", "owner"]} />
          }
        >
          <Route path="/my-notifications" element={<MyNotificationsPage />} />

          <Route
            path="/my-notifications/:notificationId"
            element={<MyNotificationsPage />}
          />
        </Route>

        {/* Ruta desconocida */}
        <Route path="*" element={<DashboardRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
