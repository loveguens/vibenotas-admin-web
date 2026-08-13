import { useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  FileText,
  Folder,
  MoreHorizontal,
  RefreshCw,
  Search,
  StickyNote,
  Trash2,
} from "lucide-react";
import api from "../services/api";

type ContentType = "todos" | "notas" | "checklists" | "documentos";

type Note = {
  id: number;
  usuario_id?: number;
  usuario_nombre?: string;
  usuario_correo?: string;
  titulo?: string;
  contenido?: string;
  tipo?: string;
  color?: string;
  es_favorita?: boolean;
  fijada?: boolean;
  creado_en?: string;
  actualizado_en?: string;
};

type DocumentItem = {
  id: number;
  usuario_id?: number;
  usuario_nombre?: string;
  usuario_correo?: string;
  nombre_original: string;
  mime_type?: string;
  tamano_bytes?: number;
  creado_en?: string;
  actualizado_en?: string;
  nota_id?: number | null;
};

type ContentResponse = {
  success: boolean;
  message: string;
  data?: {
    total_notas?: number;
    total_documentos?: number;
    total_carpetas?: number;
    notas?: Note[];
    documentos?: DocumentItem[];
  };
};

type ContentRow = {
  id: string;
  title: string;
  subtitle: string;
  owner: string;
  type: "nota" | "checklist" | "documento";
  createdAt?: string;
  updatedAt?: string;
  raw: Note | DocumentItem;
};

function formatDate(date?: string) {
  if (!date) return "Sin fecha";

  const parsedDate = new Date(date.replace(" ", "T"));

  if (Number.isNaN(parsedDate.getTime())) {
    return "Sin fecha";
  }

  return parsedDate.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function ContentPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [foldersTotal, setFoldersTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<ContentType>("todos");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadContent() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<ContentResponse>(
        "/superadmin/content"
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "No se pudo cargar el contenido de VibeNotas."
        );
      }

      setNotes(response.data.data?.notas ?? []);
      setDocuments(response.data.data?.documentos ?? []);
      setFoldersTotal(response.data.data?.total_carpetas ?? 0);
    } catch (err) {
      setNotes([]);
      setDocuments([]);
      setFoldersTotal(0);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el contenido de VibeNotas."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadContent();
  }, []);

  const notesTotal = useMemo(
    () =>
      notes.filter(
        (note) =>
          String(note.tipo ?? "").toLowerCase() !== "checklist"
      ).length,
    [notes]
  );

  const checklistsTotal = useMemo(
    () =>
      notes.filter(
        (note) =>
          String(note.tipo ?? "").toLowerCase() === "checklist"
      ).length,
    [notes]
  );

  const contentRows = useMemo<ContentRow[]>(() => {
    const noteRows: ContentRow[] = notes.map((note) => {
      const isChecklist =
        String(note.tipo ?? "").toLowerCase() === "checklist";

      return {
        id: `note-${note.id}`,
        title: note.titulo || "Nota sin título",
        subtitle: note.contenido || "Sin contenido adicional",
        owner:
          note.usuario_nombre ||
          note.usuario_correo ||
          "Usuario desconocido",
        type: isChecklist ? "checklist" : "nota",
        createdAt: note.creado_en,
        updatedAt: note.actualizado_en,
        raw: note,
      };
    });

    const documentRows: ContentRow[] = documents.map((document) => ({
      id: `document-${document.id}`,
      title: document.nombre_original || "Documento sin nombre",
      subtitle: `${
        document.mime_type || "application/pdf"
      } · ${formatBytes(document.tamano_bytes)}`,
      owner:
        document.usuario_nombre ||
        document.usuario_correo ||
        "Usuario desconocido",
      type: "documento",
      createdAt: document.creado_en,
      updatedAt: document.actualizado_en,
      raw: document,
    }));

    return [...noteRows, ...documentRows].sort((firstItem, secondItem) => {
      const firstDate = new Date(
        (firstItem.updatedAt || firstItem.createdAt || "").replace(
          " ",
          "T"
        )
      ).getTime();

      const secondDate = new Date(
        (secondItem.updatedAt || secondItem.createdAt || "").replace(
          " ",
          "T"
        )
      ).getTime();

      return secondDate - firstDate;
    });
  }, [notes, documents]);

  const filteredContent = useMemo(() => {
    const text = search.trim().toLowerCase();

    return contentRows.filter((item) => {
      const matchesSearch =
        !text ||
        item.title.toLowerCase().includes(text) ||
        item.subtitle.toLowerCase().includes(text) ||
        item.owner.toLowerCase().includes(text);

      const matchesType =
        activeFilter === "todos" ||
        (activeFilter === "notas" && item.type === "nota") ||
        (activeFilter === "checklists" && item.type === "checklist") ||
        (activeFilter === "documentos" && item.type === "documento");

      return matchesSearch && matchesType;
    });
  }, [activeFilter, contentRows, search]);

  const filters: { id: ContentType; label: string }[] = [
    { id: "todos", label: "Todo el contenido" },
    { id: "notas", label: "Notas" },
    { id: "checklists", label: "Checklists" },
    { id: "documentos", label: "Documentos PDF" },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">
            Moderación de plataforma
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Gestión de contenido
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Revisa las notas, checklists y documentos de todos los usuarios de
            VibeNotas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadContent()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={18}
            className={loading ? "animate-spin" : ""}
          />
          Actualizar contenido
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
          <p className="text-sm text-slate-400">Notas</p>
          <p className="mt-3 text-3xl font-bold text-white">{notesTotal}</p>

          <div className="mt-4 flex items-center gap-2 text-sm text-violet-300">
            <StickyNote size={16} />
            Contenido escrito
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
          <p className="text-sm text-slate-400">Checklists</p>

          <p className="mt-3 text-3xl font-bold text-white">
            {checklistsTotal}
          </p>

          <div className="mt-4 flex items-center gap-2 text-sm text-sky-300">
            <CheckSquare size={16} />
            Listas activas
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
          <p className="text-sm text-slate-400">Documentos PDF</p>

          <p className="mt-3 text-3xl font-bold text-white">
            {documents.length}
          </p>

          <div className="mt-4 flex items-center gap-2 text-sm text-amber-300">
            <FileText size={16} />
            Archivos almacenados
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
          <p className="text-sm text-slate-400">Carpetas</p>

          <p className="mt-3 text-3xl font-bold text-white">
            {foldersTotal}
          </p>

          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-300">
            <Folder size={16} />
            Carpetas activas
          </div>
        </article>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-4 shadow-xl shadow-black/10 backdrop-blur-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
            <Search size={19} className="shrink-0 text-slate-500" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar contenido o usuario..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  activeFilter === filter.id
                    ? "bg-violet-500 text-white shadow-lg shadow-violet-950/30"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-3xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          <h2 className="font-bold">No se pudo cargar el contenido</h2>
          <p className="mt-2 text-sm text-red-200/80">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#1E293B]/80 shadow-xl shadow-black/10 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div>
              <p className="text-sm font-semibold text-violet-300">
                Biblioteca de VibeNotas
              </p>

              <h2 className="mt-1 text-xl font-bold text-white">
                Contenido reciente
              </h2>
            </div>

            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400">
              {filteredContent.length} elementos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="bg-black/10 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Contenido</th>
                  <th className="px-6 py-4 font-semibold">Usuario</th>
                  <th className="px-6 py-4 font-semibold">Tipo</th>
                  <th className="px-6 py-4 font-semibold">
                    Última actualización
                  </th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredContent.map((item) => {
                  const Icon =
                    item.type === "nota"
                      ? StickyNote
                      : item.type === "checklist"
                      ? CheckSquare
                      : FileText;

                  const label =
                    item.type === "nota"
                      ? "Nota"
                      : item.type === "checklist"
                      ? "Checklist"
                      : "Documento PDF";

                  return (
                    <tr
                      key={item.id}
                      className="border-t border-white/5 text-sm transition hover:bg-white/[0.035]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                            <Icon size={20} />
                          </div>

                          <div className="min-w-0">
                            <p className="max-w-md truncate font-semibold text-white">
                              {item.title}
                            </p>

                            <p className="mt-1 max-w-md truncate text-xs text-slate-500">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-200">
                          {item.owner}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                          {label}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {formatDate(item.updatedAt || item.createdAt)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                          title="Más acciones"
                        >
                          <MoreHorizontal size={19} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredContent.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-16 text-center text-slate-500"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-2xl bg-white/5 p-4">
                          <Trash2 size={28} />
                        </div>

                        <div>
                          <p className="font-semibold text-slate-300">
                            No hay contenido para mostrar
                          </p>

                          <p className="mt-1 text-sm">
                            Prueba cambiando la búsqueda o los filtros.
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
    </section>
  );
}