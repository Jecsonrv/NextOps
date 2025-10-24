/**
 * Página de gestión de Alias de Clientes
 * Gestiona la normalización de nombres de clientes y sus aliases cortos
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    Users,
    CheckCircle,
    Link2,
    AlertCircle,
    TrendingUp,
    X,
    Check,
    RefreshCw,
} from "lucide-react";
import {
    useClientAliases,
    useUpdateAlias,
    useVerifyAlias,
    useDeleteAlias,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/Select";

export function ClientAliasesPage() {
    const navigate = useNavigate();

    // Estados
    const [filters, setFilters] = useState({
        search: "",
        is_verified: "",
        has_merged: "",
        page: 1,
        page_size: 20,
    });

    const [showFilters, setShowFilters] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState("");
    const [editError, setEditError] = useState("");

    // Queries
    const { data: aliasesData, isLoading } = useClientAliases(filters);
    const updateMutation = useUpdateAlias();
    const verifyMutation = useVerifyAlias();
    const deleteMutation = useDeleteAlias();
    const regenerateMutation = useRegenerateShortName();

    const aliases = aliasesData?.results || [];
    const totalPages = aliasesData?.count
        ? Math.ceil(aliasesData.count / filters.page_size)
        : 1;

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

    const saveEdit = async (aliasId) => {
        const trimmed = editValue.trim().toUpperCase();

        if (!trimmed) {
            setEditError("El alias no puede estar vacío");
            return;
        }

        if (trimmed.length > 50) {
            setEditError("Máximo 50 caracteres");
            return;
        }

        if (!/^[A-Z0-9_ ]+$/.test(trimmed)) {
            setEditError(
                "Solo letras mayúsculas, números, espacios y guión bajo (_)"
            );
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

    const handleRegenerate = async (aliasId, originalName) => {
        showConfirm(
            `¿Regenerar automáticamente el alias para "${originalName}"?`,
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

    const handleVerify = async (id, aliasName) => {
        try {
            await verifyMutation.mutateAsync({ id });
            showSuccess(`Alias "${aliasName}" verificado exitosamente`);
        } catch (error) {
            console.error("Error verifying alias:", error);
            showError("Error al verificar el alias");
        }
    };

    const handleDelete = async (id, aliasName) => {
        showConfirm(
            `¿Estás seguro de eliminar el alias "${aliasName}"?`,
            async () => {
                try {
                    await deleteMutation.mutateAsync(id);
                    showSuccess("Alias eliminado exitosamente");
                } catch (error) {
                    console.error("Error eliminando alias:", error);
                    showError("Error al eliminar el alias");
                }
            }
        );
    };

    const clearFilters = () => {
        setFilters({
            search: "",
            is_verified: "",
            has_merged: "",
            page: 1,
            page_size: 20,
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Alias de Clientes
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Normaliza y gestiona variaciones de nombres de clientes
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => navigate("/catalogs/aliases/create")}
                        className="flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Alias
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">
                                    Total Alias
                                </p>
                                <p className="text-2xl font-bold">
                                    {aliasesData?.count || 0}
                                </p>
                            </div>
                            <Users className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">
                                    Verificados
                                </p>
                                <p className="text-2xl font-bold text-green-600">
                                    {
                                        aliases.filter((a) => a.is_verified)
                                            .length
                                    }
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
                                    Mergeados
                                </p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {
                                        aliases.filter((a) => a.merged_into)
                                            .length
                                    }
                                </p>
                            </div>
                            <Link2 className="w-8 h-8 text-purple-500" />
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
                                <p className="text-2xl font-bold text-blue-600">
                                    {aliases.reduce(
                                        (sum, a) => sum + (a.usage_count || 0),
                                        0
                                    )}
                                </p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-blue-500" />
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
                                    placeholder="Buscar por alias o cliente oficial..."
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
                                {(filters.is_verified ||
                                    filters.has_merged) && (
                                    <Badge
                                        variant="destructive"
                                        className="ml-1"
                                    >
                                        {
                                            [
                                                filters.is_verified,
                                                filters.has_merged,
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
                                        Verificación
                                    </label>
                                    <select
                                        value={filters.is_verified}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                "is_verified",
                                                e.target.value
                                            )
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="">Todos</option>
                                        <option value="true">Verificado</option>
                                        <option value="false">
                                            No verificado
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Estado de Merge
                                    </label>
                                    <select
                                        value={filters.has_merged}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                "has_merged",
                                                e.target.value
                                            )
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="">Todos</option>
                                        <option value="true">Mergeado</option>
                                        <option value="false">
                                            Independiente
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

            {/* Tabla de Alias */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        Alias Registrados ({aliasesData?.count || 0})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="mt-2 text-gray-600">
                                Cargando alias...
                            </p>
                        </div>
                    ) : aliases.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                                No hay alias registrados
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Comienza creando un nuevo alias
                            </p>
                            <div className="mt-6">
                                <Button
                                    onClick={() =>
                                        navigate("/catalogs/aliases/create")
                                    }
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Nuevo Alias
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Nombre del Cliente
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Alias
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Estado
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Usos
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {aliases.map((alias) => (
                                        <tr
                                            key={alias.id}
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            {/* Nombre del Cliente */}
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {alias.original_name}
                                                </div>
                                            </td>

                                            {/* Alias (Editable) */}
                                            <td className="px-6 py-4">
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
                                                            className={`text-sm max-w-xs ${
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

                                            {/* Estado */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {alias.merged_into ? (
                                                    <div>
                                                        <Badge variant="purple">
                                                            <Link2 className="w-3 h-3 mr-1" />
                                                            Mergeado
                                                        </Badge>
                                                    </div>
                                                ) : alias.is_verified ? (
                                                    <Badge variant="success">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Verificado
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="warning">
                                                        <AlertCircle className="w-3 h-3 mr-1" />
                                                        Pendiente
                                                    </Badge>
                                                )}
                                            </td>

                                            {/* Usos */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1 text-sm text-gray-900">
                                                    <TrendingUp className="w-4 h-4 text-gray-400" />
                                                    <span>
                                                        {alias.usage_count || 0}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Acciones */}
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {editingId === alias.id ? (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                onClick={() =>
                                                                    saveEdit(
                                                                        alias.id
                                                                    )
                                                                }
                                                                disabled={
                                                                    updateMutation.isLoading
                                                                }
                                                                title="Guardar"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={
                                                                    cancelEdit
                                                                }
                                                                title="Cancelar"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() =>
                                                                    startEdit(
                                                                        alias
                                                                    )
                                                                }
                                                                title="Editar alias"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() =>
                                                                    handleRegenerate(
                                                                        alias.id,
                                                                        alias.original_name
                                                                    )
                                                                }
                                                                disabled={
                                                                    regenerateMutation.isLoading
                                                                }
                                                                title="Regenerar"
                                                            >
                                                                <RefreshCw className="w-4 h-4" />
                                                            </Button>
                                                            {!alias.is_verified && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="success"
                                                                    onClick={() =>
                                                                        handleVerify(
                                                                            alias.id,
                                                                            alias.original_name
                                                                        )
                                                                    }
                                                                    title="Verificar"
                                                                >
                                                                    <CheckCircle className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        alias.id,
                                                                        alias.original_name
                                                                    )
                                                                }
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </>
                                                    )}
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
                                <Select
                                    value={filters.page_size.toString()}
                                    onValueChange={(value) => handleFilterChange('page_size', parseInt(value, 10))}
                                >
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="20">20 / página</SelectItem>
                                        <SelectItem value="50">50 / página</SelectItem>
                                        <SelectItem value="100">100 / página</SelectItem>
                                    </SelectContent>
                                </Select>
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
