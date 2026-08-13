import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Crown,
  Download,
  KeyRound,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserPlus,
  UserRound,
  UserRoundCheck,
  UserRoundX,
  X,
} from "lucide-react";
import api from "../services/api";
import axios from "axios";

type AdminUser = {
  id: number;
  nombre: string;
  correo: string;
  estado?: string;
  rol?: string;
  rol_nombre?: string;
  creado_en?: string;
  ultima_actividad?: string;
  foto_perfil?: string | null;
};

type AdminsResponse = {
  success: boolean;
  message: string;
  data?: {
    usuarios?: AdminUser[];
    admins?: AdminUser[];
    total?: number;
  };
};

type CurrentUser = {
  id?: number;
  nombre?: string;
  correo?: string;
  rol?: string;
};

type StatusFilter = "todos" | "activos" | "suspendidos";
type RoleFilter = "todos" | "admin" | "superadmin";

function getRoleLabel(admin: AdminUser) {
  return admin.rol_nombre || admin.rol || "Administrador";
}

function getStatusLabel(admin: AdminUser) {
  return admin.estado || "activo";
}

function getInitials(nombre: string) {
  return nombre
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function formatDate(value?: string) {
  if (!value) return "Sin informaciÃ³n";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin informaciÃ³n";
  }

  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isActiveStatus(status?: string) {
  const normalized = String(status || "").toLowerCase();

  return normalized === "activo" || normalized === "active";
}

function isSuperAdmin(admin: AdminUser) {
  const role = `${admin.rol || ""} ${admin.rol_nombre || ""}`
    .toLowerCase()
    .replaceAll("_", " ");

  return role.includes("super admin") || role.includes("superadmin");
}

function isAdminAccount(admin: AdminUser) {
  const role = `${admin.rol || ""} ${admin.rol_nombre || ""}`
    .toLowerCase();

  return (
    role.includes("admin") ||
    role.includes("administrador")
  );
}

export default function AdministratorsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("todos");
  const [roleFilter, setRoleFilter] =
    useState<RoleFilter>("todos");

  const [selectedAdmin, setSelectedAdmin] =
    useState<AdminUser | null>(null);

  const [showActionsModal, setShowActionsModal] = useState(false);
const [adminForActions, setAdminForActions] = useState<AdminUser | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
const [adminToEdit, setAdminToEdit] = useState<AdminUser | null>(null);

const [editNombre, setEditNombre] = useState("");
const [editCorreo, setEditCorreo] = useState("");

const [editRol, setEditRol] = useState<"admin" | "super_admin">("admin");
const [editEstado, setEditEstado] = useState<"activo" | "suspendido">("activo");
const [editContrasena, setEditContrasena] = useState("");

  const currentUser = useMemo(() => {
    const storedUser = localStorage.getItem("usuario");

    try {
      return storedUser
        ? (JSON.parse(storedUser) as CurrentUser)
        : null;
    } catch {
      return null;
    }
  }, []);

  async function loadAdmins() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<AdminsResponse>(
        "/superadmin/users"
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "No se pudieron cargar los administradores."
        );
      }

      const allUsers =
        response.data.data?.admins ||
        response.data.data?.usuarios ||
        [];

      setAdmins(allUsers.filter(isAdminAccount));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los administradores."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdmins();
  }, []);

  const filteredAdmins = useMemo(() => {
    const text = search.trim().toLowerCase();

    return admins.filter((admin) => {
      const active = isActiveStatus(admin.estado);
      const superAdmin = isSuperAdmin(admin);

      const matchesSearch =
        !text ||
        admin.nombre.toLowerCase().includes(text) ||
        admin.correo.toLowerCase().includes(text) ||
        String(admin.id).includes(text);

      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "activos" && active) ||
        (statusFilter === "suspendidos" && !active);

      const matchesRole =
        roleFilter === "todos" ||
        (roleFilter === "superadmin" && superAdmin) ||
        (roleFilter === "admin" && !superAdmin);

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [admins, search, statusFilter, roleFilter]);

  const totals = useMemo(() => {
    return {
      total: admins.length,
      active: admins.filter((admin) =>
        isActiveStatus(admin.estado)
      ).length,
      suspended: admins.filter(
        (admin) => !isActiveStatus(admin.estado)
      ).length,
      superAdmins: admins.filter(isSuperAdmin).length,
    };
  }, [admins]);

  function exportCsv() {
    const headers = [
      "ID",
      "Nombre",
      "Correo",
      "Rol",
      "Estado",
      "Fecha de registro",
      "Ãšltima actividad",
    ];

    const rows = filteredAdmins.map((admin) => [
      admin.id,
      admin.nombre,
      admin.correo,
      getRoleLabel(admin),
      getStatusLabel(admin),
      admin.creado_en ?? "",
      admin.ultima_actividad ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) =>
            `"${String(cell).replaceAll('"', '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "administradores-vibenotas.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  async function createAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (contrasena.length < 8) {
      setError("La contraseÃ±a temporal debe tener al menos 8 caracteres.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/superadmin/admins", {
        nombre: nombre.trim(),
        correo: correo.trim(),
        contrasena,
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "No se pudo crear el administrador."
        );
      }

      setSuccess("Administrador creado correctamente.");
      setNombre("");
      setCorreo("");
      setContrasena("");
      setShowCreateModal(false);

      await loadAdmins();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear el administrador."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(admin: AdminUser) {
    const isOwnAccount = currentUser?.id === admin.id;

    if (isOwnAccount) {
      setError("No puedes suspender ni modificar el acceso de tu propia cuenta.");
      return;
    }

    if (isSuperAdmin(admin)) {
      setError(
        "No puedes suspender un Super Admin desde esta pantalla."
      );
      return;
    }

    const nextStatus = isActiveStatus(admin.estado)
      ? "suspendido"
      : "activo";

    const confirmed = window.confirm(
      `Â¿Quieres cambiar el estado de ${admin.nombre} a "${nextStatus}"?`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.put(
        `/superadmin/users/${admin.id}/status`,
        { estado: nextStatus }
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "No se pudo actualizar el estado."
        );
      }

      setSuccess(
        `Estado de ${admin.nombre} actualizado correctamente.`
      );

      setSelectedAdmin(null);
      await loadAdmins();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el estado."
      );
    } finally {
      setSaving(false);
    }
  }

function openEditModal(admin: AdminUser) {
  const isOwnAccount = currentUser?.id === admin.id;

  if (isOwnAccount) {
    setError(
      "No puedes modificar tu propia cuenta administrativa desde esta pantalla."
    );
    return;
  }

  setError("");
  setSuccess("");

  const roleText = `${admin.rol ?? ""} ${admin.rol_nombre ?? ""}`
    .toLowerCase()
    .replaceAll("_", " ");

  const statusText = getStatusLabel(admin).toLowerCase();

  setAdminToEdit(admin);
  setEditNombre(admin.nombre);
  setEditCorreo(admin.correo);

  setEditRol(
    roleText.includes("super admin") || roleText.includes("superadmin")
      ? "super_admin"
      : "admin"
  );

  setEditEstado(
    statusText === "activo" || statusText === "active"
      ? "activo"
      : "suspendido"
  );

  setEditContrasena("");
  setSelectedAdmin(null);
  setShowEditModal(true);
}

async function updateAdmin(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!adminToEdit) return;

  if (editNombre.trim().length < 3) {
    setError("El nombre debe tener al menos 3 caracteres.");
    return;
  }

  if (editContrasena && editContrasena.length < 8) {
    setError("La nueva contraseÃ±a debe tener al menos 8 caracteres.");
    return;
  }

  setSaving(true);
  setError("");
  setSuccess("");

  try {
    const response = await api.put(
      `/superadmin/users/${adminToEdit.id}`,
      {
        nombre: editNombre.trim(),
        correo: editCorreo.trim(),
        rol: editRol,
        estado: editEstado,
        ...(editContrasena.trim()
          ? { contrasena: editContrasena.trim() }
          : {}),
      }
    );

    if (!response.data?.success) {
      throw new Error(
        response.data?.message ||
          "No se pudo actualizar el administrador."
      );
    }

    setSuccess("Administrador actualizado correctamente.");
    setShowEditModal(false);
    setAdminToEdit(null);

    await loadAdmins();
  } catch (err) {
    if (axios.isAxiosError(err)) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "No tienes permisos para editar este administrador."
      );
    } else {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el administrador."
      );
    }
  } finally {
    setSaving(false);
  }
}

async function deleteAdmin(admin: AdminUser) {
  const isOwnAccount = currentUser?.id === admin.id;

  if (isOwnAccount) {
    setError("No puedes eliminar tu propia cuenta.");
    return;
  }

  if (isSuperAdmin(admin)) {
    setError("No puedes eliminar una cuenta Super Admin.");
    return;
  }

  const confirmed = window.confirm(
    `Â¿Eliminar definitivamente a ${admin.nombre}? Esta acciÃ³n no se puede deshacer.`
  );

  if (!confirmed) return;

  setSaving(true);
  setError("");
  setSuccess("");

  try {
    const response = await api.delete(
      `/superadmin/users/${admin.id}`
    );

    if (!response.data?.success) {
      throw new Error(
        response.data?.message ||
          "No se pudo eliminar el administrador."
      );
    }

    setSuccess(`${admin.nombre} fue eliminado correctamente.`);
    setSelectedAdmin(null);

    await loadAdmins();
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "No se pudo eliminar el administrador."
    );
  } finally {
    setSaving(false);
  }
}

function openActionsModal(admin: AdminUser) {
  setAdminForActions(admin);
  setShowActionsModal(true);
}

function closeActionsModal() {
  setShowActionsModal(false);
  setAdminForActions(null);
}

  return (
    <section className="space-y-6 pb-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">
            Control de privilegios
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Administradores
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Gestiona las cuentas con acceso administrativo, sus permisos y el
            estado de seguridad dentro de VibeNotas.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportCsv}
            disabled={filteredAdmins.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={18} />
            Exportar CSV
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:brightness-110"
          >
            <UserPlus size={18} />
            Crear administrador
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-200">
          <p className="font-bold">OcurriÃ³ un problema</p>
          <p className="mt-1 text-sm text-red-200/80">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-emerald-200">
          <p className="font-bold">AcciÃ³n completada</p>
          <p className="mt-1 text-sm text-emerald-200/80">{success}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.08] p-5">
          <p className="text-sm font-medium text-slate-400">
            Administradores totales
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {totals.total}
          </p>
          <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-violet-300">
            <ShieldCheck size={15} />
            Cuentas con privilegios
          </p>
        </article>

        <article className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.08] p-5">
          <p className="text-sm font-medium text-slate-400">
            Administradores activos
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-300">
            {totals.active}
          </p>
          <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <CheckCircle2 size={15} />
            Acceso habilitado
          </p>
        </article>

        <article className="rounded-2xl border border-red-500/15 bg-red-500/[0.08] p-5">
          <p className="text-sm font-medium text-slate-400">
            Suspendidos
          </p>
          <p className="mt-2 text-3xl font-bold text-red-300">
            {totals.suspended}
          </p>
          <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-red-300">
            <ShieldOff size={15} />
            Sin acceso al panel
          </p>
        </article>

        <article className="rounded-2xl border border-fuchsia-500/15 bg-fuchsia-500/[0.08] p-5">
          <p className="text-sm font-medium text-slate-400">
            Super Admins
          </p>
          <p className="mt-2 text-3xl font-bold text-fuchsia-300">
            {totals.superAdmins}
          </p>
          <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-fuchsia-300">
            <Crown size={15} />
            Control total del sistema
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
            onClick={loadAdmins}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20"
          >
            <RefreshCw size={17} />
            Actualizar lista
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { key: "todos", label: "Todos" },
            { key: "activos", label: "Activos" },
            { key: "suspendidos", label: "Suspendidos" },
          ].map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() =>
                setStatusFilter(filter.key as StatusFilter)
              }
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                statusFilter === filter.key
                  ? "bg-violet-500 text-white"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {filter.label}
            </button>
          ))}

          <div className="mx-1 hidden h-9 w-px bg-white/10 sm:block" />

          {[
            { key: "todos", label: "Todos los roles" },
            { key: "admin", label: "Administradores" },
            { key: "superadmin", label: "Super Admins" },
          ].map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() =>
                setRoleFilter(filter.key as RoleFilter)
              }
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                roleFilter === filter.key
                  ? "bg-fuchsia-500 text-white"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#1E293B]/80 shadow-xl shadow-black/10 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-violet-300">
              Equipo administrativo
            </p>

            <h2 className="mt-1 text-xl font-bold text-white">
              Cuentas con privilegios
            </h2>
          </div>

          <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-400">
            {filteredAdmins.length} visibles
          </span>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-2xl bg-white/5"
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead className="bg-black/10 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">
                    Administrador
                  </th>
                  <th className="px-6 py-4 font-semibold">Rol</th>
                  <th className="px-6 py-4 font-semibold">Estado</th>
                  <th className="px-6 py-4 font-semibold">
                    Registro
                  </th>
                  <th className="px-6 py-4 font-semibold">
                    Ãšltimo acceso
                  </th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredAdmins.map((admin) => {
                  const active = isActiveStatus(admin.estado);
                  const superAdmin = isSuperAdmin(admin);

                  return (
                    <tr
                      key={admin.id}
                      className="border-t border-white/5 text-sm transition hover:bg-white/[0.035]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 font-bold text-white shadow-lg shadow-violet-950/30">
                            {admin.foto_perfil ? (
                              <img
                                src={admin.foto_perfil}
                                alt={admin.nombre}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              getInitials(admin.nombre || "Admin")
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">
                              {admin.nombre}
                            </p>

                            <p className="truncate text-xs text-slate-500">
                              {admin.correo}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                            superAdmin
                              ? "bg-fuchsia-500/10 text-fuchsia-300"
                              : "bg-violet-500/10 text-violet-300"
                          }`}
                        >
                          {superAdmin ? (
                            <Crown size={14} />
                          ) : (
                            <ShieldCheck size={14} />
                          )}

                          {getRoleLabel(admin)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                            active
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-red-500/10 text-red-300"
                          }`}
                        >
                          {active ? (
                            <UserRoundCheck size={14} />
                          ) : (
                            <UserRoundX size={14} />
                          )}

                          {getStatusLabel(admin)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {formatDate(admin.creado_en)}
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {formatDate(admin.ultima_actividad)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openActionsModal(admin)}
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                          title="Ver detalles"
                        >
                          <MoreHorizontal size={19} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredAdmins.length === 0 && (
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
                            No encontramos administradores
                          </p>

                          <p className="mt-1 text-sm">
                            Prueba con otra bÃºsqueda o filtro.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showActionsModal && adminForActions && (
  <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
    <button
      type="button"
      onClick={closeActionsModal}
      className="absolute inset-0"
      aria-label="Cerrar acciones"
    />

    <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl shadow-black/60">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-violet-300">
            GestiÃ³n administrativa
          </p>

          <h2 className="mt-1 text-xl font-bold text-white">
            {adminForActions.nombre}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {adminForActions.correo}
          </p>
        </div>

        <button
          type="button"
          onClick={closeActionsModal}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      <div className="mt-6 grid gap-3">
        <button
          type="button"
          onClick={() => {
            setSelectedAdmin(adminForActions);
            closeActionsModal();
          }}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left text-slate-200 transition hover:bg-white/10"
        >
          <UserRound size={20} className="text-violet-300" />

          <div>
            <p className="font-semibold">Ver perfil completo</p>
            <p className="mt-1 text-xs text-slate-500">
              Datos, permisos, actividad y seguridad.
            </p>
          </div>
        </button>

        {currentUser?.id !== adminForActions.id && !isSuperAdmin(adminForActions) && (
          <>
            <button
              type="button"
              onClick={() => {
                closeActionsModal();
                openEditModal(adminForActions);
              }}
              className="flex items-center gap-3 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-4 text-left text-sky-100 transition hover:bg-sky-500/20"
            >
              <Pencil size={20} className="text-sky-300" />

              <div>
                <p className="font-semibold">Editar administrador</p>
                <p className="mt-1 text-xs text-sky-200/60">
                  Nombre, correo, rol, estado y contraseÃ±a.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                closeActionsModal();
                changeStatus(adminForActions);
              }}
              className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-4 text-left text-amber-100 transition hover:bg-amber-500/20"
            >
              <ShieldOff size={20} className="text-amber-300" />

              <div>
                <p className="font-semibold">
                  {isActiveStatus(adminForActions.estado)
                    ? "Suspender acceso"
                    : "Activar acceso"}
                </p>

                <p className="mt-1 text-xs text-amber-200/60">
                  Controla el acceso al panel administrativo.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                closeActionsModal();
                deleteAdmin(adminForActions);
              }}
              className="flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-4 text-left text-red-200 transition hover:bg-red-500/20"
            >
              <Trash2 size={20} className="text-red-300" />

              <div>
                <p className="font-semibold">Eliminar administrador</p>
                <p className="mt-1 text-xs text-red-200/60">
                  Esta acciÃ³n elimina la cuenta definitivamente.
                </p>
              </div>
            </button>
          </>
        )}

        {currentUser?.id === adminForActions.id && (
          <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 p-4 text-sm text-amber-200">
            No puedes modificar tu propia cuenta desde esta pantalla.
          </div>
        )}

        {isSuperAdmin(adminForActions) &&
          currentUser?.id !== adminForActions.id && (
            <div className="rounded-2xl border border-fuchsia-400/15 bg-fuchsia-500/10 p-4 text-sm text-fuchsia-200">
              Las cuentas Super Admin estÃ¡n protegidas desde este menÃº.
            </div>
          )}
      </div>
    </div>
  </div>
)}

      {selectedAdmin && (
        <div className="fixed inset-0 z-[70] flex items-center justify-end bg-black/70 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setSelectedAdmin(null)}
            className="absolute inset-0 cursor-default"
            aria-label="Cerrar panel"
          />

          <aside className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-[#111827] p-6 shadow-2xl shadow-black/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-violet-300">
                  Perfil administrativo
                </p>

                <h2 className="mt-1 text-2xl font-bold text-white">
                  {selectedAdmin.nombre}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedAdmin.correo}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAdmin(null)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                title="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-7 flex flex-col items-center rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-xl font-bold text-white">
                {selectedAdmin.foto_perfil ? (
                  <img
                    src={selectedAdmin.foto_perfil}
                    alt={selectedAdmin.nombre}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getInitials(selectedAdmin.nombre || "Admin")
                )}
              </div>

              <p className="mt-4 text-lg font-bold text-white">
                {selectedAdmin.nombre}
              </p>

              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    isSuperAdmin(selectedAdmin)
                      ? "bg-fuchsia-500/10 text-fuchsia-300"
                      : "bg-violet-500/10 text-violet-300"
                  }`}
                >
                  {getRoleLabel(selectedAdmin)}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    isActiveStatus(selectedAdmin.estado)
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-red-500/10 text-red-300"
                  }`}
                >
                  {getStatusLabel(selectedAdmin)}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Registro
                </p>

                <p className="mt-2 flex items-center gap-2 font-semibold text-white">
                  <CalendarDays size={17} className="text-violet-300" />
                  {formatDate(selectedAdmin.creado_en)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ãšltimo acceso
                </p>

                <p className="mt-2 font-semibold text-white">
                  {formatDate(selectedAdmin.ultima_actividad)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Permisos principales
                </p>

                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  <p>âœ“ Gestionar usuarios</p>
                  <p>âœ“ Gestionar contenido</p>
                  <p>âœ“ Revisar reportes</p>
                  <p>âœ“ Enviar notificaciones</p>

                  {isSuperAdmin(selectedAdmin) && (
                    <>
                      <p className="text-fuchsia-300">
                        âœ“ ConfiguraciÃ³n global
                      </p>
                      <p className="text-fuchsia-300">
                        âœ“ Gestionar administradores
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-left text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20"
              >
                <KeyRound size={17} />
                Restablecer contraseÃ±a
              </button>

              {currentUser?.id !== selectedAdmin.id && (
  <>
    <button
      type="button"
      onClick={() => openEditModal(selectedAdmin)}
      className="flex items-center gap-2 rounded-xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-left text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20"
    >
      <Pencil size={17} />
      Editar administrador
    </button>

    {!isSuperAdmin(selectedAdmin) && (
      <>
        <button
          type="button"
          disabled={saving}
          onClick={() => changeStatus(selectedAdmin)}
          className={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
            isActiveStatus(selectedAdmin.estado)
              ? "border border-amber-400/20 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
              : "border border-emerald-400/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
          }`}
        >
          {isActiveStatus(selectedAdmin.estado)
            ? "Suspender administrador"
            : "Activar administrador"}
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => deleteAdmin(selectedAdmin)}
          className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-left text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 size={17} />
          Eliminar administrador
        </button>
      </>
    )}
  </>
)}
            </div>
          </aside>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-violet-300">
                  Nuevo acceso elevado
                </p>

                <h2 className="mt-1 text-xl font-bold text-white">
                  Crear administrador
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                title="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createAdmin} className="mt-6 space-y-4">
              <input
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Nombre completo"
                className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
                required
              />

              <input
                type="email"
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
                placeholder="correo@vibenotas.com"
                className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
                required
              />

              <input
                type="password"
                value={contrasena}
                onChange={(event) => setContrasena(event.target.value)}
                placeholder="ContraseÃ±a temporal (mÃ­nimo 8 caracteres)"
                className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
                minLength={8}
                required
              />

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Creando administrador..."
                  : "Crear administrador"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showEditModal && adminToEdit && (
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
    <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-sky-300">
            ConfiguraciÃ³n de acceso
          </p>

          <h2 className="mt-1 text-xl font-bold text-white">
            Editar administrador
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Actualiza informaciÃ³n, rol, estado y contraseÃ±a.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowEditModal(false);
            setAdminToEdit(null);
          }}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          title="Cerrar"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={updateAdmin} className="mt-6 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-300">
            Nombre completo
          </label>

          <input
            value={editNombre}
            onChange={(event) => setEditNombre(event.target.value)}
            placeholder="Nombre completo"
            className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-300">
            Correo electrÃ³nico
          </label>

          <input
            type="email"
            value={editCorreo}
            onChange={(event) => setEditCorreo(event.target.value)}
            placeholder="correo@vibenotas.com"
            className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Rol administrativo
            </label>

            <select
              value={editRol}
              onChange={(event) =>
                setEditRol(event.target.value as "admin" | "super_admin")
              }
              className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/50"
            >
              <option value="admin">Administrador</option>
              <option value="super_admin">Super Admin</option>
            </select>

            <p className="mt-2 text-xs text-amber-300/80">
              Super Admin tiene acceso total al sistema.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Estado de la cuenta
            </label>

            <select
              value={editEstado}
              onChange={(event) =>
                setEditEstado(
                  event.target.value as "activo" | "suspendido"
                )
              }
              className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/50"
            >
              <option value="activo">Activo</option>
              <option value="suspendido">Suspendido</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-300">
            Nueva contraseÃ±a
            <span className="ml-2 text-xs font-normal text-slate-500">
              Opcional
            </span>
          </label>

          <input
            type="password"
            value={editContrasena}
            onChange={(event) => setEditContrasena(event.target.value)}
            placeholder="Dejar vacÃ­o para conservar la contraseÃ±a"
            minLength={8}
            className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
          />

          <p className="mt-2 text-xs text-slate-500">
            Solo escribe una contraseÃ±a si deseas reemplazar la actual.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
          <p className="text-sm font-bold text-amber-200">
            AtenciÃ³n con los permisos
          </p>

          <p className="mt-1 text-xs leading-5 text-amber-200/70">
            Cambiar a Super Admin entrega control total: usuarios,
            administradores, seguridad y configuraciones globales.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Pencil size={17} />
          {saving ? "Guardando cambios..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  </div>
)}

    </section>
  );
}