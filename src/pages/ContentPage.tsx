import { useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  FileText,
  Folder,
  MoreHorizontal,
  RefreshCw,
  Search,
  StickyNote,
  Files,
} from "lucide-react";

import api from "../services/api";

type ContentType = "todos" | "notas" | "checklists" | "documentos";

type Owner = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  displayName: string | null;
};

type FolderItem = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  owner: Owner;
  usuario_nombre: string;
  usuario_correo: string;
};

type Note = {
  id: string;
  title: string | null;
  contentFormat: string;
  color: string | null;
  folderId: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  folder: {
    id: string;
    name: string;
  } | null;
  owner: Owner;
  usuario_nombre: string;
  usuario_correo: string;
};

type Checklist = {
  id: string;
  title: string | null;
  description: string | null;
  color: string | null;
  folderId: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  folder: {
    id: string;
    name: string;
  } | null;
  totalItems: number;
  completedItems: number;
  owner: Owner;
  usuario_nombre: string;
  usuario_correo: string;
};

type DocumentItem = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number | null;
  folderId: string | null;
  noteId: string | null;
  checklistId: string | null;
  createdAt: string;
  updatedAt: string;
  folder: {
    id: string;
    name: string;
  } | null;
  note: {
    id: string;
    title: string | null;
  } | null;
  checklist: {
    id: string;
    title: string | null;
  } | null;
  owner: Owner;
  usuario_nombre: string;
  usuario_correo: string;
};

type ContentTotals = {
  folders: number;
  notes: number;
  checklists: number;
  documents: number;
  reminders: number;
  total: number;
};

type AdminContentResponse = {
  totals: ContentTotals;
  folders: FolderItem[];
  notes: Note[];
  checklists: Checklist[];
  documents: DocumentItem[];
  reminders: unknown[];
};

type ContentRow = {
  id: string;
  resourceId: string;
  title: string;
  subtitle: string;
  owner: string;
  ownerEmail: string;
  type: "nota" | "checklist" | "documento";
  createdAt: string;
  updatedAt: string;
};

const emptyTotals: ContentTotals = {
  folders: 0,
  notes: 0,
  checklists: 0,
  documents: 0,
  reminders: 0,
  total: 0,
};

function formatDate(date?: string) {
  if (!date) {
    return "Sin fecha";
  }

  const parsedDate = new Date(date);

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

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatNoteContentFormat(format: string) {
  switch (format) {
    case "RICH_TEXT":
      return "Texto enriquecido";

    case "MARKDOWN":
      return "Markdown";

    case "PLAIN_TEXT":
      return "Texto plano";

    default:
      return format || "Nota";
  }
}

function resolveOwner(
  owner: Owner | undefined,
  fallbackName: string,
  fallbackEmail: string,
) {
  return {
    name: owner?.name || fallbackName || fallbackEmail || "Usuario desconocido",
    email: owner?.email || fallbackEmail || "",
  };
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      message?: unknown;
      response?: {
        data?: {
          message?: unknown;
        };
      };
    };

    const apiMessage = candidate.response?.data?.message;

    if (typeof apiMessage === "string" && apiMessage.trim()) {
      return apiMessage;
    }

    if (typeof candidate.message === "string" && candidate.message.trim()) {
      return candidate.message;
    }
  }

  return "No se pudo cargar el contenido de VibeNotas.";
}

export default function ContentPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [totals, setTotals] = useState<ContentTotals>(emptyTotals);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ContentType>("todos");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadContent() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<AdminContentResponse>("/admin/content");

      setNotes(Array.isArray(response.data.notes) ? response.data.notes : []);

      setChecklists(
        Array.isArray(response.data.checklists) ? response.data.checklists : [],
      );

      setDocuments(
        Array.isArray(response.data.documents) ? response.data.documents : [],
      );

      setTotals(response.data.totals ?? emptyTotals);
    } catch (err: unknown) {
      setNotes([]);
      setChecklists([]);
      setDocuments([]);
      setTotals(emptyTotals);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadContent();
  }, []);

  const contentRows = useMemo<ContentRow[]>(() => {
    const noteRows: ContentRow[] = notes.map((note) => {
      const owner = resolveOwner(
        note.owner,
        note.usuario_nombre,
        note.usuario_correo,
      );

      const format = formatNoteContentFormat(note.contentFormat);

      const subtitle = note.folder?.name
        ? `${format} · ${note.folder.name}`
        : format;

      return {
        id: `note-${note.id}`,
        resourceId: note.id,
        title: note.title?.trim() || "Nota sin título",
        subtitle,
        owner: owner.name,
        ownerEmail: owner.email,
        type: "nota",
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      };
    });

    const checklistRows: ContentRow[] = checklists.map((checklist) => {
      const owner = resolveOwner(
        checklist.owner,
        checklist.usuario_nombre,
        checklist.usuario_correo,
      );

      const progress =
        `${checklist.completedItems} de ` +
        `${checklist.totalItems} completados`;

      const subtitle =
        checklist.description?.trim() ||
        (checklist.folder?.name
          ? `${progress} · ${checklist.folder.name}`
          : progress);

      return {
        id: `checklist-${checklist.id}`,
        resourceId: checklist.id,
        title: checklist.title?.trim() || "Checklist sin título",
        subtitle,
        owner: owner.name,
        ownerEmail: owner.email,
        type: "checklist",
        createdAt: checklist.createdAt,
        updatedAt: checklist.updatedAt,
      };
    });

    const documentRows: ContentRow[] = documents.map((document) => {
      const owner = resolveOwner(
        document.owner,
        document.usuario_nombre,
        document.usuario_correo,
      );

      const association =
        document.note?.title?.trim() ||
        document.checklist?.title?.trim() ||
        document.folder?.name ||
        "";

      const baseSubtitle =
        `${document.mimeType || "application/pdf"} · ` +
        formatBytes(document.sizeBytes);

      return {
        id: `document-${document.id}`,
        resourceId: document.id,
        title: document.originalName || "Documento sin nombre",
        subtitle: association
          ? `${baseSubtitle} · ${association}`
          : baseSubtitle,
        owner: owner.name,
        ownerEmail: owner.email,
        type: "documento",
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      };
    });

    return [...noteRows, ...checklistRows, ...documentRows].sort(
      (firstItem, secondItem) => {
        const firstDate = new Date(
          firstItem.updatedAt || firstItem.createdAt,
        ).getTime();

        const secondDate = new Date(
          secondItem.updatedAt || secondItem.createdAt,
        ).getTime();

        const normalizedFirst = Number.isNaN(firstDate) ? 0 : firstDate;

        const normalizedSecond = Number.isNaN(secondDate) ? 0 : secondDate;

        return normalizedSecond - normalizedFirst;
      },
    );
  }, [notes, checklists, documents]);

  const filteredContent = useMemo(() => {
    const text = search.trim().toLowerCase();

    return contentRows.filter((item) => {
      const matchesSearch =
        !text ||
        item.title.toLowerCase().includes(text) ||
        item.subtitle.toLowerCase().includes(text) ||
        item.owner.toLowerCase().includes(text) ||
        item.ownerEmail.toLowerCase().includes(text);

      const matchesType =
        activeFilter === "todos" ||
        (activeFilter === "notas" && item.type === "nota") ||
        (activeFilter === "checklists" && item.type === "checklist") ||
        (activeFilter === "documentos" && item.type === "documento");

      return matchesSearch && matchesType;
    });
  }, [activeFilter, contentRows, search]);

  const filters: {
    id: ContentType;
    label: string;
  }[] = [
    {
      id: "todos",
      label: "Todo el contenido",
    },
    {
      id: "notas",
      label: "Notas",
    },
    {
      id: "checklists",
      label: "Checklists",
    },
    {
      id: "documentos",
      label: "Documentos PDF",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
            Moderación de plataforma
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Gestión de contenido
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Revisa las notas, checklists y documentos de todos los usuarios de
            VibeNotas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadContent()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Actualizar contenido
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#1E293B]/80 dark:shadow-xl dark:shadow-black/10">
          <p className="text-sm text-slate-500 dark:text-slate-400">Notas</p>

          <p className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">
            {totals.notes}
          </p>

          <div className="mt-4 flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300">
            <StickyNote size={16} />
            Contenido escrito
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#1E293B]/80 dark:shadow-xl dark:shadow-black/10">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Checklists
          </p>

          <p className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">
            {totals.checklists}
          </p>

          <div className="mt-4 flex items-center gap-2 text-sm text-sky-700 dark:text-sky-300">
            <CheckSquare size={16} />
            Listas activas
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#1E293B]/80 dark:shadow-xl dark:shadow-black/10">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Documentos PDF
          </p>

          <p className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">
            {totals.documents}
          </p>

          <div className="mt-4 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
            <FileText size={16} />
            Archivos almacenados
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#1E293B]/80 dark:shadow-xl dark:shadow-black/10">
          <p className="text-sm text-slate-500 dark:text-slate-400">Carpetas</p>

          <p className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">
            {totals.folders}
          </p>

          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
            <Folder size={16} />
            Carpetas activas
          </div>
        </article>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#1E293B]/80 dark:shadow-xl dark:shadow-black/10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-black/10">
            <Search size={19} className="shrink-0 text-slate-500" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar contenido o usuario..."
              className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
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
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
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
              className="h-20 animate-pulse rounded-3xl border border-slate-200 bg-slate-200/60 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
          <h2 className="font-bold">No se pudo cargar el contenido</h2>

          <p className="mt-2 text-sm text-red-700 dark:text-red-200/80">
            {error}
          </p>
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#1E293B]/80 dark:shadow-xl dark:shadow-black/10">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-white/10">
            <div>
              <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                Biblioteca de VibeNotas
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                Contenido reciente
              </h2>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/5 dark:text-slate-400">
              {filteredContent.length} elementos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-black/10">
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
                      className="border-t border-slate-100 text-sm transition hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/[0.035]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                            <Icon size={20} />
                          </div>

                          <div className="min-w-0">
                            <p className="max-w-md truncate font-semibold text-slate-950 dark:text-white">
                              {item.title}
                            </p>

                            <p className="mt-1 max-w-md truncate text-xs text-slate-500">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800 dark:text-slate-200">
                          {item.owner}
                        </p>

                        {item.ownerEmail && item.ownerEmail !== item.owner && (
                          <p className="mt-1 text-xs text-slate-500">
                            {item.ownerEmail}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                          {label}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {formatDate(item.updatedAt || item.createdAt)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                          title="Más acciones"
                          data-content-id={item.resourceId}
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
                        <div className="rounded-2xl bg-slate-100 p-4 dark:bg-white/5">
                          <Files size={28} />
                        </div>

                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-300">
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
