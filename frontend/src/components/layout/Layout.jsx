import { Link, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../../hooks/useAuth";
import {
    LayoutDashboard,
    FileText,
    Ship,
    Users,
    Building2,
    LogOut,
    Menu,
    X,
    FolderOpen,
    ChevronDown,
    ChevronRight,
    Link2,
    DollarSign,
    Regex,
    Layers,
    FileMinus,
    AlertCircle,
    UserCog,
    Receipt,
    TrendingUp,
    Wallet,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { filterMenuItems } from "../../utils/permissions";

/**
 * Navegación principal del sistema con control de acceso por roles.
 *
 * - Sin 'roles': visible para todos los usuarios autenticados
 * - Con 'roles': visible solo para los roles especificados
 */
const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "OTs", href: "/ots", icon: Ship },
    { name: "Facturas", href: "/invoices", icon: FileText },
    { name: "Disputas", href: "/disputes", icon: AlertCircle },
    {
        name: "Notas de Crédito",
        href: "/invoices/credit-notes",
        icon: FileMinus,
        roles: ["admin", "finanzas"],
    },
    { name: "Clientes", href: "/clients", icon: Users },
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
                roles: ["admin"],
            },
            {
                name: "Pagos a Proveedores",
                href: "/supplier-payments",
                icon: DollarSign,
                roles: ["admin", "finanzas"],
            },
        ],
    },
    {
        name: "Catálogos",
        icon: FolderOpen,
        children: [
            {
                name: "Proveedores",
                href: "/catalogs/providers",
                icon: Building2,
            },
            { name: "Patrones", href: "/patterns", icon: Regex },
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
];

// ─── Section label ─────────────────────────────────────────────
function SectionLabel({ children, collapsed }) {
    if (collapsed) return <div className="h-4" />;
    return (
        <p className="px-3 pt-5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground/40 select-none">
            {children}
        </p>
    );
}

SectionLabel.propTypes = {
    children: PropTypes.node,
    collapsed: PropTypes.bool,
};

// ─── Nav item ──────────────────────────────────────────────────
function NavItem({ item, isActive, collapsed, onClick }) {
    return (
        <Link
            to={item.href}
            onClick={onClick}
            title={collapsed ? item.name : undefined}
            className={`
                group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150
                ${collapsed ? "justify-center px-2" : ""}
                ${
                    isActive
                        ? "bg-white/15 text-white shadow-sm"
                        : "text-primary-foreground/70 hover:bg-white/10 hover:text-white"
                }
            `}
        >
            <item.icon
                className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? "text-white" : "text-primary-foreground/60 group-hover:text-white"}`}
            />
            {!collapsed && <span className="truncate">{item.name}</span>}
        </Link>
    );
}

NavItem.propTypes = {
    item: PropTypes.object.isRequired,
    isActive: PropTypes.bool,
    collapsed: PropTypes.bool,
    onClick: PropTypes.func,
};

// ─── Nav group (collapsible) ───────────────────────────────────
function NavGroup({ item, location, collapsed, onNavigate }) {
    const isAnyChildActive = item.children.some(
        (child) =>
            location.pathname === child.href ||
            location.pathname.startsWith(`${child.href}/`),
    );
    const [open, setOpen] = useState(isAnyChildActive);

    if (collapsed) {
        return (
            <button
                title={item.name}
                onClick={() => setOpen(!open)}
                className={`
                    group flex w-full items-center justify-center rounded-lg px-2 py-2 text-sm font-medium transition-all duration-150
                    ${isAnyChildActive ? "bg-white/15 text-white" : "text-primary-foreground/70 hover:bg-white/10 hover:text-white"}
                `}
            >
                <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
            </button>
        );
    }

    return (
        <div>
            <button
                onClick={() => setOpen(!open)}
                className={`
                    group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150
                    ${isAnyChildActive ? "bg-white/15 text-white" : "text-primary-foreground/70 hover:bg-white/10 hover:text-white"}
                `}
            >
                <div className="flex items-center gap-3">
                    <item.icon
                        className={`h-[18px] w-[18px] flex-shrink-0 ${isAnyChildActive ? "text-white" : "text-primary-foreground/60 group-hover:text-white"}`}
                    />
                    <span className="truncate">{item.name}</span>
                </div>
                {open ? (
                    <ChevronDown className="h-4 w-4 text-primary-foreground/50" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-primary-foreground/50" />
                )}
            </button>

            {open && (
                <div className="ml-5 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                    {item.children.map((child) => {
                        const active =
                            location.pathname === child.href ||
                            location.pathname.startsWith(`${child.href}/`);
                        return (
                            <Link
                                key={child.name}
                                to={child.href}
                                onClick={onNavigate}
                                className={`
                                    flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-all duration-150
                                    ${active ? "bg-white/15 text-white font-medium" : "text-primary-foreground/60 hover:bg-white/10 hover:text-white"}
                                `}
                            >
                                <child.icon className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{child.name}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

NavGroup.propTypes = {
    item: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    collapsed: PropTypes.bool,
    onNavigate: PropTypes.func,
};

// ─── Main Layout ───────────────────────────────────────────────
export function Layout({ children }) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const closeMobile = useCallback(() => setMobileOpen(false), []);

    // Filter navigation by user role
    const filteredNavigation = useMemo(() => {
        const filtered = filterMenuItems(user, navigation);
        if (user?.role === "admin") {
            return [
                ...filtered,
                {
                    name: "Usuarios",
                    href: "/admin/users",
                    icon: UserCog,
                    roles: ["admin"],
                },
            ];
        }
        return filtered;
    }, [user]);

    // Separate into logical sections
    const operationsItems = filteredNavigation.filter(
        (item) => !item.children && !["Usuarios"].includes(item.name),
    );
    const financeGroup = filteredNavigation.find(
        (item) => item.name === "Finanzas",
    );
    const catalogGroup = filteredNavigation.find(
        (item) => item.name === "Catálogos",
    );
    const adminItems = filteredNavigation.filter(
        (item) => item.name === "Usuarios",
    );

    // Current page title
    const pageTitle = useMemo(() => {
        const flat = [];
        for (const item of navigation) {
            if (item.href) flat.push(item);
            if (item.children) flat.push(...item.children);
        }
        const exact = flat.find((i) => i.href === location.pathname);
        if (exact) return exact.name;
        const prefix = flat.find(
            (i) => i.href !== "/" && location.pathname.startsWith(`${i.href}/`),
        );
        if (prefix) return prefix.name;
        if (location.pathname.startsWith("/admin")) return "Usuarios";
        if (location.pathname.startsWith("/profile")) return "Perfil";
        return "Dashboard";
    }, [location.pathname]);

    const sidebarWidth = collapsed ? "w-[68px]" : "w-64";

    // ── Sidebar content (shared mobile/desktop) ──
    const sidebarContent = (
        <div
            className="flex h-full flex-col text-white"
            style={{
                background: "linear-gradient(to bottom, #071428, #0c2240)",
            }}
        >
            {/* Brand */}
            <div
                className={`flex h-16 items-center border-b border-white/10 ${collapsed ? "justify-center px-2" : "justify-between px-5"}`}
            >
                {!collapsed ? (
                    <Link
                        to="/"
                        className="flex items-center gap-2"
                        onClick={closeMobile}
                    >
                        <img
                            src="/nextops-logo.svg"
                            alt="NextOps"
                            className="h-10 w-auto brightness-0 invert"
                        />
                    </Link>
                ) : (
                    <Link
                        to="/"
                        className="flex items-center"
                        onClick={closeMobile}
                    >
                        <Ship className="h-6 w-6 text-white" />
                    </Link>
                )}
                <button
                    className="lg:hidden text-white/70 hover:text-white"
                    onClick={closeMobile}
                    aria-label="Cerrar menú"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 py-2 pr-2 space-y-0.5">
                {/* Operations section */}
                <SectionLabel collapsed={collapsed}>Operaciones</SectionLabel>
                {operationsItems.map((item) => (
                    <NavItem
                        key={item.name}
                        item={item}
                        isActive={
                            item.href === "/"
                                ? location.pathname === "/"
                                : location.pathname === item.href ||
                                  location.pathname.startsWith(`${item.href}/`)
                        }
                        collapsed={collapsed}
                        onClick={closeMobile}
                    />
                ))}

                {/* Finance section */}
                {financeGroup && (
                    <>
                        <SectionLabel collapsed={collapsed}>
                            Finanzas
                        </SectionLabel>
                        <NavGroup
                            item={financeGroup}
                            location={location}
                            collapsed={collapsed}
                            onNavigate={closeMobile}
                        />
                    </>
                )}

                {/* Catalog section */}
                {catalogGroup && (
                    <>
                        <SectionLabel collapsed={collapsed}>
                            Configuración
                        </SectionLabel>
                        <NavGroup
                            item={catalogGroup}
                            location={location}
                            collapsed={collapsed}
                            onNavigate={closeMobile}
                        />
                    </>
                )}

                {/* Admin section */}
                {adminItems.length > 0 && (
                    <>
                        <SectionLabel collapsed={collapsed}>Admin</SectionLabel>
                        {adminItems.map((item) => (
                            <NavItem
                                key={item.name}
                                item={item}
                                isActive={location.pathname.startsWith(
                                    item.href,
                                )}
                                collapsed={collapsed}
                                onClick={closeMobile}
                            />
                        ))}
                    </>
                )}
            </nav>

            {/* Collapse toggle (desktop) */}
            <div className="hidden lg:block px-3 pb-2">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex w-full items-center justify-center rounded-lg py-1.5 text-primary-foreground/50 hover:bg-white/10 hover:text-white transition-colors"
                    title={collapsed ? "Expandir menú" : "Colapsar menú"}
                >
                    {collapsed ? (
                        <ChevronsRight className="h-4 w-4" />
                    ) : (
                        <ChevronsLeft className="h-4 w-4" />
                    )}
                </button>
            </div>

            {/* User section */}
            <div
                className={`border-t border-white/10 p-3 ${collapsed ? "flex flex-col items-center gap-2" : ""}`}
            >
                <Link
                    to="/profile"
                    onClick={closeMobile}
                    className={`flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/10 ${collapsed ? "justify-center" : ""}`}
                >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold uppercase text-white">
                        {user?.email?.[0] || "U"}
                    </div>
                    {!collapsed && (
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                                {user?.email}
                            </p>
                            <p className="truncate text-xs text-primary-foreground/50">
                                {user?.role_display || user?.role || "Usuario"}
                            </p>
                        </div>
                    )}
                </Link>
                <button
                    onClick={logout}
                    className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-primary-foreground/60 transition-colors hover:bg-white/10 hover:text-white ${collapsed ? "justify-center w-full" : "w-full mt-1"}`}
                    title="Cerrar sesión"
                >
                    <LogOut className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && <span>Cerrar sesión</span>}
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={closeMobile}
                />
            )}

            {/* Mobile sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                {sidebarContent}
            </aside>

            {/* Desktop sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 hidden lg:block ${sidebarWidth} transition-all duration-200`}
            >
                {sidebarContent}
            </aside>

            {/* Main content */}
            <div
                className={`transition-all duration-200 ${collapsed ? "lg:pl-[68px]" : "lg:pl-64"}`}
            >
                {/* Header */}
                <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border/60 bg-card/80 px-4 backdrop-blur-md sm:h-16 lg:px-8">
                    <button
                        className="lg:hidden"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Abrir menú"
                    >
                        <Menu className="h-5 w-5 text-foreground" />
                    </button>
                    <h1 className="text-base font-semibold text-foreground sm:text-lg">
                        {pageTitle}
                    </h1>
                </header>

                {/* Page */}
                <main className="p-4 sm:p-6 lg:p-8">{children}</main>
            </div>
        </div>
    );
}

Layout.propTypes = {
    children: PropTypes.node.isRequired,
};
