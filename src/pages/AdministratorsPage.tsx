import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Crown,
  FileSpreadsheet,
  Info,
  LockKeyhole,
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
  X,
} from "lucide-react";

import api from "../services/api";

type AdminRoleSlug = "owner" | "super_admin" | "admin";

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

type ApiUserStatus =
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "SUSPENDED"
  | "DISABLED";

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
    displayName?: string;
    status?: ApiUserStatus;
  };
  developmentVerificationToken?: string;
  verificationExpiresAt?: string;
};

type AdminUser = {
  id: string;
  nombre: string;
  correo: string;
  estado: ApiUserStatus;
  rol: AdminRoleSlug;
  rol_nombre: string;
  creado_en: string;
  ultima_actividad?: string;
  foto_perfil?: string | null;
};

type CurrentUser = {
  id?: string;
  rol?: string;
};

type StatusFilter =
  | "todos"
  | "ACTIVE"
  | "SUSPENDED"
  | "DISABLED";

type RoleFilter =
  | "todos"
  | "admin"
  | "super_admin"
  | "owner";

const ADMIN_ROLES: AdminRoleSlug[] = [
  "owner",
  "super_admin",
  "admin",
];

const STATUS_FILTERS: Array<{
  key: StatusFilter;
  label: string;
}> = [
  { key: "todos", label: "Todos" },
  { key: "ACTIVE", label: "Activos" },
  { key: "SUSPENDED", label: "Suspendidos" },
  { key: "DISABLED", label: "Deshabilitados" },
];

const ROLE_FILTERS: Array<{
  key: RoleFilter;
  label: string;
}> = [
  { key: "todos", label: "Todos los roles" },
  { key: "admin", label: "Administradores" },
  { key: "super_admin", label: "Super Admins" },
  { key: "owner", label: "Owners" },
];

function getInitials(nombre: string) {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function formatDate(value?: string) {
  if (!value) return "Sin información";

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
  if (!value) return "Sin información";

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

function getStatusLabel(status: ApiUserStatus) {
  switch (status) {
    case "ACTIVE":
      return "Activo";
    case "SUSPENDED":
      return "Suspendido";
    case "DISABLED":
      return "Deshabilitado";
    case "PENDING_VERIFICATION":
      return "Verificación pendiente";
    default:
      return status;
  }
}

function getRoleLabel(role: AdminRoleSlug) {
  switch (role) {
    case "owner":
      return "Owner";
    case "super_admin":
      return "Superadministrador";
    case "admin":
      return "Administrador";
    default:
      return role;
  }
}

function isProtectedRole(role: AdminRoleSlug) {
  return role === "owner" || role === "super_admin";
}

function getAxiosErrorMessage(
  error: unknown,
  fallback: string
) {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error.message
      : fallback;
  }

  const message = error.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return (
    message ||
    error.response?.data?.error ||
    fallback
  );
}

function isRoleAssignmentActive(
  assignment: ApiRoleAssignment
) {
  if (!assignment.expiresAt) {
    return true;
  }

  const expiresAt = new Date(
    assignment.expiresAt
  );

  return (
    !Number.isNaN(expiresAt.getTime()) &&
    expiresAt.getTime() > Date.now()
  );
}

function mapApiUserToAdmin(
  user: ApiUser
): AdminUser | null {
  const role = user.roles
    .filter(isRoleAssignmentActive)
    .map((assignment) => assignment.role)
    .filter((candidate) =>
      ADMIN_ROLES.includes(
        candidate.slug as AdminRoleSlug
      )
    )
    .sort(
      (left, right) =>
        right.priority - left.priority
    )[0];

  if (!role) {
    return null;
  }

  return {
    id: user.id,
    nombre:
      user.displayName?.trim() ||
      user.email,
    correo: user.email,
    estado: user.status,
    rol: role.slug as AdminRoleSlug,
    rol_nombre:
      role.name || getRoleLabel(
        role.slug as AdminRoleSlug
      ),
    creado_en: user.createdAt,
    ultima_actividad:
      user.lastLoginAt ?? undefined,
    foto_perfil: user.avatarUrl,
  };
}

async function fetchUsersByRole(
  role: AdminRoleSlug
): Promise<ApiUser[]> {
  const users: ApiUser[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response =
      await api.get<UsersResponse>(
        "/users",
        {
          params: {
            role,
            page,
            limit: 100,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
        }
      );

    users.push(...response.data.users);
    totalPages =
      response.data.totalPages;
    page += 1;
  } while (page <= totalPages);

  return users;
}

function readCurrentUser(): CurrentUser | null {
  const raw =
    localStorage.getItem("usuario");

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (
      typeof parsed !== "object" ||
      parsed === null
    ) {
      return null;
    }

    const root =
      parsed as Record<string, unknown>;

    const data =
      typeof root.data === "object" &&
      root.data !== null
        ? (root.data as Record<
            string,
            unknown
          >)
        : null;

    const candidate =
      (typeof data?.user === "object" &&
      data.user !== null
        ? data.user
        : undefined) ??
      (typeof data?.usuario === "object" &&
      data.usuario !== null
        ? data.usuario
        : undefined) ??
      (typeof root.user === "object" &&
      root.user !== null
        ? root.user
        : undefined) ??
      (typeof root.usuario === "object" &&
      root.usuario !== null
        ? root.usuario
        : undefined) ??
      root;

    if (
      typeof candidate !== "object" ||
      candidate === null
    ) {
      return null;
    }

    const value =
      candidate as Record<
        string,
        unknown
      >;

    return {
      id:
        typeof value.id === "string"
          ? value.id
          : undefined,
      rol:
        typeof value.rol === "string"
          ? value.rol
          : typeof value.role === "string"
            ? value.role
            : undefined,
    };
  } catch {
    return null;
  }
}

function StatusBadge({
  status,
}: {
  status: ApiUserStatus;
}) {
  const active = status === "ACTIVE";
  const suspended =
    status === "SUSPENDED";
  const pending =
    status === "PENDING_VERIFICATION";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        active
          ? "border-emerald-400/15 bg-emerald-500/10 text-emerald-300"
          : suspended
            ? "border-amber-400/15 bg-amber-500/10 text-amber-300"
            : pending
              ? "border-sky-400/15 bg-sky-500/10 text-sky-300"
              : "border-red-400/15 bg-red-500/10 text-red-300"
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

function RoleBadge({
  role,
}: {
  role: AdminRoleSlug;
}) {
  const owner = role === "owner";
  const superAdmin =
    role === "super_admin";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        owner
          ? "border-amber-400/15 bg-amber-500/10 text-amber-300"
          : superAdmin
            ? "border-fuchsia-400/15 bg-fuchsia-500/10 text-fuchsia-300"
            : "border-violet-400/15 bg-violet-500/10 text-violet-300"
      }`}
    >
      {owner || superAdmin ? (
        <Crown size={13} />
      ) : (
        <ShieldCheck size={13} />
      )}
      {getRoleLabel(role)}
    </span>
  );
}

function AdminAvatar({
  admin,
  large = false,
}: {
  admin: AdminUser;
  large?: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-violet-500 via-violet-600 to-fuchsia-600 font-bold text-white shadow-lg shadow-violet-950/30 ${
        large
          ? "h-20 w-20 rounded-3xl text-xl"
          : "h-11 w-11 rounded-2xl text-sm"
      }`}
    >
      {admin.foto_perfil ? (
        <img
          src={admin.foto_perfil}
          alt={admin.nombre}
          className="h-full w-full object-cover"
        />
      ) : (
        getInitials(
          admin.nombre || "Admin"
        )
      )}
    </div>
  );
}

export default function AdministratorsPage() {
  const [admins, setAdmins] = useState<
    AdminUser[]
  >([]);
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
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
  const [roleFilter, setRoleFilter] =
    useState<RoleFilter>("todos");

  const [
    selectedAdmin,
    setSelectedAdmin,
  ] = useState<AdminUser | null>(null);

  const [
    showActionsModal,
    setShowActionsModal,
  ] = useState(false);
  const [
    adminForActions,
    setAdminForActions,
  ] = useState<AdminUser | null>(null);

  const [
    showCreateModal,
    setShowCreateModal,
  ] = useState(false);
  const [creating, setCreating] =
    useState(false);
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

  const [
    showEditModal,
    setShowEditModal,
  ] = useState(false);
  const [
    adminToEdit,
    setAdminToEdit,
  ] = useState<AdminUser | null>(null);
  const [editNombre, setEditNombre] =
    useState("");
  const [editCorreo, setEditCorreo] =
    useState("");

  const currentUser = useMemo(
    readCurrentUser,
    []
  );

  function resetCreateForm() {
    setCreateFirstName("");
    setCreateLastName("");
    setCreateUsername("");
    setCreateEmail("");
    setCreatePassword("");
  }

  async function createAdmin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const firstName =
      createFirstName.trim();
    const lastName =
      createLastName.trim();
    const username =
      createUsername.trim();
    const email = createEmail.trim();

    if (
      firstName.length < 1 ||
      firstName.length > 80
    ) {
      setError(
        "El nombre debe tener entre 1 y 80 caracteres."
      );
      return;
    }

    if (
      lastName.length < 1 ||
      lastName.length > 80
    ) {
      setError(
        "El apellido debe tener entre 1 y 80 caracteres."
      );
      return;
    }

    if (
      username.length < 3 ||
      username.length > 30 ||
      !/^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])$/.test(
        username
      )
    ) {
      setError(
        "El username debe tener entre 3 y 30 caracteres y solo puede usar letras, números, puntos, guiones y guiones bajos."
      );
      return;
    }

    if (
      createPassword.length < 12 ||
      createPassword.length > 128
    ) {
      setError(
        "La contraseña temporal debe tener entre 12 y 128 caracteres."
      );
      return;
    }

    setCreating(true);
    setError("");
    setSuccess("");

    let createdUserId: string | null =
      null;

    try {
      const registerResponse =
        await api.post<RegisterResponse>(
          "/auth/register",
          {
            firstName,
            lastName,
            username,
            email,
            password: createPassword,
          }
        );

      createdUserId =
        registerResponse.data.user?.id ??
        null;

      if (!createdUserId) {
        throw new Error(
          "El backend creó la cuenta sin devolver un ID de usuario válido."
        );
      }

      const rolesResponse =
        await api.get<ApiRole[]>("/roles");

      const adminRole =
        rolesResponse.data.find(
          (role) =>
            role.slug === "admin"
        );

      if (!adminRole) {
        throw new Error(
          "No se encontró el rol admin en el backend."
        );
      }

      try {
        await api.post(
          `/users/${createdUserId}/roles/${adminRole.id}`
        );
      } catch (roleError) {
        /*
         * Compensación de seguridad:
         * si la cuenta fue creada pero no se pudo
         * asignar el rol administrativo, intentamos
         * dejarla deshabilitada para evitar una
         * cuenta parcial utilizable.
         */
        try {
          await api.patch(
            `/users/${createdUserId}/status`,
            {
              status: "DISABLED",
            }
          );
        } catch {
          // Conservamos el error original de asignación de rol.
        }

        throw roleError;
      }

      let verifiedInDevelopment =
        false;

      const developmentToken =
        registerResponse.data
          .developmentVerificationToken;

      if (
        typeof developmentToken ===
          "string" &&
        developmentToken.length >= 32
      ) {
        try {
          await api.post(
            "/auth/verify-email",
            {
              token: developmentToken,
            }
          );

          verifiedInDevelopment =
            true;
        } catch {
          /*
           * La cuenta y el rol ya fueron creados.
           * Si falla la verificación automática,
           * queda PENDING_VERIFICATION.
           */
        }
      }

      resetCreateForm();
      setShowCreateModal(false);

      await loadAdmins();

      setSuccess(
        verifiedInDevelopment
          ? "Administrador creado y activado correctamente."
          : "Administrador creado correctamente. La cuenta queda pendiente de verificación de correo."
      );
    } catch (err) {
      setError(
        getAxiosErrorMessage(
          err,
          "No se pudo crear el administrador."
        )
      );
    } finally {
      setCreating(false);
    }
  }

  async function loadAdmins() {
    setLoading(true);
    setError("");

    try {
      const [
        adminUsers,
        superAdminUsers,
        ownerUsers,
      ] = await Promise.all([
        fetchUsersByRole("admin"),
        fetchUsersByRole(
          "super_admin"
        ),
        fetchUsersByRole("owner"),
      ]);

      const uniqueUsers = new Map<
        string,
        ApiUser
      >();

      for (const user of [
        ...ownerUsers,
        ...superAdminUsers,
        ...adminUsers,
      ]) {
        uniqueUsers.set(
          user.id,
          user
        );
      }

      const mapped = Array.from(
        uniqueUsers.values()
      )
        .map(mapApiUserToAdmin)
        .filter(
          (
            admin
          ): admin is AdminUser =>
            admin !== null
        )
        .sort((left, right) => {
          const priorities: Record<
            AdminRoleSlug,
            number
          > = {
            owner: 100,
            super_admin: 90,
            admin: 50,
          };

          const roleDifference =
            priorities[right.rol] -
            priorities[left.rol];

          if (roleDifference !== 0) {
            return roleDifference;
          }

          return (
            new Date(
              right.creado_en
            ).getTime() -
            new Date(
              left.creado_en
            ).getTime()
          );
        });

      setAdmins(mapped);
    } catch (err) {
      setError(
        getAxiosErrorMessage(
          err,
          "No se pudieron cargar los administradores."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAdmins();
  }, []);

  const filteredAdmins = useMemo(() => {
    const text =
      search.trim().toLowerCase();

    return admins.filter((admin) => {
      const matchesSearch =
        !text ||
        admin.nombre
          .toLowerCase()
          .includes(text) ||
        admin.correo
          .toLowerCase()
          .includes(text) ||
        admin.id
          .toLowerCase()
          .includes(text);

      const matchesStatus =
        statusFilter === "todos" ||
        admin.estado ===
          statusFilter;

      const matchesRole =
        roleFilter === "todos" ||
        admin.rol === roleFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesRole
      );
    });
  }, [
    admins,
    search,
    statusFilter,
    roleFilter,
  ]);

  const totals = useMemo(() => {
    return {
      total: admins.length,
      active: admins.filter(
        (admin) =>
          admin.estado === "ACTIVE"
      ).length,
      restricted: admins.filter(
        (admin) =>
          admin.estado ===
            "SUSPENDED" ||
          admin.estado ===
            "DISABLED"
      ).length,
      protected: admins.filter(
        (admin) =>
          isProtectedRole(admin.rol)
      ).length,
    };
  }, [admins]);

  async function exportExcel() {
    if (
      filteredAdmins.length === 0 ||
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
          "Administradores",
          {
            views: [
              {
                state: "frozen",
                ySplit: 1,
              },
            ],
          }
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
          header: "Rol",
          key: "rol",
          width: 24,
        },
        {
          header: "Estado",
          key: "estado",
          width: 20,
        },
        {
          header:
            "Fecha de registro",
          key: "registro",
          width: 22,
        },
        {
          header:
            "Última actividad",
          key: "actividad",
          width: 24,
        },
        {
          header: "ID",
          key: "id",
          width: 40,
        },
      ];

      for (const admin of filteredAdmins) {
        sheet.addRow({
          nombre: admin.nombre,
          correo: admin.correo,
          rol: getRoleLabel(
            admin.rol
          ),
          estado: getStatusLabel(
            admin.estado
          ),
          registro: admin.creado_en
            ? new Date(
                admin.creado_en
              )
            : null,
          actividad:
            admin.ultima_actividad
              ? new Date(
                  admin.ultima_actividad
                )
              : null,
          id: admin.id,
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
        to: "G1",
      };

      sheet.eachRow(
        (
          row,
          rowNumber
        ) => {
          row.alignment = {
            vertical: "middle",
          };

          if (rowNumber > 1) {
            row.height = 22;

            if (
              rowNumber % 2 ===
              0
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

            const statusCell =
              row.getCell(4);
            const statusValue =
              String(
                statusCell.value ??
                  ""
              );

            const statusColors: Record<
              string,
              string
            > = {
              Activo: "FF047857",
              Suspendido:
                "FFB45309",
              Deshabilitado:
                "FFB91C1C",
              "Verificación pendiente":
                "FF0369A1",
            };

            statusCell.font = {
              bold: true,
              color: {
                argb:
                  statusColors[
                    statusValue
                  ] ??
                  "FF334155",
              },
            };
          }
        }
      );

      for (const cell of [
        "E",
        "F",
      ]) {
        for (
          let row = 2;
          row <= sheet.rowCount;
          row += 1
        ) {
          sheet.getCell(
            `${cell}${row}`
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
        }
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
      link.download = `vibenotas-administradores-${date}.xlsx`;
      link.click();

      URL.revokeObjectURL(url);

      setSuccess(
        `Excel generado con ${filteredAdmins.length} registro${
          filteredAdmins.length ===
          1
            ? ""
            : "s"
        }.`
      );
    } catch (err) {
      setError(
        getAxiosErrorMessage(
          err,
          "No se pudo generar el archivo Excel."
        )
      );
    } finally {
      setExporting(false);
    }
  }

  function openActionsModal(
    admin: AdminUser
  ) {
    setAdminForActions(admin);
    setShowActionsModal(true);
  }

  function closeActionsModal() {
    setShowActionsModal(false);
    setAdminForActions(null);
  }

  function openEditModal(
    admin: AdminUser
  ) {
    const isOwnAccount =
      currentUser?.id === admin.id;

    if (isOwnAccount) {
      setError(
        "No puedes modificar tu propia cuenta administrativa desde esta pantalla."
      );
      return;
    }

    if (
      isProtectedRole(admin.rol)
    ) {
      setError(
        "Las cuentas Owner y Super Admin están protegidas por jerarquía."
      );
      return;
    }

    setError("");
    setSuccess("");
    setAdminToEdit(admin);
    setEditNombre(admin.nombre);
    setEditCorreo(admin.correo);
    setSelectedAdmin(null);
    setShowEditModal(true);
  }

  async function updateAdmin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!adminToEdit) return;

    const nextName =
      editNombre.trim();
    const nextEmail =
      editCorreo.trim();

    if (nextName.length < 2) {
      setError(
        "El nombre debe tener al menos 2 caracteres."
      );
      return;
    }

    const changes: {
      displayName?: string;
      email?: string;
    } = {};

    if (
      nextName !==
      adminToEdit.nombre
    ) {
      changes.displayName =
        nextName;
    }

    if (
      nextEmail.toLowerCase() !==
      adminToEdit.correo.toLowerCase()
    ) {
      changes.email =
        nextEmail;
    }

    if (
      Object.keys(changes)
        .length === 0
    ) {
      setShowEditModal(false);
      setAdminToEdit(null);
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.patch(
        `/users/${adminToEdit.id}`,
        changes
      );

      setSuccess(
        "Administrador actualizado correctamente."
      );
      setShowEditModal(false);
      setAdminToEdit(null);

      await loadAdmins();
    } catch (err) {
      setError(
        getAxiosErrorMessage(
          err,
          "No se pudo actualizar el administrador."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(
    admin: AdminUser
  ) {
    const isOwnAccount =
      currentUser?.id === admin.id;

    if (isOwnAccount) {
      setError(
        "No puedes modificar el acceso de tu propia cuenta."
      );
      return;
    }

    if (
      isProtectedRole(admin.rol)
    ) {
      setError(
        "Las cuentas Owner y Super Admin están protegidas por jerarquía."
      );
      return;
    }

    const nextStatus:
      | "ACTIVE"
      | "SUSPENDED" =
      admin.estado === "ACTIVE"
        ? "SUSPENDED"
        : "ACTIVE";

    const action =
      nextStatus === "ACTIVE"
        ? "activar"
        : "suspender";

    const confirmed =
      window.confirm(
        `¿Quieres ${action} el acceso de ${admin.nombre}?`
      );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.patch(
        `/users/${admin.id}/status`,
        {
          status: nextStatus,
        }
      );

      setSuccess(
        `${admin.nombre} fue ${
          nextStatus === "ACTIVE"
            ? "activado"
            : "suspendido"
        } correctamente.`
      );

      setSelectedAdmin(null);
      closeActionsModal();

      await loadAdmins();
    } catch (err) {
      setError(
        getAxiosErrorMessage(
          err,
          "No se pudo actualizar el estado."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function disableAdmin(
    admin: AdminUser
  ) {
    const isOwnAccount =
      currentUser?.id === admin.id;

    if (isOwnAccount) {
      setError(
        "No puedes deshabilitar tu propia cuenta."
      );
      return;
    }

    if (
      isProtectedRole(admin.rol)
    ) {
      setError(
        "Las cuentas Owner y Super Admin están protegidas por jerarquía."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `¿Deshabilitar la cuenta de ${admin.nombre}? Se revocará su acceso administrativo.`
      );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.patch(
        `/users/${admin.id}/status`,
        {
          status: "DISABLED",
        }
      );

      setSuccess(
        `${admin.nombre} fue deshabilitado correctamente.`
      );

      setSelectedAdmin(null);
      closeActionsModal();

      await loadAdmins();
    } catch (err) {
      setError(
        getAxiosErrorMessage(
          err,
          "No se pudo deshabilitar el administrador."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  function canManage(
    admin: AdminUser
  ) {
    return (
      currentUser?.id !==
        admin.id &&
      !isProtectedRole(admin.rol)
    );
  }

  return (
    <section className="space-y-6 pb-10">
      <header className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.18),transparent_38%),linear-gradient(135deg,rgba(30,41,59,0.96),rgba(15,23,42,0.96))] p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/15 bg-violet-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-violet-200">
              <ShieldCheck size={14} />
              Control de privilegios
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Administradores
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
              Gestiona accesos elevados, revisa el estado de cada cuenta y mantén protegida la jerarquía administrativa de VibeNotas.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                void exportExcel()
              }
              disabled={
                filteredAdmins.length ===
                  0 || exporting
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.055] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/15 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
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
                setShowCreateModal(
                  true
                );
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-950/30 transition hover:-translate-y-0.5 hover:brightness-110"
            >
              <UserPlus size={18} />
              Nuevo administrador
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-400/15 bg-red-500/[0.08] p-4 text-red-100">
          <div className="mt-0.5 rounded-xl bg-red-500/10 p-2 text-red-300">
            <AlertTriangle
              size={18}
            />
          </div>

          <div className="min-w-0">
            <p className="font-semibold">
              No pudimos completar la acción
            </p>
            <p className="mt-1 text-sm leading-5 text-red-200/70">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            className="ml-auto rounded-lg p-1.5 text-red-200/60 transition hover:bg-red-500/10 hover:text-red-100"
            aria-label="Cerrar alerta"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.08] p-4 text-emerald-100">
          <div className="mt-0.5 rounded-xl bg-emerald-500/10 p-2 text-emerald-300">
            <CheckCircle2
              size={18}
            />
          </div>

          <div>
            <p className="font-semibold">
              Acción completada
            </p>
            <p className="mt-1 text-sm text-emerald-200/70">
              {success}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setSuccess("")
            }
            className="ml-auto rounded-lg p-1.5 text-emerald-200/60 transition hover:bg-emerald-500/10 hover:text-emerald-100"
            aria-label="Cerrar confirmación"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total",
            value: totals.total,
            helper:
              "Cuentas administrativas",
            icon: ShieldCheck,
            tone:
              "border-violet-400/15 bg-violet-500/[0.07] text-violet-300",
          },
          {
            label: "Activos",
            value: totals.active,
            helper:
              "Acceso disponible",
            icon: UserRoundCheck,
            tone:
              "border-emerald-400/15 bg-emerald-500/[0.07] text-emerald-300",
          },
          {
            label:
              "Acceso restringido",
            value:
              totals.restricted,
            helper:
              "Suspendidos o deshabilitados",
            icon: ShieldOff,
            tone:
              "border-amber-400/15 bg-amber-500/[0.07] text-amber-300",
          },
          {
            label:
              "Cuentas protegidas",
            value:
              totals.protected,
            helper:
              "Owner y Super Admin",
            icon: Crown,
            tone:
              "border-fuchsia-400/15 bg-fuchsia-500/[0.07] text-fuchsia-300",
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
                  <p className="mt-2 text-3xl font-bold text-white">
                    {item.value}
                  </p>
                </div>

                <div className="rounded-xl bg-white/[0.055] p-2.5">
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

      <div className="rounded-3xl border border-white/10 bg-[#172033]/85 p-4 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 transition focus-within:border-violet-400/35 focus-within:bg-black/15">
            <Search
              size={18}
              className="shrink-0 text-slate-500"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Buscar por nombre, correo o ID"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                className="rounded-lg p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
                aria-label="Limpiar búsqueda"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              void loadAdmins()
            }
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-400/15 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-50"
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

        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map(
              (filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() =>
                    setStatusFilter(
                      filter.key
                    )
                  }
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition sm:text-sm ${
                    statusFilter ===
                    filter.key
                      ? "bg-violet-500 text-white shadow-lg shadow-violet-950/20"
                      : "bg-white/[0.045] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {filter.label}
                </button>
              )
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {ROLE_FILTERS.map(
              (filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() =>
                    setRoleFilter(
                      filter.key
                    )
                  }
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition sm:text-sm ${
                    roleFilter ===
                    filter.key
                      ? "bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-950/20"
                      : "bg-white/[0.045] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {filter.label}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#172033]/85 shadow-xl shadow-black/10 backdrop-blur-xl">
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-semibold text-violet-300">
              Equipo administrativo
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              Accesos y jerarquía
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-bold text-slate-400">
              {filteredAdmins.length} visibles
            </span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5 sm:p-6">
            {[1, 2, 3, 4].map(
              (item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-2xl bg-white/[0.045]"
                />
              )
            )}
          </div>
        ) : filteredAdmins.length ===
          0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-slate-500">
              <UserRound size={32} />
            </div>
            <p className="mt-4 font-semibold text-slate-200">
              No hay resultados
            </p>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              No encontramos administradores que coincidan con la búsqueda y los filtros seleccionados.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter(
                  "todos"
                );
                setRoleFilter(
                  "todos"
                );
              }}
              className="mt-5 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-black/10 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">
                      Administrador
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Rol
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
                  {filteredAdmins.map(
                    (admin) => {
                      const own =
                        currentUser?.id ===
                        admin.id;

                      return (
                        <tr
                          key={admin.id}
                          className="border-t border-white/[0.055] text-sm transition hover:bg-white/[0.03]"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <AdminAvatar
                                admin={
                                  admin
                                }
                              />

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="truncate font-semibold text-white">
                                    {
                                      admin.nombre
                                    }
                                  </p>

                                  {own && (
                                    <span className="rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-300">
                                      Tú
                                    </span>
                                  )}
                                </div>

                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                  {
                                    admin.correo
                                  }
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <RoleBadge
                              role={
                                admin.rol
                              }
                            />
                          </td>

                          <td className="px-6 py-4">
                            <StatusBadge
                              status={
                                admin.estado
                              }
                            />
                          </td>

                          <td className="px-6 py-4 text-slate-500">
                            {formatDate(
                              admin.creado_en
                            )}
                          </td>

                          <td className="px-6 py-4 text-slate-500">
                            {formatDate(
                              admin.ultima_actividad
                            )}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                openActionsModal(
                                  admin
                                )
                              }
                              className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                              aria-label={`Acciones de ${admin.nombre}`}
                            >
                              <MoreHorizontal
                                size={
                                  19
                                }
                              />
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 lg:hidden">
              {filteredAdmins.map(
                (admin) => (
                  <article
                    key={admin.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <AdminAvatar
                        admin={admin}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white">
                          {admin.nombre}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {admin.correo}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          openActionsModal(
                            admin
                          )
                        }
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                        aria-label={`Acciones de ${admin.nombre}`}
                      >
                        <MoreHorizontal
                          size={18}
                        />
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <RoleBadge
                        role={
                          admin.rol
                        }
                      />
                      <StatusBadge
                        status={
                          admin.estado
                        }
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Registro
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-400">
                          {formatDate(
                            admin.creado_en
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Último acceso
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-400">
                          {formatDate(
                            admin.ultima_actividad
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          </>
        )}
      </div>

      {showActionsModal &&
        adminForActions && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-4">
            <button
              type="button"
              onClick={
                closeActionsModal
              }
              className="absolute inset-0"
              aria-label="Cerrar acciones"
            />

            <div className="relative z-10 w-full max-w-md rounded-[28px] border border-white/10 bg-[#172033] p-5 shadow-2xl shadow-black/60 sm:p-6">
              <div className="flex items-start gap-3">
                <AdminAvatar
                  admin={
                    adminForActions
                  }
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-white">
                    {
                      adminForActions.nombre
                    }
                  </p>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {
                      adminForActions.correo
                    }
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <RoleBadge
                      role={
                        adminForActions.rol
                      }
                    />
                    <StatusBadge
                      status={
                        adminForActions.estado
                      }
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    closeActionsModal
                  }
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Cerrar"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="mt-6 grid gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAdmin(
                      adminForActions
                    );
                    closeActionsModal();
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3.5 text-left text-slate-200 transition hover:bg-white/[0.07]"
                >
                  <UserRound
                    size={19}
                    className="text-violet-300"
                  />
                  <div>
                    <p className="font-semibold">
                      Ver detalles
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Identidad, fechas y estado de acceso.
                    </p>
                  </div>
                </button>

                {canManage(
                  adminForActions
                ) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        closeActionsModal();
                        openEditModal(
                          adminForActions
                        );
                      }}
                      className="flex items-center gap-3 rounded-2xl border border-sky-400/15 bg-sky-500/[0.07] px-4 py-3.5 text-left text-sky-100 transition hover:bg-sky-500/10"
                    >
                      <Pencil
                        size={19}
                        className="text-sky-300"
                      />
                      <div>
                        <p className="font-semibold">
                          Editar identidad
                        </p>
                        <p className="mt-0.5 text-xs text-sky-200/55">
                          Cambiar nombre o correo.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        void changeStatus(
                          adminForActions
                        )
                      }
                      className="flex items-center gap-3 rounded-2xl border border-amber-400/15 bg-amber-500/[0.07] px-4 py-3.5 text-left text-amber-100 transition hover:bg-amber-500/10 disabled:opacity-50"
                    >
                      {adminForActions.estado ===
                      "ACTIVE" ? (
                        <ShieldOff
                          size={19}
                          className="text-amber-300"
                        />
                      ) : (
                        <ShieldCheck
                          size={19}
                          className="text-emerald-300"
                        />
                      )}
                      <div>
                        <p className="font-semibold">
                          {adminForActions.estado ===
                          "ACTIVE"
                            ? "Suspender acceso"
                            : "Activar acceso"}
                        </p>
                        <p className="mt-0.5 text-xs text-amber-200/55">
                          Actualiza el estado de la cuenta.
                        </p>
                      </div>
                    </button>

                    {adminForActions.estado !==
                      "DISABLED" && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          void disableAdmin(
                            adminForActions
                          )
                        }
                        className="flex items-center gap-3 rounded-2xl border border-red-400/15 bg-red-500/[0.07] px-4 py-3.5 text-left text-red-100 transition hover:bg-red-500/10 disabled:opacity-50"
                      >
                        <UserRoundX
                          size={19}
                          className="text-red-300"
                        />
                        <div>
                          <p className="font-semibold">
                            Deshabilitar cuenta
                          </p>
                          <p className="mt-0.5 text-xs text-red-200/55">
                            Revoca el acceso sin eliminar datos.
                          </p>
                        </div>
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex items-start gap-3 rounded-2xl border border-fuchsia-400/15 bg-fuchsia-500/[0.06] p-4 text-sm text-fuchsia-100">
                    <LockKeyhole
                      size={18}
                      className="mt-0.5 shrink-0 text-fuchsia-300"
                    />
                    <p className="leading-5 text-fuchsia-200/70">
                      {currentUser?.id ===
                      adminForActions.id
                        ? "Tu propia cuenta se administra desde Perfil y Seguridad."
                        : "Esta cuenta está protegida por la jerarquía administrativa."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {selectedAdmin && (
        <div className="fixed inset-0 z-[75] flex justify-end bg-black/70 backdrop-blur-sm">
          <button
            type="button"
            onClick={() =>
              setSelectedAdmin(null)
            }
            className="absolute inset-0"
            aria-label="Cerrar panel"
          />

          <aside className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-[#101827] p-5 shadow-2xl shadow-black/60 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-300">
                  Perfil administrativo
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  {selectedAdmin.nombre}
                </h2>
                <p className="mt-1 break-all text-sm text-slate-500">
                  {selectedAdmin.correo}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedAdmin(
                    null
                  )
                }
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center">
              <div className="flex justify-center">
                <AdminAvatar
                  admin={
                    selectedAdmin
                  }
                  large
                />
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <RoleBadge
                  role={
                    selectedAdmin.rol
                  }
                />
                <StatusBadge
                  status={
                    selectedAdmin.estado
                  }
                />
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <CalendarDays
                    size={15}
                  />
                  Fecha de registro
                </div>
                <p className="mt-2 font-semibold text-slate-200">
                  {formatDateTime(
                    selectedAdmin.creado_en
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Última actividad
                </p>
                <p className="mt-2 font-semibold text-slate-200">
                  {formatDateTime(
                    selectedAdmin.ultima_actividad
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Identificador
                </p>
                <p className="mt-2 break-all font-mono text-xs leading-5 text-slate-400">
                  {selectedAdmin.id}
                </p>
              </div>

              {isProtectedRole(
                selectedAdmin.rol
              ) && (
                <div className="flex items-start gap-3 rounded-2xl border border-fuchsia-400/15 bg-fuchsia-500/[0.06] p-4">
                  <LockKeyhole
                    size={18}
                    className="mt-0.5 shrink-0 text-fuchsia-300"
                  />
                  <div>
                    <p className="font-semibold text-fuchsia-100">
                      Cuenta protegida
                    </p>
                    <p className="mt-1 text-xs leading-5 text-fuchsia-200/60">
                      Owner y Super Admin no se modifican desde acciones de menor jerarquía.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {canManage(
              selectedAdmin
            ) && (
              <div className="mt-6 border-t border-white/10 pt-5">
                <button
                  type="button"
                  onClick={() =>
                    openEditModal(
                      selectedAdmin
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-400/15 bg-sky-500/[0.08] px-4 py-3 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/15"
                >
                  <Pencil size={17} />
                  Editar identidad
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {showEditModal &&
        adminToEdit && (
          <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-4">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(
                  false
                );
                setAdminToEdit(
                  null
                );
              }}
              className="absolute inset-0"
              aria-label="Cerrar edición"
            />

            <div className="relative z-10 w-full max-w-lg rounded-[28px] border border-white/10 bg-[#172033] p-5 shadow-2xl shadow-black/60 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-300">
                    Identidad
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-white">
                    Editar administrador
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Actualiza solo datos compatibles con el endpoint administrativo actual.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(
                      false
                    );
                    setAdminToEdit(
                      null
                    );
                  }}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={updateAdmin}
                className="mt-6 space-y-5"
              >
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Nombre visible
                  </label>
                  <input
                    value={editNombre}
                    onChange={(event) =>
                      setEditNombre(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/10"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={editCorreo}
                    onChange={(event) =>
                      setEditCorreo(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/10"
                    required
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Cambiar el correo puede revocar las sesiones del usuario por seguridad.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Rol actual
                  </p>
                  <div className="mt-2">
                    <RoleBadge
                      role={
                        adminToEdit.rol
                      }
                    />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    El cambio de roles se gestiona por el sistema de jerarquía y no se mezcla con la edición de identidad.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(
                        false
                      );
                      setAdminToEdit(
                        null
                      );
                    }}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {saving ? (
                      <RefreshCw
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <Pencil
                        size={17}
                      />
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

          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/10 bg-[#172033] shadow-2xl shadow-black/60">
            <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.18),transparent_42%),rgba(15,23,42,0.45)] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/15 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-200">
                    <UserPlus size={14} />
                    Nuevo acceso administrativo
                  </div>

                  <h2 className="mt-4 text-2xl font-bold text-white">
                    Crear administrador
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                    Crea la identidad, registra sus credenciales y asigna dinámicamente el rol Administrador configurado en el backend.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={creating}
                  onClick={() =>
                    setShowCreateModal(false)
                  }
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form
              onSubmit={createAdmin}
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
                        event.target.value
                      )
                    }
                    required
                    minLength={1}
                    maxLength={80}
                    autoComplete="given-name"
                    placeholder="Ej. Ana"
                    className="w-full rounded-2xl border border-white/10 bg-[#101827] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
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
                        event.target.value
                      )
                    }
                    required
                    minLength={1}
                    maxLength={80}
                    autoComplete="family-name"
                    placeholder="Ej. Pérez"
                    className="w-full rounded-2xl border border-white/10 bg-[#101827] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
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
                        event.target.value
                      )
                    }
                    required
                    minLength={3}
                    maxLength={30}
                    autoComplete="username"
                    placeholder="ana.perez"
                    className="w-full rounded-2xl border border-white/10 bg-[#101827] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
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
                        event.target.value
                      )
                    }
                    required
                    maxLength={320}
                    autoComplete="email"
                    placeholder="admin@vibenotas.com"
                    className="w-full rounded-2xl border border-white/10 bg-[#101827] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
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
                      event.target.value
                    )
                  }
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="Mínimo 12 caracteres"
                  className="w-full rounded-2xl border border-white/10 bg-[#101827] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
                />
                <span className="mt-2 block text-xs leading-5 text-slate-500">
                  La contraseña se envía al backend únicamente al crear la cuenta y no se guarda en este formulario.
                </span>
              </label>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-violet-400/15 bg-violet-500/[0.07] p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-violet-500/10 p-2 text-violet-300">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-violet-100">
                        Rol: Administrador
                      </p>
                      <p className="mt-1 text-xs leading-5 text-violet-200/55">
                        El ID del rol no está escrito a mano: se obtiene desde /roles y se asigna por slug admin.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-400/15 bg-amber-500/[0.06] p-4">
                  <div className="flex items-start gap-3">
                    <Info
                      size={18}
                      className="mt-0.5 shrink-0 text-amber-300"
                    />
                    <div>
                      <p className="text-sm font-semibold text-amber-100">
                        Verificación de correo
                      </p>
                      <p className="mt-1 text-xs leading-5 text-amber-200/60">
                        En desarrollo, si el backend devuelve el token de verificación de desarrollo, la cuenta se activa automáticamente. En producción queda pendiente de verificación.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() =>
                    setShowCreateModal(false)
                  }
                  className="rounded-xl bg-white/[0.06] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
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
                    ? "Creando administrador..."
                    : "Crear administrador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}