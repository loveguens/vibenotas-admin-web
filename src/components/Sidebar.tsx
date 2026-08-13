import {
  BarChart3,
  BellRing,
  ChevronLeft,
  ChevronRight,
  Crown,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MessageCircle,
  ScrollText,
  Settings,
  ShieldCheck,
  Tags,
  UserCircle2,
  Users,
  X,
  Bell,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

type SidebarProps = {
  role: "admin" | "superadmin";
  isOpen: boolean;
  onClose: () => void;
};

type MenuItem = {
  label: string;
  icon: React.ElementType;
  path: string;
  section?: "principal" | "gestion" | "sistema";
};

export default function Sidebar({
  role,
  isOpen,
  onClose,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);

  const basePath = role === "superadmin" ? "/superadmin" : "/admin";

  const menuItems: MenuItem[] = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: `${basePath}/dashboard`,
      section: "principal",
    },
    {
      label: "Usuarios",
      icon: Users,
      path: `${basePath}/users`,
      section: "principal",
    },

    ...(role === "superadmin"
      ? [
          {
            label: "Administradores",
            icon: ShieldCheck,
            path: "/superadmin/administrators",
            section: "principal" as const,
          },
        ]
      : []),

    {
      label: "Contenido",
      icon: FileText,
      path: `${basePath}/content`,
      section: "gestion",
    },
    {
  label: "Notificaciones",
  icon: BellRing,
  path: `${basePath}/notifications`,
  section: "gestion",
},
{
  label: "Mis notificaciones",
  icon: Bell,
  path: "/my-notifications",
  section: "gestion",
},
{
  label: "Comunidad",
  icon: MessageCircle,
  path: `${basePath}/chat`,
  section: "gestion",
},
    {
      label: "Etiquetas",
      icon: Tags,
      path: `${basePath}/tags`,
      section: "gestion",
    },
    {
      label: "Reportes",
      icon: BarChart3,
      path: `${basePath}/reports`,
      section: "gestion",
    },

    ...(role === "superadmin"
      ? [
          {
            label: "Analíticas",
            icon: BarChart3,
            path: "/superadmin/analytics",
            section: "sistema" as const,
          },
          {
            label: "Logs de actividad",
            icon: ScrollText,
            path: "/superadmin/logs",
            section: "sistema" as const,
          },
          {
            label: "Suscripciones",
            icon: Crown,
            path: "/superadmin/subscriptions",
            section: "sistema" as const,
          },
          {
            label: "Seguridad",
            icon: LockKeyhole,
            path: "/superadmin/security",
            section: "sistema" as const,
          },
        ]
      : []),
  ];

  const cerrarSesion = () => {
    onClose();

    navigate("/logout", {
      replace: true,
    });
  };

  const esRutaActiva = (path: string) => {
    if (path.endsWith("/dashboard")) {
      return location.pathname === path;
    }

    return location.pathname.startsWith(path);
  };

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon;
    const active = esRutaActiva(item.path);

    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onClose}
        title={collapsed ? item.label : undefined}
        className={`group relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all duration-200 ${
          active
            ? "bg-gradient-to-r from-violet-500/25 to-fuchsia-500/10 text-white shadow-lg shadow-violet-950/20"
            : "text-slate-400 hover:bg-white/5 hover:text-white"
        }`}
      >
        {active && (
          <span className="absolute left-0 h-7 w-1 rounded-r-full bg-gradient-to-b from-violet-300 to-fuchsia-400 shadow-[0_0_12px_rgba(192,132,252,0.9)]" />
        )}

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
            active
              ? "bg-violet-400/20 text-violet-200"
              : "text-slate-500 group-hover:bg-violet-500/10 group-hover:text-violet-300"
          }`}
        >
          <Icon size={19} />
        </div>

        {!collapsed && (
          <span className="truncate">{item.label}</span>
        )}
      </Link>
    );
  };

  const principal = menuItems.filter(
    (item) => item.section === "principal"
  );

  const gestion = menuItems.filter(
    (item) => item.section === "gestion"
  );

  const sistema = menuItems.filter(
    (item) => item.section === "sistema"
  );

  return (
    <>
      {/* Fondo oscuro al abrir menú en teléfono */}
      {isOpen && (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          aria-label="Cerrar menú lateral"
        />
      )}

      <aside
        className={`fixed inset-y-4 left-4 z-50 flex h-[calc(100vh-32px)] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0F172A]/95 shadow-2xl shadow-black/50 backdrop-blur-2xl transition-all duration-300 lg:sticky lg:top-4 lg:h-[calc(100vh-32px)] ${
          collapsed ? "w-[86px]" : "w-[280px]"
        } ${
          isOpen
            ? "translate-x-0"
            : "-translate-x-[120%] lg:translate-x-0"
        }`}
      >
        {/* LOGO */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-5">
          <Link
            to={`${basePath}/dashboard`}
            onClick={onClose}
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-600 text-white shadow-lg shadow-violet-900/50">
              <Crown size={20} />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <h1 className="truncate text-[15px] font-extrabold tracking-tight text-white">
                  VibeNotas
                </h1>

                <p className="mt-0.5 text-[10px] font-bold tracking-[0.18em] text-violet-300">
                  {role === "superadmin"
                    ? "SUPER ADMIN"
                    : "ADMINISTRADOR"}
                </p>
              </div>
            )}
          </Link>

          {/* Contraer solo en escritorio */}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="hidden rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:block"
            title={collapsed ? "Expandir menú" : "Contraer menú"}
          >
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>

          {/* Cerrar solo en móvil */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
            title="Cerrar menú"
          >
            <X size={19} />
          </button>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          {!collapsed && (
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Principal
            </p>
          )}

          <div className="space-y-1.5">
            {principal.map(renderMenuItem)}
          </div>

          <div className="my-5 border-t border-white/10" />

          {!collapsed && (
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Gestión
            </p>
          )}

          <div className="space-y-1.5">
            {gestion.map(renderMenuItem)}
          </div>

          {sistema.length > 0 && (
            <>
              <div className="my-5 border-t border-white/10" />

              {!collapsed && (
                <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Sistema
                </p>
              )}

              <div className="space-y-1.5">
                {sistema.map(renderMenuItem)}
              </div>
            </>
          )}
        </nav>

        {/* PARTE INFERIOR */}
        <div className="border-t border-white/10 p-3">
          <Link
            to={`${basePath}/profile`}
            onClick={onClose}
            title={collapsed ? "Mi perfil" : undefined}
            className={`group mb-1 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${
              esRutaActiva(`${basePath}/profile`)
                ? "bg-violet-500/15 text-violet-200"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition group-hover:bg-violet-500/10 group-hover:text-violet-300">
              <UserCircle2 size={19} />
            </div>

            {!collapsed && <span>Mi perfil</span>}
          </Link>

          <Link
            to={`${basePath}/settings`}
            onClick={onClose}
            title={collapsed ? "Configuración" : undefined}
            className={`group mb-1 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${
              esRutaActiva(`${basePath}/settings`)
                ? "bg-violet-500/15 text-violet-200"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition group-hover:bg-violet-500/10 group-hover:text-violet-300">
              <Settings size={19} />
            </div>

            {!collapsed && <span>Configuración</span>}
          </Link>

          <button
            type="button"
            onClick={cerrarSesion}
            title={collapsed ? "Cerrar sesión" : undefined}
            className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition group-hover:bg-red-500/10">
              <LogOut size={19} />
            </div>

            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>
    </>
  );
}