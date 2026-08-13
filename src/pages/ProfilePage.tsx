import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  Camera,
  KeyRound,
  LoaderCircle,
  LogOut,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  Eye,
EyeOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import axios from "axios";

type ProfileUser = {
  id: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  estado: string;
  rol: string;
  rol_nombre: string;
  foto_perfil: string | null;
};

type ProfileResponse = {
  success: boolean;
  message: string;
  data?: {
    usuario: ProfileUser;
  };
};

type ProfileForm = {
  nombre: string;
  correo: string;
  telefono: string;
};

const API_URL = "http://localhost/vibenotas-backend/public";



function getPhotoUrl(path?: string | null, version?: number) {
  if (!path) return "";

  const url = path.startsWith("http")
    ? path
    : `${API_URL}/${path.replace(/^\/+/, "")}`;

  return version ? `${url}?v=${version}` : url;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const inputPhotoRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    nombre: "",
    correo: "",
    telefono: "",
  });

  const [photoPreview, setPhotoPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [photoError, setPhotoError] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
const [showNewPassword, setShowNewPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const initials = useMemo(() => {
    if (!user?.nombre) return "SA";

    return user.nombre
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [user?.nombre]);


async function loadProfile() {
  setLoading(true);
  setError("");

  try {
    const response = await api.get<ProfileResponse>("/auth/profile");

    if (!response.data.success || !response.data.data?.usuario) {
      throw new Error(
        response.data.message || "No se pudo cargar tu perfil."
      );
    }

    const profileUser = response.data.data.usuario;

    setUser(profileUser);

    setForm({
      nombre: profileUser.nombre ?? "",
      correo: profileUser.correo ?? "",
      telefono: profileUser.telefono ?? "",
    });

    setPhotoError(false);
    setPhotoPreview(getPhotoUrl(profileUser.foto_perfil));
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "No se pudo cargar la información del perfil."
    );
  } finally {
    setLoading(false);
  }
}

useEffect(() => {
  void loadProfile();
}, []);

function updateField<K extends keyof ProfileForm>(
  key: K,
  value: ProfileForm[K]
) {
  setForm((current) => ({
    ...current,
    [key]: value,
  }));
}

async function saveProfile(event: FormEvent) {
  event.preventDefault();

  setSavingProfile(true);
  setError("");
  setSuccess("");

  try {
    const response = await api.put("/auth/profile", {
      nombre: form.nombre.trim(),
      correo: form.correo.trim(),
      telefono: form.telefono.trim(),
    });

    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "No se pudieron guardar los cambios."
      );
    }

    const updatedUser = response.data.data?.usuario;

    if (updatedUser) {
      setUser((current) =>
        current
          ? {
              ...current,
              ...updatedUser,
            }
          : current
      );

      const storedUser = localStorage.getItem("usuario");

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);

        localStorage.setItem(
          "usuario",
          JSON.stringify({
            ...parsedUser,
            ...updatedUser,
          })
        );

        window.dispatchEvent(new Event("usuarioActualizado"));
      }
    }

    setSuccess("Tu información personal fue actualizada correctamente.");
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "No se pudo actualizar tu perfil."
    );
  } finally {
    setSavingProfile(false);
  }
}

async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
  const photo = event.target.files?.[0];

  if (!photo) return;

  const maxSize = 3 * 1024 * 1024;
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(photo.type)) {
    setError("Selecciona una imagen JPG, PNG o WEBP.");
    event.target.value = "";
    return;
  }

  if (photo.size > maxSize) {
    setError("La imagen no puede superar los 3 MB.");
    event.target.value = "";
    return;
  }

  setUploadingPhoto(true);
  setError("");
  setSuccess("");

  const previousPhoto = user?.foto_perfil ?? null;
  const temporaryPreview = URL.createObjectURL(photo);

  setPhotoError(false);
  setPhotoPreview(temporaryPreview);

  try {
    const formData = new FormData();
    formData.append("foto", photo);

    const response = await api.post("/auth/profile/photo", formData);

    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "No se pudo actualizar la foto."
      );
    }

    const photoPath = response.data?.data?.foto_perfil ?? null;

    if (!photoPath) {
      throw new Error(
        "La foto fue subida, pero el servidor no devolvió la ruta de la imagen."
      );
    }

    const updatedPhotoUrl = getPhotoUrl(photoPath, Date.now());

    console.log("Ruta devuelta por backend:", photoPath);
    console.log("URL final de la foto:", updatedPhotoUrl);

    setUser((current) =>
      current
        ? {
            ...current,
            foto_perfil: photoPath,
          }
        : current
    );

    setPhotoError(false);
    setPhotoPreview(updatedPhotoUrl);

    const storedUser = localStorage.getItem("usuario");

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);

      localStorage.setItem(
        "usuario",
        JSON.stringify({
          ...parsedUser,
          foto_perfil: photoPath,
        })
      );

      window.dispatchEvent(new Event("usuarioActualizado"));
    }

    setSuccess("Foto de perfil actualizada correctamente.");
  } catch (err) {
    console.error("ERROR AL SUBIR FOTO:", err);

    setPhotoError(false);
    setPhotoPreview(getPhotoUrl(previousPhoto));

    if (axios.isAxiosError(err)) {
      const backendMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "El servidor no explicó el error.";

      setError(`Error ${err.response?.status ?? ""}: ${backendMessage}`);
    } else if (err instanceof Error) {
      setError(err.message);
    } else {
      setError("No se pudo actualizar la foto.");
    }
  } finally {
    URL.revokeObjectURL(temporaryPreview);
    setUploadingPhoto(false);
    event.target.value = "";
  }
}


  async function savePassword(event: FormEvent) {
    event.preventDefault();

    setSavingPassword(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.put("/auth/profile/password", {
        contrasena_actual: currentPassword,
        nueva_contrasena: newPassword,
        confirmar_contrasena: confirmPassword,
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "No se pudo actualizar la contraseña."
        );
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setSuccess("Tu contraseña fue actualizada correctamente.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la contraseña."
      );
    } finally {
      setSavingPassword(false);
    }
  }

  const passwordStrength = useMemo(() => {
  let score = 0;

  if (newPassword.length >= 8) score++;
  if (/[A-Z]/.test(newPassword)) score++;
  if (/[a-z]/.test(newPassword)) score++;
  if (/\d/.test(newPassword)) score++;
  if (/[^A-Za-z0-9]/.test(newPassword)) score++;

  if (score <= 2) {
    return {
      label: "Débil",
      width: "w-1/3",
      color: "bg-red-500",
      textColor: "text-red-300",
    };
  }

  if (score <= 4) {
    return {
      label: "Media",
      width: "w-2/3",
      color: "bg-amber-400",
      textColor: "text-amber-300",
    };
  }

  return {
    label: "Segura",
    width: "w-full",
    color: "bg-emerald-500",
    textColor: "text-emerald-300",
  };
}, [newPassword]);

  function logout(): void {
    const confirmed = window.confirm(
      "¿Quieres cerrar tu sesión actual?",
    );

    if (!confirmed) {
      return;
    }

    navigate("/logout", {
      replace: true,
    });
  }

  if (loading) {
    return (
      
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="h-96 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
          <div className="h-96 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
        </div>
      
    );
  }

  return (
    
      <section className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">
            Cuenta administrativa
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Mi perfil
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Administra tu información, tu foto y la seguridad de tu cuenta.
          </p>
        </div>

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

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-6 shadow-xl shadow-black/10">
            <div className="flex flex-col items-center text-center">
              <button
                type="button"
                onClick={() => inputPhotoRef.current?.click()}
                className="group relative"
                disabled={uploadingPhoto}
              >
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-[2rem] border-4 border-violet-400/20 bg-gradient-to-br from-violet-500 to-fuchsia-600 text-3xl font-bold text-white shadow-xl shadow-violet-950/30">
                  {photoPreview && !photoError ? (
                    <img
                      src={photoPreview}
                      alt={`Foto de ${user?.nombre ?? "usuario"}`}
                      className="h-full w-full object-cover"
                      onError={() => {
                        console.error("No se pudo cargar la foto:", photoPreview);
                        setPhotoError(true);
                      }}
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>

                <span className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[#111827] text-violet-300 shadow-lg transition group-hover:bg-violet-600 group-hover:text-white">
                  {uploadingPhoto ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : (
                    <Camera size={18} />
                  )}
                </span>
              </button>

              <input
                ref={inputPhotoRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={uploadPhoto}
              />

              <h2 className="mt-5 text-xl font-bold text-white">
                {user?.nombre}
              </h2>

              <p className="mt-1 text-sm text-slate-400">{user?.correo}</p>

              <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200">
                <ShieldCheck size={15} />
                {user?.rol_nombre || "Super Administrador"}
              </span>

              <button
                type="button"
                onClick={() => inputPhotoRef.current?.click()}
                className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Cambiar foto
              </button>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                JPG, PNG o WEBP. Máximo 3 MB.
              </p>
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/20"
              >
                <LogOut size={18} />
                Cerrar sesión
              </button>
            </div>
          </aside>

          <div className="space-y-6">
            <form
              onSubmit={saveProfile}
              className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-6 shadow-xl shadow-black/10"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-300">
                  <UserRound size={21} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-violet-300">
                    Información personal
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-white">
                    Datos de tu cuenta
                  </h2>
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-slate-300">
                    Nombre completo
                  </span>

                  <input
                    value={form.nombre}
                    onChange={(event) => updateField("nombre", event.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400/50"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Correo electrónico
                  </span>

                  <div className="relative mt-2">
                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      type="email"
                      value={form.correo}
                      onChange={(event) => updateField("correo", event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-violet-400/50"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Teléfono
                  </span>

                  <div className="relative mt-2">
                    <Phone
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      value={form.telefono}
                      onChange={(event) =>
                        updateField("telefono", event.target.value)
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-violet-400/50"
                      placeholder="+56 9 1234 5678"
                    />
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingProfile ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {savingProfile ? "Guardando..." : "Guardar información"}
              </button>
            </form>

            <form
              onSubmit={savePassword}
              className="rounded-3xl border border-white/10 bg-[#1E293B]/80 p-6 shadow-xl shadow-black/10"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-fuchsia-500/10 p-3 text-fuchsia-300">
                  <KeyRound size={21} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-fuchsia-300">
                    Seguridad de acceso
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-white">
                    Cambiar contraseña
                  </h2>
                </div>
              </div>

              <div className="mt-6 grid gap-5">
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Contraseña actual
                  </span>

                  <div className="relative mt-2">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 pr-12 text-sm text-white outline-none transition focus:border-fuchsia-400/50"
                    />

                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                      aria-label={
                        showCurrentPassword
                          ? "Ocultar contraseña actual"
                          : "Mostrar contraseña actual"
                      }
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-300">
                      Nueva contraseña
                    </span>

                    <div className="relative mt-2">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 pr-12 text-sm text-white outline-none transition focus:border-fuchsia-400/50"
                      />

                      <button
                        type="button"
                        onClick={() => setShowNewPassword((current) => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                        aria-label={
                          showNewPassword
                            ? "Ocultar nueva contraseña"
                            : "Mostrar nueva contraseña"
                        }
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-300">
                      Confirmar contraseña
                    </span>

                    <div className="relative mt-2">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 pr-12 text-sm text-white outline-none transition focus:border-fuchsia-400/50"
                      />

                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((current) => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                        aria-label={
                          showConfirmPassword
                            ? "Ocultar confirmación de contraseña"
                            : "Mostrar confirmación de contraseña"
                        }
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {newPassword && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Seguridad de contraseña</span>

                          <span className={`font-semibold ${passwordStrength.textColor}`}>
                            {passwordStrength.label}
                          </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${passwordStrength.width} ${passwordStrength.color}`}
                          />
                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                          Usa al menos 8 caracteres, mayúscula, minúscula, número y símbolo.
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-5 py-3 text-sm font-bold text-fuchsia-200 transition hover:bg-fuchsia-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingPassword ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <KeyRound size={18} />
                )}

                {savingPassword ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </form>
          </div>
        </div>
      </section>

  );
}