import {
  BarChart3,
  Bell,
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
} from "lucide-react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  useState,
  type ElementType,
  type ReactNode,
} from "react";

type SidebarProps = {
  role: "admin" | "superadmin";
  isOpen: boolean;
  onClose: () => void;
};

type MenuSection =
  | "principal"
  | "gestion"
  | "sistema";

type MenuItem = {
  label: string;
  icon: ElementType;
  path: string;
  section: MenuSection;
};

type SidebarSectionProps = {
  label: string;
  collapsed: boolean;
  children: ReactNode;
};

export default function Sidebar({
  role,
  isOpen,
  onClose,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] =
    useState(false);

  const basePath =
    role === "superadmin"
      ? "/superadmin"
      : "/admin";

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

  function cerrarSesion(): void {
    onClose();

    navigate("/logout", {
      replace: true,
    });
  }

  function esRutaActiva(
    path: string,
  ): boolean {
    if (path.endsWith("/dashboard")) {
      return location.pathname === path;
    }

    if (path === "/my-notifications") {
      return (
        location.pathname ===
        "/my-notifications"
      );
    }

    return location.pathname.startsWith(
      path,
    );
  }

  function renderMenuItem(
    item: MenuItem,
  ) {
    const Icon = item.icon;
    const active =
      esRutaActiva(item.path);

    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onClose}
        aria-current={
          active ? "page" : undefined
        }
        title={
          collapsed
            ? item.label
            : undefined
        }
        className={`
          group relative flex min-h-12
          items-center gap-3 rounded-2xl
          px-3 py-2.5 text-sm font-semibold
          outline-none transition-all duration-200
          ${
            active
              ? `
                bg-violet-100
                text-violet-950
                shadow-sm
                ring-1 ring-violet-200
                dark:bg-gradient-to-r
                dark:from-violet-500/25
                dark:to-fuchsia-500/10
                dark:text-white
                dark:shadow-lg
                dark:shadow-violet-950/20
                dark:ring-0
              `
              : `
                text-slate-600
                hover:bg-slate-100
                hover:text-slate-950
                focus-visible:bg-slate-100
                focus-visible:text-slate-950

                dark:text-slate-400
                dark:hover:bg-white/5
                dark:hover:text-white
                dark:focus-visible:bg-white/5
                dark:focus-visible:text-white
              `
          }
        `}
      >
        {active && (
          <span
            className="
              absolute left-0 h-7 w-1
              rounded-r-full
              bg-gradient-to-b
              from-violet-500
              to-fuchsia-500
              shadow-[0_0_10px_rgba(139,92,246,0.35)]

              dark:from-violet-300
              dark:to-fuchsia-400
              dark:shadow-[0_0_12px_rgba(192,132,252,0.9)]
            "
          />
        )}

        <div
          className={`
            flex h-9 w-9 shrink-0
            items-center justify-center
            rounded-xl transition
            ${
              active
                ? `
                  bg-violet-200/70
                  text-violet-700
                  dark:bg-violet-400/20
                  dark:text-violet-200
                `
                : `
                  text-slate-500
                  group-hover:bg-violet-100
                  group-hover:text-violet-700

                  dark:text-slate-500
                  dark:group-hover:bg-violet-500/10
                  dark:group-hover:text-violet-300
                `
            }
          `}
        >
          <Icon size={19} />
        </div>

        <span
          className={`
            min-w-0 truncate
            ${
              collapsed
                ? "lg:hidden"
                : ""
            }
          `}
        >
          {item.label}
        </span>
      </Link>
    );
  }

  const principal =
    menuItems.filter(
      (item) =>
        item.section === "principal",
    );

  const gestion =
    menuItems.filter(
      (item) =>
        item.section === "gestion",
    );

  const sistema =
    menuItems.filter(
      (item) =>
        item.section === "sistema",
    );

  return (
    <>
      {isOpen && (
        <button
          type="button"
          onClick={onClose}
          className="
            fixed inset-0 z-[60]
            bg-slate-950/60
            backdrop-blur-sm
            lg:hidden
          "
          aria-label="Cerrar menú lateral"
        />
      )}

      <aside
        aria-label="Navegación principal"
        className={`
          fixed inset-y-3 left-3 z-[70]
          flex h-[calc(100vh-24px)]
          w-[280px] flex-col
          overflow-hidden
          rounded-[28px]

          border border-slate-200
          bg-white/95
          shadow-2xl shadow-slate-300/40
          backdrop-blur-2xl

          transition-all duration-300

          dark:border-white/10
          dark:bg-[#0F172A]/95
          dark:shadow-black/50

          lg:sticky
          lg:top-3
          lg:h-[calc(100vh-24px)]

          ${
            collapsed
              ? "lg:w-[86px]"
              : "lg:w-[280px]"
          }

          ${
            isOpen
              ? "translate-x-0"
              : "-translate-x-[120%] lg:translate-x-0"
          }
        `}
      >
        <div
          className="
            flex min-h-[78px]
            items-center justify-between
            border-b border-slate-200
            px-4
            dark:border-white/10
          "
        >
          <Link
            to={`${basePath}/dashboard`}
            onClick={onClose}
            className="
              flex min-w-0
              items-center gap-3
            "
          >
            <div
              className="
                flex h-11 w-11
                shrink-0 items-center
                justify-center
                rounded-2xl
                bg-gradient-to-br
                from-violet-500
                via-fuchsia-500
                to-indigo-600
                text-white
                shadow-lg
                shadow-violet-500/20
                dark:shadow-violet-900/50
              "
            >
              <Crown size={20} />
            </div>

            <div
              className={`
                min-w-0
                ${
                  collapsed
                    ? "lg:hidden"
                    : ""
                }
              `}
            >
              <h1
                className="
                  truncate
                  text-[15px]
                  font-extrabold
                  tracking-tight
                  text-slate-950
                  dark:text-white
                "
              >
                VibeNotas
              </h1>

              <p
                className="
                  mt-0.5
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.18em]
                  text-violet-600
                  dark:text-violet-300
                "
              >
                {role === "superadmin"
                  ? "Super Admin"
                  : "Administrador"}
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() =>
              setCollapsed(
                (value) => !value,
              )
            }
            className="
              hidden h-9 w-9
              items-center justify-center
              rounded-xl
              text-slate-500
              transition
              hover:bg-slate-100
              hover:text-slate-950

              dark:text-slate-400
              dark:hover:bg-white/10
              dark:hover:text-white
              lg:flex
            "
            aria-label={
              collapsed
                ? "Expandir menú"
                : "Contraer menú"
            }
            title={
              collapsed
                ? "Expandir menú"
                : "Contraer menú"
            }
          >
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="
              flex h-9 w-9
              items-center justify-center
              rounded-xl
              text-slate-500
              transition
              hover:bg-slate-100
              hover:text-slate-950

              dark:text-slate-400
              dark:hover:bg-white/10
              dark:hover:text-white
              lg:hidden
            "
            aria-label="Cerrar menú"
            title="Cerrar menú"
          >
            <X size={19} />
          </button>
        </div>

        <nav
          className="
            flex-1
            overflow-y-auto
            px-3 py-4
          "
        >
          <SidebarSection
            label="Principal"
            collapsed={collapsed}
          >
            {principal.map(
              renderMenuItem,
            )}
          </SidebarSection>

          <div
            className="
              my-4
              border-t border-slate-200
              dark:border-white/10
            "
          />

          <SidebarSection
            label="Gestión"
            collapsed={collapsed}
          >
            {gestion.map(
              renderMenuItem,
            )}
          </SidebarSection>

          {sistema.length > 0 && (
            <>
              <div
                className="
                  my-4
                  border-t border-slate-200
                  dark:border-white/10
                "
              />

              <SidebarSection
                label="Sistema"
                collapsed={collapsed}
              >
                {sistema.map(
                  renderMenuItem,
                )}
              </SidebarSection>
            </>
          )}
        </nav>

        <div
          className="
            border-t border-slate-200
            p-3
            dark:border-white/10
          "
        >
          <Link
            to={`${basePath}/profile`}
            onClick={onClose}
            title={
              collapsed
                ? "Mi perfil"
                : undefined
            }
            className={`
              group mb-1 flex
              min-h-12 items-center
              gap-3 rounded-2xl
              px-3 py-2.5
              text-sm font-semibold
              transition
              ${
                esRutaActiva(
                  `${basePath}/profile`,
                )
                  ? `
                    bg-violet-100
                    text-violet-800
                    dark:bg-violet-500/15
                    dark:text-violet-200
                  `
                  : `
                    text-slate-600
                    hover:bg-slate-100
                    hover:text-slate-950
                    dark:text-slate-400
                    dark:hover:bg-white/5
                    dark:hover:text-white
                  `
              }
            `}
          >
            <div
              className="
                flex h-9 w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                text-slate-500
                transition
                group-hover:bg-violet-100
                group-hover:text-violet-700

                dark:text-slate-500
                dark:group-hover:bg-violet-500/10
                dark:group-hover:text-violet-300
              "
            >
              <UserCircle2 size={19} />
            </div>

            <span
              className={
                collapsed
                  ? "lg:hidden"
                  : ""
              }
            >
              Mi perfil
            </span>
          </Link>

          <Link
            to={`${basePath}/settings`}
            onClick={onClose}
            title={
              collapsed
                ? "Configuración"
                : undefined
            }
            className={`
              group mb-1 flex
              min-h-12 items-center
              gap-3 rounded-2xl
              px-3 py-2.5
              text-sm font-semibold
              transition
              ${
                esRutaActiva(
                  `${basePath}/settings`,
                )
                  ? `
                    bg-violet-100
                    text-violet-800
                    dark:bg-violet-500/15
                    dark:text-violet-200
                  `
                  : `
                    text-slate-600
                    hover:bg-slate-100
                    hover:text-slate-950
                    dark:text-slate-400
                    dark:hover:bg-white/5
                    dark:hover:text-white
                  `
              }
            `}
          >
            <div
              className="
                flex h-9 w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                text-slate-500
                transition
                group-hover:bg-violet-100
                group-hover:text-violet-700

                dark:text-slate-500
                dark:group-hover:bg-violet-500/10
                dark:group-hover:text-violet-300
              "
            >
              <Settings size={19} />
            </div>

            <span
              className={
                collapsed
                  ? "lg:hidden"
                  : ""
              }
            >
              Configuración
            </span>
          </Link>

          <div
            className="
              my-2
              border-t border-slate-200
              dark:border-white/[0.06]
            "
          />

          <button
            type="button"
            onClick={cerrarSesion}
            title={
              collapsed
                ? "Cerrar sesión"
                : undefined
            }
            className="
              group flex min-h-12
              w-full items-center
              gap-3 rounded-2xl
              px-3 py-2.5
              text-sm font-semibold
              text-red-600
              transition
              hover:bg-red-50
              hover:text-red-700

              dark:text-red-400
              dark:hover:bg-red-500/10
              dark:hover:text-red-300
            "
          >
            <div
              className="
                flex h-9 w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                transition
                group-hover:bg-red-100
                dark:group-hover:bg-red-500/10
              "
            >
              <LogOut size={19} />
            </div>

            <span
              className={
                collapsed
                  ? "lg:hidden"
                  : ""
              }
            >
              Cerrar sesión
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarSection({
  label,
  collapsed,
  children,
}: SidebarSectionProps) {
  return (
    <section>
      <p
        className={`
          mb-2 px-3
          text-[10px]
          font-bold
          uppercase
          tracking-[0.18em]
          text-slate-500
          dark:text-slate-500
          ${
            collapsed
              ? "lg:hidden"
              : ""
          }
        `}
      >
        {label}
      </p>

      <div className="space-y-1">
        {children}
      </div>
    </section>
  );
}
