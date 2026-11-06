import { useEffect, useMemo, useState } from "react";
import {
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import axios from "axios";
import api from "../services/api";
import "./SuperadminTagsPage.css";

type TagItem = {
  id: string;
  nombre: string;
  color: string;
  total_notas?: number;
  notas_count?: number;
  creado_en?: string;
};

type TagsResponse = {
  success: boolean;
  message: string;
  data?: {
    etiquetas?: TagItem[];
    tags?: TagItem[];
    total?: number;
  };
};

type UsageFilter = "all" | "used" | "unused";

type TagForm = {
  nombre: string;
  color: string;
};

const initialForm: TagForm = {
  nombre: "",
  color: "#F06449",
};

function getTagColor(value: string | undefined): string {
  if (value && /^#[0-9a-f]{6}$/i.test(value)) return value;
  return "#F06449";
}
function getTagError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const backendMessage = error.response?.data?.message;

    if (
      error.response?.status === 404 &&
      typeof backendMessage === "string" &&
      backendMessage.includes("Etiqueta no encontrada")
    ) {
      return backendMessage;
    }

    if (error.response?.status === 404) {
      return "El servicio de Etiquetas aún no está disponible en el backend. Debe desplegarse el módulo de Etiquetas.";
    }

    if (error.response?.status === 403) {
      return "Tu cuenta no tiene permisos para administrar etiquetas.";
    }

    if (typeof backendMessage === "string" && backendMessage.trim()) {
      return backendMessage;
    }
    if (Array.isArray(backendMessage)) {
      return backendMessage.filter((item): item is string => typeof item === "string").join(" ") || fallback;
    }
  }

  return error instanceof Error ? error.message : fallback;
}

function getTagNoteCount(tag: TagItem): number {
  return Math.max(0, Number(tag.total_notas ?? tag.notas_count ?? 0) || 0);
}
export default function SuperadminTagsPage() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [search, setSearch] = useState("");
  const [usageFilter, setUsageFilter] = useState<UsageFilter>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<TagForm>(initialForm);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState("");

  async function loadTags() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<TagsResponse>("/admin/tags");

      if (!response.data.success) {
        throw new Error(
          response.data.message || "No se pudieron cargar las etiquetas."
        );
      }

      setTags(response.data.data?.etiquetas ?? response.data.data?.tags ?? []);
    } catch (err) {
      setTags([]);
      setError(getTagError(err, "No se pudieron cargar las etiquetas."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadTags();
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, []);

  const usedCount = useMemo(
    () => tags.filter((tag) => getTagNoteCount(tag) > 0).length,
    [tags],
  );
  const filteredTags = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-CL");
    return tags.filter((tag) => {
      const matchesName = !query || tag.nombre.toLocaleLowerCase("es-CL").includes(query);
      const used = getTagNoteCount(tag) > 0;
      return matchesName && (usageFilter === "all" || (usageFilter === "used" ? used : !used));
    });
  }, [search, tags, usageFilter]);

  function openCreateModal() {
    setEditingTag(null);
    setModalError("");
    setForm(initialForm);
    setModalOpen(true);
  }

  function openEditModal(tag: TagItem) {
    setEditingTag(tag);
    setModalError("");
    setForm({
      nombre: tag.nombre,
      color: getTagColor(tag.color),
    });
    setModalOpen(true);
  }

  async function saveTag(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nombre = form.nombre.trim();

    if (!nombre) {
      setModalError("Escribe un nombre para la etiqueta.");
      return;
    }

    if (!/^#[0-9a-f]{6}$/i.test(form.color)) {
      setModalError("Utiliza un color hexadecimal válido, por ejemplo #F06449.");
      return;
    }
    setSaving(true);
    setModalError("");
    setError("");
    setSuccess("");
    try {
      const response = editingTag
        ? await api.put(`/admin/tags/${editingTag.id}`, {
            nombre,
            color: form.color,
          })
        : await api.post("/admin/tags", {
            nombre,
            color: form.color,
          });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "No se pudo guardar la etiqueta."
        );
      }

      setSuccess(
        editingTag
          ? "Etiqueta actualizada correctamente."
          : "Etiqueta creada correctamente."
      );

      setModalOpen(false);
      await loadTags();
    } catch (err) {
      setModalError(getTagError(err, "No se pudo guardar la etiqueta."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteTag(tag: TagItem) {
    const confirmed = window.confirm(
      `¿Eliminar la etiqueta "${tag.nombre}"? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await api.delete(`/admin/tags/${tag.id}`);

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "No se pudo eliminar la etiqueta."
        );
      }

      setSuccess("Etiqueta eliminada correctamente.");
      await loadTags();
    } catch (err) {
      setError(getTagError(err, "No se pudo eliminar la etiqueta."));
    }
  }

  return (
    <section className="vn-tags-page">
      <section className="vn-tags-content space-y-6">
        <div className="vn-tags-hero flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="vn-tags-eyebrow text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">
              Organización de contenido
            </p>

            <h1 className="vn-tags-title mt-2 text-3xl font-bold tracking-tight text-white">
              Etiquetas
            </h1>

            <p className="vn-tags-description mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Administra el catálogo de etiquetas sin modificar las etiquetas ya guardadas en tus notas.
            </p>
          </div>

          <div className="vn-tags-actions flex flex-wrap gap-3">
            <button
              onClick={loadTags}
              disabled={loading}
              className="vn-tags-refresh inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>

            <button
              onClick={openCreateModal}
              disabled={loading || Boolean(error)}
              title={error ? "Necesitas conexión con el backend para crear etiquetas" : "Nueva etiqueta"}
              className="vn-tags-create inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:brightness-110"
            >
              <Plus size={18} />
              Nueva etiqueta
            </button>
          </div>
        </div>

        {error && (
          <div className="vn-tags-feedback vn-tags-error rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-red-200" role="alert">
            <p className="font-semibold">Ocurrió un problema</p>
            <p className="mt-1 text-sm text-red-200/80">{error}</p>
          </div>
        )}

        {success && (
          <div className="vn-tags-feedback vn-tags-success rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-emerald-200">
            <p className="font-semibold">Acción completada</p>
            <p className="mt-1 text-sm text-emerald-200/80">{success}</p>
          </div>
        )}

        <div className="vn-tags-toolbar rounded-3xl border border-white/10 bg-[#1E293B]/80 p-4 shadow-xl shadow-black/10 backdrop-blur-xl">
          <div className="vn-tags-search flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
            <Search size={19} aria-hidden="true" className="text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar una etiqueta..."
              aria-label="Buscar etiquetas por nombre"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Limpiar búsqueda" className="vn-tags-clear">
                <X size={15} />
              </button>
            )}
          </div>
          <div className="vn-tags-filters" role="group" aria-label="Filtrar por uso">
            <button type="button" aria-pressed={usageFilter === "all"} onClick={() => setUsageFilter("all")}>Todas <span>{tags.length}</span></button>
            <button type="button" aria-pressed={usageFilter === "used"} onClick={() => setUsageFilter("used")}>En uso <span>{usedCount}</span></button>
            <button type="button" aria-pressed={usageFilter === "unused"} onClick={() => setUsageFilter("unused")}>Sin uso <span>{tags.length - usedCount}</span></button>
          </div>
          <span className="vn-tags-visible" aria-live="polite">{filteredTags.length} visibles</span>
        </div>

        {loading && (
          <div className="vn-tags-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="vn-tags-skeleton h-40 animate-pulse rounded-3xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        )}

        {!loading && !error && (
          <div className="vn-tags-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredTags.map((tag) => {
              const total = getTagNoteCount(tag);

              return (
                <article
                  key={tag.id}
                  className="vn-tags-item group rounded-3xl border border-white/10 bg-[#1E293B]/80 p-5 shadow-xl shadow-black/10 transition hover:-translate-y-1 hover:border-violet-400/30 hover:bg-[#24334a]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="vn-tags-swatch flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg"
                      style={{ backgroundColor: getTagColor(tag.color) }}
                    >
                      <Tag size={21} />
                    </div>

                    <div className="vn-tags-item-actions flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(tag)}
                        aria-label={`Editar etiqueta ${tag.nombre}`}
                        className="vn-tags-edit rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                        title="Editar etiqueta"
                      >
                        <Edit3 size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteTag(tag)}
                        aria-label={`Eliminar etiqueta ${tag.nombre}`}
                        className="vn-tags-delete rounded-xl p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
                        title="Eliminar etiqueta"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>

                  <h2 className="vn-tags-item-name mt-5 text-lg font-bold text-white">
                    {tag.nombre}
                  </h2>

                  <p className="vn-tags-item-count mt-1 text-sm text-slate-500">
                    {total} {total === 1 ? "nota asociada" : "notas asociadas"}
                  </p>

                  <div className="vn-tags-item-footer mt-5 flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: getTagColor(tag.color) }}
                    />
                    <code className="text-xs text-slate-500">
                      {getTagColor(tag.color).toUpperCase()}
                    </code>
                  </div>
                </article>
              );
            })}

            {filteredTags.length === 0 && (
              <div className="vn-tags-empty col-span-full rounded-3xl border border-dashed border-white/10 py-16 text-center text-slate-500">
                <Tag className="mx-auto mb-3" size={30} />
                {tags.length === 0 ? "Todavía no hay etiquetas. Crea la primera para organizar el contenido." : "No hay etiquetas que coincidan con los filtros."}
              </div>
            )}
          </div>
        )}

        {modalOpen && (
          <div
            className="vn-tags-modal-overlay fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !saving) setModalOpen(false);
            }}
          >
            <div role="dialog"
              aria-modal="true"
              aria-labelledby="vn-tags-modal-title"
              className="vn-tags-modal w-full max-w-md rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl shadow-black/50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="vn-tags-modal-eyebrow text-sm font-semibold text-violet-300">
                    {editingTag ? "Editar organización" : "Nueva organización"}
                  </p>

                  <h2 id="vn-tags-modal-title" className="vn-tags-modal-title mt-1 text-xl font-bold text-white">
                    {editingTag ? "Editar etiqueta" : "Crear etiqueta"}
                  </h2>
                </div>

                <button
                  type="button"
                  disabled={saving}
                  aria-label="Cerrar formulario de etiqueta"
                  onClick={() => setModalOpen(false)}
                  className="vn-tags-modal-close rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={saveTag} className="vn-tags-form mt-6 space-y-4">
                {modalError && <p className="vn-tags-modal-error" role="alert">{modalError}</p>}
                <div>
                  <label htmlFor="vn-tags-name" className="mb-2 block text-sm font-medium text-slate-300">
                    Nombre
                  </label>

                  <input
                    id="vn-tags-name"
                    autoFocus
                    value={form.nombre}
                    disabled={Boolean(editingTag && getTagNoteCount(editingTag) > 0)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        nombre: event.target.value,
                      }))
                    }
                    placeholder="Ejemplo: Trabajo"
                    maxLength={80}
                    className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
                    required
                  />
                  {editingTag && getTagNoteCount(editingTag) > 0 && (
                    <p className="vn-tags-name-locked">
                      Esta etiqueta se usa en notas. Puedes cambiar su color, pero no su nombre.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="vn-tags-color" className="mb-2 block text-sm font-medium text-slate-300">
                    Color
                  </label>

                  <div className="flex gap-3">
                    <input
                      type="color"
                      id="vn-tags-color"
                      aria-label="Seleccionar color"
                      value={/^#[0-9a-f]{6}$/i.test(form.color) ? form.color : "#F06449"}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          color: event.target.value,
                        }))
                      }
                      className="h-12 w-14 cursor-pointer rounded-xl border border-white/10 bg-black/10 p-1"
                    />

                    <input
                      value={form.color}
                      aria-label="Color hexadecimal"
                      placeholder="#F06449"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          color: event.target.value.toUpperCase(),
                        }))
                      }
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/10 px-4 py-3 font-mono text-sm text-white outline-none focus:border-violet-400/50"
                      maxLength={7}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="vn-tags-save w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Guardando..."
                    : editingTag
                    ? "Guardar cambios"
                    : "Crear etiqueta"}
                </button>
              </form>
            </div>
          </div>
        )}
      </section>
    </section>
  );
}