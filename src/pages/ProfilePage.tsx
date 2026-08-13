import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  AtSign,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Globe2,
  LoaderCircle,
  Mail,
  MapPin,
  RefreshCw,
  Save,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import axios from "axios";

import api from "../services/api";

type ProfileDetails = {
  bio: string | null;
  coverUrl: string | null;
  locale: string;
  timezone: string;
  countryCode: string | null;
  occupation: string | null;
  organization: string | null;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProfileUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  status: string;
  emailVerifiedAt: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  profile: ProfileDetails | null;
};

type GetProfileResponse = {
  profile: ProfileUser;
};

type UpdateProfileResponse = {
  message: string;
  profile: ProfileUser;
};

type AvatarUploadResponse = {
  message: string;
  avatarUrl: string;
};

type ProfileForm = {
  firstName: string;
  lastName: string;
  username: string;
  bio: string;
  locale: string;
  timezone: string;
  countryCode: string;
  occupation: string;
  organization: string;
};

const EMPTY_FORM: ProfileForm = {
  firstName: "",
  lastName: "",
  username: "",
  bio: "",
  locale: "es-419",
  timezone: "America/Sao_Paulo",
  countryCode: "",
  occupation: "",
  organization: "",
};

function formatDate(value?: string | null): string {
  if (!value) {
    return "No disponible";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No disponible";
  }

  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAvatarUrl(value?: string | null): string {
  if (!value) {
    return "";
  }

  if (/^(https?:\/\/|blob:|data:)/i.test(value)) {
    return value;
  }

  const baseURL = String(api.defaults.baseURL ?? "").trim();

  try {
    const apiOrigin = new URL(
      baseURL || window.location.origin,
      window.location.origin,
    ).origin;

    return new URL(value, `${apiOrigin}/`).toString();
  } catch {
    return value;
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    if (Array.isArray(message)) {
      return message.join(" ");
    }

    const backendError = error.response?.data?.error;

    if (typeof backendError === "string" && backendError.trim()) {
      return backendError;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function profileToForm(user: ProfileUser): ProfileForm {
  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    username: user.username ?? "",
    bio: user.profile?.bio ?? "",
    locale: user.profile?.locale ?? "es-419",
    timezone: user.profile?.timezone ?? "America/Sao_Paulo",
    countryCode: user.profile?.countryCode ?? "",
    occupation: user.profile?.occupation ?? "",
    organization: user.profile?.organization ?? "",
  };
}

function persistPublicProfile(updatedProfile: ProfileUser): void {
  const raw = localStorage.getItem("usuario");

  if (!raw) {
    return;
  }

  try {
    const current = JSON.parse(raw) as Record<string, unknown>;

    const patch: Record<string, unknown> = {
      id: updatedProfile.id,
      email: updatedProfile.email,
      username: updatedProfile.username,
      firstName: updatedProfile.firstName,
      lastName: updatedProfile.lastName,
      displayName: updatedProfile.displayName,
      avatarUrl: updatedProfile.avatarUrl,

      // Compatibilidad temporal con componentes antiguos del admin.
      nombre: updatedProfile.displayName,
      correo: updatedProfile.email,
      foto_perfil: updatedProfile.avatarUrl,
    };

    const storedUsuario = current.usuario;
    const storedUser = current.user;

    let next: Record<string, unknown>;

    if (
      typeof storedUsuario === "object" &&
      storedUsuario !== null &&
      !Array.isArray(storedUsuario)
    ) {
      next = {
        ...current,
        usuario: {
          ...(storedUsuario as Record<string, unknown>),
          ...patch,
        },
      };
    } else if (
      typeof storedUser === "object" &&
      storedUser !== null &&
      !Array.isArray(storedUser)
    ) {
      next = {
        ...current,
        user: {
          ...(storedUser as Record<string, unknown>),
          ...patch,
        },
      };
    } else {
      next = {
        ...current,
        ...patch,
      };
    }

    localStorage.setItem("usuario", JSON.stringify(next));
    window.dispatchEvent(new Event("usuarioActualizado"));
  } catch {
    // El backend continúa siendo la fuente de verdad.
  }
}

export default function ProfilePage() {
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [avatarError, setAvatarError] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");

  const initials = useMemo(() => {
    const source =
      user?.displayName ||
      [form.firstName, form.lastName].filter(Boolean).join(" ");

    if (!source.trim()) {
      return "VN";
    }

    return source
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }, [user?.displayName, form.firstName, form.lastName]);

  const displayedAvatarUrl = useMemo(() => {
    if (avatarPreview) {
      return avatarPreview;
    }

    return getAvatarUrl(user?.avatarUrl);
  }, [avatarPreview, user?.avatarUrl]);

  const profileCompletion = useMemo(() => {
    const fields = [
      form.firstName,
      form.lastName,
      form.username,
      form.bio,
      form.countryCode,
      form.occupation,
      form.organization,
    ];

    const complete = fields.filter((value) => value.trim().length > 0).length;

    return Math.round((complete / fields.length) * 100);
  }, [form]);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get<GetProfileResponse>("/profile");
      const profile = response.data?.profile;

      if (!profile) {
        throw new Error("El backend no devolvió un perfil válido.");
      }

      setUser(profile);
      setForm(profileToForm(profile));
      setAvatarError(false);
      setAvatarPreview("");
    } catch (caughtError) {
      setError(
        getErrorMessage(caughtError, "No se pudo cargar tu perfil."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  function updateField<K extends keyof ProfileForm>(
    key: K,
    value: ProfileForm[K],
  ): void {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setSuccess("");
  }

  async function uploadAvatar(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const currentUser = user;

    if (!currentUser) {
      setError("No se pudo identificar el usuario actual.");
      return;
    }

    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);

    const maxBytes = 3 * 1024 * 1024;

    if (!allowedTypes.has(file.type)) {
      setError("Selecciona una imagen JPG, PNG o WEBP.");
      return;
    }

    if (file.size > maxBytes) {
      setError("La imagen no puede superar los 3 MB.");
      return;
    }

    const temporaryPreview = URL.createObjectURL(file);

    try {
      setUploadingAvatar(true);
      setError("");
      setSuccess("");
      setAvatarError(false);
      setAvatarPreview(temporaryPreview);

      const formData = new FormData();
      formData.append("avatar", file);

      const response = await api.post<AvatarUploadResponse>(
        "/profile/avatar",
        formData,
      );

      const nextAvatarUrl = response.data?.avatarUrl;

      if (!nextAvatarUrl) {
        throw new Error("El servidor no devolvió la ruta del avatar.");
      }

      const updatedUser: ProfileUser = {
        ...currentUser,
        avatarUrl: nextAvatarUrl,
      };

      setUser(updatedUser);
      setAvatarPreview("");
      setAvatarError(false);
      persistPublicProfile(updatedUser);

      setSuccess(
        response.data?.message ||
          "Foto de perfil actualizada correctamente.",
      );
    } catch (caughtError) {
      setAvatarPreview("");
      setError(
        getErrorMessage(
          caughtError,
          "No se pudo actualizar la foto de perfil.",
        ),
      );
    } finally {
      URL.revokeObjectURL(temporaryPreview);
      setUploadingAvatar(false);
    }
  }

  async function saveProfile(event: FormEvent): Promise<void> {
    event.preventDefault();

    if (saving) {
      return;
    }

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const username = form.username.trim();
    const locale = form.locale.trim();
    const timezone = form.timezone.trim();

    if (!firstName && !lastName) {
      setError("Debes indicar al menos un nombre o apellido.");
      return;
    }

    if (!username) {
      setError("El nombre de usuario es obligatorio.");
      return;
    }

    if (!locale) {
      setError("El idioma es obligatorio.");
      return;
    }

    if (!timezone) {
      setError("La zona horaria es obligatoria.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        username,
        bio: form.bio.trim(),
        locale,
        timezone,
        countryCode: form.countryCode.trim()
          ? form.countryCode.trim().toUpperCase()
          : null,
        occupation: form.occupation.trim() || null,
        organization: form.organization.trim() || null,
      };

      const response = await api.patch<UpdateProfileResponse>(
        "/profile",
        payload,
      );

      const updatedProfile = response.data?.profile;

      if (!updatedProfile) {
        throw new Error("El backend no devolvió el perfil actualizado.");
      }

      setUser(updatedProfile);
      setForm(profileToForm(updatedProfile));
      setAvatarError(false);
      persistPublicProfile(updatedProfile);

      setSuccess(
        response.data?.message || "Perfil actualizado correctamente.",
      );
    } catch (caughtError) {
      setError(
        getErrorMessage(
          caughtError,
          "No se pudo actualizar tu perfil.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="h-40 animate-pulse rounded-[30px] border border-white/10 bg-white/[0.04]" />

        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="h-[520px] animate-pulse rounded-[30px] border border-white/10 bg-white/[0.04]" />
          <div className="h-[620px] animate-pulse rounded-[30px] border border-white/10 bg-white/[0.04]" />
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-6xl">
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[30px] border border-red-500/20 bg-red-500/[0.06] p-8 text-center">
          <div className="rounded-2xl bg-red-500/10 p-4 text-red-300">
            <TriangleAlert size={28} />
          </div>

          <h1 className="mt-5 text-xl font-black text-white">
            No pudimos cargar tu perfil
          </h1>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
            {error ||
              "Ocurrió un problema al consultar la información de tu cuenta."}
          </p>

          <button
            type="button"
            onClick={() => void loadProfile()}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-violet-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-400"
          >
            <RefreshCw size={17} />
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header className="relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-[#151B31] via-[#111827] to-[#10253B] p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-20 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-violet-200">
              <ShieldCheck size={15} />
              Cuenta administrativa
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Mi perfil
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
              Administra tu identidad, información profesional y preferencias de
              cuenta desde un solo lugar.
            </p>
          </div>

          <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-lg font-black text-white">
              {displayedAvatarUrl && !avatarError ? (
                <img
                  src={displayedAvatarUrl}
                  alt={`Avatar de ${user.displayName}`}
                  className="h-full w-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                initials
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate font-black text-white">
                {user.displayName}
              </p>
              <p className="mt-1 truncate text-sm text-slate-400">
                @{user.username || "sin-usuario"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-3xl border border-red-500/20 bg-red-500/10 p-5">
          <div className="rounded-xl bg-red-500/10 p-2 text-red-300">
            <TriangleAlert size={18} />
          </div>
          <div>
            <p className="font-bold text-red-100">Ocurrió un problema</p>
            <p className="mt-1 text-sm text-red-200/80">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-300">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="font-bold text-emerald-100">Cambios guardados</p>
            <p className="mt-1 text-sm text-emerald-200/80">{success}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#111827] shadow-xl shadow-black/15">
            <div className="relative h-28 overflow-hidden bg-gradient-to-r from-violet-600/30 via-fuchsia-600/20 to-sky-500/20">
              {displayedAvatarUrl && !avatarError && (
                <img
                  src={displayedAvatarUrl}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full scale-110 object-cover opacity-10 blur-xl"
                />
              )}
            </div>

            <div className="-mt-12 px-6 pb-6">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-[26px] border-4 border-[#111827] bg-gradient-to-br from-violet-500 to-fuchsia-600 text-2xl font-black text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                aria-label="Cambiar foto de perfil"
                title="Cambiar foto de perfil"
              >
                {displayedAvatarUrl && !avatarError ? (
                  <img
                    src={displayedAvatarUrl}
                    alt={`Foto de ${user.displayName}`}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  initials
                )}

                <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
                  {uploadingAvatar ? (
                    <LoaderCircle size={22} className="animate-spin" />
                  ) : (
                    <Camera size={22} />
                  )}
                </span>
              </button>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => void uploadAvatar(event)}
              />

              <h2 className="mt-4 text-xl font-black text-white">
                {user.displayName}
              </h2>

              <p className="mt-1 text-sm text-slate-400">{user.email}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-200">
                  <ShieldCheck size={14} />
                  {user.status}
                </span>

                {user.emailVerifiedAt && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
                    <BadgeCheck size={14} />
                    Correo verificado
                  </span>
                )}
              </div>

              <button
                type="button"
                disabled={uploadingAvatar}
                onClick={() => avatarInputRef.current?.click()}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-bold text-violet-200 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploadingAvatar ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <Camera size={18} />
                )}

                {uploadingAvatar ? "Subiendo foto..." : "Cambiar foto"}
              </button>

              <p className="mt-2 text-center text-xs leading-5 text-slate-500">
                JPG, PNG o WEBP. Máximo 3 MB.
              </p>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#111827] p-5">
            <div className="flex items-center justify-between">
              <p className="font-bold text-white">Perfil completado</p>
              <span className="text-sm font-black text-violet-300">
                {profileCompletion}%
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              Agrega información profesional y de ubicación para completar tu
              perfil administrativo.
            </p>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#111827] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Actividad de la cuenta
            </p>

            <div className="mt-4 space-y-4">
              <AccountInfo
                icon={<CalendarDays size={17} />}
                label="Cuenta creada"
                value={formatDate(user.createdAt)}
              />

              <AccountInfo
                icon={<Clock3 size={17} />}
                label="Último acceso"
                value={formatDate(user.lastLoginAt)}
              />
            </div>
          </div>
        </aside>

        <form onSubmit={saveProfile} className="space-y-6">
          <div className="rounded-[30px] border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/15 sm:p-7">
            <SectionHeader
              icon={<UserRound size={20} />}
              eyebrow="Identidad"
              title="Información personal"
              description="Estos datos forman parte de tu identidad dentro de VibeNotas."
            />

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field
                label="Nombre"
                value={form.firstName}
                onChange={(value) => updateField("firstName", value)}
                autoComplete="given-name"
              />

              <Field
                label="Apellido"
                value={form.lastName}
                onChange={(value) => updateField("lastName", value)}
                autoComplete="family-name"
              />

              <Field
                label="Nombre de usuario"
                value={form.username}
                onChange={(value) => updateField("username", value)}
                icon={<AtSign size={17} />}
                autoComplete="username"
              />

              <ReadOnlyField
                label="Correo electrónico"
                value={user.email}
                icon={<Mail size={17} />}
                helper="El correo no se modifica desde esta pantalla."
              />
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/15 sm:p-7">
            <SectionHeader
              icon={<BriefcaseBusiness size={20} />}
              eyebrow="Perfil público"
              title="Información profesional"
              description="Añade contexto sobre tu trabajo y organización."
            />

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field
                label="Ocupación"
                value={form.occupation}
                onChange={(value) => updateField("occupation", value)}
                icon={<BriefcaseBusiness size={17} />}
                placeholder="Ej. Administrador"
              />

              <Field
                label="Organización"
                value={form.organization}
                onChange={(value) => updateField("organization", value)}
                icon={<Building2 size={17} />}
                placeholder="Ej. VibeNotas"
              />

              <label className="block sm:col-span-2">
                <span className="text-sm font-semibold text-slate-300">
                  Biografía
                </span>

                <textarea
                  value={form.bio}
                  onChange={(event) => updateField("bio", event.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Escribe una breve descripción sobre ti..."
                  className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/10"
                />

                <div className="mt-2 text-right text-xs text-slate-600">
                  {form.bio.length}/500
                </div>
              </label>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/15 sm:p-7">
            <SectionHeader
              icon={<Globe2 size={20} />}
              eyebrow="Localización"
              title="Región y preferencias"
              description="Estas opciones permiten adaptar fechas, idioma y zona horaria."
            />

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field
                label="País"
                value={form.countryCode}
                onChange={(value) =>
                  updateField("countryCode", value.toUpperCase())
                }
                icon={<MapPin size={17} />}
                placeholder="CL"
                maxLength={2}
              />

              <Field
                label="Idioma"
                value={form.locale}
                onChange={(value) => updateField("locale", value)}
                icon={<Globe2 size={17} />}
                placeholder="es-419"
              />

              <Field
                label="Zona horaria"
                value={form.timezone}
                onChange={(value) => updateField("timezone", value)}
                icon={<Clock3 size={17} />}
                placeholder="America/Santiago"
              />
            </div>
          </div>

          <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-[24px] border border-white/10 bg-[#0F172A]/95 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Los cambios se aplicarán a tu perfil administrativo.
            </p>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-violet-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}

              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: ReactNode;
  autoComplete?: string;
  maxLength?: number;
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  icon,
  autoComplete,
  maxLength,
}: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-300">{label}</span>

      <div className="relative mt-2">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
            {icon}
          </span>
        )}

        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          className={`w-full rounded-2xl border border-white/10 bg-black/20 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/10 ${
            icon ? "pl-11 pr-4" : "px-4"
          }`}
        />
      </div>
    </label>
  );
}

type ReadOnlyFieldProps = {
  label: string;
  value: string;
  helper?: string;
  icon?: ReactNode;
};

function ReadOnlyField({
  label,
  value,
  helper,
  icon,
}: ReadOnlyFieldProps) {
  return (
    <div>
      <span className="text-sm font-semibold text-slate-300">{label}</span>

      <div className="relative mt-2">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">
            {icon}
          </span>
        )}

        <div
          className={`w-full rounded-2xl border border-white/[0.07] bg-white/[0.025] py-3 text-sm text-slate-500 ${
            icon ? "pl-11 pr-4" : "px-4"
          }`}
        >
          {value}
        </div>
      </div>

      {helper && <p className="mt-2 text-xs text-slate-600">{helper}</p>}
    </div>
  );
}

type SectionHeaderProps = {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
};

function SectionHeader({
  icon,
  eyebrow,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-300 ring-1 ring-violet-400/10">
        {icon}
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-300">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-black text-white">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

type AccountInfoProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function AccountInfo({ icon, label, value }: AccountInfoProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-white/[0.04] p-2 text-slate-400">
        {icon}
      </div>

      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 text-sm font-semibold text-slate-300">{value}</p>
      </div>
    </div>
  );
}