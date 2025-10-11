import { Link, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../../hooks/useAuth";
import {
    LayoutDashboard,
    FileText,
    Truck,
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
} from "lucide-react";
import { Button } from "../ui/Button";
import { useState } from "react";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "OTs", href: "/ots", icon: Truck },
    { name: "Facturas", href: "/invoices", icon: FileText },
    { name: "Clientes", href: "/clients", icon: Users },
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
                name: "Patrones Proveedor",
                href: "/catalogs/provider-patterns",
                icon: Regex,
            },
            {
                name: "Campos Objetivo",
                href: "/catalogs/target-fields",
                icon: Target,
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
    { name: "Automatización", href: "/automation", icon: Mail },
];

export function Layout({ children }) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [catalogsOpen, setCatalogsOpen] = useState(
        location.pathname.startsWith("/catalogs")
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 
          transform transition-transform duration-200 ease-in-out lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
                        <h1 className="text-xl font-bold text-blue-600">
                            NextOps
                        </h1>
                        <button
                            className="lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        {navigation.map((item) => {
                            // Handle parent items with children (Catalogs)
                            if (item.children) {
                                const isAnyCatalogActive =
                                    location.pathname.startsWith("/catalogs");
                                return (
                                    <div key={item.name}>
                                        <button
                                            onClick={() =>
                                                setCatalogsOpen(!catalogsOpen)
                                            }
                                            className={`
                                                w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-lg transition-colors
                                                ${
                                                    isAnyCatalogActive
                                                        ? "bg-blue-50 text-blue-600"
                                                        : "text-gray-700 hover:bg-gray-100"
                                                }
                                            `}
                                        >
                                            <div className="flex items-center">
                                                <item.icon className="w-5 h-5 mr-3" />
                                                {item.name}
                                            </div>
                                            {catalogsOpen ? (
                                                <ChevronDown className="w-4 h-4" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4" />
                                            )}
                                        </button>

                                        {/* Submenu */}
                                        {catalogsOpen && (
                                            <div className="ml-4 mt-1 space-y-1">
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
                                                                flex items-center px-4 py-2 text-sm rounded-lg transition-colors
                                                                ${
                                                                    isActive
                                                                        ? "bg-blue-100 text-blue-700 font-medium"
                                                                        : "text-gray-600 hover:bg-gray-50"
                                                                }
                                                            `}
                                                            onClick={() =>
                                                                setSidebarOpen(
                                                                    false
                                                                )
                                                            }
                                                        >
                                                            <child.icon className="w-4 h-4 mr-2" />
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
                                        flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors
                                        ${
                                            isActive
                                                ? "bg-blue-50 text-blue-600"
                                                : "text-gray-700 hover:bg-gray-100"
                                        }
                                    `}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <item.icon className="w-5 h-5 mr-3" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User info */}
                    <div className="p-4 border-t border-gray-200">
                        <div className="flex items-center mb-3">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                    {user?.email}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {user?.role || "Usuario"}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={logout}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Cerrar sesión
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:pl-64">
                {/* Header */}
                <header className="sticky top-0 z-30 flex items-center h-16 px-4 bg-white border-b border-gray-200 lg:px-8">
                    <button
                        className="lg:hidden mr-4"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="flex-1">
                        <h2 className="text-lg font-semibold text-gray-900">
                            {(() => {
                                // Find navigation item for current page
                                const currentNav = navigation.find(
                                    (item) => item.href === location.pathname
                                );
                                if (currentNav) return currentNav.name;

                                // Check if in catalogs section
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

                                return "Dashboard";
                            })()}
                        </h2>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 lg:p-8">{children}</main>
            </div>
        </div>
    );
}

Layout.propTypes = {
    children: PropTypes.node.isRequired,
};
