import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Building2,
  HardDriveUpload,
  Mail,
  RefreshCw,
  Save,
  Settings2,
  ShieldAlert,
  Trash2,
  Wrench,
} from "lucide-react";
import api from "../services/api";

type SettingItem = {
  id: number;
  clave: string;
  valor: string | null;
  tipo: "texto" | "numero" | "booleano" | "json";
  descripcion: string | null;
  actualizado_por: number | null;
  actualizado_en: string;
};

type SettingsResponse = {
  success: boolean;
  message: string;
  data?: {
    total: number;
    configuraciones: SettingItem[];
  };
};

type SettingsForm = {
  nombre_plataforma: string;
  modo_mantenimiento: boolean;
  mensaje_mantenimiento: string;
  registro_habilitado: boolean;
  tamano_maximo_pdf_mb: string;
  notificaciones_globales_habilitadas: boolean;
  retencion_papelera_dias: string;
  correo_soporte: string;
};

const initialForm: SettingsForm = {
  nombre_plataforma: "VibeNotas",
  modo_mantenimiento: false,
  mensaje_mantenimiento: "",
  registro_habilitado: true,
  tamano_maximo_pdf_mb: "10",
  notificaciones_globales_habilitadas: true,
  retencion_papelera_dias: "30",
  correo_soporte: "",
};

function isEnabled(value?: string | null) {
  return value === "1" || value === "true" || value === "on";
}

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  async function loadSettings() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<SettingsResponse>("/superadmin/settings");

      if (!response.data.success || !response.data.data) {
        throw new Error(
          response.data.message || "No se pudieron cargar las configuraciones."
        );
      }

      const values = response.data.data.configuraciones.reduce(
        (acc, item) => {
          acc[item.clave] = item.valor ?? "";
          return acc;
        },
        {} as Record<string, string>
      );

      setForm({
        nombre_plataforma: values.nombre_plataforma || "VibeNotas",
        modo_mantenimiento: isEnabled(values.modo_mantenimiento),
        mensaje_mantenimiento: values.mensaje_mantenimiento || "",
        registro_habilitado: isEnabled(values.registro_habilitado),
        tamano_maximo_pdf_mb: values.tamano_maximo_pdf_mb || "10",
        notificaciones_globales_habilitadas: isEnabled(
          values.notificaciones_globales_habilitadas
        ),
        retencion_papelera_dias: values.retencion_papelera_dias || "30",
        correo_soporte: values.correo_soporte || "",
      });

      const latestDate = response.data.data.configuraciones
        .map((item) => item.actualizado_en)
        .sort()
        .at(-1);

      setLastUpdated(latestDate || "");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las configuraciones."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const maintenanceWarning = useMemo(
    () => form.modo_mantenimiento,
    [form.modo_mantenimiento]
  );

  function updateField<K extends keyof SettingsForm>(
    key: K,
    value: SettingsForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveSettings() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const configuraciones = [
        {
          clave: "nombre_plataforma",
          valor: form.nombre_plataforma.trim(),
        },
        {
          clave: "modo_mantenimiento",
          valor: form.modo_mantenimiento ? "1" : "0",
        },
        {
          clave: "mensaje_mantenimiento",
          valor: form.mensaje_mantenimiento.trim(),
        },
        {
          clave: "registro_habilitado",
          valor: form.registro_habilitado ? "1" : "0",
        },
        {
          clave: "tamano_maximo_pdf_mb",
          valor: form.tamano_maximo_pdf_mb.trim(),
        },
        {
          clave: "notificaciones_globales_habilitadas",
          valor: form.notificaciones_globales_habilitadas ? "1" : "0",
        },
        {
          clave: "retencion_papelera_dias",
          valor: form.retencion_papelera_dias.trim(),
        },
        {
          clave: "correo_soporte",
          valor: form.correo_soporte.trim(),
        },
      ];

      const response = await api.put("/superadmin/settings", {
        configuraciones,
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "No se pudieron guardar los cambios."
        );
      }

      setSuccess("Configuraciones guardadas correctamente.");
      await loadSettings();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron guardar los cambios."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section role="superadmin">
      <section className="space-y-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">
              Control del sistema
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Configuración global
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Administra los ajustes principales que afectan a toda la plataforma
              VibeNotas.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadSettings}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={18} />
              Recargar
            </button>

            <button
              onClick={saveSettings}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>

        {maintenanceWarning && (
          <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 text-amber-300" size={21} />
              <div>
                <p className="font-semibold text-amber-200">
                  Modo mantenimiento activado
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-100/70">
                  Los usuarios deberían ver el mensaje de mantenimiento cuando
                  esta configuración sea aplicada en el login y frontend público.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5">
            <p className="font-semibold text-red-200">Ocurrió un problema</p>
            <p className="mt-1 text-sm text-red-200/80">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
            <p className="font-semibold text-emerald-200">Cambios guardados</p>
            <p className="mt-1 text-sm text-emerald-200/80">{success}</p>
          </div>
        )}

        {loading ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-3xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-6 shadow-xl shadow-black/10">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-300">
                  <Building2 size={21} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-violet-300">
                    Identidad de plataforma
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white">
                    Información principal
                  </h2>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Nombre de la plataforma
                  </span>

                  <input
                    value={form.nombre_plataforma}
                    onChange={(event) =>
                      updateField("nombre_plataforma", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50"
                    placeholder="Ejemplo: VibeNotas"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Correo de soporte
                  </span>

                  <div className="relative mt-2">
                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      type="email"
                      value={form.correo_soporte}
                      onChange={(event) =>
                        updateField("correo_soporte", event.target.value)
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50"
                      placeholder="soporte@vibenotas.com"
                    />
                  </div>
                </label>
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-6 shadow-xl shadow-black/10">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-300">
                  <Wrench size={21} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-amber-300">
                    Disponibilidad
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white">
                    Mantenimiento y registros
                  </h2>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <ToggleRow
                  title="Modo mantenimiento"
                  description="Limita temporalmente el acceso a la plataforma."
                  enabled={form.modo_mantenimiento}
                  onChange={(value) => updateField("modo_mantenimiento", value)}
                />

                <ToggleRow
                  title="Permitir nuevos registros"
                  description="Activa o bloquea la creación de nuevas cuentas."
                  enabled={form.registro_habilitado}
                  onChange={(value) => updateField("registro_habilitado", value)}
                />

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Mensaje de mantenimiento
                  </span>

                  <textarea
                    rows={3}
                    value={form.mensaje_mantenimiento}
                    onChange={(event) =>
                      updateField("mensaje_mantenimiento", event.target.value)
                    }
                    className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50"
                    placeholder="Explica brevemente el motivo del mantenimiento."
                  />
                </label>
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-6 shadow-xl shadow-black/10">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-300">
                  <HardDriveUpload size={21} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-sky-300">
                    Archivos y almacenamiento
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white">
                    Límites de contenido
                  </h2>
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Tamaño máximo PDF
                  </span>

                  <div className="mt-2 flex overflow-hidden rounded-xl border border-white/10 bg-black/20 focus-within:border-violet-400/50">
                    <input
                      type="number"
                      min="1"
                      value={form.tamano_maximo_pdf_mb}
                      onChange={(event) =>
                        updateField("tamano_maximo_pdf_mb", event.target.value)
                      }
                      className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white outline-none"
                    />
                    <span className="border-l border-white/10 px-4 py-3 text-sm text-slate-500">
                      MB
                    </span>
                  </div>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Retención en papelera
                  </span>

                  <div className="mt-2 flex overflow-hidden rounded-xl border border-white/10 bg-black/20 focus-within:border-violet-400/50">
                    <input
                      type="number"
                      min="1"
                      value={form.retencion_papelera_dias}
                      onChange={(event) =>
                        updateField("retencion_papelera_dias", event.target.value)
                      }
                      className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white outline-none"
                    />
                    <span className="border-l border-white/10 px-4 py-3 text-sm text-slate-500">
                      días
                    </span>
                  </div>
                </label>
              </div>

              <div className="mt-5 rounded-2xl border border-white/5 bg-black/10 p-4">
                <div className="flex items-start gap-3">
                  <Trash2 size={18} className="mt-0.5 text-slate-400" />
                  <p className="text-sm leading-6 text-slate-400">
                    Los elementos de la papelera podrán eliminarse de forma
                    definitiva después del período definido.
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-6 shadow-xl shadow-black/10">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-fuchsia-500/10 p-3 text-fuchsia-300">
                  <BellRing size={21} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-fuchsia-300">
                    Comunicación
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white">
                    Notificaciones globales
                  </h2>
                </div>
              </div>

              <div className="mt-6">
                <ToggleRow
                  title="Campañas globales habilitadas"
                  description="Permite el envío de notificaciones creadas desde Super Admin."
                  enabled={form.notificaciones_globales_habilitadas}
                  onChange={(value) =>
                    updateField("notificaciones_globales_habilitadas", value)
                  }
                />
              </div>

              <div className="mt-6 rounded-2xl border border-violet-400/10 bg-violet-500/5 p-4">
                <div className="flex items-start gap-3">
                  <Settings2 size={18} className="mt-0.5 text-violet-300" />
                  <p className="text-sm leading-6 text-slate-400">
                    Los cambios se guardan en{" "}
                    <code className="rounded bg-black/20 px-1.5 py-0.5 text-violet-200">
                      configuraciones_sistema
                    </code>{" "}
                    y quedan registrados en los logs de actividad.
                  </p>
                </div>
              </div>
            </article>
          </div>
        )}

        {lastUpdated && (
          <p className="text-center text-xs text-slate-600">
            Última actualización registrada: {lastUpdated}
          </p>
        )}
      </section>
    </section>
  );
}

type ToggleRowProps = {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
};

function ToggleRow({
  title,
  description,
  enabled,
  onChange,
}: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-2xl border border-white/5 bg-black/10 p-4">
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          enabled ? "bg-violet-600" : "bg-slate-700"
        }`}
        aria-pressed={enabled}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}