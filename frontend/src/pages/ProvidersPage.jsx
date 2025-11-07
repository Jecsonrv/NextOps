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

export function ProvidersPage() {
    const navigate = useNavigate();

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
                `¿Estás seguro de eliminar el proveedor "${nombre}"?`
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Gestión de Proveedores
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Administra el catálogo de proveedores del sistema
                    </p>
                </div>
                <div className="flex gap-2">
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
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        className="flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Exportar
                    </Button>
                    <Button
                        onClick={() => navigate("/catalogs/providers/create")}
                        className="flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Proveedor
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                            Total Proveedores
                        </CardTitle>
                        <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                            {providersData?.count || 0}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            En el sistema
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                            Activos
                        </CardTitle>
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-green-600">
                            {providers.filter((p) => p.is_active).length}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Proveedores habilitados
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                            Navieras
                        </CardTitle>
                        <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                            {providers.filter((p) => p.tipo === "naviera").length}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Líneas navieras
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                            Transportistas
                        </CardTitle>
                        <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                            {providers.filter((p) => p.tipo === "transportista").length}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Empresas de transporte
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Búsqueda y Filtros */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        {/* Barra de búsqueda */}
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tipo
                                    </label>
                                    <select
                                        value={filters.tipo}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                "tipo",
                                                e.target.value
                                            )
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Categoría
                                    </label>
                                    <select
                                        value={filters.categoria}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                "categoria",
                                                e.target.value
                                            )
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Estado
                                    </label>
                                    <select
                                        value={filters.is_active}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                "is_active",
                                                e.target.value
                                            )
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                            <p className="mt-2 text-gray-600">
                                Cargando proveedores...
                            </p>
                        </div>
                    ) : providers.length === 0 ? (
                        <div className="text-center py-12">
                            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                                No hay proveedores
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
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
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Proveedor
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            NIT
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tipo
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Categoría
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Contacto
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Estado
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {providers.map((provider) => (
                                        <tr
                                            key={provider.id}
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {provider.nombre}
                                                        </div>
                                                        {provider.contacto && (
                                                            <div className="text-xs text-gray-500">
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
                                                <div className="text-sm font-mono text-gray-900">
                                                    {provider.nit || "-"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge
                                                    variant={getTipoBadgeColor(
                                                        provider.tipo
                                                    )}
                                                >
                                                    {provider.tipo_display}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm text-gray-900">
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
                                                <div className="text-sm text-gray-900">
                                                    {provider.email && (
                                                        <div className="flex items-center gap-1 mb-1">
                                                            <Mail className="w-3 h-3 text-gray-400" />
                                                            <span className="text-xs">
                                                                {provider.email}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {provider.telefono && (
                                                        <div className="flex items-center gap-1">
                                                            <Phone className="w-3 h-3 text-gray-400" />
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
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            navigate(
                                                                `/catalogs/providers/${provider.id}/edit`
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
                                                                provider.nombre
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                            <div className="flex items-center gap-4 text-sm text-gray-700">
                                <span>Página {filters.page} de {totalPages}</span>
                                <select
                                    value={filters.page_size}
                                    onChange={(e) => handleFilterChange('page_size', parseInt(e.target.value, 10))}
                                    className="px-2 py-1 border border-gray-300 rounded-md text-sm"
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
