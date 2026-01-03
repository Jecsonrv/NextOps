import { Link, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../../hooks/useAuth";
import {
    LayoutDashboard,
    FileText,
    Ship,
    Users,
    Building2,
    Mail,
    LogOut,
    Menu,
    X,
    FolderOpen,
    ChevronDown,
    ChevronRight,
    Link2,
    DollarSign,
    Regex,
    Target,
    Layers,
    FileMinus,
    AlertCircle,
    UserCog,
    User,
    Receipt,
    TrendingUp,
    Wallet,
} from "lucide-react";
import { Button } from "../ui/Button";
import { useState } from "react";
import { filterMenuItems } from "../../utils/permissions";

/**
 * Navegación principal del sistema con control de acceso por roles.
 *
 * - Sin 'roles': visible para todos los usuarios autenticados
 * - Con 'roles': visible solo para los roles especificados
 */
const navigation = [
    // Todos los usuarios pueden acceder (sin 'roles')
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "OTs", href: "/ots", icon: Ship },
    { name: "Facturas", href: "/invoices", icon: FileText },

    // Disputas - Todos pueden ver/crear, solo Admin/Finanzas pueden resolver
    // Se muestra para todos, la restricción está en las acciones dentro de la página
    { name: "Disputas", href: "/disputes", icon: AlertCircle },

    // Notas de Crédito - Solo Admin y Finanzas pueden crear/modificar
    {
        name: "Notas de Crédito",
        href: "/invoices/credit-notes",
        icon: FileMinus,
        roles: ["admin", "finanzas"], // Ocultar para operativos y jefe_operaciones
    },

    { name: "Clientes", href: "/clients", icon: Users },

    // Módulo de Finanzas - Solo Admin y Finanzas
    {
        name: "Finanzas",
        icon: TrendingUp,
        roles: ["admin", "finanzas"],
        children: [
            {
                name: "Dashboard Finanzas",
                href: "/sales/dashboard",
                icon: LayoutDashboard,
                roles: ["admin", "finanzas"],
            },
            {
                name: "Facturas de Venta",
                href: "/sales/invoices",
                icon: Receipt,
                roles: ["admin", "finanzas"],
            },
            {
                name: "Pagos Recibidos",
                href: "/sales/payments",
                icon: Wallet,
                roles: ["admin"], // MÓDULO OCULTO: Solo Admin
            },
            {
                name: "Pagos a Proveedores",
                href: "/supplier-payments",
                icon: DollarSign,
                roles: ["admin", "finanzas"],
            },
        ],
    },

    // Catálogos - Todos pueden ver (sin restricciones de roles en el menú)
    // La edición está protegida a nivel de componente y backend
    {
        name: "Catálogos",
        icon: FolderOpen,
        children: [
            {
                name: "Proveedores",
                href: "/catalogs/providers",
                icon: Building2,
            },
            {
                name: "Patrones",
                href: "/patterns",
                icon: Regex,
            },
            {
                name: "Alias de Clientes",
                href: "/catalogs/aliases",
                icon: Link2,
            },
            {
                name: "Tipos de Costo",
                href: "/catalogs/cost-types",
                icon: DollarSign,
            },
            {
                name: "Categorías de Costo",
                href: "/catalogs/cost-categories",
                icon: Layers,
            },
        ],
    },

    // Automatización - Solo Admin
    {
        name: "Automatización",
        href: "/automation",
        icon: Mail,
        roles: ["admin"],
    },
];

export function Layout({ children }) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [salesOpen, setSalesOpen] = useState(
        location.pathname.startsWith("/sales")
    );
    const [catalogsOpen, setCatalogsOpen] = useState(
        location.pathname.startsWith("/catalogs")
    );

    // Filtrar items del menú según el rol del usuario
    const filteredNavigation = filterMenuItems(user, navigation);

    // Agregar Gestión de Usuarios solo para Admin
    const navigationItems = [
        ...filteredNavigation,
        ...(user?.role === "admin"
            ? [
                  {
                      name: "Usuarios",
                      href: "/admin/users",
                      icon: UserCog,
                      roles: ["admin"],
                  },
              ]
            : []),
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Diseño profesional ERP */}
            <aside
                className={`
          fixed top-0 left-0 z-50 h-full w-60 bg-slate-900
          transform transition-transform duration-200 ease-in-out lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between h-14 px-4 border-b border-slate-700">
                        <Link to="/" className="flex items-center">
                            <img
                                src="/nextops-logo.svg"
                                alt="NextOps"
                                className="h-10 w-auto brightness-0 invert"
                            />
                        </Link>
                        <button
                            className="lg:hidden text-slate-400 hover:text-white"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                        {navigationItems.map((item) => {
                            // Handle parent items with children (Sales, Catalogs, etc.)
                            if (item.children) {
                                const isSalesSection =
                                    item.name === "Finanzas";
                                const isCatalogsSection =
                                    item.name === "Catálogos";
                                const isOpen = isSalesSection
                                    ? salesOpen
                                    : isCatalogsSection
                                    ? catalogsOpen
                                    : false;
                                const toggleOpen = isSalesSection
                                    ? () => setSalesOpen(!salesOpen)
                                    : () => setCatalogsOpen(!catalogsOpen);

                                // Check if any child is active
                                const isAnyChildActive = item.children.some(
                                    (child) =>
                                        location.pathname.startsWith(child.href)
                                );

                                return (
                                    <div key={item.name}>
                                        <button
                                            onClick={toggleOpen}
                                            className={`
                                                w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors
                                                ${
                                                    isAnyChildActive
                                                        ? "bg-slate-800 text-white"
                                                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                                }
                                            `}
                                        >
                                            <div className="flex items-center">
                                                <item.icon className="w-4 h-4 mr-2.5" />
                                                {item.name}
                                            </div>
                                            {isOpen ? (
                                                <ChevronDown className="w-3.5 h-3.5" />
                                            ) : (
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            )}
                                        </button>

                                        {/* Submenu */}
                                        {isOpen && (
                                            <div className="ml-6 mt-0.5 space-y-0.5 border-l border-slate-700 pl-2">
                                                {item.children.map((child) => {
                                                    const isActive =
                                                        location.pathname ===
                                                            child.href ||
                                                        location.pathname.startsWith(
                                                            `${child.href}/`
                                                        );
                                                    return (
                                                        <Link
                                                            key={child.name}
                                                            to={child.href}
                                                            className={`
                                                                flex items-center px-2 py-1.5 text-sm rounded transition-colors
                                                                ${
                                                                    isActive
                                                                        ? "bg-slate-700 text-white"
                                                                        : "text-slate-400 hover:text-slate-200"
                                                                }
                                                            `}
                                                            onClick={() =>
                                                                setSidebarOpen(
                                                                    false
                                                                )
                                                            }
                                                        >
                                                            <child.icon className="w-3.5 h-3.5 mr-2" />
                                                            {child.name}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // Handle regular navigation items
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`
                                        flex items-center px-3 py-2 text-sm rounded transition-colors
                                        ${
                                            isActive
                                                ? "bg-slate-800 text-white"
                                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                        }
                                    `}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <item.icon className="w-4 h-4 mr-2.5" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User info */}
                    <div className="p-3 border-t border-slate-700">
                        <Link
                            to="/profile"
                            className="block hover:bg-slate-800 p-2 rounded transition-colors"
                        >
                            <div className="flex items-center">
                                <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center mr-2.5">
                                    <User className="w-4 h-4 text-slate-300" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-200 truncate">
                                        {user?.email?.split("@")[0]}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {user?.role_display ||
                                            user?.role ||
                                            "Usuario"}
                                    </p>
                                </div>
                            </div>
                        </Link>
                        <button
                            onClick={logout}
                            className="w-full mt-2 flex items-center justify-center px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                        >
                            <LogOut className="w-3.5 h-3.5 mr-1.5" />
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:pl-60">
                {/* Header - Minimalista */}
                <header className="sticky top-0 z-30 flex items-center h-12 px-4 lg:px-6 bg-white border-b border-slate-200">
                    <button
                        className="lg:hidden mr-3 text-slate-600 hover:text-slate-900"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-medium text-slate-700 truncate">
                            {(() => {
                                // Find navigation item for current page (exact match)
                                const currentNav = navigationItems.find(
                                    (item) => item.href === location.pathname
                                );
                                if (currentNav) return currentNav.name;

                                // Check in navigation children (exact match)
                                for (const item of navigation) {
                                    if (item.children) {
                                        const child = item.children.find(
                                            (c) => c.href === location.pathname
                                        );
                                        if (child) return child.name;
                                    }
                                }

                                // Check in navigation children (startsWith match)
                                for (const item of navigation) {
                                    if (item.children) {
                                        const child = item.children.find(
                                            (c) => location.pathname.startsWith(`${c.href}/`)
                                        );
                                        if (child) return child.name;
                                    }
                                }

                                // Check if in specific sections with startsWith
                                if (location.pathname.startsWith("/catalogs")) {
                                    const catalogNav = navigation.find(
                                        (item) => item.name === "Catálogos"
                                    );
                                    if (catalogNav?.children) {
                                        const currentCatalog =
                                            catalogNav.children.find(
                                                (child) =>
                                                    location.pathname ===
                                                        child.href ||
                                                    location.pathname.startsWith(
                                                        `${child.href}/`
                                                    )
                                            );
                                        if (currentCatalog)
                                            return currentCatalog.name;
                                    }
                                    return "Catálogos";
                                }

                                // Check top-level navigation with startsWith
                                const navStartsWith = navigationItems.find(
                                    (item) => item.href !== "/" && location.pathname.startsWith(item.href)
                                );
                                if (navStartsWith) return navStartsWith.name;

                                return "Dashboard";
                            })()}
                        </h2>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 lg:p-6">{children}</main>
            </div>
        </div>
    );
}

Layout.propTypes = {
    children: PropTypes.node.isRequired,
};
