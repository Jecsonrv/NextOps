/**
 * Página de gestión de Alias Cortos de Clientes
 *
 * Permite:
 * - Ver todos los aliases cortos autogenerados
 * - Editar alias cortos personalizados
 * - Regenerar aliases automáticamente
 * - Búsqueda y filtros
 */

import { useState, useMemo } from "react";
import {
    Search,
    Edit2,
    Check,
    X,
    RefreshCw,
    Zap,
    Filter,
    FileText,
    AlertCircle,
} from "lucide-react";
import {
    useClientAliases,
    useUpdateAlias,
    useGenerateShortNames,
    useRegenerateShortName,
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

export function ClientShortNamesPage() {
    // Estados
    const [filters, setFilters] = useState({
        search: "",
        country: "",
        has_short_name: "true", // Por defecto mostrar solo los que tienen
        page: 1,
        page_size: 50,
    });

    const [showFilters, setShowFilters] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState("");
    const [editError, setEditError] = useState("");

    // Queries
    const { data: aliasesData, isLoading } = useClientAliases(filters);
    const updateMutation = useUpdateAlias();
    const generateAllMutation = useGenerateShortNames();
    const regenerateMutation = useRegenerateShortName();

    const aliases = aliasesData?.results || [];
    const totalPages = aliasesData?.count
        ? Math.ceil(aliasesData.count / filters.page_size)
        : 1;

    // Estadísticas
    const stats = useMemo(() => {
        return {
            total: aliases.length,
            withShortName: aliases.filter((a) => a.short_name).length,
            withoutShortName: aliases.filter((a) => !a.short_name).length,
        };
    }, [aliases]);

    const handleSearch = (e) => {
        setFilters({ ...filters, search: e.target.value, page: 1 });
    };

    const handleFilterChange = (key, value) => {
        setFilters({ ...filters, [key]: value, page: 1 });
    };

    const startEdit = (alias) => {
        setEditingId(alias.id);
        setEditValue(alias.short_name || "");
        setEditError("");
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValue("");
        setEditError("");
    };

    const saveEdit = async (aliasId, originalName) => {
        // Validar
        const trimmed = editValue.trim().toUpperCase();

        if (!trimmed) {
            setEditError("El alias corto no puede estar vacío");
            return;
        }

        if (trimmed.length > 50) {
            setEditError("Máximo 50 caracteres");
            return;
        }

        if (!/^[A-Z0-9_]+$/.test(trimmed)) {
            setEditError("Solo letras mayúsculas, números y guión bajo (_)");
            return;
        }

        try {
            await updateMutation.mutateAsync({
                id: aliasId,
                data: { short_name: trimmed },
            });
            setEditingId(null);
            setEditValue("");
            setEditError("");
        } catch (error) {
            console.error("Error actualizando alias:", error);
            setEditError(
                error.response?.data?.short_name?.[0] || "Error al guardar"
            );
        }
    };

    const handleRegenerateOne = async (aliasId, originalName) => {
        showConfirm(
            `¿Regenerar automáticamente el alias para "${originalName}"?\n\nEsto reemplazará el alias actual.`,
            async () => {
                try {
                    await regenerateMutation.mutateAsync(aliasId);
                    showSuccess("Alias regenerado exitosamente");
                } catch (error) {
                    console.error("Error regenerando alias:", error);
                    showError("Error al regenerar el alias");
                }
            }
        );
    };

    const handleGenerateAll = async () => {
        showConfirm(
            "¿Generar aliases cortos para todos los clientes que no tienen uno?\n\nEsto puede tomar unos momentos.",
            async () => {
                try {
                    const result = await generateAllMutation.mutateAsync({
                        force: false,
                    });
                    showSuccess(
                        `Generación completada:\n\n` +
                            `Generados: ${result.generated}\n` +
                            `Omitidos: ${result.skipped}\n` +
                            `Errores: ${result.errors.length}`
                    );
                } catch (error) {
                    console.error("Error generando aliases:", error);
                    showError("Error al generar aliases");
                }
            }
        );
    };

    const clearFilters = () => {
        setFilters({
            search: "",
            country: "",
            has_short_name: "true",
            page: 1,
            page_size: 50,
        });
    };

    if (isLoading && !aliases.length) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                    <p className="mt-2 text-gray-600">Cargando aliases...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Alias Cortos de Clientes
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Gestiona los nombres cortos para usar en facturas y
                        documentos
                    </p>
                </div>
                <Button
                    onClick={handleGenerateAll}
                    className="flex items-center gap-2"
                    disabled={generateAllMutation.isLoading}
                >
                    <Zap className="w-4 h-4" />
                    {generateAllMutation.isLoading
                        ? "Generando..."
                        : "Generar Todos"}
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">
                                    Total Clientes
                                </p>
                                <p className="text-2xl font-bold">
                                    {aliasesData?.count || 0}
                                </p>
                            </div>
                            <FileText className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">
                                    Con Alias
                                </p>
                                <p className="text-2xl font-bold text-green-600">
                                    {stats.withShortName}
                                </p>
                            </div>
                            <Check className="w-8 h-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">
                                    Sin Alias
                                </p>
                                <p className="text-2xl font-bold text-orange-600">
                                    {stats.withoutShortName}
                                </p>
                            </div>
                            <AlertCircle className="w-8 h-8 text-orange-500" />
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
                                    placeholder="Buscar cliente o alias..."
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
                                {(filters.country ||
                                    filters.has_short_name !== "true") && (
                                    <Badge
                                        variant="destructive"
                                        className="ml-1"
                                    >
                                        {
                                            [
                                                filters.country,
                                                filters.has_short_name !==
                                                    "true",
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
                                        País
                                    </label>
                                    <Input
                                        type="text"
                                        placeholder="GT, SV, NI..."
                                        value={filters.country}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                "country",
                                                e.target.value
                                            )
                                        }
                                        maxLength={3}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Estado
                                    </label>
                                    <select
                                        value={filters.has_short_name}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                "has_short_name",
                                                e.target.value
                                            )
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="">Todos</option>
                                        <option value="true">
                                            Con alias corto
                                        </option>
                                        <option value="false">
                                            Sin alias corto
                                        </option>
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

            {/* Tabla de Aliases */}
            <Card>
                <CardHeader>
                    <CardTitle>Aliases de Clientes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Cliente
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Alias Corto
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        País
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Usos
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {aliases.map((alias) => (
                                    <tr
                                        key={alias.id}
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {alias.original_name}
                                                </span>
                                                {alias.is_verified && (
                                                    <Badge
                                                        variant="success"
                                                        className="w-fit mt-1"
                                                    >
                                                        Verificado
                                                    </Badge>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingId === alias.id ? (
                                                <div className="space-y-1">
                                                    <Input
                                                        type="text"
                                                        value={editValue}
                                                        onChange={(e) =>
                                                            setEditValue(
                                                                e.target.value.toUpperCase()
                                                            )
                                                        }
                                                        className={`text-sm ${
                                                            editError
                                                                ? "border-red-500"
                                                                : ""
                                                        }`}
                                                        maxLength={50}
                                                        autoFocus
                                                    />
                                                    {editError && (
                                                        <p className="text-xs text-red-500">
                                                            {editError}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : alias.short_name ? (
                                                <code className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm font-mono">
                                                    {alias.short_name}
                                                </code>
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">
                                                    Sin alias
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {alias.country ? (
                                                <Badge variant="secondary">
                                                    {alias.country}
                                                </Badge>
                                            ) : (
                                                <span className="text-sm text-gray-400">
                                                    -
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-gray-600">
                                                {alias.usage_count || 0}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                {editingId === alias.id ? (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            onClick={() =>
                                                                saveEdit(
                                                                    alias.id,
                                                                    alias.original_name
                                                                )
                                                            }
                                                            disabled={
                                                                updateMutation.isLoading
                                                            }
                                                            className="flex items-center gap-1"
                                                        >
                                                            <Check className="w-3 h-3" />
                                                            Guardar
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={cancelEdit}
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() =>
                                                                startEdit(alias)
                                                            }
                                                            title="Editar alias"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() =>
                                                                handleRegenerateOne(
                                                                    alias.id,
                                                                    alias.original_name
                                                                )
                                                            }
                                                            disabled={
                                                                regenerateMutation.isLoading
                                                            }
                                                            title="Regenerar automáticamente"
                                                        >
                                                            <RefreshCw className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {aliases.length === 0 && (
                            <div className="text-center py-12">
                                <FileText className="w-12 h-12 mx-auto text-gray-300" />
                                <p className="mt-2 text-gray-500">
                                    No se encontraron clientes
                                </p>
                                <p className="text-sm text-gray-400 mt-1">
                                    Intenta ajustar los filtros de búsqueda
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t">
                            <div className="text-sm text-gray-600">
                                Página {filters.page} de {totalPages}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
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
                                    variant="outline"
                                    size="sm"
                                    disabled={filters.page >= totalPages}
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
