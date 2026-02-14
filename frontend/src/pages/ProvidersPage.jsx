/**
 * Página principal de gestión de Proveedores
 * Incluye tabla con filtros, búsqueda, paginación y acciones CRUD
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Plus,
    Search,
    Filter,
    Download,
    Upload,
    Edit,
    Trash2,
    CheckCircle,
    Building2,
    Phone,
    Mail,
} from "lucide-react";
import {
    useProviders,
    useProviderTypes,
    useProviderCategories,
    useDeleteProvider,
} from "../hooks/useCatalogs";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { usePermissions } from "../components/common/PermissionGate";
import { StatCard } from "../components/common/StatCard";

export function ProvidersPage() {
    const navigate = useNavigate();
    const { canEditCatalogs } = usePermissions();

    // Estados para filtros y búsqueda
    const [filters, setFilters] = useState({
        search: "",
        tipo: "",
        categoria: "",
        is_active: "",
        page: 1,
        page_size: 20,
    });

    const [showFilters, setShowFilters] = useState(false);

    // Queries
    const { data: providersData, isLoading } = useProviders(filters);
    const { data: types } = useProviderTypes();
    const { data: categories } = useProviderCategories();
    const deleteMutation = useDeleteProvider();

    const providers = providersData?.results || [];
    const totalPages = providersData?.count
        ? Math.ceil(providersData.count / filters.page_size)
        : 1;

    const handleSearch = (e) => {
        setFilters({ ...filters, search: e.target.value, page: 1 });
    };

    const handleFilterChange = (key, value) => {
        setFilters({ ...filters, [key]: value, page: 1 });
    };

    const handleDelete = async (id, nombre) => {
        if (
            !window.confirm(
                `¿Estás seguro de eliminar el proveedor "${nombre}"?`,
            )
        ) {
            return;
        }

        try {
            await deleteMutation.mutateAsync(id);
            alert("Proveedor eliminado exitosamente");
        } catch (error) {
            console.error("Error eliminando proveedor:", error);
            alert("Error al eliminar el proveedor");
        }
    };

    const handleExport = () => {
        // TODO: Implementar exportación a Excel
        alert("Exportación a Excel - Por implementar");
    };

    const handleImport = () => {
        navigate("/catalogs/providers/import");
    };

    const clearFilters = () => {
        setFilters({
            search: "",
            tipo: "",
            categoria: "",
            is_active: "",
            page: 1,
            page_size: 20,
        });
    };

    const getTipoBadgeColor = (tipo) => {
        const colors = {
            naviera: "blue",
            agente_local: "green",
            transportista: "purple",
            otro: "gray",
        };
        return colors[tipo] || "gray";
    };

    return (
        <div className="space-y-6">
            {/* Actions + Stats */}
            <div className="flex items-center justify-end gap-2">
                {canEditCatalogs && (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleImport}
                            className="flex items-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            Importar
                        </Button>
                        <Button
                            onClick={() =>
                                navigate("/catalogs/providers/create")
                            }
                            className="flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo Proveedor
                        </Button>
                    </>
                )}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="flex items-center gap-2"
                >
                    <Download className="w-4 h-4" />
                    Exportar
                </Button>
            </div>

            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Proveedores"
                    value={providersData?.count || 0}
                    icon={Building2}
                />
                <StatCard
                    label="Activos"
                    value={providers.filter((p) => p.is_active).length}
                    icon={CheckCircle}
                />
                <StatCard
                    label="Navieras"
                    value={providers.filter((p) => p.tipo === "naviera").length}
                    icon={Building2}
                />
                <StatCard
                    label="Transportistas"
                    value={
                        providers.filter((p) => p.tipo === "transportista")
                            .length
                    }
                    icon={Building2}
                />
            </div>

            {/* Búsqueda y Filtros */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        {/* Barra de búsqueda */}
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Buscar por nombre, NIT, email o contacto..."
                                    value={filters.search}
                                    onChange={handleSearch}
                                    className="pl-10"
                                />
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-2"
                            >
                                <Filter className="w-4 h-4" />
                                Filtros
                                {(filters.tipo ||
                                    filters.categoria ||
                                    filters.is_active) && (
                                    <Badge
                                        variant="destructive"
                                        className="ml-1"
                                    >
                                        {
                                            [
                                                filters.tipo,
                                                filters.categoria,
                                                filters.is_active,
                                            ].filter(Boolean).length
                                        }
                                    </Badge>
                                )}
                            </Button>
                        </div>

                        {/* Panel de filtros */}
                        {showFilters && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Tipo
                                    </label>
                                    <select
                                        value={filters.tipo}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                "tipo",
                                                e.target.value,
                                            )
                                        }
                                        className="w-full px-3 py-2 border border-border rounded-md"
                                    >
                                        <option value="">Todos</option>
                                        {types?.map((t) => (
                                            <option
                                                key={t.value}
                                                value={t.value}
                                            >
                                                {t.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Categoría
                                    </label>
                                    <select
                                        value={filters.categoria}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                "categoria",
                                                e.target.value,
                                            )
                                        }
                                        className="w-full px-3 py-2 border border-border rounded-md"
                                    >
                                        <option value="">Todas</option>
                                        {categories?.map((c) => (
                                            <option
                                                key={c.value}
                                                value={c.value}
                                            >
                                                {c.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Estado
                                    </label>
                                    <select
                                        value={filters.is_active}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                "is_active",
                                                e.target.value,
                                            )
                                        }
                                        className="w-full px-3 py-2 border border-border rounded-md"
                                    >
                                        <option value="">Todos</option>
                                        <option value="true">Activo</option>
                                        <option value="false">Inactivo</option>
                                    </select>
                                </div>

                                <div className="flex items-end">
                                    <Button
                                        variant="outline"
                                        onClick={clearFilters}
                                        className="w-full"
                                    >
                                        Limpiar Filtros
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Tabla de Proveedores */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        Proveedores ({providersData?.count || 0})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="mt-2 text-muted-foreground">
                                Cargando proveedores...
                            </p>
                        </div>
                    ) : providers.length === 0 ? (
                        <div className="text-center py-12">
                            <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-2 text-sm font-medium text-foreground">
                                No hay proveedores
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Comienza creando un nuevo proveedor
                            </p>
                            <div className="mt-6">
                                <Button
                                    onClick={() =>
                                        navigate("/catalogs/providers/create")
                                    }
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Nuevo Proveedor
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Proveedor
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            NIT
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Tipo
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Categoría
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Contacto
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Estado
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                    {providers.map((provider) => (
                                        <tr
                                            key={provider.id}
                                            className="hover:bg-muted transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <Building2 className="w-5 h-5 text-muted-foreground mr-3" />
                                                    <div>
                                                        <div className="text-sm font-medium text-foreground">
                                                            {provider.nombre}
                                                        </div>
                                                        {provider.contacto && (
                                                            <div className="text-xs text-muted-foreground">
                                                                Contacto:{" "}
                                                                {
                                                                    provider.contacto
                                                                }
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-mono text-foreground">
                                                    {provider.nit || "-"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge
                                                    variant={getTipoBadgeColor(
                                                        provider.tipo,
                                                    )}
                                                >
                                                    {provider.tipo_display}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm text-foreground">
                                                        {
                                                            provider.categoria_display
                                                        }
                                                    </span>
                                                    {provider.tiene_credito && (
                                                        <Badge variant="info">
                                                            Crédito:{" "}
                                                            {
                                                                provider.dias_credito
                                                            }{" "}
                                                            días
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-foreground">
                                                    {provider.email && (
                                                        <div className="flex items-center gap-1 mb-1">
                                                            <Mail className="w-3 h-3 text-muted-foreground" />
                                                            <span className="text-xs">
                                                                {provider.email}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {provider.telefono && (
                                                        <div className="flex items-center gap-1">
                                                            <Phone className="w-3 h-3 text-muted-foreground" />
                                                            <span className="text-xs">
                                                                {
                                                                    provider.telefono
                                                                }
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {provider.is_active ? (
                                                    <Badge variant="success">
                                                        Activo
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">
                                                        Inactivo
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {/* Solo Admin puede editar/eliminar proveedores */}
                                                {canEditCatalogs && (
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                navigate(
                                                                    `/catalogs/providers/${provider.id}/edit`,
                                                                )
                                                            }
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    provider.id,
                                                                    provider.nombre,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                            <div className="flex items-center gap-4 text-sm text-foreground">
                                <span>
                                    Página {filters.page} de {totalPages}
                                </span>
                                <select
                                    value={filters.page_size}
                                    onChange={(e) =>
                                        handleFilterChange(
                                            "page_size",
                                            parseInt(e.target.value, 10),
                                        )
                                    }
                                    className="px-2 py-1 border border-border rounded-md text-sm"
                                >
                                    <option value="20">20 / página</option>
                                    <option value="50">50 / página</option>
                                    <option value="100">100 / página</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={filters.page === 1}
                                    onClick={() =>
                                        setFilters({
                                            ...filters,
                                            page: filters.page - 1,
                                        })
                                    }
                                >
                                    Anterior
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={filters.page === totalPages}
                                    onClick={() =>
                                        setFilters({
                                            ...filters,
                                            page: filters.page + 1,
                                        })
                                    }
                                >
                                    Siguiente
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
