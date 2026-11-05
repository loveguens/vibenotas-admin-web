import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  BellRing,
  Building2,
  CheckCircle2,
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
import "./SuperadminSettingsPage.css";

type PlatformSettings = {
  platformName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  registrationEnabled: boolean;
  pdfMaxSizeMb: number;
  trashRetentionDays: number;
  globalNotificationsEnabled: boolean;
};

// Solo para visualizar la maqueta cuando el backend no responde.
 // Ninguno de estos valores procede de Supabase ni se puede guardar.
const PREVIEW_VALUES: PlatformSettings = {
  platformName: "VibeNotas (ejemplo)",
  supportEmail: "",
  maintenanceMode: false,
  maintenanceMessage: "",
  registrationEnabled: false,
  pdfMaxSizeMb: 10,
  trashRetentionDays: 30,
  globalNotificationsEnabled: false,
};

type SettingsResponse = {
  values: PlatformSettings;
  updatedAt: string | null;
  applicationStatus: "STORED_ONLY";
  message: string;
};

function formatDate(value: string | null): string {
  if (!value) return "Sin cambios guardados";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return date.toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 404) {
      return "El backend todavía no tiene disponible el servicio de Configuración global.";
    }
    if (error.response?.status === 403) {
      return "Tu cuenta no tiene permisos para gestionar la configuración de plataforma.";
    }
    if (error.response?.status === 401) {
      return "Debes volver a iniciar sesión para continuar.";
    }
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
    if (Array.isArray(message)) {
      const combined = message.filter((part): part is string => typeof part === "string").join(". ");
      if (combined) return combined;
    }
  }
  return error instanceof Error
    ? error.message
    : "No se pudo completar la solicitud.";
}

type SettingSwitchProps = {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
};

function SettingSwitch({
  title,
  description,
  checked,
  disabled,
  onChange,
}: SettingSwitchProps) {
  return (
    <div className="vn-settings-switch-row">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        className="vn-settings-switch"
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}

export default function SuperadminSettingsPage() {
  const [form, setForm] = useState<PlatformSettings | null>(null);
  const [saved, setSaved] = useState<PlatformSettings | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadSettings(): Promise<void> {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data } = await api.get<SettingsResponse>("/admin/platform-settings");
      if (!data?.values || data.applicationStatus !== "STORED_ONLY") {
        throw new Error("La respuesta de configuración no tiene el formato esperado.");
      }
      setForm(data.values);
      setSaved(data.values);
      setLastUpdated(data.updatedAt);
    } catch (caught: unknown) {
      setForm(null);
      setSaved(null);
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSettings(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const isDirty = useMemo(
    () => Boolean(form && saved && JSON.stringify(form) !== JSON.stringify(saved)),
    [form, saved],
  );

  const validationError = useMemo(() => {
    if (!form) return "";
    const name = form.platformName.trim();
    if (name.length < 2 || name.length > 80) {
      return "El nombre debe contener entre 2 y 80 caracteres.";
    }
    if (form.supportEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supportEmail.trim())) {
      return "Escribe un correo de soporte válido.";
    }
    if (form.supportEmail.length > 254) {
      return "El correo de soporte es demasiado largo.";
    }
    if (form.maintenanceMessage.length > 500) {
      return "El mensaje de mantenimiento no puede superar 500 caracteres.";
    }
    if (form.maintenanceMode && !form.maintenanceMessage.trim()) {
      return "Escribe un mensaje antes de preparar el modo mantenimiento.";
    }
    if (!Number.isInteger(form.pdfMaxSizeMb) || form.pdfMaxSizeMb < 1 || form.pdfMaxSizeMb > 50) {
      return "El tamaño máximo PDF debe estar entre 1 y 50 MB.";
    }
    if (
      !Number.isInteger(form.trashRetentionDays) ||
      form.trashRetentionDays < 1 ||
      form.trashRetentionDays > 365
    ) {
      return "La retención de papelera debe estar entre 1 y 365 días.";
    }
    return "";
  }, [form]);

  function updateField<K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K],
  ): void {
    setForm((current) => current ? { ...current, [key]: value } : current);
    setSuccess("");
  }

  async function saveSettings(): Promise<void> {
    if (!form || loading || saving || validationError || !isDirty) return;

    const confirmed = window.confirm(
      "¿Guardar los ajustes administrativos?\n\n" +
      "IMPORTANTE: esta versión solamente los almacena. " +
      "NO activa mantenimiento, bloquea registros, limita archivos, " +
      "elimina elementos ni cambia el envío de notificaciones.\n\n" +
      "¿Deseas guardar los valores para una integración posterior?",
    );
    if (!confirmed) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { data } = await api.put<SettingsResponse>(
        "/admin/platform-settings",
        form,
      );
      if (!data?.values || data.applicationStatus !== "STORED_ONLY") {
        throw new Error("El backend no confirmó el almacenamiento de los valores.");
      }
      setForm(data.values);
      setSaved(data.values);
      setLastUpdated(data.updatedAt);
      setSuccess("Los ajustes se guardaron como configuración pendiente de aplicación.");
    } catch (caught: unknown) {
      setError(getErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  const disabled = loading || saving || !form;
  const displayForm = form ?? PREVIEW_VALUES;

  return (
    <section className="vn-settings-page">
      <header className="vn-settings-hero">
        <div>
          <p className="vn-settings-eyebrow">CONTROL DEL SISTEMA</p>
          <h1>Configuración global</h1>
          <p className="vn-settings-description">
            Gestiona los ajustes administrativos de la plataforma VibeNotas desde un mismo lugar.
          </p>
        </div>
        <div className="vn-settings-hero-actions">
          <button
            className="vn-settings-reload"
            type="button"
            disabled={loading || saving}
            onClick={() => {
              if (isDirty && !window.confirm("Hay cambios sin guardar. ¿Recargar y descartarlos?")) return;
              void loadSettings();
            }}
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            Recargar
          </button>
          <button
            className="vn-settings-save"
            type="button"
            disabled={disabled || !isDirty || Boolean(validationError)}
            onClick={() => void saveSettings()}
          >
            <Save size={17} />
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </header>

      <section className="vn-settings-notice" aria-label="Estado de los ajustes">
        <ShieldAlert size={19} />
        <div>
          <strong>Configuración almacenada, no aplicada</strong>
          <p>
            Esta etapa conecta el panel con un almacenamiento protegido del backend.
            Los interruptores y límites <strong>todavía no modifican</strong> la actividad real
            de VibeNotas hasta integrar cada servicio correspondiente.
          </p>
        </div>
      </section>

      {error && (
        <div className="vn-settings-feedback vn-settings-error" role="alert">
          <AlertTriangle size={18} />
          <div><strong>Ocurrió un problema</strong><p>{error}</p></div>
        </div>
      )}
      {success && (
        <div className="vn-settings-feedback vn-settings-success" role="status">
          <CheckCircle2 size={18} />
          <div><strong>Ajustes guardados</strong><p>{success}</p></div>
        </div>
      )}
      {validationError && (
        <div className="vn-settings-feedback vn-settings-error" role="alert">
          <AlertTriangle size={18} />
          <div><strong>Revisa los campos</strong><p>{validationError}</p></div>
        </div>
      )}

      {!loading && !form && (
        <div className="vn-settings-preview" role="status">
          <strong>Vista previa del diseño — sin datos reales</strong>
          <p>
            Las tarjetas muestran únicamente valores ilustrativos, no la configuración de
            producción. Todos los controles están bloqueados y no se puede guardar hasta
            que el servicio de Configuración global esté disponible.
          </p>
        </div>
      )}

      {loading ? (
        <div className="vn-settings-grid" role="status" aria-live="polite">
          {[1, 2, 3, 4].map((item) => <div className="vn-settings-skeleton" key={item} />)}
        </div>
      ) : (
        <div className="vn-settings-grid" aria-label={form ? "Ajustes de plataforma" : "Vista previa de ajustes no disponibles"}>
          <article className="vn-settings-card">
            <div className="vn-settings-card-header">
              <span className="vn-settings-card-icon"><Building2 size={20} /></span>
              <div>
                <p>IDENTIDAD DE PLATAFORMA</p>
                <h2>Información principal</h2>
              </div>
            </div>
            <div className="vn-settings-card-body">
              <label className="vn-settings-field">
                <span>Nombre de la plataforma</span>
                <input
                  value={displayForm.platformName}
                  maxLength={80}
                  disabled={disabled}
                  placeholder="VibeNotas"
                  onChange={(event) => updateField("platformName", event.target.value)}
                />
              </label>
              <label className="vn-settings-field">
                <span>Correo de soporte</span>
                <div className="vn-settings-icon-input">
                  <Mail size={17} aria-hidden="true" />
                  <input
                    type="email"
                    value={displayForm.supportEmail}
                    maxLength={254}
                    disabled={disabled}
                    placeholder="soporte@ejemplo.com"
                    onChange={(event) => updateField("supportEmail", event.target.value)}
                  />
                </div>
              </label>
            </div>
          </article>

          <article className="vn-settings-card">
            <div className="vn-settings-card-header">
              <span className="vn-settings-card-icon"><Wrench size={20} /></span>
              <div>
                <p>ACCESO A LA PLATAFORMA</p>
                <h2>Mantenimiento y registros</h2>
              </div>
            </div>
            <div className="vn-settings-card-body">
              <SettingSwitch
                title="Preparar modo mantenimiento"
                description="Solo guarda la preferencia; todavía no interrumpe los accesos."
                checked={displayForm.maintenanceMode}
                disabled={disabled}
                onChange={(value) => updateField("maintenanceMode", value)}
              />
              <SettingSwitch
                title="Permitir registros (preferencia)"
                description="Todavía no activa ni desactiva el registro real de usuarios."
                checked={displayForm.registrationEnabled}
                disabled={disabled}
                onChange={(value) => updateField("registrationEnabled", value)}
              />
              <label className="vn-settings-field">
                <span>Mensaje de mantenimiento</span>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={displayForm.maintenanceMessage}
                  disabled={disabled}
                  placeholder="Mensaje previsto para futuros periodos de mantenimiento..."
                  onChange={(event) => updateField("maintenanceMessage", event.target.value)}
                />
                <small>{displayForm.maintenanceMessage.length}/500 caracteres</small>
              </label>
            </div>
          </article>

          <article className="vn-settings-card">
            <div className="vn-settings-card-header">
              <span className="vn-settings-card-icon"><HardDriveUpload size={20} /></span>
              <div>
                <p>ARCHIVOS Y ALMACENAMIENTO</p>
                <h2>Límites de contenido</h2>
              </div>
            </div>
            <div className="vn-settings-card-body">
              <div className="vn-settings-number-fields">
                <label className="vn-settings-field">
                  <span>Tamaño máximo PDF (pendiente)</span>
                  <div className="vn-settings-number-input">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      step={1}
                      disabled={disabled}
                      value={displayForm.pdfMaxSizeMb}
                      onChange={(event) => updateField("pdfMaxSizeMb", Number(event.target.value))}
                    />
                    <span>MB</span>
                  </div>
                </label>
                <label className="vn-settings-field">
                  <span>Retención en papelera (pendiente)</span>
                  <div className="vn-settings-number-input">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      step={1}
                      disabled={disabled}
                      value={displayForm.trashRetentionDays}
                      onChange={(event) => updateField("trashRetentionDays", Number(event.target.value))}
                    />
                    <span>días</span>
                  </div>
                </label>
              </div>
              <div className="vn-settings-inline-note">
                <Trash2 size={17} />
                <p>Estos valores no provocan cargas bloqueadas ni eliminaciones automáticas.</p>
              </div>
            </div>
          </article>

          <article className="vn-settings-card">
            <div className="vn-settings-card-header">
              <span className="vn-settings-card-icon"><BellRing size={20} /></span>
              <div>
                <p>COMUNICACIÓN</p>
                <h2>Notificaciones globales</h2>
              </div>
            </div>
            <div className="vn-settings-card-body">
              <SettingSwitch
                title="Campañas globales (preferencia)"
                description="Guarda el ajuste, pero no restringe los envíos hasta integrarlo en Notificaciones."
                checked={displayForm.globalNotificationsEnabled}
                disabled={disabled}
                onChange={(value) => updateField("globalNotificationsEnabled", value)}
              />
              <div className="vn-settings-inline-note">
                <Settings2 size={17} />
                <p>Los cambios se guardan en el backend y su modificación se audita, sin registrar valores sensibles.</p>
              </div>
            </div>
          </article>
        </div>
      )}

      {form && !loading && (
        <footer className="vn-settings-footer">
          <span>
            <CheckCircle2 size={15} />
            {isDirty ? "Cambios sin guardar" : "Sin cambios pendientes"}
          </span>
          <span>Última actualización: {formatDate(lastUpdated)}</span>
        </footer>
      )}
    </section>
  );
}
