import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./index.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
  throw new Error(
    "Falta VITE_GOOGLE_CLIENT_ID. Revisa el archivo .env del frontend.",
  );
}

/*
 * Aplicamos el tema ANTES de renderizar React.
 * Así evitamos el destello blanco/oscuro al recargar.
 *
 * Conservamos el comportamiento actual de VibeNotas:
 * si el usuario todavía no eligió un tema, iniciamos en oscuro.
 */
const storedTheme = localStorage.getItem("tema");
const initialDarkMode =
  storedTheme === null ? true : storedTheme === "dark";

const rootElement = document.documentElement;

rootElement.classList.toggle("dark", initialDarkMode);
rootElement.dataset.theme = initialDarkMode ? "dark" : "light";
rootElement.style.colorScheme = initialDarkMode ? "dark" : "light";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
