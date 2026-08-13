import { useState } from "react";
import { ArrowLeft, LoaderCircle, Mail, Send } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function ForgotPasswordPage() {
  const [correo, setCorreo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const correoLimpio = correo.trim();

    if (!correoLimpio) {
      setError("Ingresa tu correo electrónico.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/forgot-password", {
        correo: correoLimpio,
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "No se pudo enviar el enlace de recuperación."
        );
      }

      setSuccess(
        "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."
      );

      setCorreo("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo procesar la solicitud."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 transition hover:text-violet-900 hover:underline"
        >
          <ArrowLeft size={17} />
          Volver al inicio de sesión
        </Link>

        <div className="mt-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-700 text-white shadow-lg shadow-violet-200">
            <Mail size={28} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Recuperar contraseña
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Escribe tu correo y te enviaremos un enlace seguro para crear una nueva contraseña.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Correo electrónico
            </span>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 transition focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100">
              <Mail size={18} className="shrink-0 text-slate-400" />

              <input
                type="email"
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
                className="w-full bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
                required
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-4 font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <LoaderCircle size={18} className="animate-spin" />
                Enviando enlace...
              </>
            ) : (
              <>
                <Send size={18} />
                Enviar enlace de recuperación
              </>
            )}
          </button>
        </form>
      </section>
    </main>
  );
}