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

type Report = {
  id: number;
  tipo: string;
  referencia_id: number | null;
  reportante_id?: number;
  reportado_id?: number | null;
  motivo: string;
  descripcion?: string | null;
  estado: ReportStatus;
  respuesta_admin?: string | null;
  creado_en: string;
  actualizado_en?: string | null;
  revisado_en?: string | null;
  reportante_nombre: string;
  reportante_correo: string;
  reportado_nombre: string | null;
  reportado_correo: string | null;
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

function StatusBadge({
  status,
}: {
  status: ReportStatus;
}) {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}
    >
      <Icon size={13} />
      {meta.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const meta = getTypeMeta(type);
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}
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
    <article className="group relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-slate-900/70 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.2)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/[0.14]">
      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl ${glow}`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">
            {title}
          </p>

          <p className="mt-3 text-3xl font-black tracking-tight text-white">
            {value.toLocaleString("es-CL")}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] ${color}`}
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
  const [copying, setCopying] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isSuperAdmin = role === "superadmin";

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
      if (event.key === "Escape" && !savingStatus) {
        setSelectedReport(null);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectedReport, savingStatus]);

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
          report.reportante_correo,
          report.reportado_nombre,
          report.reportado_correo,
          report.referencia_id,
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
    if (savingStatus) return;

    setSelectedReport(null);
    setAdminResponse("");
    setModalError("");
  }

  async function updateStatus(status: ReportStatus) {
    if (!selectedReport) return;

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
      "Fecha",
    ];

    const rows = filteredReports.map((report) => [
      report.id,
      report.tipo,
      report.motivo,
      getStatusMeta(report.estado).label,
      report.reportante_nombre,
      report.reportante_correo,
      report.reportado_nombre,
      report.reportado_correo,
      report.referencia_id,
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
    <section className="relative min-h-full overflow-hidden rounded-[32px] border border-white/[0.06] bg-[#0b1120] p-4 shadow-2xl shadow-black/20 sm:p-6 xl:p-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-violet-600/10 blur-[110px]" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-sky-500/[0.07] blur-[110px]" />
        <div className="absolute bottom-0 left-1/2 h-64 w-64 rounded-full bg-fuchsia-500/[0.05] blur-[100px]" />
      </div>

      <div className="relative space-y-6">
        <header className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-violet-950/30 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.25)] sm:p-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-violet-400/20 bg-violet-500/10 text-violet-300 shadow-lg shadow-violet-950/30">
                <ShieldAlert size={27} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">
                    Centro de confianza
                  </p>

                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {isSuperAdmin
                      ? "Superadministrador"
                      : "Administrador"}
                  </span>
                </div>

                <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Moderación de reportes
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
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
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
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
            color="text-violet-300"
            glow="bg-violet-500/20"
          />

          <StatCard
            title="Pendientes"
            value={counts.pendientes}
            description="Reportes que todavía necesitan una primera revisión."
            icon={Clock3}
            color="text-amber-300"
            glow="bg-amber-500/20"
          />

          <StatCard
            title="En revisión"
            value={counts.revision}
            description="Casos que están siendo analizados por moderación."
            icon={Eye}
            color="text-sky-300"
            glow="bg-sky-500/20"
          />

          <StatCard
            title="Resueltos"
            value={counts.resueltos}
            description="Casos cerrados con una decisión administrativa."
            icon={ClipboardCheck}
            color="text-emerald-300"
            glow="bg-emerald-500/20"
          />
        </div>

        <div className="rounded-[26px] border border-white/[0.08] bg-slate-900/65 p-4 shadow-xl shadow-black/10 backdrop-blur-xl">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_190px_180px]">
            <label className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/15 px-4 py-3 transition focus-within:border-violet-400/30 focus-within:bg-violet-500/[0.04]">
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

            <label className="relative flex items-center">
              <Filter
                size={17}
                className="pointer-events-none absolute left-4 text-slate-500"
              />

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value)
                }
                className="h-full min-h-12 w-full appearance-none rounded-2xl border border-white/[0.08] bg-black/15 py-3 pl-11 pr-4 text-sm font-medium text-slate-300 outline-none transition focus:border-violet-400/30"
              >
                <option value="todos">
                  Todos los tipos
                </option>

                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {getTypeMeta(type).label}
                  </option>
                ))}
              </select>
            </label>

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value as SortOption
                )
              }
              className="min-h-12 rounded-2xl border border-white/[0.08] bg-black/15 px-4 py-3 text-sm font-medium text-slate-300 outline-none transition focus:border-violet-400/30"
            >
              <option value="recientes">
                Más recientes
              </option>
              <option value="antiguos">
                Más antiguos
              </option>
              <option value="prioridad">
                Por prioridad
              </option>
            </select>
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
                      ? "border-violet-400/25 bg-violet-500/15 text-violet-100 shadow-lg shadow-violet-950/20"
                      : "border-transparent bg-white/[0.04] text-slate-400 hover:border-white/10 hover:bg-white/[0.07] hover:text-white"
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

        <div className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-slate-900/70 shadow-[0_22px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 border-b border-white/[0.07] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
                Bandeja de moderación
              </p>

              <h2 className="mt-1 text-xl font-bold text-white">
                Reportes recibidos
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CircleDot
                size={14}
                className="text-emerald-400"
              />
              {filteredReports.length} resultados
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-5 sm:p-6">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-2xl border border-white/[0.05] bg-white/[0.035]"
                />
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] text-slate-500">
                <Inbox size={29} />
              </div>

              <h3 className="mt-5 text-lg font-bold text-white">
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
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1120px] text-left">
                  <thead className="bg-black/15 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
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
                        className="group border-t border-white/[0.055] text-sm transition hover:bg-white/[0.035]"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-slate-400 transition group-hover:border-violet-400/20 group-hover:bg-violet-500/10 group-hover:text-violet-300">
                              <Flag size={16} />
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="max-w-[300px] truncate font-bold text-slate-100">
                                  {report.motivo}
                                </p>

                                <span className="text-xs font-semibold text-slate-600">
                                  #{report.id}
                                </span>
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <TypeBadge
                                  type={report.tipo}
                                />

                                {report.referencia_id && (
                                  <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-500">
                                    Ref. #
                                    {report.referencia_id}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="max-w-[190px] truncate font-semibold text-slate-200">
                            {report.reportante_nombre ||
                              "Usuario"}
                          </p>
                          <p className="mt-1 max-w-[190px] truncate text-xs text-slate-500">
                            {report.reportante_correo ||
                              "Sin correo"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="max-w-[190px] truncate font-semibold text-slate-200">
                            {report.reportado_nombre ||
                              "No aplica"}
                          </p>
                          <p className="mt-1 max-w-[190px] truncate text-xs text-slate-500">
                            {report.reportado_correo ||
                              "Sin usuario reportado"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={report.estado}
                          />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-slate-400">
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
                            className="inline-flex items-center gap-2 rounded-xl border border-violet-400/15 bg-violet-500/10 px-3.5 py-2.5 text-xs font-bold text-violet-200 transition hover:border-violet-400/30 hover:bg-violet-500/20"
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

              <div className="divide-y divide-white/[0.06] lg:hidden">
                {paginatedReports.map((report) => (
                  <article
                    key={report.id}
                    className="p-5 transition hover:bg-white/[0.025]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                          Reporte #{report.id}
                        </p>
                        <h3 className="mt-1 truncate font-bold text-white">
                          {report.motivo}
                        </h3>
                      </div>

                      <StatusBadge
                        status={report.estado}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <TypeBadge type={report.tipo} />

                      {report.referencia_id && (
                        <span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-xs text-slate-500">
                          Ref. #{report.referencia_id}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 rounded-2xl border border-white/[0.06] bg-black/10 p-4 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Reportante
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-200">
                          {report.reportante_nombre}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Reportado
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-200">
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
                        className="inline-flex items-center gap-2 rounded-xl bg-violet-500/10 px-3.5 py-2.5 text-xs font-bold text-violet-200"
                      >
                        <Eye size={15} />
                        Revisar
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="flex flex-col gap-4 border-t border-white/[0.07] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs text-slate-500">
                  Mostrando{" "}
                  <strong className="text-slate-300">
                    {visibleFrom}
                  </strong>{" "}
                  a{" "}
                  <strong className="text-slate-300">
                    {visibleTo}
                  </strong>{" "}
                  de{" "}
                  <strong className="text-slate-300">
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
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <span className="min-w-24 text-center text-xs font-semibold text-slate-400">
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
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-30"
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
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-md sm:items-center sm:p-5"
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

          <div className="relative max-h-[94vh] w-full overflow-hidden rounded-t-[32px] border border-white/10 bg-[#111827] shadow-[0_30px_100px_rgba(0,0,0,0.65)] sm:max-w-3xl sm:rounded-[32px]">
            <div className="pointer-events-none absolute right-0 top-0 h-60 w-60 rounded-full bg-violet-600/10 blur-[90px]" />

            <div className="relative flex items-start justify-between gap-4 border-b border-white/[0.08] px-5 py-5 sm:px-7">
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
                  className="mt-3 text-xl font-black text-white sm:text-2xl"
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
                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-2.5 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
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
                  disabled={Boolean(savingStatus)}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-2.5 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                  aria-label="Cerrar"
                >
                  <X size={19} />
                </button>
              </div>
            </div>

            <div className="relative max-h-[calc(94vh-100px)] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              {modalError && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
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
                <div className="rounded-2xl border border-white/[0.07] bg-black/15 p-4">
                  <div className="flex items-center gap-2 text-violet-300">
                    <UserRound size={17} />
                    <p className="text-xs font-bold uppercase tracking-[0.14em]">
                      Reportante
                    </p>
                  </div>

                  <p className="mt-3 font-bold text-white">
                    {selectedReport.reportante_nombre ||
                      "Usuario"}
                  </p>

                  <p className="mt-1 break-all text-sm text-slate-500">
                    {selectedReport.reportante_correo ||
                      "Sin correo"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-black/15 p-4">
                  <div className="flex items-center gap-2 text-rose-300">
                    <ShieldAlert size={17} />
                    <p className="text-xs font-bold uppercase tracking-[0.14em]">
                      Reportado
                    </p>
                  </div>

                  <p className="mt-3 font-bold text-white">
                    {selectedReport.reportado_nombre ||
                      "No aplica"}
                  </p>

                  <p className="mt-1 break-all text-sm text-slate-500">
                    {selectedReport.reportado_correo ||
                      "Sin usuario reportado"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/[0.07] bg-black/15 p-4">
                <div className="flex items-center gap-2 text-sky-300">
                  <MessageSquareText size={17} />
                  <p className="text-xs font-bold uppercase tracking-[0.14em]">
                    Descripción del reporte
                  </p>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {selectedReport.descripcion?.trim() ||
                    "El usuario no agregó una descripción adicional."}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Referencia
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-200">
                    {selectedReport.referencia_id
                      ? `#${selectedReport.referencia_id}`
                      : "No aplica"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Creado
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-200">
                    {formatDate(
                      selectedReport.creado_en
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Última revisión
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-200">
                    {formatDate(
                      selectedReport.revisado_en ||
                        selectedReport.actualizado_en
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="admin-response"
                    className="text-sm font-bold text-white"
                  >
                    Respuesta administrativa
                  </label>

                  <span className="text-xs text-slate-600">
                    {adminResponse.length}/1500
                  </span>
                </div>

                <textarea
                  id="admin-response"
                  value={adminResponse}
                  onChange={(event) =>
                    setAdminResponse(
                      event.target.value.slice(
                        0,
                        1500
                      )
                    )
                  }
                  rows={5}
                  placeholder="Escribe la decisión, las acciones realizadas o el motivo del rechazo..."
                  className="mt-3 w-full resize-none rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/30 focus:bg-violet-500/[0.03]"
                />

                <p className="mt-2 text-xs leading-5 text-slate-600">
                  La respuesta es obligatoria al resolver
                  o rechazar un reporte.
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {selectedReport.estado !==
                  "en_revision" && (
                  <button
                    type="button"
                    onClick={() =>
                      void updateStatus(
                        "en_revision"
                      )
                    }
                    disabled={Boolean(savingStatus)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3.5 text-sm font-bold text-sky-200 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
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

                <button
                  type="button"
                  onClick={() =>
                    void updateStatus("resuelto")
                  }
                  disabled={
                    Boolean(savingStatus) ||
                    selectedReport.estado ===
                      "resuelto"
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3.5 text-sm font-bold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingStatus === "resuelto" ? (
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  Resolver reporte
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void updateStatus("rechazado")
                  }
                  disabled={
                    Boolean(savingStatus) ||
                    selectedReport.estado ===
                      "rechazado"
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3.5 text-sm font-bold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingStatus === "rechazado" ? (
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <Ban size={18} />
                  )}
                  Rechazar reporte
                </button>

                {(selectedReport.estado ===
                  "resuelto" ||
                  selectedReport.estado ===
                    "rechazado") && (
                  <button
                    type="button"
                    onClick={() =>
                      void updateStatus("pendiente")
                    }
                    disabled={Boolean(savingStatus)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3.5 text-sm font-bold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingStatus === "pendiente" ? (
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
            </div>
          </div>
        </div>
      )}
    </section>
  );
}