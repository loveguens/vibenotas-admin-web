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
import api from "../services/api";

type TagItem = {
  id: number;
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

type TagForm = {
  nombre: string;
  color: string;
};

const initialForm: TagForm = {
  nombre: "",
  color: "#8B5CF6",
};

export default function TagsPage() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<TagForm>(initialForm);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function loadTags() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<TagsResponse>("/tags");

      if (!response.data.success) {
        throw new Error(
          response.data.message || "No se pudieron cargar las etiquetas."
        );
      }

      setTags(response.data.data?.etiquetas ?? response.data.data?.tags ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las etiquetas."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTags();
  }, []);

  const filteredTags = useMemo(() => {
    const text = search.trim().toLowerCase();

    if (!text) return tags;

    return tags.filter((tag) => tag.nombre.toLowerCase().includes(text));
  }, [search, tags]);

  function openCreateModal() {
    setEditingTag(null);
    setForm(initialForm);
    setModalOpen(true);
  }

  function openEditModal(tag: TagItem) {
    setEditingTag(tag);
    setForm({
      nombre: tag.nombre,
      color: tag.color || "#8B5CF6",
    });
    setModalOpen(true);
  }

  async function saveTag(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nombre = form.nombre.trim();

    if (!nombre) {
      setError("Escribe un nombre para la etiqueta.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = editingTag
        ? await api.put(`/tags/${editingTag.id}`, {
            nombre,
            color: form.color,
          })
        : await api.post("/tags", {
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
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la etiqueta."
      );
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
      const response = await api.delete(`/tags/${tag.id}`);

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "No se pudo eliminar la etiqueta."
        );
      }

      setSuccess("Etiqueta eliminada correctamente.");
      await loadTags();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar la etiqueta."
      );
    }
  }

  return (
    <section role="superadmin">
      <section className="space-y-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">
              Organización de contenido
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Etiquetas
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Crea y administra etiquetas para organizar mejor las notas.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadTags}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20"
            >
              <RefreshCw size={18} />
              Actualizar
            </button>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:brightness-110"
            >
              <Plus size={18} />
              Nueva etiqueta
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-red-200">
            <p className="font-semibold">Ocurrió un problema</p>
            <p className="mt-1 text-sm text-red-200/80">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-emerald-200">
            <p className="font-semibold">Acción completada</p>
            <p className="mt-1 text-sm text-emerald-200/80">{success}</p>
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-4 shadow-xl shadow-black/10 backdrop-blur-xl">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
            <Search size={19} className="text-slate-500" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar una etiqueta..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="h-40 animate-pulse rounded-3xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        )}

        {!loading && !error && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredTags.map((tag) => {
              const total =
                tag.total_notas ?? tag.notas_count ?? 0;

              return (
                <article
                  key={tag.id}
                  className="group rounded-3xl border border-white/10 bg-[#1E293B]/80 p-5 shadow-xl shadow-black/10 transition hover:-translate-y-1 hover:border-violet-400/30 hover:bg-[#24334a]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg"
                      style={{ backgroundColor: tag.color || "#8B5CF6" }}
                    >
                      <Tag size={21} />
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(tag)}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                        title="Editar etiqueta"
                      >
                        <Edit3 size={17} />
                      </button>

                      <button
                        onClick={() => deleteTag(tag)}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
                        title="Eliminar etiqueta"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>

                  <h2 className="mt-5 text-lg font-bold text-white">
                    {tag.nombre}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {total} {total === 1 ? "nota asociada" : "notas asociadas"}
                  </p>

                  <div className="mt-5 flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag.color || "#8B5CF6" }}
                    />
                    <code className="text-xs text-slate-500">
                      {tag.color || "#8B5CF6"}
                    </code>
                  </div>
                </article>
              );
            })}

            {filteredTags.length === 0 && (
              <div className="col-span-full rounded-3xl border border-dashed border-white/10 py-16 text-center text-slate-500">
                <Tag className="mx-auto mb-3" size={30} />
                No hay etiquetas para mostrar.
              </div>
            )}
          </div>
        )}

        {modalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl shadow-black/50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-violet-300">
                    {editingTag ? "Editar organización" : "Nueva organización"}
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-white">
                    {editingTag ? "Editar etiqueta" : "Crear etiqueta"}
                  </h2>
                </div>

                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={saveTag} className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Nombre
                  </label>

                  <input
                    value={form.nombre}
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
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Color
                  </label>

                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={form.color}
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
                  className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
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