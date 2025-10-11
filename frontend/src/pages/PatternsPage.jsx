/**
 * Página de gestión de Patrones Regex
 * Incluye testing interactivo, estadísticas de uso y gestión CRUD
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Plus,
    Search,
    Filter,
    Edit,
    Trash2,
    TestTube,
    TrendingUp,
    CheckCircle,
    Play,
    Code,
} from "lucide-react";
import {
    useRegexPatterns,
    usePatternCategories,
    useDeletePattern,
} from "../hooks/useCatalogs";
import { showSuccess, showError, showConfirm } from "../utils/toast.jsx";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { PatternTestModal } from "../components/catalogs/PatternTestModal";

export function PatternsPage() {
    const navigate = useNavigate();

    // Estados
    const [filters, setFilters] = useState({
        search: "",
        categoria: "",
        is_active: "",
        page: 1,
        page_size: 20,
    });

    const [showFilters, setShowFilters] = useState(false);
    const [testingPattern, setTestingPattern] = useState(null);

    // Queries
    const { data: patternsData, isLoading } = useRegexPatterns(filters);
    const { data: categories } = usePatternCategories();
    const deleteMutation = useDeletePattern();

    const patterns = patternsData?.results || [];
    const totalPages = patternsData?.count
        ? Math.ceil(patternsData.count / filters.page_size)
        : 1;

    const handleSearch = (e) => {
        setFilters({ ...filters, search: e.target.value, page: 1 });
    };

    const handleFilterChange = (key, value) => {
        setFilters({ ...filters, [key]: value, page: 1 });
    };

    const handleDelete = async (id, nombre) => {
        showConfirm(
            `¿Estás seguro de eliminar el patrón "${nombre}"?`,
            async () => {
                try {
                    await deleteMutation.mutateAsync(id);
                    showSuccess("Patrón eliminado exitosamente");
                } catch (error) {
                    console.error("Error eliminando patrón:", error);
                    showError("Error al eliminar el patrón");
                }
            }
        );
    };

    const clearFilters = () => {
        setFilters({
            search: "",
            categoria: "",
            is_active: "",
            page: 1,
            page_size: 20,
        });
    };

    const getCategoryBadgeColor = (categoria) => {
        const colors = {
            numero_factura: "blue",
            fecha: "green",
            monto: "purple",
            proveedor: "orange",
            otro: "gray",
        };
        return colors[categoria] || "gray";
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Patrones de Extracción
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Administra patrones regex para extracción automática de
                        datos
                    </p>
                </div>
                <Button
                    onClick={() => navigate("/catalogs/patterns/create")}
                    className="flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Patrón
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">
                                    Total Patrones
                                </p>
                                <p className="text-2xl font-bold">
                                    {patternsData?.count || 0}
                                </p>
                            </div>
                            <Code className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Activos</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {patterns.filter((p) => p.is_active).length}
                                </p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">
                                    Total Usos
                                </p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {patterns.reduce(
                                        (sum, p) => sum + (p.usage_count || 0),
                                        0
                                    )}
                                </p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">
                                    Promedio Éxito
                                </p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {patterns.length > 0
                                        ? Math.round(
                                              patterns.reduce(
                                                  (sum, p) =>
                                                      sum +
                                                      (p.success_rate || 0),
                                                  0
                                              ) / patterns.length
                                          )
                                        : 0}
                                    %
                                </p>
                            </div>
                            <TestTube className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Búsqueda y Filtros */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Buscar por nombre o descripción..."
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
                                {(filters.categoria || filters.is_active) && (
                                    <Badge
                                        variant="destructive"
                                        className="ml-1"
                                    >
                                        {
                                            [
                                                filters.categoria,
                                                filters.is_active,
                                            ].filter(Boolean).length
                                        }
                                    </Badge>
                                )}
                            </Button>
                        </div>

                        {showFilters && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
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

            {/* Tabla de Patrones */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        Patrones Regex ({patternsData?.count || 0})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="mt-2 text-gray-600">
                                Cargando patrones...
                            </p>
                        </div>
                    ) : patterns.length === 0 ? (
                        <div className="text-center py-12">
                            <Code className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                                No hay patrones
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Comienza creando un nuevo patrón
                            </p>
                            <div className="mt-6">
                                <Button
                                    onClick={() =>
                                        navigate("/catalogs/patterns/create")
                                    }
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Nuevo Patrón
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Patrón
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Categoría
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Expresión Regular
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Estadísticas
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
                                    {patterns.map((pattern) => (
                                        <tr
                                            key={pattern.id}
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {pattern.nombre}
                                                    </div>
                                                    {pattern.descripcion && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {pattern.descripcion
                                                                .length > 60
                                                                ? `${pattern.descripcion.slice(
                                                                      0,
                                                                      60
                                                                  )}...`
                                                                : pattern.descripcion}
                                                        </div>
                                                    )}
                                                    {pattern.prioridad > 0 && (
                                                        <Badge
                                                            variant="warning"
                                                            className="mt-1"
                                                        >
                                                            Prioridad:{" "}
                                                            {pattern.prioridad}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge
                                                    variant={getCategoryBadgeColor(
                                                        pattern.categoria
                                                    )}
                                                >
                                                    {pattern.categoria_display}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                                                    {pattern.patron &&
                                                    pattern.patron.length > 40
                                                        ? `${pattern.patron.slice(
                                                              0,
                                                              40
                                                          )}...`
                                                        : pattern.patron || "-"}
                                                </code>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-xs text-gray-900">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <TrendingUp className="w-3 h-3 text-gray-400" />
                                                        <span>
                                                            {pattern.usage_count ||
                                                                0}{" "}
                                                            usos
                                                        </span>
                                                    </div>
                                                    {pattern.success_rate !==
                                                        null && (
                                                        <div className="flex items-center gap-2">
                                                            <TestTube className="w-3 h-3 text-gray-400" />
                                                            <span>
                                                                {
                                                                    pattern.success_rate
                                                                }
                                                                % éxito
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {pattern.is_active ? (
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
                                                            setTestingPattern(
                                                                pattern
                                                            )
                                                        }
                                                        title="Probar patrón"
                                                    >
                                                        <Play className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            navigate(
                                                                `/catalogs/patterns/${pattern.id}/edit`
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
                                                                pattern.id,
                                                                pattern.nombre
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
                            <div className="text-sm text-gray-700">
                                Página {filters.page} de {totalPages}
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

            {/* Modal de Testing */}
            {testingPattern && (
                <PatternTestModal
                    pattern={testingPattern}
                    onClose={() => setTestingPattern(null)}
                />
            )}
        </div>
    );
}
