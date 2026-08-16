import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  MailCheck,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  UserPlus,
  UserRound,
  UserRoundCheck,
  UserRoundX,
  UsersRound,
  X,
} from "lucide-react";

import api from "../services/api";

type Role = "admin" | "superadmin";

type ApiUserStatus =
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "SUSPENDED"
  | "DISABLED";

type ApiRole = {
  id: string;
  name: string;
  slug: string;
  priority: number;
};

type ApiRoleAssignment = {
  assignedAt: string;
  expiresAt: string | null;
  role: ApiRole;
};

type ApiUser = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: ApiUserStatus;
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

type RegisterResponse = {
  message?: string;
  user?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    displayName?: string | null;
    status?: ApiUserStatus;
  };
  developmentVerificationToken?: string;
  verificationExpiresAt?: string;
};

type User = {
  id: string;
  nombre: string;
  correo: string;
  estado: ApiUserStatus;
  roles: ApiRole[];
  creado_en: string;
  ultima_actividad?: string;
  foto_perfil?: string | null;
  email_verificado: boolean;
  mfa_habilitado: boolean;
};

type UsersPageProps = {
  role: Role;
};

type StatusFilter =
  | "todos"
  | "ACTIVE"
  | "PENDING_VERIFICATION"
  | "SUSPENDED"
  | "DISABLED";

const STATUS_FILTERS: Array<{
  key: StatusFilter;
  label: string;
}> = [
  { key: "todos", label: "Todos" },
  { key: "ACTIVE", label: "Activos" },
  {
    key: "PENDING_VERIFICATION",
    label: "Pendientes",
  },
  { key: "SUSPENDED", label: "Suspendidos" },
  { key: "DISABLED", label: "Deshabilitados" },
];

const ADMIN_ROLE_SLUGS = new Set([
  "admin",
  "super_admin",
  "owner",
]);

function isRoleAssignmentActive(
  assignment: ApiRoleAssignment,
) {
  if (!assignment.expiresAt) {
    return true;
  }

  const expiresAt = new Date(
    assignment.expiresAt,
  );

  return (
    !Number.isNaN(expiresAt.getTime()) &&
    expiresAt.getTime() > Date.now()
  );
}

function mapApiUser(apiUser: ApiUser): User {
  const activeRoles = apiUser.roles
    .filter(isRoleAssignmentActive)
    .map((assignment) => assignment.role);

  return {
    id: apiUser.id,
    nombre:
      apiUser.displayName?.trim() ||
      apiUser.email,
    correo: apiUser.email,
    estado: apiUser.status,
    roles: activeRoles,
    creado_en: apiUser.createdAt,
    ultima_actividad:
      apiUser.lastLoginAt ?? undefined,
    foto_perfil: apiUser.avatarUrl,
    email_verificado:
      apiUser.emailVerifiedAt !== null,
    mfa_habilitado: apiUser.mfaEnabled,
  };
}

function isNormalUser(user: User) {
  return !user.roles.some((role) =>
    ADMIN_ROLE_SLUGS.has(role.slug),
  );
}

function getStatusLabel(
  status: ApiUserStatus,
) {
  switch (status) {
    case "ACTIVE":
      return "Activo";
    case "PENDING_VERIFICATION":
      return "Verificación pendiente";
    case "SUSPENDED":
      return "Suspendido";
    case "DISABLED":
      return "Deshabilitado";
    default:
      return status;
  }
}

function getInitials(nombre: string) {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) =>
      word.charAt(0).toUpperCase(),
    )
    .join("");
}

function formatDate(value?: string) {
  if (!value) {
    return "Sin información";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin información";
  }

  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Sin información";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin información";
  }

  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAxiosErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error.message
      : fallback;
  }

  const message =
    error.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return (
    message ||
    error.response?.data?.error ||
    fallback
  );
}

function UserAvatar({
  user,
  large = false,
}: {
  user: User;
  large?: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-sky-500 via-violet-600 to-fuchsia-600 font-bold text-white shadow-lg shadow-violet-300/30 dark:shadow-violet-950/30 ${
        large
          ? "h-20 w-20 rounded-3xl text-xl"
          : "h-11 w-11 rounded-2xl text-sm"
      }`}
    >
      {user.foto_perfil ? (
        <img
          src={user.foto_perfil}
          alt={user.nombre}
          className="h-full w-full object-cover"
        />
      ) : (
        getInitials(
          user.nombre || "Usuario",
        )
      )}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: ApiUserStatus;
}) {
  const active = status === "ACTIVE";
  const pending =
    status === "PENDING_VERIFICATION";
  const suspended =
    status === "SUSPENDED";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/15 dark:bg-emerald-500/10 dark:text-emerald-300"
          : pending
            ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/15 dark:bg-sky-500/10 dark:text-sky-300"
            : suspended
              ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/15 dark:bg-amber-500/10 dark:text-amber-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-400/15 dark:bg-red-500/10 dark:text-red-300"
      }`}
    >
      {active ? (
        <UserRoundCheck size={13} />
      ) : (
        <UserRoundX size={13} />
      )}
      {getStatusLabel(status)}
    </span>
  );
}

function VerificationBadge({
  verified,
}: {
  verified: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        verified
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/15 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-400/10 dark:bg-slate-500/10 dark:text-slate-400"
      }`}
    >
      <MailCheck size={13} />
      {verified
        ? "Correo verificado"
        : "Sin verificar"}
    </span>
  );
}

export default function UsersPage({
  role,
}: UsersPageProps) {
  const [users, setUsers] = useState<
    User[]
  >([]);
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [creating, setCreating] =
    useState(false);
  const [exporting, setExporting] =
    useState(false);

  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");
  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>("todos");

  const [
    selectedUser,
    setSelectedUser,
  ] = useState<User | null>(null);

  const [
    showActionsModal,
    setShowActionsModal,
  ] = useState(false);
  const [
    userForActions,
    setUserForActions,
  ] = useState<User | null>(null);

  const [
    showEditModal,
    setShowEditModal,
  ] = useState(false);
  const [
    userToEdit,
    setUserToEdit,
  ] = useState<User | null>(null);
  const [
    editNombre,
    setEditNombre,
  ] = useState("");
  const [
    editCorreo,
    setEditCorreo,
  ] = useState("");

  const [
    showCreateModal,
    setShowCreateModal,
  ] = useState(false);
  const [
    createFirstName,
    setCreateFirstName,
  ] = useState("");
  const [
    createLastName,
    setCreateLastName,
  ] = useState("");
  const [
    createUsername,
    setCreateUsername,
  ] = useState("");
  const [
    createEmail,
    setCreateEmail,
  ] = useState("");
  const [
    createPassword,
    setCreatePassword,
  ] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      const allUsers: ApiUser[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const response =
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

        allUsers.push(
          ...response.data.users,
        );

        totalPages =
          response.data.totalPages;
        page += 1;
      } while (page <= totalPages);

      setUsers(
        allUsers
          .map(mapApiUser)
          .filter(isNormalUser),
      );
    } catch (err) {
      setError(
        getAxiosErrorMessage(
          err,
          "No se pudieron cargar los usuarios.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, [role]);

  const filteredUsers = useMemo(() => {
    const text =
      search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !text ||
        user.nombre
          .toLowerCase()
          .includes(text) ||
        user.correo
          .toLowerCase()
          .includes(text) ||
        user.id
          .toLowerCase()
          .includes(text);

      const matchesStatus =
        statusFilter === "todos" ||
        user.estado === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    users,
    search,
    statusFilter,
  ]);

  const totals = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(
        (user) =>
          user.estado === "ACTIVE",
      ).length,
      pending: users.filter(
        (user) =>
          user.estado ===
          "PENDING_VERIFICATION",
      ).length,
      restricted: users.filter(
        (user) =>
          user.estado ===
            "SUSPENDED" ||
          user.estado === "DISABLED",
      ).length,
    };
  }, [users]);

  function resetCreateForm() {
    setCreateFirstName("");
    setCreateLastName("");
    setCreateUsername("");
    setCreateEmail("");
    setCreatePassword("");
  }

  async function createUser(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const firstName =
      createFirstName.trim();
    const lastName =
      createLastName.trim();
    const username =
      createUsername.trim();
    const email =
      createEmail.trim();

    if (
      firstName.length < 1 ||
      firstName.length > 80
    ) {
      setError(
        "El nombre debe tener entre 1 y 80 caracteres.",
      );
      return;
    }

    if (
      lastName.length < 1 ||
      lastName.length > 80
    ) {
      setError(
        "El apellido debe tener entre 1 y 80 caracteres.",
      );
      return;
    }

    if (
      username.length < 3 ||
      username.length > 30 ||
      !/^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])$/.test(
        username,
      )
    ) {
      setError(
        "El username debe tener entre 3 y 30 caracteres y solo puede usar letras, números, puntos, guiones y guiones bajos.",
      );
      return;
    }

    if (
      createPassword.length < 12 ||
      createPassword.length > 128
    ) {
      setError(
        "La contraseña debe tener entre 12 y 128 caracteres.",
      );
      return;
    }

    setCreating(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await api.post<RegisterResponse>(
          "/auth/register",
          {
            firstName,
            lastName,
            username,
            email,
            password: createPassword,
          },
        );

      let verifiedInDevelopment =
        false;

      const token =
        response.data
          .developmentVerificationToken;

      if (
        typeof token === "string" &&
        token.length >= 32
      ) {
        try {
          await api.post(
            "/auth/verify-email",
            {
              token,
            },
          );

          verifiedInDevelopment =
            true;
        } catch {
          // La cuenta queda pendiente de verificación.
        }
      }

      resetCreateForm();
      setShowCreateModal(false);

      await loadUsers();

      setSuccess(
        verifiedInDevelopment
          ? "Usuario creado y activado correctamente."
          : "Usuario creado correctamente. La cuenta queda pendiente de verificación de correo.",
      );
    } catch (err) {
      setError(
        getAxiosErrorMessage(
          err,
          "No se pudo crear el usuario.",
        ),
      );
    } finally {
      setCreating(false);
    }
  }

  function openActions(user: User) {
    setUserForActions(user);
    setShowActionsModal(true);
  }

  function closeActions() {
    setShowActionsModal(false);
    setUserForActions(null);
  }

  function openEditUser(user: User) {
    setError("");
    setSuccess("");
    setUserToEdit(user);
    setEditNombre(user.nombre);
    setEditCorreo(user.correo);
    setSelectedUser(null);
    closeActions();
    setShowEditModal(true);
  }

  async function updateUser(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!userToEdit) {
      return;
    }

    const displayName =
      editNombre.trim();
    const email =
      editCorreo.trim();

    if (displayName.length < 2) {
      setError(
        "El nombre debe tener al menos 2 caracteres.",
      );
      return;
    }

    const changes: {
      displayName?: string;
      email?: string;
    } = {};

    if (
      displayName !== userToEdit.nombre
    ) {
      changes.displayName =
        displayName;
    }

    if (
      email.toLowerCase() !==
      userToEdit.correo.toLowerCase()
    ) {
      changes.email = email;
    }

    if (
      Object.keys(changes).length === 0
    ) {
      setShowEditModal(false);
      setUserToEdit(null);
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.patch(
        `/users/${userToEdit.id}`,
        changes,
      );

      setShowEditModal(false);
      setUserToEdit(null);

      await loadUsers();

      setSuccess(
        "Usuario actualizado correctamente.",
      );
    } catch (err) {
      setError(
        getAxiosErrorMessage(
          err,
          "No se pudo actualizar el usuario.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeUserStatus(
    user: User,
  ) {
    const nextStatus:
      | "ACTIVE"
      | "SUSPENDED" =
      user.estado === "ACTIVE"
        ? "SUSPENDED"
        : "ACTIVE";

    const confirmed =
      window.confirm(
        nextStatus === "SUSPENDED"
          ? `¿Quieres suspender a ${user.nombre}? Sus sesiones activas serán revocadas.`
          : `¿Quieres activar nuevamente a ${user.nombre}?`,
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.patch(
        `/users/${user.id}/status`,
        {
          status: nextStatus,
        },
      );

      closeActions();
      setSelectedUser(null);

      await loadUsers();

      setSuccess(
        nextStatus === "ACTIVE"
          ? "Usuario activado correctamente."
          : "Usuario suspendido correctamente.",
      );
    } catch (err) {
      setError(
        getAxiosErrorMessage(
          err,
          "No se pudo cambiar el estado del usuario.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function disableUser(
    user: User,
  ) {
    const confirmed =
      window.confirm(
        `¿Deshabilitar la cuenta de ${user.nombre}? Se revocará su acceso sin eliminar sus datos.`,
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.patch(
        `/users/${user.id}/status`,
        {
          status: "DISABLED",
        },
      );

      closeActions();
      setSelectedUser(null);

      await loadUsers();

      setSuccess(
        "Usuario deshabilitado correctamente.",
      );
    } catch (err) {
      setError(
        getAxiosErrorMessage(
          err,
          "No se pudo deshabilitar el usuario.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function exportExcel() {
    if (
      filteredUsers.length === 0 ||
      exporting
    ) {
      return;
    }

    setExporting(true);
    setError("");
    setSuccess("");

    try {
      const ExcelJS =
        await import("exceljs");

      const workbook =
        new ExcelJS.Workbook();

      workbook.creator = "VibeNotas";
      workbook.created = new Date();

      const sheet =
        workbook.addWorksheet(
          "Usuarios",
          {
            views: [
              {
                state: "frozen",
                ySplit: 1,
              },
            ],
          },
        );

      sheet.columns = [
        {
          header: "Nombre",
          key: "nombre",
          width: 30,
        },
        {
          header: "Correo",
          key: "correo",
          width: 34,
        },
        {
          header: "Estado",
          key: "estado",
          width: 23,
        },
        {
          header: "Correo verificado",
          key: "verificado",
          width: 20,
        },
        {
          header: "MFA",
          key: "mfa",
          width: 14,
        },
        {
          header: "Registro",
          key: "registro",
          width: 22,
        },
        {
          header: "Último acceso",
          key: "actividad",
          width: 24,
        },
        {
          header: "ID",
          key: "id",
          width: 40,
        },
      ];

      for (const user of filteredUsers) {
        sheet.addRow({
          nombre: user.nombre,
          correo: user.correo,
          estado: getStatusLabel(
            user.estado,
          ),
          verificado:
            user.email_verificado
              ? "Sí"
              : "No",
          mfa: user.mfa_habilitado
            ? "Habilitado"
            : "Deshabilitado",
          registro: new Date(
            user.creado_en,
          ),
          actividad:
            user.ultima_actividad
              ? new Date(
                  user.ultima_actividad,
                )
              : null,
          id: user.id,
        });
      }

      const header =
        sheet.getRow(1);

      header.height = 28;
      header.font = {
        bold: true,
        color: {
          argb: "FFFFFFFF",
        },
      };
      header.alignment = {
        vertical: "middle",
      };
      header.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FF6D28D9",
        },
      };

      sheet.autoFilter = {
        from: "A1",
        to: "H1",
      };

      sheet.eachRow(
        (row, rowNumber) => {
          row.alignment = {
            vertical: "middle",
          };

          if (rowNumber > 1) {
            row.height = 22;

            if (
              rowNumber % 2 === 0
            ) {
              row.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: {
                  argb:
                    "FFF8FAFC",
                },
              };
            }
          }
        },
      );

      for (const column of [
        "F",
        "G",
      ]) {
        for (
          let row = 2;
          row <= sheet.rowCount;
          row += 1
        ) {
          sheet.getCell(
            `${column}${row}`,
          ).numFmt =
            "dd/mm/yyyy hh:mm";
        }
      }

      const buffer =
        await workbook.xlsx.writeBuffer();

      const blob = new Blob(
        [buffer as BlobPart],
        {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      );

      const url =
        URL.createObjectURL(blob);
      const link =
        document.createElement("a");

      const date =
        new Date()
          .toISOString()
          .slice(0, 10);

      link.href = url;
      link.download = `vibenotas-usuarios-${date}.xlsx`;
      link.click();

      URL.revokeObjectURL(url);

      setSuccess(
        `Excel generado con ${filteredUsers.length} usuario${
          filteredUsers.length === 1
            ? ""
            : "s"
        }.`,
      );
    } catch (err) {
      setError(
        getAxiosErrorMessage(
          err,
          "No se pudo generar el archivo Excel.",
        ),
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="space-y-6 pb-10 text-slate-900 dark:text-white">
      <header className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] p-6 shadow-xl shadow-slate-200/60 sm:p-8 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_38%),linear-gradient(135deg,rgba(30,41,59,0.96),rgba(15,23,42,0.96))] dark:shadow-2xl dark:shadow-black/20">
        <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/10" />
        <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-violet-300/20 blur-3xl dark:bg-violet-500/10" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-sky-700 dark:border-sky-400/15 dark:bg-sky-500/10 dark:text-sky-200">
              <UsersRound size={14} />
              Comunidad VibeNotas
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Usuarios
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
              Gestiona cuentas de usuario, verifica su estado de acceso y revisa información real de identidad y seguridad.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                void exportExcel()
              }
              disabled={
                filteredUsers.length ===
                  0 || exporting
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-200 dark:hover:border-white/15 dark:hover:bg-white/10"
            >
              {exporting ? (
                <RefreshCw
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <FileSpreadsheet
                  size={18}
                />
              )}
              {exporting
                ? "Generando..."
                : "Exportar Excel"}
            </button>

            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccess("");
                resetCreateForm();
                setShowCreateModal(true);
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-300/30 dark:shadow-violet-950/30 transition hover:-translate-y-0.5 hover:brightness-110"
            >
              <UserPlus size={18} />
              Nuevo usuario
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-400/15 dark:bg-red-500/[0.08] dark:text-red-100">
          <div className="mt-0.5 rounded-xl bg-red-100 p-2 text-red-700 dark:bg-red-500/10 dark:text-red-300">
            <AlertTriangle size={18} />
          </div>

          <div className="min-w-0">
            <p className="font-semibold">
              No pudimos completar la acción
            </p>
            <p className="mt-1 text-sm leading-5 text-red-700 dark:text-red-200/70">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            className="ml-auto rounded-lg p-1.5 text-red-500 transition hover:bg-red-100 hover:text-red-800 dark:text-red-200/60 dark:hover:bg-red-500/10 dark:hover:text-red-100"
            aria-label="Cerrar alerta"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-400/15 dark:bg-emerald-500/[0.08] dark:text-emerald-100">
          <div className="mt-0.5 rounded-xl bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 size={18} />
          </div>

          <div>
            <p className="font-semibold">
              Acción completada
            </p>
            <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-200/70">
              {success}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setSuccess("")
            }
            className="ml-auto rounded-lg p-1.5 text-emerald-500 transition hover:bg-emerald-100 hover:text-emerald-800 dark:text-emerald-200/60 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-100"
            aria-label="Cerrar confirmación"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Usuarios totales",
            value: totals.total,
            helper: "Cuentas no administrativas",
            icon: UsersRound,
            tone:
              "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/15 dark:bg-violet-500/[0.07] dark:text-violet-300",
          },
          {
            label: "Activos",
            value: totals.active,
            helper: "Acceso disponible",
            icon: UserRoundCheck,
            tone:
              "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/15 dark:bg-emerald-500/[0.07] dark:text-emerald-300",
          },
          {
            label: "Pendientes",
            value: totals.pending,
            helper: "Esperando verificación",
            icon: MailCheck,
            tone:
              "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/15 dark:bg-sky-500/[0.07] dark:text-sky-300",
          },
          {
            label: "Restringidos",
            value: totals.restricted,
            helper:
              "Suspendidos o deshabilitados",
            icon: ShieldOff,
            tone:
              "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/15 dark:bg-amber-500/[0.07] dark:text-amber-300",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.label}
              className={`rounded-2xl border p-5 ${item.tone}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">
                    {item.value}
                  </p>
                </div>

                <div className="rounded-xl bg-white/70 p-2.5 ring-1 ring-black/5 dark:bg-white/[0.055] dark:ring-0">
                  <Icon size={19} />
                </div>
              </div>

              <p className="mt-4 text-xs font-medium text-slate-500">
                {item.helper}
              </p>
            </article>
          );
        })}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/50 backdrop-blur-xl sm:p-5 dark:border-white/10 dark:bg-[#172033]/85 dark:shadow-black/10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-violet-400 focus-within:bg-white dark:border-white/10 dark:bg-black/10 dark:focus-within:border-violet-400/35 dark:focus-within:bg-black/15">
            <Search
              size={18}
              className="shrink-0 text-slate-500"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Buscar por nombre, correo o ID"
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-600"
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Limpiar búsqueda"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              void loadUsers()
            }
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-400/15 dark:bg-violet-500/10 dark:text-violet-200 dark:hover:bg-violet-500/15"
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />
            Actualizar
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map(
            (filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() =>
                  setStatusFilter(
                    filter.key,
                  )
                }
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition sm:text-sm ${
                  statusFilter ===
                  filter.key
                    ? "bg-violet-500 text-white shadow-lg shadow-violet-950/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950 dark:bg-white/[0.045] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
                }`}
              >
                {filter.label}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-[#172033]/85 dark:shadow-black/10">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-white/10">
          <div>
            <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">
              Comunidad
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              Usuarios registrados
            </h2>
          </div>

          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-400">
            {filteredUsers.length} visibles
          </span>
        </div>

        {loading ? (
          <div className="space-y-3 p-5 sm:p-6">
            {[1, 2, 3, 4].map(
              (item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-white/[0.045]"
                />
              ),
            )}
          </div>
        ) : filteredUsers.length ===
          0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="rounded-3xl border border-slate-200 bg-slate-100 p-5 text-slate-500 dark:border-white/10 dark:bg-white/[0.04]">
              <UserRound size={32} />
            </div>
            <p className="mt-4 font-semibold text-slate-800 dark:text-slate-200">
              No hay resultados
            </p>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              No encontramos usuarios que coincidan con la búsqueda y el estado seleccionado.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter(
                  "todos",
                );
              }}
              className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1000px] text-left">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:bg-black/10">
                  <tr>
                    <th className="px-6 py-4 font-semibold">
                      Usuario
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Verificación
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Estado
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Registro
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Último acceso
                    </th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map(
                    (user) => (
                      <tr
                        key={user.id}
                        className="border-t border-slate-100 text-sm transition hover:bg-slate-50 dark:border-white/[0.055] dark:hover:bg-white/[0.03]"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              user={user}
                            />

                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900 dark:text-white">
                                {user.nombre}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                {user.correo}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <VerificationBadge
                            verified={
                              user.email_verificado
                            }
                          />
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge
                            status={
                              user.estado
                            }
                          />
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {formatDate(
                            user.creado_en,
                          )}
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {formatDate(
                            user.ultima_actividad,
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              openActions(
                                user,
                              )
                            }
                            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                            aria-label={`Acciones de ${user.nombre}`}
                          >
                            <MoreHorizontal
                              size={19}
                            />
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 lg:hidden">
              {filteredUsers.map(
                (user) => (
                  <article
                    key={user.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.025]"
                  >
                    <div className="flex items-start gap-3">
                      <UserAvatar
                        user={user}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900 dark:text-white">
                          {user.nombre}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {user.correo}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          openActions(user)
                        }
                        className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label={`Acciones de ${user.nombre}`}
                      >
                        <MoreHorizontal
                          size={18}
                        />
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <StatusBadge
                        status={
                          user.estado
                        }
                      />
                      <VerificationBadge
                        verified={
                          user.email_verificado
                        }
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 dark:border-white/[0.06]">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Registro
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                          {formatDate(
                            user.creado_en,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Último acceso
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                          {formatDate(
                            user.ultima_actividad,
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          </>
        )}
      </div>

      {showActionsModal &&
        userForActions && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-4">
            <button
              type="button"
              onClick={closeActions}
              className="absolute inset-0"
              aria-label="Cerrar acciones"
            />

            <div className="relative z-10 w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-400/30 sm:p-6 dark:border-white/10 dark:bg-[#172033] dark:shadow-black/60">
              <div className="flex items-start gap-3">
                <UserAvatar
                  user={userForActions}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-slate-950 dark:text-white">
                    {userForActions.nombre}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {userForActions.correo}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge
                      status={
                        userForActions.estado
                      }
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeActions}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Cerrar"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="mt-6 grid gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(
                      userForActions,
                    );
                    closeActions();
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left text-slate-800 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.035] dark:text-slate-200 dark:hover:bg-white/[0.07]"
                >
                  <UserRound
                    size={19}
                    className="text-violet-700 dark:text-violet-300"
                  />
                  <div>
                    <p className="font-semibold">
                      Ver detalles
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Identidad y seguridad real de la cuenta.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openEditUser(
                      userForActions,
                    )
                  }
                  className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3.5 text-left text-sky-900 transition hover:bg-sky-100 dark:border-sky-400/15 dark:bg-sky-500/[0.07] dark:text-sky-100 dark:hover:bg-sky-500/10"
                >
                  <Pencil
                    size={19}
                    className="text-sky-700 dark:text-sky-300"
                  />
                  <div>
                    <p className="font-semibold">
                      Editar identidad
                    </p>
                    <p className="mt-0.5 text-xs text-sky-700 dark:text-sky-200/55">
                      Cambiar nombre o correo.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    void changeUserStatus(
                      userForActions,
                    )
                  }
                  className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-left text-amber-900 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-400/15 dark:bg-amber-500/[0.07] dark:text-amber-100 dark:hover:bg-amber-500/10"
                >
                  {userForActions.estado ===
                  "ACTIVE" ? (
                    <ShieldOff
                      size={19}
                      className="text-amber-700 dark:text-amber-300"
                    />
                  ) : (
                    <ShieldCheck
                      size={19}
                      className="text-emerald-700 dark:text-emerald-300"
                    />
                  )}
                  <div>
                    <p className="font-semibold">
                      {userForActions.estado ===
                      "ACTIVE"
                        ? "Suspender acceso"
                        : "Activar acceso"}
                    </p>
                    <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-200/55">
                      Actualiza el estado de la cuenta.
                    </p>
                  </div>
                </button>

                {userForActions.estado !==
                  "DISABLED" && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      void disableUser(
                        userForActions,
                      )
                    }
                    className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-left text-red-900 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-400/15 dark:bg-red-500/[0.07] dark:text-red-100 dark:hover:bg-red-500/10"
                  >
                    <UserRoundX
                      size={19}
                      className="text-red-700 dark:text-red-300"
                    />
                    <div>
                      <p className="font-semibold">
                        Deshabilitar cuenta
                      </p>
                      <p className="mt-0.5 text-xs text-red-700 dark:text-red-200/55">
                        Revoca el acceso sin borrar sus datos.
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      {selectedUser && (
        <div className="fixed inset-0 z-[75] flex justify-end bg-black/70 backdrop-blur-sm">
          <button
            type="button"
            onClick={() =>
              setSelectedUser(null)
            }
            className="absolute inset-0"
            aria-label="Cerrar panel"
          />

          <aside className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl shadow-slate-400/30 sm:p-6 dark:border-white/10 dark:bg-[#101827] dark:shadow-black/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
                  Perfil de usuario
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                  {selectedUser.nombre}
                </h2>
                <p className="mt-1 break-all text-sm text-slate-500">
                  {selectedUser.correo}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedUser(null)
                }
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-7 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex justify-center">
                <UserAvatar
                  user={selectedUser}
                  large
                />
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <StatusBadge
                  status={
                    selectedUser.estado
                  }
                />
                <VerificationBadge
                  verified={
                    selectedUser.email_verificado
                  }
                />
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.025]">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <CalendarDays size={15} />
                  Fecha de registro
                </div>
                <p className="mt-2 font-semibold text-slate-800 dark:text-slate-200">
                  {formatDateTime(
                    selectedUser.creado_en,
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.025]">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Último acceso
                </p>
                <p className="mt-2 font-semibold text-slate-800 dark:text-slate-200">
                  {formatDateTime(
                    selectedUser.ultima_actividad,
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.025]">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  MFA
                </p>
                <p className="mt-2 font-semibold text-slate-800 dark:text-slate-200">
                  {selectedUser.mfa_habilitado
                    ? "Habilitado"
                    : "Deshabilitado"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.025]">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Roles activos
                </p>
                <p className="mt-2 font-semibold text-slate-800 dark:text-slate-200">
                  {selectedUser.roles.length >
                  0
                    ? selectedUser.roles
                        .map(
                          (roleItem) =>
                            roleItem.name,
                        )
                        .join(", ")
                    : "Sin rol activo"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.025]">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Identificador
                </p>
                <p className="mt-2 break-all font-mono text-xs leading-5 text-slate-400">
                  {selectedUser.id}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5 dark:border-white/10">
              <button
                type="button"
                onClick={() =>
                  openEditUser(
                    selectedUser,
                  )
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 dark:border-sky-400/15 dark:bg-sky-500/[0.08] dark:text-sky-200 dark:hover:bg-sky-500/15"
              >
                <Pencil size={17} />
                Editar identidad
              </button>
            </div>
          </aside>
        </div>
      )}

      {showEditModal &&
        userToEdit && (
          <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-4">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setUserToEdit(null);
              }}
              className="absolute inset-0"
              aria-label="Cerrar edición"
            />

            <div className="relative z-10 w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-400/30 sm:p-6 dark:border-white/10 dark:bg-[#172033] dark:shadow-black/60">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
                    Identidad
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
                    Editar usuario
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Actualiza nombre o correo con los campos admitidos por el backend.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setUserToEdit(null);
                  }}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={updateUser}
                className="mt-6 space-y-5"
              >
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Nombre visible
                  </label>
                  <input
                    value={editNombre}
                    onChange={(event) =>
                      setEditNombre(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-500/10 dark:border-white/10 dark:bg-black/10 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-violet-400/40"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={editCorreo}
                    onChange={(event) =>
                      setEditCorreo(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-500/10 dark:border-white/10 dark:bg-black/10 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-violet-400/40"
                    required
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Cambiar el correo puede revocar las sesiones del usuario por seguridad.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setUserToEdit(null);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-300/30 dark:shadow-violet-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {saving ? (
                      <RefreshCw
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <Pencil size={17} />
                    )}
                    {saving
                      ? "Guardando..."
                      : "Guardar cambios"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {showCreateModal && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <button
            type="button"
            onClick={() => {
              if (!creating) {
                setShowCreateModal(false);
              }
            }}
            className="absolute inset-0"
            aria-label="Cerrar creación"
          />

          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl shadow-slate-400/30 dark:border-white/10 dark:bg-[#172033] dark:shadow-black/60">
            <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_42%),rgba(248,250,252,0.9)] p-5 sm:p-6 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_42%),rgba(15,23,42,0.45)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 dark:border-sky-400/15 dark:bg-sky-500/10 dark:text-sky-200">
                    <UserPlus size={14} />
                    Nueva cuenta
                  </div>

                  <h2 className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">
                    Crear usuario
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                    Registra una cuenta real usando el flujo de autenticación actual de VibeNotas.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={creating}
                  onClick={() =>
                    setShowCreateModal(false)
                  }
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form
              onSubmit={createUser}
              className="max-h-[78vh] overflow-y-auto p-5 sm:p-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Nombre
                  </span>
                  <input
                    type="text"
                    value={createFirstName}
                    onChange={(event) =>
                      setCreateFirstName(
                        event.target.value,
                      )
                    }
                    required
                    minLength={1}
                    maxLength={80}
                    autoComplete="given-name"
                    placeholder="Ej. Ana"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-[#101827] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-violet-400/40"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Apellido
                  </span>
                  <input
                    type="text"
                    value={createLastName}
                    onChange={(event) =>
                      setCreateLastName(
                        event.target.value,
                      )
                    }
                    required
                    minLength={1}
                    maxLength={80}
                    autoComplete="family-name"
                    placeholder="Ej. Pérez"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-[#101827] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-violet-400/40"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Username
                  </span>
                  <input
                    type="text"
                    value={createUsername}
                    onChange={(event) =>
                      setCreateUsername(
                        event.target.value,
                      )
                    }
                    required
                    minLength={3}
                    maxLength={30}
                    autoComplete="username"
                    placeholder="ana.perez"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-[#101827] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-violet-400/40"
                  />
                  <span className="mt-2 block text-xs leading-5 text-slate-500">
                    3–30 caracteres. Letras, números, punto, guion y guion bajo.
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Correo electrónico
                  </span>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(event) =>
                      setCreateEmail(
                        event.target.value,
                      )
                    }
                    required
                    maxLength={320}
                    autoComplete="email"
                    placeholder="usuario@correo.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-[#101827] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-violet-400/40"
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Contraseña temporal
                </span>
                <input
                  type="password"
                  value={createPassword}
                  onChange={(event) =>
                    setCreatePassword(
                      event.target.value,
                    )
                  }
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="Mínimo 12 caracteres"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-[#101827] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-violet-400/40"
                />
              </label>

              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-400/15 dark:bg-sky-500/[0.06]">
                <Info
                  size={18}
                  className="mt-0.5 shrink-0 text-sky-300"
                />
                <div>
                  <p className="font-semibold text-sky-900 dark:text-sky-100">
                    Rol de usuario normal
                  </p>
                  <p className="mt-1 text-xs leading-5 text-sky-700 dark:text-sky-200/60">
                    Este formulario no asigna privilegios administrativos. El registro utiliza el rol base configurado por el backend.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end dark:border-white/10">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() =>
                    setShowCreateModal(false)
                  }
                  className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/10"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-300/30 dark:shadow-violet-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {creating ? (
                    <RefreshCw
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <UserPlus size={17} />
                  )}

                  {creating
                    ? "Creando usuario..."
                    : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}