import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  Clock3,
  Crown,
  Download,
  FileText,
  Folder,
  Globe2,
  MonitorSmartphone,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Smartphone,
  StickyNote,
  UserCheck,
  UserPlus,
  UserRound,
  UserX,
  Wifi,
  X,
} from "lucide-react";
import api from "../services/api";
import axios from "axios";

type Role = "admin" | "superadmin";

type User = {
  id: string;
  nombre: string;
  correo: string;
  telefono?: string | null;
  estado?: string;
  rol?: string;
  rol_nombre?: string;
  plan?: string;
  plan_nombre?: string;
  creado_en?: string;
  ultima_actividad?: string;
  foto_perfil?: string | null;
  notas_total?: number;

  // Datos de seguridad, sesiones y dispositivo.
  ultimo_inicio_sesion?: string | null;
  dispositivo_actual?: string | null;
  sistema_operativo?: string | null;
  navegador?: string | null;
  ip_ultima?: string | null;
  sesiones_activas?: number | null;

    contenido?: {
    notas: number;
    checklists: number;
    carpetas: number;
    documentos: number;
  };
};



type ApiRoleAssignment = {
  assignedAt: string;
  expiresAt: string | null;
  role: {
    id: string;
    name: string;
    slug: string;
    priority: number;
  };
};

type ApiUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  status: string;
  emailVerifiedAt: string | null;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: ApiRoleAssignment[];
};

type UsersResponse = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  users: ApiUser[];
};

type UserDetailResponse = ApiUser;

type ManageableUserStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "DISABLED";

type UsersPageProps = {
  role: Role;
};

type FilterKey = "todos" | "activos" | "suspendidos" | "vip" | "free";

function getStatusLabel(user: User) {
  return user.estado || "activo";
}

function getPlanLabel(user: User) {
  return (
    user.plan_nombre ||
    user.plan ||
    "No disponible"
  );
}

function getInitials(nombre: string) {
  return nombre
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function formatDate(dateValue?: string) {
  if (!dateValue) return "â€”";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "â€”";
  }

  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isNormalUser(user: User) {
  const role = `${user.rol ?? ""} ${user.rol_nombre ?? ""}`
    .toLowerCase()
    .trim();

  return !role.includes("admin") && !role.includes("administrador");
}

function mapApiUser(apiUser: ApiUser): User {
  const now = Date.now();

  const activeRoles = apiUser.roles.filter(
    ({ expiresAt }) => {
      if (!expiresAt) return true;

      const expiration =
        new Date(expiresAt).getTime();

      return (
        !Number.isNaN(expiration) &&
        expiration > now
      );
    },
  );

  return {
    id: apiUser.id,
    nombre: apiUser.displayName,
    correo: apiUser.email,
    estado: apiUser.status,
    rol: activeRoles
      .map(({ role }) => role.slug)
      .join(" "),
    rol_nombre: activeRoles
      .map(({ role }) => role.name)
      .join(", "),
    creado_en: apiUser.createdAt,
    ultima_actividad:
      apiUser.lastLoginAt ??
      apiUser.updatedAt,
    foto_perfil: apiUser.avatarUrl,
  };
}

function toManageableStatus(
  value: string,
): ManageableUserStatus | null {
  const status = value
    .trim()
    .toLowerCase();

  if (
    status === "active" ||
    status === "activo"
  ) {
    return "ACTIVE";
  }

  if (
    status === "suspended" ||
    status === "suspendido"
  ) {
    return "SUSPENDED";
  }

  if (
    status === "disabled" ||
    status === "deshabilitado"
  ) {
    return "DISABLED";
  }

  return null;
}
export default function UsersPage({ role }: UsersPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<FilterKey>("todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
const [userToEdit, setUserToEdit] = useState<User | null>(null);

const [editNombre, setEditNombre] = useState("");
const [editCorreo, setEditCorreo] = useState("");
const [editTelefono, setEditTelefono] = useState("");
const [editEstado, setEditEstado] = useState("activo");
const [editContrasena, setEditContrasena] = useState("");
const [savingEdit, setSavingEdit] = useState(false);
const [, setSuccess] = useState("");

const [showCreateModal, setShowCreateModal] = useState(false);
const [creatingUser, setCreatingUser] = useState(false);

const [createNombre, setCreateNombre] = useState("");
const [createCorreo, setCreateCorreo] = useState("");
const [createTelefono, setCreateTelefono] = useState("");
const [createContrasena, setCreateContrasena] = useState("");
const [createPlan, setCreatePlan] = useState("free");

const [showActionsModal, setShowActionsModal] = useState(false);
const [userForActions, setUserForActions] = useState<User | null>(null);
const [changingPlan, setChangingPlan] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      const firstResponse =
        await api.get<UsersResponse>(
          "/users",
          {
            params: {
              page: 1,
              limit: 100,
              sortBy: "createdAt",
              sortOrder: "desc",
            },
          },
        );

      const apiUsers = [
        ...firstResponse.data.users,
      ];

      for (
        let page = 2;
        page <= firstResponse.data.totalPages;
        page += 1
      ) {
        const pageResponse =
          await api.get<UsersResponse>(
            "/users",
            {
              params: {
                page,
                limit: 100,
                sortBy: "createdAt",
                sortOrder: "desc",
              },
            },
          );

        apiUsers.push(
          ...pageResponse.data.users,
        );
      }

      setUsers(
        apiUsers
          .map(mapApiUser)
          .filter(isNormalUser),
      );
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message ||
              "No se pudieron cargar los usuarios."
          : err instanceof Error
            ? err.message
            : "No se pudieron cargar los usuarios.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [role]);

  async function openUserProfile(user: User) {
    setLoadingUserDetail(true);
    setError("");

    try {
      const response =
        await api.get<UserDetailResponse>(
          `/users/${user.id}`,
        );

      setSelectedUser({
        ...user,
        ...mapApiUser(response.data),
      });

      closeActions();
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message ||
              "No se pudo cargar el detalle del usuario."
          : err instanceof Error
            ? err.message
            : "No se pudo cargar el detalle del usuario.",
      );
    } finally {
      setLoadingUserDetail(false);
    }
  }

  const filteredUsers = useMemo(() => {
    const text = search.trim().toLowerCase();

    return users.filter((user) => {
      const status = getStatusLabel(user).toLowerCase();
      const plan = getPlanLabel(user).toLowerCase();

      const matchesSearch =
        !text ||
        user.nombre.toLowerCase().includes(text) ||
        user.correo.toLowerCase().includes(text) ||
        String(user.id).includes(text);

      const matchesFilter =
        activeFilter === "todos" ||
        (activeFilter === "activos" &&
          (status === "activo" || status === "active")) ||
        (activeFilter === "suspendidos" &&
          (status === "suspendido" || status === "suspended")) ||
        (activeFilter === "vip" && plan.includes("vip")) ||
        (activeFilter === "free" && plan.includes("free"));

      return matchesSearch && matchesFilter;
    });
  }, [search, users, activeFilter]);

  const totals = useMemo(() => {
    return {
      total: users.length,
      activos: users.filter((user) => {
        const status = getStatusLabel(user).toLowerCase();
        return status === "activo" || status === "active";
      }).length,
      suspendidos: users.filter((user) => {
        const status = getStatusLabel(user).toLowerCase();
        return status === "suspendido" || status === "suspended";
      }).length,
      vip: users.filter((user) =>
        getPlanLabel(user).toLowerCase().includes("vip")
      ).length,
    };
  }, [users]);

  function exportCsv() {
    const headers = [
      "ID",
      "Nombre",
      "Correo",
      "Plan",
      "Estado",
      "Registro",
    ];

    const rows = filteredUsers.map((user) => [
      user.id,
      user.nombre,
      user.correo,
      getPlanLabel(user),
      getStatusLabel(user),
      user.creado_en ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "usuarios-vibenotas.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  const filters: { key: FilterKey; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "activos", label: "Activos" },
    { key: "suspendidos", label: "Suspendidos" },
    { key: "free", label: "Plan Free" },
    { key: "vip", label: "Plan VIP" },
  ];

  function openEditUser(user: User) {
  setUserToEdit(user);
  setEditNombre(user.nombre);
  setEditCorreo(user.correo);
  setEditTelefono(user.telefono || "");
  setEditEstado(getStatusLabel(user));
  setEditContrasena("");

  setSelectedUser(null);
  setShowEditModal(true);
}

async function updateUser(
  event: React.FormEvent<HTMLFormElement>,
) {
  event.preventDefault();

  if (!userToEdit) return;

  const displayName = editNombre.trim();
  const email = editCorreo.trim();

  if (displayName.length < 2) {
    setError(
      "El nombre debe tener al menos 2 caracteres.",
    );
    return;
  }

  if (editContrasena.trim()) {
    setError(
      "El backend administrativo no permite cambiar contraseñas desde esta operación.",
    );
    return;
  }

  if (
    editTelefono.trim() !==
    (userToEdit.telefono ?? "").trim()
  ) {
    setError(
      "El backend administrativo actual no expone edición de teléfono.",
    );
    return;
  }

  const requestedStatus =
    toManageableStatus(editEstado);

  const currentStatus =
    toManageableStatus(
      getStatusLabel(userToEdit),
    );

  if (!requestedStatus) {
    setError("Estado de usuario inválido.");
    return;
  }

  const identityChanged =
    displayName !== userToEdit.nombre ||
    email.toLowerCase() !==
      userToEdit.correo.toLowerCase();

  const statusChanged =
    requestedStatus !== currentStatus;

  if (!identityChanged && !statusChanged) {
    setShowEditModal(false);
    setUserToEdit(null);
    return;
  }

  setSavingEdit(true);
  setError("");

  try {
    if (identityChanged) {
      await api.patch<ApiUser>(
        `/users/${userToEdit.id}`,
        {
          displayName,
          email,
        },
      );
    }

    if (statusChanged) {
      await api.patch<ApiUser>(
        `/users/${userToEdit.id}/status`,
        {
          status: requestedStatus,
        },
      );
    }

    setSuccess(
      "Usuario actualizado correctamente.",
    );

    setShowEditModal(false);
    setUserToEdit(null);

    await loadUsers();
  } catch (err) {
    setError(
      axios.isAxiosError(err)
        ? err.response?.data?.message ||
            "No se pudo actualizar el usuario."
        : err instanceof Error
          ? err.message
          : "No se pudo actualizar el usuario.",
    );
  } finally {
    setSavingEdit(false);
  }
}

function getAvatarUrl(path?: string | null) {
  return path ?? "";
}

function openActions(user: User) {
  setUserForActions(user);
  setShowActionsModal(true);
}

function closeActions() {
  setShowActionsModal(false);
  setUserForActions(null);
}

async function changeUserStatus(user: User) {
  const currentStatus =
    toManageableStatus(
      getStatusLabel(user),
    );

  const newStatus: ManageableUserStatus =
    currentStatus === "ACTIVE"
      ? "SUSPENDED"
      : "ACTIVE";

  const confirmed = window.confirm(
    newStatus === "SUSPENDED"
      ? `¿Quieres suspender a ${user.nombre}? Sus sesiones activas serán revocadas.`
      : `¿Quieres activar nuevamente a ${user.nombre}?`,
  );

  if (!confirmed) return;

  setError("");
  setSuccess("");

  try {
    await api.patch<ApiUser>(
      `/users/${user.id}/status`,
      {
        status: newStatus,
      },
    );

    setSuccess(
      newStatus === "ACTIVE"
        ? "Usuario activado correctamente."
        : "Usuario suspendido correctamente.",
    );

    closeActions();
    setSelectedUser(null);

    await loadUsers();
  } catch (err) {
    setError(
      axios.isAxiosError(err)
        ? err.response?.data?.message ||
            "No se pudo cambiar el estado."
        : err instanceof Error
          ? err.message
          : "No se pudo cambiar el estado.",
    );
  }
}

async function createUser(
  event: React.FormEvent<HTMLFormElement>,
) {
  event.preventDefault();

  setCreatingUser(false);
  setError(
    "La creación administrativa de usuarios todavía no está implementada en el backend NestJS.",
  );
}

async function changeUserPlan(user: User) {
  void user;

  setChangingPlan(false);
  setError(
    "La administración de planes todavía no está implementada en el backend NestJS.",
  );
}

  return (
    <section className="space-y-6 pb-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">
            Comunidad VibeNotas
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Usuarios de la aplicaciÃ³n
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Revisa las cuentas de usuarios, sus planes y el estado de acceso
            dentro de VibeNotas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-950/30 transition hover:scale-[1.02]"
          >
            <UserPlus size={18} />
            Crear usuario
          </button>

          <button
            type="button"
            onClick={exportCsv}
            disabled={filteredUsers.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={18} />
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.08] p-4">
          <p className="text-sm font-medium text-slate-400">
            Usuarios totales
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {totals.total}
          </p>
        </article>

        <article className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.08] p-4">
          <p className="text-sm font-medium text-slate-400">
            Usuarios activos
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-300">
            {totals.activos}
          </p>
        </article>

        <article className="rounded-2xl border border-red-500/15 bg-red-500/[0.08] p-4">
          <p className="text-sm font-medium text-slate-400">
            Suspendidos
          </p>
          <p className="mt-2 text-3xl font-bold text-red-300">
            {totals.suspendidos}
          </p>
        </article>

        <article className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.08] p-4">
          <p className="text-sm font-medium text-slate-400">
            Usuarios VIP
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-300">
            {totals.vip}
          </p>
        </article>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-4 shadow-xl shadow-black/10 backdrop-blur-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
            <Search size={19} className="shrink-0 text-slate-500" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, correo o ID..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="rounded-lg p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
                title="Limpiar bÃºsqueda"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={loadUsers}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20"
          >
            <RefreshCw size={17} />
            Actualizar lista
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeFilter === filter.key
                  ? "bg-violet-500 text-white shadow-lg shadow-violet-950/30"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          <h2 className="font-bold">No se pudieron cargar los usuarios</h2>
          <p className="mt-2 text-sm text-red-200/80">{error}</p>

          <button
            type="button"
            onClick={loadUsers}
            className="mt-4 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-400"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#1E293B]/80 shadow-xl shadow-black/10 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div>
              <h2 className="font-bold text-white">Usuarios registrados</h2>
              <p className="mt-1 text-sm text-slate-500">
                Mostrando {filteredUsers.length} de {users.length} usuarios.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-black/10 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Usuario</th>
                  <th className="px-6 py-4 font-semibold">Plan</th>
                  <th className="px-6 py-4 font-semibold">Estado</th>
                  <th className="px-6 py-4 font-semibold">Registro</th>
                  <th className="px-6 py-4 font-semibold">
                    Ãšltima actividad
                  </th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Detalle
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => {
                  const status = getStatusLabel(user).toLowerCase();
                  const isActive =
                    status === "activo" || status === "active";

                  const plan = getPlanLabel(user);
                  const isVip = plan.toLowerCase().includes("vip");

                  return (
                    <tr
                      key={user.id}
                      className="border-t border-white/5 text-sm transition hover:bg-white/[0.035]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 font-bold text-white shadow-lg shadow-violet-950/30">
                            {user.foto_perfil ? (
                              <img
                                src={getAvatarUrl(user.foto_perfil)}
                                alt={user.nombre}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              getInitials(user.nombre || "Usuario")
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">
                              {user.nombre}
                            </p>

                            <p className="truncate text-xs text-slate-500">
                              {user.correo}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                            isVip
                              ? "bg-amber-500/10 text-amber-300"
                              : "bg-sky-500/10 text-sky-300"
                          }`}
                        >
                          {isVip && <Crown size={13} />}
                          {plan}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                            isActive
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {isActive ? (
                            <UserCheck size={14} />
                          ) : (
                            <UserX size={14} />
                          )}

                          {getStatusLabel(user)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatDate(user.creado_en)}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatDate(user.ultima_actividad)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openActions(user)}
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                          title="Ver informaciÃ³n del usuario"
                        >
                          <MoreHorizontal size={19} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-16 text-center text-slate-500"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-2xl bg-white/5 p-4">
                          <UserRound size={30} />
                        </div>

                        <div>
                          <p className="font-semibold text-slate-300">
                            No encontramos usuarios
                          </p>
                          <p className="mt-1 text-sm">
                            Prueba con otra bÃºsqueda o cambia los filtros.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

{selectedUser && (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md sm:p-6">
    <button
      type="button"
      onClick={() => setSelectedUser(null)}
      className="absolute inset-0 cursor-default"
      aria-label="Cerrar perfil"
    />

    <section className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-white/10 bg-[#111827] shadow-2xl shadow-black/70">
      <div className="relative overflow-hidden border-b border-white/10 px-6 pb-6 pt-7 sm:px-8">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-violet-600/25 via-fuchsia-500/10 to-transparent" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
              Perfil de usuario
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              InformaciÃ³n de cuenta
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Resumen administrativo sin acceso al contenido privado.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedUser(null)}
            className="rounded-2xl border border-white/10 bg-white/5 p-2.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar perfil"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative mt-8 flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[28px] border border-white/15 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 text-2xl font-bold text-white shadow-xl shadow-violet-950/50">
            {selectedUser.foto_perfil ? (
              <img
                src={getAvatarUrl(selectedUser.foto_perfil)}
                alt={selectedUser.nombre}
                className="h-full w-full object-cover"
              />
            ) : (
              getInitials(selectedUser.nombre || "Usuario")
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="truncate text-2xl font-bold text-white">
                {selectedUser.nombre}
              </h3>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  getStatusLabel(selectedUser).toLowerCase() === "activo"
                    ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                    : "border border-red-400/20 bg-red-500/10 text-red-300"
                }`}
              >
                {getStatusLabel(selectedUser)}
              </span>
            </div>

            <p className="mt-2 truncate text-sm text-slate-400">
              {selectedUser.correo}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-xl border border-amber-400/15 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">
                <Crown size={15} className="text-amber-300" />
                {getPlanLabel(selectedUser)}
              </span>

              <span className="inline-flex items-center gap-2 rounded-xl border border-sky-400/15 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-200">
                <UserCheck size={15} className="text-sky-300" />
                {selectedUser.sesiones_activas ?? 0} sesiones activas
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6 sm:p-8">
        <div className="rounded-3xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.10] via-fuchsia-500/[0.04] to-transparent p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
                Actividad de VibeNotas
              </p>

              <h4 className="mt-2 text-lg font-bold text-white">
                Resumen de contenido
              </h4>

              <p className="mt-1 text-sm text-slate-400">
                Solo se muestran cantidades; las notas y archivos permanecen privados.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-xs font-semibold text-slate-400">
              Cuenta #{selectedUser.id}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-violet-400/15 bg-violet-500/[0.10] p-4">
              <StickyNote size={19} className="text-violet-300" />
              <p className="mt-4 text-xs font-medium text-slate-400">Notas</p>
              <p className="mt-1 text-3xl font-bold text-violet-100">
                {selectedUser.contenido?.notas ?? 0}
              </p>
            </div>

            <div className="rounded-2xl border border-sky-400/15 bg-sky-500/[0.10] p-4">
              <CheckSquare size={19} className="text-sky-300" />
              <p className="mt-4 text-xs font-medium text-slate-400">
                Checklists
              </p>
              <p className="mt-1 text-3xl font-bold text-sky-100">
                {selectedUser.contenido?.checklists ?? 0}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.10] p-4">
              <Folder size={19} className="text-emerald-300" />
              <p className="mt-4 text-xs font-medium text-slate-400">
                Carpetas
              </p>
              <p className="mt-1 text-3xl font-bold text-emerald-100">
                {selectedUser.contenido?.carpetas ?? 0}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-400/15 bg-amber-500/[0.10] p-4">
              <FileText size={19} className="text-amber-300" />
              <p className="mt-4 text-xs font-medium text-slate-400">
                Documentos
              </p>
              <p className="mt-1 text-3xl font-bold text-amber-100">
                {selectedUser.contenido?.documentos ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Registro y actividad
            </p>

            <div className="mt-5 space-y-4 text-sm">
              <div className="flex items-center gap-3 rounded-2xl bg-black/10 p-3">
                <div className="rounded-xl bg-violet-500/10 p-2 text-violet-300">
                  <CalendarDays size={17} />
                </div>

                <div>
                  <p className="text-xs text-slate-500">Registro</p>
                  <p className="mt-1 font-semibold text-slate-200">
                    {formatDate(selectedUser.creado_en)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-black/10 p-3">
                <div className="rounded-xl bg-sky-500/10 p-2 text-sky-300">
                  <Clock3 size={17} />
                </div>

                <div>
                  <p className="text-xs text-slate-500">Ãšltima actividad</p>
                  <p className="mt-1 font-semibold text-slate-200">
                    {formatDate(selectedUser.ultima_actividad)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Dispositivo y seguridad
            </p>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center gap-3 rounded-2xl bg-black/10 p-3 text-slate-200">
                <MonitorSmartphone size={17} className="shrink-0 text-sky-300" />
                <span>{selectedUser.dispositivo_actual || "Sin informaciÃ³n"}</span>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-black/10 p-3 text-slate-200">
                <Smartphone size={17} className="shrink-0 text-violet-300" />
                <span>
                  {selectedUser.sistema_operativo || "Sistema no registrado"}
                </span>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-black/10 p-3 text-slate-200">
                <Globe2 size={17} className="shrink-0 text-fuchsia-300" />
                <span>{selectedUser.navegador || "Navegador no registrado"}</span>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-black/10 p-3 text-slate-200">
                <Wifi size={17} className="shrink-0 text-emerald-300" />
                <span>{selectedUser.ip_ultima || "IP no registrada"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t border-white/10 bg-black/10 px-6 py-4 sm:px-8">
        <button
          type="button"
          onClick={() => setSelectedUser(null)}
          className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          Cerrar perfil
        </button>
      </div>
    </section>
  </div>
)}

{showActionsModal && userForActions && (
  <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
    <button
      type="button"
      className="absolute inset-0"
      onClick={closeActions}
      aria-label="Cerrar gestiÃ³n"
    />

    <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl shadow-black/60">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
            GestiÃ³n de usuario
          </p>

          <h2 className="mt-2 text-xl font-bold text-white">
            {userForActions.nombre}
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            {userForActions.correo}
          </p>
        </div>

        <button
          type="button"
          onClick={closeActions}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Cerrar gestiÃ³n"
        >
          <X size={20} />
        </button>
      </div>

      <div className="mt-6 grid gap-3">
        <button
          type="button"
          onClick={() => void openUserProfile(userForActions)}
          disabled={loadingUserDetail}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left text-slate-100 transition hover:bg-white/10"
        >
          <UserRound size={20} className="text-violet-300" />
          <div>
            <p className="font-semibold">
              {loadingUserDetail ? "Cargando perfil..." : "Ver perfil completo"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Consulta plan, actividad, y cantidades de contenido.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openEditUser(userForActions)}
          className="flex items-center gap-3 rounded-2xl border border-sky-400/20 bg-sky-500/[0.08] px-4 py-4 text-left text-sky-100 transition hover:bg-sky-500/[0.15]"
        >
          <Pencil size={20} className="text-sky-300" />
          <div>
            <p className="font-semibold">Editar informaciÃ³n</p>
            <p className="mt-1 text-xs text-sky-100/60">
              Nombre, correo, telÃ©fono, estado y contraseÃ±a.
            </p>
          </div>
        </button>

        <button
          type="button"
          disabled={changingPlan}
          onClick={() => changeUserPlan(userForActions)}
          className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/[0.08] px-4 py-4 text-left text-amber-100 transition hover:bg-amber-500/[0.15] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Crown size={20} className="text-amber-300" />
          <div>
            <p className="font-semibold">
              {getPlanLabel(userForActions).toLowerCase().includes("vip")
                ? "Cambiar a Plan Free"
                : "Activar Plan VIP"}
            </p>
            <p className="mt-1 text-xs text-amber-100/60">
              {changingPlan
                ? "Actualizando plan..."
                : "Gestiona los beneficios de la cuenta."}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => changeUserStatus(userForActions)}
          className="flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/[0.08] px-4 py-4 text-left text-red-100 transition hover:bg-red-500/[0.15]"
        >
          <ShieldAlert size={20} className="text-red-300" />
          <div>
            <p className="font-semibold">
              {getStatusLabel(userForActions).toLowerCase() === "activo"
                ? "Suspender acceso"
                : "Activar acceso"}
            </p>
            <p className="mt-1 text-xs text-red-100/60">
              Controla si la cuenta puede iniciar sesiÃ³n.
            </p>
          </div>
        </button>
      </div>
    </div>
  </div>
)}

{showCreateModal && (
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
    <button
      type="button"
      className="absolute inset-0"
      onClick={() => setShowCreateModal(false)}
      aria-label="Cerrar creaciÃ³n"
    />

    <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl shadow-black/60">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
            Nueva cuenta
          </p>
          <h2 className="mt-2 text-xl font-bold text-white">
            Crear usuario
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(false)}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={createUser} className="mt-6 space-y-4">
        <input
          value={createNombre}
          onChange={(event) => setCreateNombre(event.target.value)}
          placeholder="Nombre completo"
          required
          className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400/60"
        />

        <input
          type="email"
          value={createCorreo}
          onChange={(event) => setCreateCorreo(event.target.value)}
          placeholder="Correo electrÃ³nico"
          required
          className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400/60"
        />

        <input
          value={createTelefono}
          onChange={(event) => setCreateTelefono(event.target.value)}
          placeholder="TelÃ©fono opcional"
          className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400/60"
        />

        <select
          value={createPlan}
          onChange={(event) => setCreatePlan(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400/60"
        >
          <option value="free">Plan Free</option>
          <option value="vip">Plan VIP</option>
        </select>

        <input
          type="password"
          value={createContrasena}
          onChange={(event) => setCreateContrasena(event.target.value)}
          placeholder="ContraseÃ±a inicial"
          minLength={8}
          required
          className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400/60"
        />

        <button
          type="submit"
          disabled={creatingUser}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={18} />
          {creatingUser ? "Creando usuario..." : "Crear usuario"}
        </button>
      </form>
    </div>
  </div>
)}

{showEditModal && userToEdit && (
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
    <button
      type="button"
      className="absolute inset-0"
      onClick={() => {
        setShowEditModal(false);
        setUserToEdit(null);
      }}
      aria-label="Cerrar ediciÃ³n"
    />

    <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl shadow-black/60">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">
            InformaciÃ³n de usuario
          </p>

          <h2 className="mt-2 text-xl font-bold text-white">
            Editar usuario
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowEditModal(false);
            setUserToEdit(null);
          }}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Cerrar ediciÃ³n"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={updateUser} className="mt-6 space-y-4">
        <input
          value={editNombre}
          onChange={(event) => setEditNombre(event.target.value)}
          placeholder="Nombre completo"
          required
          className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
        />

        <input
          type="email"
          value={editCorreo}
          onChange={(event) => setEditCorreo(event.target.value)}
          placeholder="Correo electrÃ³nico"
          required
          className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
        />

        <input
          value={editTelefono}
          onChange={(event) => setEditTelefono(event.target.value)}
          placeholder="TelÃ©fono opcional"
          className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
        />

        <select
          value={editEstado}
          onChange={(event) => setEditEstado(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
        >
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
          <option value="suspendido">Suspendido</option>
        </select>

        <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-slate-400">
          Plan actual:{" "}
          <span className="font-semibold text-amber-300">
            {getPlanLabel(userToEdit)}
          </span>
        </div>

        <input
          type="password"
          value={editContrasena}
          onChange={(event) => setEditContrasena(event.target.value)}
          placeholder="Nueva contraseÃ±a (opcional)"
          minLength={8}
          className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
        />

        <button
          type="submit"
          disabled={savingEdit}
          className="w-full rounded-xl bg-gradient-to-r from-sky-600 to-violet-600 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingEdit ? "Guardando cambios..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  </div>
)}

    </section>
  );
}