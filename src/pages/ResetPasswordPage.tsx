import { useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function ResetPasswordPage() {
  function getResetToken(): string {
    const tokenFromSearch = new URLSearchParams(
      window.location.search
    ).get("token");

    if (tokenFromSearch) {
      return tokenFromSearch.trim();
    }

    const hash = window.location.hash;
    const queryIndex = hash.indexOf("?");

    if (queryIndex >= 0) {
      const hashQuery = hash.slice(queryIndex + 1);

      return new URLSearchParams(hashQuery).get("token")?.trim() ?? "";
    }

    return "";
  }

  const token = getResetToken();

  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  setError("");
  setSuccess("");

  if (!token) {
    setError("El enlace de recuperación no es válido.");
    return;
  }

  if (nuevaContrasena.length < 8) {
    setError("La nueva contraseña debe tener al menos 8 caracteres.");
    return;
  }

  if (nuevaContrasena !== confirmarContrasena) {
    setError("Las contraseñas no coinciden.");
    return;
  }

  try {
    setLoading(true);

    const response = await api.post("/auth/reset-password", {
      token,
      nueva_contrasena: nuevaContrasena,
      confirmar_contrasena: confirmarContrasena,
    });

    if (!response.data?.success) {
      throw new Error(
        response.data?.message ||
          "No se pudo restablecer la contraseña."
      );
    }

    setSuccess(
      "Tu contraseña fue restablecida correctamente. Ya puedes iniciar sesión."
    );

    setNuevaContrasena("");
    setConfirmarContrasena("");
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "No se pudo restablecer la contraseña."
    );
  } finally {
    setLoading(false);
  }
}

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-700 text-white shadow-lg shadow-violet-200">
            <KeyRound size={28} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Restablecer contraseña
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Crea una contraseña nueva y segura para tu cuenta de VibeNotas.
          </p>
        </div>

        {!token && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            El enlace de recuperación es inválido o no contiene un token.
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          </div>
        )}

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Nueva contraseña
              </span>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 transition focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100">
                <LockKeyhole size={18} className="shrink-0 text-slate-400" />

                <input
                  type={mostrarNueva ? "text" : "password"}
                  value={nuevaContrasena}
                  onChange={(event) =>
                    setNuevaContrasena(event.target.value)
                  }
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  onClick={() => setMostrarNueva((actual) => !actual)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-violet-50 hover:text-violet-700"
                  aria-label={
                    mostrarNueva
                      ? "Ocultar nueva contraseña"
                      : "Mostrar nueva contraseña"
                  }
                >
                  {mostrarNueva ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Confirmar nueva contraseña
              </span>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 transition focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100">
                <LockKeyhole size={18} className="shrink-0 text-slate-400" />

                <input
                  type={mostrarConfirmar ? "text" : "password"}
                  value={confirmarContrasena}
                  onChange={(event) =>
                    setConfirmarContrasena(event.target.value)
                  }
                  placeholder="Repite tu nueva contraseña"
                  className="w-full bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  onClick={() => setMostrarConfirmar((actual) => !actual)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-violet-50 hover:text-violet-700"
                  aria-label={
                    mostrarConfirmar
                      ? "Ocultar confirmación"
                      : "Mostrar confirmación"
                  }
                >
                  {mostrarConfirmar ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading || !token}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-4 font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <LoaderCircle size={18} className="animate-spin" />
                  Restableciendo...
                </>
              ) : (
                <>
                  <KeyRound size={18} />
                  Guardar nueva contraseña
                </>
              )}
            </button>
          </form>
        ) : (
          <a
            href="/login"
            className="flex w-full items-center justify-center rounded-2xl bg-violet-600 px-4 py-4 font-bold text-white transition hover:bg-violet-700"
          >
            Ir a iniciar sesión
          </a>
        )}

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm font-semibold text-violet-700 transition hover:text-violet-900 hover:underline"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </section>
    </main>
  );
}