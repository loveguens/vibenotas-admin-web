import axios from "axios";
import {
  AlertCircle,
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Clock3,
  Copy,
  Download,
  Eye,
  FileWarning,
  Filter,
  Flag,
  Inbox,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../services/api";

type Role = "admin" | "superadmin";

type ReportStatus =
  | "pendiente"
  | "en_revision"
  | "resuelto"
  | "rechazado";

type ReportFilter = "todos" | ReportStatus;

type SortOption =
  | "recientes"
  | "antiguos"
  | "prioridad";

type ReportModerationAction =
  | "resolver"
  | "suspender_usuario"
  | "deshabilitar_usuario"
  | "eliminar_mensaje";

type Report = {
  id: string;
  tipo: string;
  motivo: string;
  descripcion?: string | null;
  estado: ReportStatus;
  respuesta_admin?: string | null;
  accion_moderacion?: ReportModerationAction | null;
  creado_en: string;
  actualizado_en?: string | null;
  revisado_en?: string | null;
  revisado_por_id?: string | null;
  revisado_por_nombre?: string | null;
  revisado_por_email?: string | null;
  reportante_nombre: string;
  reportante_email: string;
  reportado_nombre: string | null;
  reportado_email: string | null;
  conversacion_id: string | null;
  mensaje_id: string | null;
  contenido_reportado: string | null;
  tipo_mensaje: string | null;
  usuario_reportado_id?: string | null;
};

type ReportsResponse = {
  success: boolean;
  message: string;
  data?: {
    total: number;
    reportes: Report[];
  };
};

type UpdateReportResponse = {
  success: boolean;
  message: string;
  data?: {
    reporte?: Report;
  };
};

type ReportsPageProps = {
  role: Role;
};

const PAGE_SIZE = 8;

const statusConfig: Record<
  ReportStatus,
  {
    label: string;
    className: string;
    dot: string;
    icon: typeof Clock3;
  }
> = {
  pendiente: {
    label: "Pendiente",
    className:
      "border-amber-400/20 bg-amber-500/10 text-amber-200",
    dot: "bg-amber-400",
    icon: Clock3,
  },
  en_revision: {
    label: "En revisión",
    className:
      "border-sky-400/20 bg-sky-500/10 text-sky-200",
    dot: "bg-sky-400",
    icon: Eye,
  },
  resuelto: {
    label: "Resuelto",
    className:
      "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    dot: "bg-emerald-400",
    icon: CheckCircle2,
  },
  rechazado: {
    label: "Rechazado",
    className:
      "border-rose-400/20 bg-rose-500/10 text-rose-200",
    dot: "bg-rose-400",
    icon: Ban,
  },
};

const moderationActionConfig: Record<
  ReportModerationAction,
  {
    label: string;
    description: string;
    className: string;
    icon: typeof ShieldCheck;
  }
> = {
  resolver: {
    label: "Resolver sin sanción",
    description:
      "Cierra el reporte después de documentar la decisión administrativa.",
    className:
      "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    icon: CheckCircle2,
  },
  suspender_usuario: {
    label: "Suspender usuario",
    description:
      "Suspende al usuario reportado y revoca sus sesiones activas.",
    className:
      "border-amber-400/20 bg-amber-500/10 text-amber-200",
    icon: ShieldAlert,
  },
  deshabilitar_usuario: {
    label: "Deshabilitar usuario",
    description:
      "Deshabilita la cuenta reportada y revoca sus credenciales activas.",
    className:
      "border-rose-400/20 bg-rose-500/10 text-rose-200",
    icon: Ban,
  },
  eliminar_mensaje: {
    label: "Retirar mensaje",
    description:
      "Retira mediante soft-delete el mensaje asociado al reporte.",
    className:
      "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-200",
    icon: MessageSquareText,
  },
};

const typeConfig: Record<
  string,
  {
    label: string;
    className: string;
    icon: typeof UserRound;
  }
> = {
  usuario: {
    label: "Usuario",
    className:
      "border-violet-400/20 bg-violet-500/10 text-violet-200",
    icon: UserRound,
  },
  mensaje: {
    label: "Mensaje",
    className:
      "border-sky-400/20 bg-sky-500/10 text-sky-200",
    icon: MessageSquareText,
  },
  conversacion: {
    label: "Conversación",
    className:
      "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-200",
    icon: MessageSquareText,
  },
  soporte: {
    label: "Soporte",
    className:
      "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    icon: ShieldCheck,
  },
  otro: {
    label: "Otro",
    className:
      "border-slate-400/20 bg-slate-500/10 text-slate-300",
    icon: FileWarning,
  },
};

function formatDate(date?: string | null): string {
  if (!date) return "—";

  const normalizedDate = date.includes("T")
    ? date
    : date.replace(" ", "T");

  const parsedDate = new Date(normalizedDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normalizeText(value?: string | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.message ||
      fallback
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function getStatusMeta(status: ReportStatus) {
  return statusConfig[status] ?? statusConfig.pendiente;
}

function getTypeMeta(type: string) {
  return (
    typeConfig[type.toLowerCase()] ?? {
      label: type || "Otro",
      className:
        "border-slate-400/20 bg-slate-500/10 text-slate-300",
      icon: FileWarning,
    }
  );
}

function getModerationActionMeta(
  action: ReportModerationAction
) {
  return moderationActionConfig[action];
}

function getReportReference(
  report: Report
): string | null {
  return (
    report.mensaje_id ??
    report.usuario_reportado_id ??
    report.conversacion_id ??
    null
  );
}

function StatusBadge({
  status,
}: {
  status: ReportStatus;
}) {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;

  const tone =
    status === "pendiente"
      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200"
      : status === "en_revision"
        ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-200"
        : status === "resuelto"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200"
          : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      <Icon size={13} />
      {meta.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const meta = getTypeMeta(type);
  const Icon = meta.icon;
  const normalizedType = type.trim().toLowerCase();

  const tone =
    normalizedType === "usuario"
      ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200"
      : normalizedType === "mensaje"
        ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-400/20 dark:bg-fuchsia-500/10 dark:text-fuchsia-200"
        : "border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      <Icon size={13} />
      {meta.label}
    </span>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
  glow,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof Flag;
  color: string;
  glow: string;
}) {
  return (
    <article className="group relative overflow-hidden rounded-[26px] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/50 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl dark:border-white/[0.08] dark:bg-slate-900/70 dark:shadow-lg dark:shadow-black/20 dark:hover:border-white/[0.14]">
      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl ${glow}`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>

          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            {value.toLocaleString("es-CL")}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none ${color}`}
        >
          <Icon size={21} />
        </div>
      </div>

      <p className="relative mt-4 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </article>
  );
}

type FilterSelectOption = {
  value: string;
  label: string;
};

function FilterSelect({
  value,
  options,
  onChange,
  ariaLabel,
  leadingPadding = false,
}: {
  value: string;
  options: FilterSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  leadingPadding?: boolean;
}) {
  const selected =
    options.find((option) => option.value === value) ??
    options[0];

  return (
    <details className="group relative w-full">
      <summary
        aria-label={ariaLabel}
        className={
          "flex min-h-12 w-full cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white py-3 pr-4 text-left text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:border-slate-300 hover:bg-slate-50 focus-visible:border-violet-400 focus-visible:ring-4 focus-visible:ring-violet-500/10 dark:border-white/10 dark:bg-black/10 dark:text-slate-200 dark:shadow-none dark:hover:border-white/15 dark:hover:bg-white/[0.06] dark:focus-visible:border-violet-400/40 [&::-webkit-details-marker]:hidden " +
          (leadingPadding ? "pl-11" : "pl-4")
        }
      >
        <span className="min-w-0 truncate">
          {selected?.label}
        </span>

        <span
          aria-hidden="true"
          className="shrink-0 text-base leading-none text-slate-400 transition-transform duration-200 group-open:rotate-180 dark:text-slate-500"
        >
          ⌄
        </span>
      </summary>

      <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-300/40 dark:border-white/10 dark:bg-[#172033] dark:shadow-black/50">
        <div className="max-h-64 overflow-y-auto">
          {options.map((option) => {
            const active = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={(event) => {
                  onChange(option.value);

                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                }}
                className={
                  "flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition " +
                  (active
                    ? "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.07] dark:hover:text-white")
                }
              >
                <span className="truncate">
                  {option.label}
                </span>

                {active && (
                  <span
                    aria-hidden="true"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-black text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </details>
  );
}

export default function ReportsPage({
  role,
}: ReportsPageProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<ReportFilter>("todos");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [sortBy, setSortBy] =
    useState<SortOption>("recientes");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedReport, setSelectedReport] =
    useState<Report | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [modalError, setModalError] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] =
    useState<ReportStatus | null>(null);
  const [savingAction, setSavingAction] =
    useState<ReportModerationAction | null>(null);
  const [copying, setCopying] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isSuperAdmin = role === "superadmin";
  const isSaving = Boolean(savingStatus || savingAction);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response =
        await api.get<ReportsResponse>("/admin/reports");

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "No se pudieron cargar los reportes."
        );
      }

      setReports(response.data.data?.reportes ?? []);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No se pudieron cargar los reportes."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (!success) return;

    const timeout = window.setTimeout(() => {
      setSuccess("");
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [success]);

  useEffect(() => {
    if (!selectedReport) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        setSelectedReport(null);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectedReport, isSaving]);

  const counts = useMemo(() => {
    return {
      total: reports.length,
      pendientes: reports.filter(
        (report) => report.estado === "pendiente"
      ).length,
      revision: reports.filter(
        (report) => report.estado === "en_revision"
      ).length,
      resueltos: reports.filter(
        (report) => report.estado === "resuelto"
      ).length,
      rechazados: reports.filter(
        (report) => report.estado === "rechazado"
      ).length,
    };
  }, [reports]);

  const typeOptions = useMemo(() => {
    return Array.from(
      new Set(
        reports
          .map((report) => report.tipo.toLowerCase())
          .filter(Boolean)
      )
    ).sort();
  }, [reports]);

  const filteredReports = useMemo(() => {
    const text = normalizeText(search);

    const priority: Record<ReportStatus, number> = {
      pendiente: 1,
      en_revision: 2,
      resuelto: 3,
      rechazado: 4,
    };

    return reports
      .filter((report) => {
        const searchableContent = [
          report.id,
          report.motivo,
          report.descripcion,
          report.tipo,
          report.reportante_nombre,
          report.reportante_email,
          report.reportado_nombre,
          report.reportado_email,
          getReportReference(report),
          report.contenido_reportado,
          report.tipo_mensaje,
        ]
          .map((value) => normalizeText(String(value ?? "")))
          .join(" ");

        const matchesSearch =
          !text || searchableContent.includes(text);

        const matchesStatus =
          activeFilter === "todos" ||
          report.estado === activeFilter;

        const matchesType =
          typeFilter === "todos" ||
          report.tipo.toLowerCase() === typeFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesType
        );
      })
      .sort((first, second) => {
        if (sortBy === "prioridad") {
          return (
            priority[first.estado] -
            priority[second.estado]
          );
        }

        const firstDate = new Date(
          first.creado_en.replace(" ", "T")
        ).getTime();

        const secondDate = new Date(
          second.creado_en.replace(" ", "T")
        ).getTime();

        if (sortBy === "antiguos") {
          return firstDate - secondDate;
        }

        return secondDate - firstDate;
      });
  }, [
    reports,
    search,
    activeFilter,
    typeFilter,
    sortBy,
  ]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredReports.length / PAGE_SIZE)
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeFilter, typeFilter, sortBy]);

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;

    return filteredReports.slice(
      start,
      start + PAGE_SIZE
    );
  }, [filteredReports, currentPage]);

  const filterOptions: {
    id: ReportFilter;
    label: string;
    count: number;
  }[] = [
    {
      id: "todos",
      label: "Todos",
      count: counts.total,
    },
    {
      id: "pendiente",
      label: "Pendientes",
      count: counts.pendientes,
    },
    {
      id: "en_revision",
      label: "En revisión",
      count: counts.revision,
    },
    {
      id: "resuelto",
      label: "Resueltos",
      count: counts.resueltos,
    },
    {
      id: "rechazado",
      label: "Rechazados",
      count: counts.rechazados,
    },
  ];

  function openReport(report: Report) {
    setSelectedReport(report);
    setAdminResponse(report.respuesta_admin ?? "");
    setModalError("");
  }

  function closeReport() {
    if (isSaving) return;

    setSelectedReport(null);
    setAdminResponse("");
    setModalError("");
  }

  async function updateStatus(status: ReportStatus) {
    if (!selectedReport) return;

    if (selectedReport.accion_moderacion) {
      setModalError(
        "Este reporte ya tiene una acción de moderación aplicada y no puede cambiar de estado."
      );
      return;
    }

    const requiresResponse =
      status === "resuelto" ||
      status === "rechazado";

    if (requiresResponse && !adminResponse.trim()) {
      setModalError(
        status === "resuelto"
          ? "Escribe una respuesta antes de resolver el reporte."
          : "Escribe el motivo antes de rechazar el reporte."
      );
      return;
    }

    setSavingStatus(status);
    setModalError("");
    setError("");

    try {
      const response =
        await api.put<UpdateReportResponse>(
          `/admin/reports/${selectedReport.id}/status`,
          {
            estado: status,
            respuesta_admin:
              adminResponse.trim() || null,
          }
        );

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "No se pudo actualizar el reporte."
        );
      }

      const updatedReport: Report = response.data.data
        ?.reporte ?? {
        ...selectedReport,
        estado: status,
        respuesta_admin:
          adminResponse.trim() || null,
        actualizado_en: new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", " "),
      };

      setReports((currentReports) =>
        currentReports.map((report) =>
          report.id === updatedReport.id
            ? {
                ...report,
                ...updatedReport,
              }
            : report
        )
      );

      setSelectedReport(updatedReport);

      setSuccess(
        `Reporte #${updatedReport.id} actualizado como "${getStatusMeta(
          status
        ).label}".`
      );
    } catch (requestError) {
      setModalError(
        getErrorMessage(
          requestError,
          "No se pudo actualizar el reporte."
        )
      );
    } finally {
      setSavingStatus(null);
    }
  }

  async function applyModerationAction(
    action: ReportModerationAction
  ) {
    if (!selectedReport) return;

    if (selectedReport.accion_moderacion) {
      setModalError(
        "Este reporte ya tiene una acción de moderación aplicada."
      );
      return;
    }

    if (
      selectedReport.estado !== "pendiente" &&
      selectedReport.estado !== "en_revision"
    ) {
      setModalError(
        "El reporte debe estar pendiente o en revisión para aplicar una acción de moderación."
      );
      return;
    }

    if (
      action === "eliminar_mensaje" &&
      selectedReport.tipo.toLowerCase() !== "mensaje"
    ) {
      setModalError(
        "Retirar mensaje sólo está disponible para reportes de mensajes."
      );
      return;
    }

    const responseText = adminResponse.trim();

    if (!responseText) {
      setModalError(
        "Escribe una respuesta administrativa antes de aplicar la acción."
      );
      return;
    }

    const confirmations: Partial<
      Record<ReportModerationAction, string>
    > = {
      suspender_usuario:
        "¿Confirmas la suspensión del usuario reportado? Sus sesiones activas serán revocadas.",
      deshabilitar_usuario:
        "¿Confirmas la deshabilitación del usuario reportado? Perderá acceso y sus sesiones activas serán revocadas.",
      eliminar_mensaje:
        "¿Confirmas que deseas retirar el mensaje reportado mediante moderación?",
    };

    const confirmation = confirmations[action];

    if (
      confirmation &&
      !window.confirm(confirmation)
    ) {
      return;
    }

    setSavingAction(action);
    setModalError("");
    setError("");

    try {
      const response = await api.post(
        "/admin/reports/" + selectedReport.id + "/action",
        {
          accion: action,
          respuesta_admin: responseText,
        }
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data.message ||
            "No se pudo aplicar la acción de moderación."
        );
      }

      const reportId = selectedReport.id;
      const actionLabel =
        getModerationActionMeta(action).label;

      await loadReports();

      setSelectedReport(null);
      setAdminResponse("");

      setSuccess(
        "Reporte #" + reportId + ": " + actionLabel + " aplicado correctamente."
      );
    } catch (requestError) {
      setModalError(
        getErrorMessage(
          requestError,
          "No se pudo aplicar la acción de moderación."
        )
      );
    } finally {
      setSavingAction(null);
    }
  }

  async function copyReportId() {
    if (!selectedReport) return;

    setCopying(true);

    try {
      await navigator.clipboard.writeText(
        `Reporte #${selectedReport.id}`
      );

      setSuccess(
        `Identificador del reporte #${selectedReport.id} copiado.`
      );
    } catch {
      setModalError(
        "No se pudo copiar el identificador."
      );
    } finally {
      setCopying(false);
    }
  }

  function exportReports() {
    if (filteredReports.length === 0) {
      setError("No hay reportes para exportar.");
      return;
    }

    const escapeCsv = (
      value: string | number | null | undefined
    ) => {
      const normalized = String(value ?? "").replace(
        /"/g,
        '""'
      );

      return `"${normalized}"`;
    };

    const headers = [
      "ID",
      "Tipo",
      "Motivo",
      "Estado",
      "Reportante",
      "Correo reportante",
      "Reportado",
      "Correo reportado",
      "Referencia",
      "Acción de moderación",
      "Fecha",
    ];

    const rows = filteredReports.map((report) => [
      report.id,
      report.tipo,
      report.motivo,
      getStatusMeta(report.estado).label,
      report.reportante_nombre,
      report.reportante_email,
      report.reportado_nombre,
      report.reportado_email,
      getReportReference(report),
      report.accion_moderacion
        ? getModerationActionMeta(
            report.accion_moderacion
          ).label
        : "",
      report.creado_en,
    ]);

    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) =>
        row.map(escapeCsv).join(",")
      ),
    ].join("\n");

    const blob = new Blob(
      [`\uFEFF${csv}`],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `reportes-vibenotas-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    setSuccess(
      `${filteredReports.length} reportes exportados correctamente.`
    );
  }

  const visibleFrom =
    filteredReports.length === 0
      ? 0
      : (currentPage - 1) * PAGE_SIZE + 1;

  const visibleTo = Math.min(
    currentPage * PAGE_SIZE,
    filteredReports.length
  );

  return (
    <section className="relative min-h-full overflow-hidden rounded-[32px] border border-slate-200 bg-slate-50 p-4 text-slate-900 shadow-xl shadow-slate-200/50 sm:p-6 xl:p-8 dark:border-white/[0.06] dark:bg-[#0b1120] dark:text-white dark:shadow-2xl dark:shadow-black/20">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-violet-300/25 blur-[110px] dark:bg-violet-600/10" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-sky-300/20 blur-[110px] dark:bg-sky-500/[0.07]" />
        <div className="absolute bottom-0 left-1/2 h-64 w-64 rounded-full bg-fuchsia-300/15 blur-[100px] dark:bg-fuchsia-500/[0.05]" />
      </div>

      <div className="relative space-y-6">
        <header className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-violet-50 p-5 shadow-xl shadow-slate-200/60 sm:p-7 dark:border-white/[0.08] dark:from-slate-900/95 dark:via-slate-900/80 dark:to-violet-950/30 dark:shadow-lg dark:shadow-black/25">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-violet-200 bg-violet-100 text-violet-700 shadow-lg shadow-violet-200/50 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300 dark:shadow-violet-950/30">
                <ShieldAlert size={27} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-700 dark:text-violet-300">
                    Centro de confianza
                  </p>

                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-400 dark:shadow-none">
                    {isSuperAdmin
                      ? "Superadministrador"
                      : "Administrador"}
                  </span>
                </div>

                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
                  Moderación de reportes
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Revisa incidentes, analiza el contexto y
                  registra decisiones seguras para proteger
                  la comunidad de VibeNotas.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={exportReports}
                disabled={
                  loading || filteredReports.length === 0
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:shadow-none dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <Download size={17} />
                Exportar CSV
              </button>

              <button
                type="button"
                onClick={() => void loadReports()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-950/40 transition hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={17}
                  className={
                    loading ? "animate-spin" : ""
                  }
                />
                Actualizar
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-100 shadow-lg shadow-rose-950/10">
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0 text-rose-300"
            />

            <div className="min-w-0 flex-1">
              <p className="font-bold">
                No pudimos completar la operación
              </p>
              <p className="mt-1 text-sm text-rose-200/80">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="rounded-lg p-1 text-rose-300 transition hover:bg-rose-500/10 hover:text-white"
              aria-label="Cerrar error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-100 shadow-lg shadow-emerald-950/10">
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0 text-emerald-300"
            />

            <div className="min-w-0 flex-1">
              <p className="font-bold">
                Acción completada
              </p>
              <p className="mt-1 text-sm text-emerald-200/80">
                {success}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="rounded-lg p-1 text-emerald-300 transition hover:bg-emerald-500/10 hover:text-white"
              aria-label="Cerrar mensaje"
            >
              <X size={17} />
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          <StatCard
            title="Reportes totales"
            value={counts.total}
            description="Todos los reportes registrados en la plataforma."
            icon={Flag}
            color="text-violet-700 dark:text-violet-300"
            glow="bg-violet-300/35 dark:bg-violet-500/20"
          />

          <StatCard
            title="Pendientes"
            value={counts.pendientes}
            description="Reportes que todavía necesitan una primera revisión."
            icon={Clock3}
            color="text-amber-700 dark:text-amber-300"
            glow="bg-amber-300/35 dark:bg-amber-500/20"
          />

          <StatCard
            title="En revisión"
            value={counts.revision}
            description="Casos que están siendo analizados por moderación."
            icon={Eye}
            color="text-sky-700 dark:text-sky-300"
            glow="bg-sky-300/35 dark:bg-sky-500/20"
          />

          <StatCard
            title="Resueltos"
            value={counts.resueltos}
            description="Casos cerrados con una decisión administrativa."
            icon={ClipboardCheck}
            color="text-emerald-700 dark:text-emerald-300"
            glow="bg-emerald-300/35 dark:bg-emerald-500/20"
          />
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-white/[0.08] dark:bg-slate-900/65 dark:shadow-black/10">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_190px_180px]">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-violet-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-500/10 dark:border-white/[0.08] dark:bg-black/15 dark:focus-within:border-violet-400/30 dark:focus-within:bg-violet-500/[0.04] dark:focus-within:ring-0">
              <Search
                size={19}
                className="shrink-0 text-slate-500"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar ID, motivo, correo o persona..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="rounded-lg p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={16} />
                </button>
              )}
            </label>

            <div className="relative">
              <Filter
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              />

              <FilterSelect
                value={typeFilter}
                onChange={setTypeFilter}
                ariaLabel="Filtrar por tipo de reporte"
                leadingPadding
                options={[
                  {
                    value: "todos",
                    label: "Todos los tipos",
                  },
                  ...typeOptions.map((type) => ({
                    value: type,
                    label: getTypeMeta(type).label,
                  })),
                ]}
              />
            </div>

            <FilterSelect
              value={sortBy}
              onChange={(value) =>
                setSortBy(value as SortOption)
              }
              ariaLabel="Ordenar reportes"
              options={[
                {
                  value: "recientes",
                  label: "Más recientes",
                },
                {
                  value: "antiguos",
                  label: "Más antiguos",
                },
                {
                  value: "prioridad",
                  label: "Por prioridad",
                },
              ]}
            />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {filterOptions.map((filter) => {
              const active =
                activeFilter === filter.id;

              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() =>
                    setActiveFilter(filter.id)
                  }
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "border-violet-300 bg-violet-50 text-violet-700 shadow-sm dark:border-violet-400/25 dark:bg-violet-500/15 dark:text-violet-100 dark:shadow-lg dark:shadow-violet-950/20"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 dark:border-transparent dark:bg-white/[0.04] dark:text-slate-400 dark:hover:border-white/10 dark:hover:bg-white/[0.07] dark:hover:text-white"
                  }`}
                >
                  {filter.label}

                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      active
                        ? "bg-violet-400/15 text-violet-200"
                        : "bg-black/20 text-slate-500"
                    }`}
                  >
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-white/[0.08] dark:bg-slate-900/70 dark:shadow-lg dark:shadow-black/20">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-white/[0.07]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
                Bandeja de moderación
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                Reportes recibidos
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CircleDot
                size={14}
                className="text-emerald-400"
              />
              {filteredReports.length} {filteredReports.length === 1 ? "resultado" : "resultados"}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-5 sm:p-6">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/[0.05] dark:bg-white/[0.035]"
                />
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-500">
                <Inbox size={29} />
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">
                No encontramos reportes
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Cambia los filtros o intenta buscar con
                otro nombre, correo o identificador.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveFilter("todos");
                  setTypeFilter("todos");
                  setSortBy("recientes");
                }}
                className="mt-5 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <>
              <div className="hidden lg:block">
                <table className="w-full table-fixed text-left">
                  <colgroup>
                    <col className="w-[26%]" />
                    <col className="w-[18%]" />
                    <col className="w-[17%]" />
                    <col className="w-[12%]" />
                    <col className="w-[13%]" />
                    <col className="w-[14%]" />
                  </colgroup>

                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:bg-black/15">
                    <tr>
                      <th className="px-6 py-4">
                        Reporte
                      </th>
                      <th className="px-5 py-4">
                        Reportante
                      </th>
                      <th className="px-5 py-4">
                        Reportado
                      </th>
                      <th className="px-5 py-4">
                        Estado
                      </th>
                      <th className="px-5 py-4">
                        Fecha
                      </th>
                      <th className="px-6 py-4 text-right">
                        Acción
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedReports.map((report) => (
                      <tr
                        key={report.id}
                        className="group border-t border-slate-100 text-sm transition hover:bg-slate-50 dark:border-white/[0.055] dark:hover:bg-white/[0.035]"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition group-hover:border-violet-300 group-hover:bg-violet-50 group-hover:text-violet-700 dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-slate-400 dark:group-hover:border-violet-400/20 dark:group-hover:bg-violet-500/10 dark:group-hover:text-violet-300">
                              <Flag size={16} />
                            </div>

                            <div className="min-w-0">
                              <div className="min-w-0">
                                <p className="truncate font-bold text-slate-900 dark:text-slate-100">
                                  {report.motivo}
                                </p>

                                <span
                                  className="mt-1 block max-w-full truncate text-xs font-semibold text-slate-400 dark:text-slate-600"
                                  title={report.id}
                                >
                                  #{report.id}
                                </span>
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <TypeBadge
                                  type={report.tipo}
                                />

                                {getReportReference(report) && (
                                  <span className="inline-block max-w-[210px] truncate rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:bg-white/[0.04]">
                                    Ref. #
                                    {getReportReference(report)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="max-w-[190px] truncate font-semibold text-slate-800 dark:text-slate-200">
                            {report.reportante_nombre ||
                              "Usuario"}
                          </p>
                          <p className="mt-1 max-w-[190px] truncate text-xs text-slate-500">
                            {report.reportante_email ||
                              "Sin correo"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="max-w-[190px] truncate font-semibold text-slate-800 dark:text-slate-200">
                            {report.reportado_nombre ||
                              "No aplica"}
                          </p>
                          <p className="mt-1 max-w-[190px] truncate text-xs text-slate-500">
                            {report.reportado_email ||
                              "Sin usuario reportado"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={report.estado}
                          />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <CalendarDays
                              size={15}
                              className="text-slate-600"
                            />
                            <span className="text-xs">
                              {formatDate(
                                report.creado_en
                              )}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              openReport(report)
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2.5 text-xs font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 dark:border-violet-400/15 dark:bg-violet-500/10 dark:text-violet-200 dark:hover:border-violet-400/30 dark:hover:bg-violet-500/20"
                          >
                            <Eye size={15} />
                            Revisar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 lg:hidden dark:divide-white/[0.06]">
                {paginatedReports.map((report) => (
                  <article
                    key={report.id}
                    className="p-5 transition hover:bg-slate-50 dark:hover:bg-white/[0.025]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                          Reporte #{report.id}
                        </p>
                        <h3 className="mt-1 truncate font-bold text-slate-900 dark:text-white">
                          {report.motivo}
                        </h3>
                      </div>

                      <StatusBadge
                        status={report.estado}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <TypeBadge type={report.tipo} />

                      {getReportReference(report) && (
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs text-slate-500 dark:border-white/[0.07] dark:bg-white/[0.04]">
                          Ref. #{getReportReference(report)}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 dark:border-white/[0.06] dark:bg-black/10">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Reportante
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {report.reportante_nombre}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Reportado
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {report.reportado_nombre ||
                            "No aplica"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-500">
                        {formatDate(report.creado_en)}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          openReport(report)
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-violet-50 px-3.5 py-2.5 text-xs font-bold text-violet-700 transition hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-200 dark:hover:bg-violet-500/15"
                      >
                        <Eye size={15} />
                        Revisar
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-white/[0.07]">
                <p className="text-xs text-slate-500">
                  Mostrando{" "}
                  <strong className="text-slate-700 dark:text-slate-300">
                    {visibleFrom}
                  </strong>{" "}
                  a{" "}
                  <strong className="text-slate-700 dark:text-slate-300">
                    {visibleTo}
                  </strong>{" "}
                  de{" "}
                  <strong className="text-slate-700 dark:text-slate-300">
                    {filteredReports.length}
                  </strong>{" "}
                  reportes
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.max(1, page - 1)
                      )
                    }
                    disabled={currentPage === 1}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300 dark:shadow-none dark:hover:bg-white/[0.08] dark:hover:text-white"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <span className="min-w-24 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Página {currentPage} de {pageCount}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(
                          pageCount,
                          page + 1
                        )
                      )
                    }
                    disabled={
                      currentPage === pageCount
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300 dark:shadow-none dark:hover:bg-white/[0.08] dark:hover:text-white"
                    aria-label="Página siguiente"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedReport && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-md sm:items-center sm:p-5 dark:bg-slate-950/80"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-dialog-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={closeReport}
            aria-label="Cerrar modal"
          />

          <div className="relative max-h-[94vh] w-full overflow-hidden rounded-t-[32px] border border-slate-200 bg-white shadow-2xl shadow-slate-500/30 sm:max-w-3xl sm:rounded-[32px] dark:border-white/10 dark:bg-[#111827] dark:shadow-black/60">
            <div className="pointer-events-none absolute right-0 top-0 h-60 w-60 rounded-full bg-violet-300/20 blur-[90px] dark:bg-violet-600/10" />

            <div className="relative flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7 dark:border-white/[0.08]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <TypeBadge
                    type={selectedReport.tipo}
                  />
                  <StatusBadge
                    status={selectedReport.estado}
                  />
                </div>

                <h2
                  id="report-dialog-title"
                  className="mt-3 text-xl font-black text-slate-950 sm:text-2xl dark:text-white"
                >
                  {selectedReport.motivo}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Reporte #{selectedReport.id}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void copyReportId()
                  }
                  disabled={copying}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Copiar ID"
                >
                  {copying ? (
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <Copy size={18} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={closeReport}
                  disabled={isSaving}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Cerrar"
                >
                  <X size={19} />
                </button>
              </div>
            </div>

            <div className="relative max-h-[calc(94vh-100px)] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              {modalError && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />
                  <p className="flex-1">
                    {modalError}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setModalError("")
                    }
                    aria-label="Cerrar error"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.07] dark:bg-black/15">
                  <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                    <UserRound size={17} />
                    <p className="text-xs font-bold uppercase tracking-[0.14em]">
                      Reportante
                    </p>
                  </div>

                  <p className="mt-3 font-bold text-slate-900 dark:text-white">
                    {selectedReport.reportante_nombre ||
                      "Usuario"}
                  </p>

                  <p className="mt-1 break-all text-sm text-slate-500">
                    {selectedReport.reportante_email ||
                      "Sin correo"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.07] dark:bg-black/15">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                    <ShieldAlert size={17} />
                    <p className="text-xs font-bold uppercase tracking-[0.14em]">
                      Reportado
                    </p>
                  </div>

                  <p className="mt-3 font-bold text-slate-900 dark:text-white">
                    {selectedReport.reportado_nombre ||
                      "No aplica"}
                  </p>

                  <p className="mt-1 break-all text-sm text-slate-500">
                    {selectedReport.reportado_email ||
                      "Sin usuario reportado"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.07] dark:bg-black/15">
                <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300">
                  <MessageSquareText size={17} />
                  <p className="text-xs font-bold uppercase tracking-[0.14em]">
                    Descripción del reporte
                  </p>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {selectedReport.descripcion?.trim() ||
                    "El usuario no agregó una descripción adicional."}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] dark:shadow-none">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Referencia
                  </p>
                  <p className="mt-2 break-words text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {getReportReference(selectedReport)
                      ? `#${getReportReference(selectedReport)}`
                      : "No aplica"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] dark:shadow-none">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Creado
                  </p>
                  <p className="mt-2 break-words text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formatDate(
                      selectedReport.creado_en
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] dark:shadow-none">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Última revisión
                  </p>
                  <p className="mt-2 break-words text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formatDate(
                      selectedReport.revisado_en ||
                        selectedReport.actualizado_en
                    )}
                  </p>
                </div>
              </div>

              {selectedReport.accion_moderacion && (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-500/[0.08]">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      size={19}
                      className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-300"
                    />

                    <div>
                      <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                        Acción de moderación aplicada
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {
                          getModerationActionMeta(
                            selectedReport.accion_moderacion
                          ).label
                        }
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {
                          getModerationActionMeta(
                            selectedReport.accion_moderacion
                          ).description
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="admin-response"
                    className="text-sm font-bold text-slate-900 dark:text-white"
                  >
                    Respuesta administrativa
                  </label>

                  <span className="text-xs text-slate-600">
                    {adminResponse.length}/2000
                  </span>
                </div>

                <textarea
                  id="admin-response"
                  value={adminResponse}
                  onChange={(event) =>
                    setAdminResponse(
                      event.target.value.slice(
                        0,
                        2000
                      )
                    )
                  }
                  disabled={
                    Boolean(
                      selectedReport.accion_moderacion
                    ) || isSaving
                  }
                  rows={5}
                  placeholder="Escribe la decisión, las acciones realizadas o el motivo del rechazo..."
                  className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-white/[0.08] dark:bg-black/20 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-violet-400/30 dark:focus:bg-violet-500/[0.03] dark:focus:ring-0 dark:disabled:bg-black/10 dark:disabled:text-slate-500"
                />

                <p className="mt-2 text-xs leading-5 text-slate-600">
                  La respuesta es obligatoria al rechazar
                  o aplicar una acción de moderación.
                </p>
              </div>

              {!selectedReport.accion_moderacion && (
                <>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {selectedReport.estado ===
                      "pendiente" && (
                      <button
                        type="button"
                        onClick={() =>
                          void updateStatus(
                            "en_revision"
                          )
                        }
                        disabled={isSaving}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3.5 text-sm font-bold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:bg-sky-500/20"
                      >
                        {savingStatus ===
                        "en_revision" ? (
                          <LoaderCircle
                            size={18}
                            className="animate-spin"
                          />
                        ) : (
                          <Eye size={18} />
                        )}
                        Marcar en revisión
                      </button>
                    )}

                    {(selectedReport.estado ===
                      "pendiente" ||
                      selectedReport.estado ===
                        "en_revision") && (
                      <button
                        type="button"
                        onClick={() =>
                          void updateStatus(
                            "rechazado"
                          )
                        }
                        disabled={isSaving}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                      >
                        {savingStatus ===
                        "rechazado" ? (
                          <LoaderCircle
                            size={18}
                            className="animate-spin"
                          />
                        ) : (
                          <Ban size={18} />
                        )}
                        Rechazar reporte
                      </button>
                    )}

                    {(selectedReport.estado ===
                      "resuelto" ||
                      selectedReport.estado ===
                        "rechazado") && (
                      <button
                        type="button"
                        onClick={() =>
                          void updateStatus(
                            "pendiente"
                          )
                        }
                        disabled={isSaving}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3.5 text-sm font-bold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
                      >
                        {savingStatus ===
                        "pendiente" ? (
                          <LoaderCircle
                            size={18}
                            className="animate-spin"
                          />
                        ) : (
                          <RefreshCw size={18} />
                        )}
                        Reabrir reporte
                      </button>
                    )}
                  </div>

                  {(selectedReport.estado ===
                    "pendiente" ||
                    selectedReport.estado ===
                      "en_revision") && (
                    <div className="mt-6 border-t border-white/[0.07] pt-6">
                      <p className="text-sm font-black text-white">
                        Acción de moderación
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Estas acciones resuelven el reporte
                        y quedan registradas en auditoría.
                      </p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {(
                          [
                            "resolver",
                            "suspender_usuario",
                            "deshabilitar_usuario",
                            "eliminar_mensaje",
                          ] as ReportModerationAction[]
                        ).map((action) => {
                          const meta =
                            getModerationActionMeta(
                              action
                            );
                          const Icon = meta.icon;
                          const unavailable =
                            action ===
                              "eliminar_mensaje" &&
                            selectedReport.tipo.toLowerCase() !==
                              "mensaje";

                          return (
                            <button
                              key={action}
                              type="button"
                              onClick={() =>
                                void applyModerationAction(
                                  action
                                )
                              }
                              disabled={
                                isSaving || unavailable
                              }
                              title={
                                unavailable
                                  ? "Disponible sólo para reportes de mensajes."
                                  : meta.description
                              }
                              className={
                                "flex items-start gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-35 " +
                                meta.className
                              }
                            >
                              {savingAction ===
                              action ? (
                                <LoaderCircle
                                  size={19}
                                  className="mt-0.5 shrink-0 animate-spin"
                                />
                              ) : (
                                <Icon
                                  size={19}
                                  className="mt-0.5 shrink-0"
                                />
                              )}

                              <span>
                                <span className="block text-sm font-bold">
                                  {meta.label}
                                </span>

                                <span className="mt-1 block text-xs leading-5 opacity-70">
                                  {unavailable
                                    ? "Sólo disponible para reportes de mensajes."
                                    : meta.description}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}