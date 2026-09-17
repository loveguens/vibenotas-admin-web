import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import api from "../services/api";

type ApiRole = {
  id: string;
  name: string;
  slug: string;
  priority: number;
};

type UserRole = {
  id: string;
  name: string;
  slug: string;
  priority: number;
};

type ManagedUser = {
  id: string;
  email: string;
  displayName: string;
  status: string;
  roles: UserRole[];
};

type ApiErrorResponse = {
  message?: string | string[];
  error?: string;
};

type CreateOwnerForm = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRole(value: unknown): UserRole | null {
  if (!isRecord(value)) {
    return null;
  }

  const source = isRecord(value.role) ? value.role : value;

  const id = typeof source.id === "string" ? source.id : "";

  const slug = typeof source.slug === "string" ? source.slug : "";

  if (!id || !slug) {
    return null;
  }

  return {
    id,
    slug,
    name: typeof source.name === "string" ? source.name : slug,
    priority: typeof source.priority === "number" ? source.priority : 0,
  };
}

function normalizeUser(value: unknown): ManagedUser | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id : "";

  const email =
    typeof value.email === "string"
      ? value.email
      : typeof value.correo === "string"
        ? value.correo
        : "";

  if (!id || !email) {
    return null;
  }

  const rawRoles = Array.isArray(value.roles) ? value.roles : [];

  const roles = rawRoles
    .map(normalizeRole)
    .filter((role): role is UserRole => role !== null);

  return {
    id,
    email,
    displayName:
      typeof value.displayName === "string"
        ? value.displayName
        : typeof value.nombre === "string"
          ? value.nombre
          : email,
    status: typeof value.status === "string" ? value.status : "UNKNOWN",
    roles,
  };
}

function extractUsers(value: unknown): ManagedUser[] {
  if (Array.isArray(value)) {
    return value
      .map(normalizeUser)
      .filter((user): user is ManagedUser => user !== null);
  }

  if (!isRecord(value)) {
    return [];
  }

  const candidates = [value.users, value.items, value.results, value.data];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return extractUsers(candidate);
    }

    if (isRecord(candidate)) {
      const nested = extractUsers(candidate);

      if (nested.length > 0) {
        return nested;
      }
    }
  }

  return [];
}

function extractCreatedUserId(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.id === "string" && value.id) {
    return value.id;
  }

  const candidates = [value.user, value.usuario, value.data];

  for (const candidate of candidates) {
    if (!isRecord(candidate)) {
      continue;
    }

    const nested = extractCreatedUserId(candidate);

    if (nested) {
      return nested;
    }
  }

  return null;
}

function getCurrentUserId(): string | null {
  const raw = localStorage.getItem("usuario");

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) {
      return null;
    }

    const candidates = [parsed, parsed.user, parsed.usuario, parsed.data];

    for (const candidate of candidates) {
      if (isRecord(candidate) && typeof candidate.id === "string") {
        return candidate.id;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(" ");
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    return (
      error.response?.data?.error || `Error ${error.response?.status ?? ""}`
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error inesperado.";
}

function roleLabel(slug: string): string {
  switch (slug) {
    case "owner":
      return "Owner";

    case "super_admin":
      return "Super Admin";

    case "admin":
      return "Admin";

    case "user":
      return "Usuario";

    default:
      return slug;
  }
}

function roleStyle(slug: string): string {
  switch (slug) {
    case "owner":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";

    case "super_admin":
      return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-500/20 dark:bg-fuchsia-500/10 dark:text-fuchsia-300";

    case "admin":
      return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300";
  }
}

export default function OwnerOwnersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);

  const [roles, setRoles] = useState<ApiRole[]>([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [selectedExistingUser, setSelectedExistingUser] = useState("");

  const [selectedRoleByUser, setSelectedRoleByUser] = useState<
    Record<string, string>
  >({});

  const [createForm, setCreateForm] = useState<CreateOwnerForm>({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
  });

  const currentUserId = useMemo(() => getCurrentUserId(), []);

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError("");

      const [usersResponse, rolesResponse] = await Promise.all([
        api.get<unknown>("/users", {
          params: {
            page: 1,
            limit: 100,
          },
        }),

        api.get<ApiRole[]>("/roles"),
      ]);

      setUsers(extractUsers(usersResponse.data));

      setRoles(Array.isArray(rolesResponse.data) ? rolesResponse.data : []);
    } catch (caughtError: unknown) {
      setError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const ownerRole = roles.find((role) => role.slug === "owner");

  const owners = useMemo(
    () =>
      users.filter((user) => user.roles.some((role) => role.slug === "owner")),
    [users],
  );

  const candidates = useMemo(
    () =>
      users.filter((user) => !user.roles.some((role) => role.slug === "owner")),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter(
      (user) =>
        user.displayName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.roles.some((role) => role.slug.toLowerCase().includes(query)),
    );
  }, [search, users]);

  async function promoteExistingOwner(): Promise<void> {
    if (!ownerRole || !selectedExistingUser) {
      return;
    }

    if (owners.length >= 2) {
      setError("Ya existen 2 propietarios.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await api.post(`/users/${selectedExistingUser}/roles/${ownerRole.id}`);

      setSelectedExistingUser("");

      setSuccess("El segundo OWNER fue asignado correctamente.");

      await loadData();
    } catch (caughtError: unknown) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSaving(false);
    }
  }

  async function createNewOwner(): Promise<void> {
    if (!ownerRole) {
      setError("No se encontró el rol owner.");
      return;
    }

    if (owners.length >= 2) {
      setError("VibeNotas ya tiene 2 propietarios.");
      return;
    }

    const firstName = createForm.firstName.trim();

    const lastName = createForm.lastName.trim();

    const username = createForm.username.trim();

    const email = createForm.email.trim().toLowerCase();

    const password = createForm.password;

    if (!firstName || !lastName || !username || !email || !password) {
      setError("Completa todos los campos.");
      return;
    }

    let createdUserId: string | null = null;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const registerResponse = await api.post<unknown>("/auth/register", {
        firstName,
        lastName,
        username,
        email,
        password,
      });

      createdUserId = extractCreatedUserId(registerResponse.data);

      if (!createdUserId) {
        throw new Error(
          "La cuenta fue registrada, pero no se pudo obtener su ID.",
        );
      }

      try {
        await api.post(`/users/${createdUserId}/roles/${ownerRole.id}`);
      } catch (roleError) {
        try {
          await api.patch(`/users/${createdUserId}/status`, {
            status: "DISABLED",
          });
        } catch {
          // Conservamos el error original.
        }

        throw roleError;
      }

      setCreateForm({
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        password: "",
      });

      setSuccess(
        "Cuenta OWNER creada correctamente. Si la cuenta requiere verificación de correo, debe completarla antes de iniciar sesión.",
      );

      await loadData();
    } catch (caughtError: unknown) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSaving(false);
    }
  }

  async function assignRole(user: ManagedUser): Promise<void> {
    const roleId = selectedRoleByUser[user.id];

    if (!roleId) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await api.post(`/users/${user.id}/roles/${roleId}`);

      setSuccess(`Rol actualizado para ${user.displayName}.`);

      await loadData();
    } catch (caughtError: unknown) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSaving(false);
    }
  }

  async function revokeRole(user: ManagedUser, role: UserRole): Promise<void> {
    const confirmed = window.confirm(
      `¿Quitar el rol ${roleLabel(role.slug)} a ${user.displayName}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await api.delete(`/users/${user.id}/roles/${role.id}`);

      setSuccess(
        `Rol ${roleLabel(role.slug)} eliminado de ${user.displayName}.`,
      );

      await loadData();
    } catch (caughtError: unknown) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="space-y-5 pb-8">
        <div className="h-40 animate-pulse rounded-3xl bg-slate-200 dark:bg-white/5" />

        <div className="h-80 animate-pulse rounded-3xl bg-slate-200 dark:bg-white/5" />
      </section>
    );
  }

  return (
    <section className="space-y-7 pb-8 text-slate-900 dark:text-white">
      <article className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-violet-50 p-6 shadow-sm dark:border-amber-500/15 dark:from-amber-500/10 dark:via-[#172033] dark:to-violet-950/20 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="text-amber-600 dark:text-amber-300" />

              <span className="text-xs font-black uppercase tracking-[0.15em] text-amber-700 dark:text-amber-300">
                Control Owner
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-black">
              Propietarios y jerarquía
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Administra los dos puestos Owner y controla los roles de la
              plataforma.
            </p>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-white/80 px-5 py-3 dark:border-amber-500/20 dark:bg-black/20">
            <Crown className="text-amber-600 dark:text-amber-300" />

            <div>
              <p className="text-2xl font-black">{owners.length}/2</p>

              <p className="text-xs text-slate-500">propietarios</p>
            </div>
          </div>
        </div>
      </article>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <AlertTriangle className="mt-0.5 shrink-0" size={19} />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 shrink-0" size={19} />
          <p className="text-sm font-semibold">{success}</p>
        </div>
      )}

      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#172033]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
              Propietarios
            </p>

            <h2 className="mt-1 text-xl font-black">Cuentas OWNER</h2>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {owners.map((owner) => (
            <div
              key={owner.id}
              className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/15 dark:bg-amber-500/[0.06]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Crown size={17} className="text-amber-600" />

                    <p className="font-black">{owner.displayName}</p>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">{owner.email}</p>

                  <p className="mt-3 text-xs font-bold text-amber-700 dark:text-amber-300">
                    {owner.id === currentUserId ? "Tu cuenta" : "OWNER"}
                  </p>
                </div>

                {owner.id !== currentUserId &&
                  owners.length > 1 &&
                  ownerRole && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        void revokeRole(owner, {
                          id: ownerRole.id,
                          name: ownerRole.name,
                          slug: ownerRole.slug,
                          priority: ownerRole.priority,
                        })
                      }
                      className="rounded-xl p-2 text-red-500 transition hover:bg-red-100 dark:hover:bg-red-500/10"
                      title="Quitar OWNER"
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
              </div>
            </div>
          ))}

          {owners.length < 2 && (
            <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-white/10 dark:bg-white/[0.02]">
              <div>
                <UserPlus className="mx-auto text-slate-400" size={24} />

                <p className="mt-2 text-sm font-bold">
                  Segundo puesto disponible
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Puedes crear o promover otro OWNER.
                </p>
              </div>
            </div>
          )}
        </div>
      </article>

      {owners.length < 2 && (
        <div className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#172033]">
            <ShieldCheck className="text-violet-600 dark:text-violet-300" />

            <h2 className="mt-4 text-xl font-black">
              Promover cuenta existente
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Convierte un usuario actual en el segundo Owner.
            </p>

            <select
              value={selectedExistingUser}
              onChange={(event) => setSelectedExistingUser(event.target.value)}
              className="mt-5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-slate-900"
            >
              <option value="">Selecciona una cuenta</option>

              {candidates.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName} · {user.email}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={saving || !selectedExistingUser}
              onClick={() => void promoteExistingOwner()}
              className="mt-4 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Promover a OWNER
            </button>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#172033]">
            <UserPlus className="text-amber-600 dark:text-amber-300" />

            <h2 className="mt-4 text-xl font-black">
              Crear nueva cuenta OWNER
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Registra una cuenta nueva y asígnale el rol Owner.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <input
                value={createForm.firstName}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    firstName: event.target.value,
                  }))
                }
                placeholder="Nombre"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900"
              />

              <input
                value={createForm.lastName}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    lastName: event.target.value,
                  }))
                }
                placeholder="Apellido"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900"
              />

              <input
                value={createForm.username}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                }
                placeholder="Usuario"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900"
              />

              <input
                type="email"
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="Correo"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900"
              />

              <input
                type="password"
                value={createForm.password}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder="Contraseña"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm sm:col-span-2 dark:border-white/10 dark:bg-slate-900"
              />
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void createNewOwner()}
              className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
            >
              Crear segundo OWNER
            </button>
          </article>
        </div>
      )}

      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#172033]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-violet-700 dark:text-violet-300">
              Jerarquía
            </p>

            <h2 className="mt-1 text-xl font-black">Gestión global de roles</h2>

            <p className="mt-1 text-xs text-slate-500">
              OWNER puede administrar USER, ADMIN, SUPER_ADMIN y OWNER.
            </p>
          </div>

          <div className="relative w-full md:max-w-sm">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar usuario..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm dark:border-white/10 dark:bg-slate-900"
            />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.025]"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Users size={17} className="shrink-0 text-slate-400" />

                    <p className="truncate font-black">{user.displayName}</p>
                  </div>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {user.email} · {user.status}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {user.roles.map((role) => (
                      <span
                        key={role.id}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${roleStyle(
                          role.slug,
                        )}`}
                      >
                        {roleLabel(role.slug)}

                        {!(
                          user.id === currentUserId && role.slug === "owner"
                        ) && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void revokeRole(user, role)}
                            className="ml-1 opacity-60 transition hover:opacity-100"
                            title={`Quitar ${roleLabel(role.slug)}`}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <select
                    value={selectedRoleByUser[user.id] ?? ""}
                    onChange={(event) =>
                      setSelectedRoleByUser((current) => ({
                        ...current,
                        [user.id]: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-slate-900"
                  >
                    <option value="">Asignar rol</option>

                    {roles
                      .filter(
                        (role) =>
                          !user.roles.some(
                            (currentRole) => currentRole.id === role.id,
                          ),
                      )
                      .sort((left, right) => right.priority - left.priority)
                      .map((role) => (
                        <option key={role.id} value={role.id}>
                          {roleLabel(role.slug)}
                        </option>
                      ))}
                  </select>

                  <button
                    type="button"
                    disabled={saving || !selectedRoleByUser[user.id]}
                    onClick={() => void assignRole(user)}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40 dark:bg-white dark:text-slate-950"
                  >
                    Asignar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
