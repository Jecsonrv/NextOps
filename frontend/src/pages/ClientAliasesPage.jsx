import { useQuery } from "@tanstack/react-query";
import apiClient from "../lib/api";

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
import { extractApiErrorMessage } from "../lib/errorMessages";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { StatCard } from "../components/common/StatCard";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/Select";

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
    const { data: stats } = useQuery({
        queryKey: ["client-aliases-stats", filters],
        queryFn: async () => {
            const params = new URLSearchParams(filters);
            const response = await apiClient.get(
                `/client-aliases/stats/?${params}`,
            );
            return response.data;
        },
    });
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
                "Solo letras mayúsculas, números, espacios y guión bajo (_)",
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
                extractApiErrorMessage(error, {
                    fallback: "Error al guardar el alias.",
                    fieldPriority: ["short_name", "original_name"],
                }),
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
            },
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
            },
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
            {/* Actions */}
            <div className="flex items-center justify-end">
                <Button
                    onClick={() => navigate("/catalogs/aliases/create")}
                    className="flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Alias
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Alias"
                    value={stats?.total_aliases || 0}
                    icon={Users}
                />
                <StatCard
                    label="Verificados"
                    value={stats?.verified_count || 0}
                    icon={CheckCircle}
                />
                <StatCard
                    label="Mergeados"
                    value={stats?.merged_count || 0}
                    icon={Link2}
                />
                <StatCard
                    label="Sugerencias Pendientes"
                    value={stats?.pending_matches || 0}
                    icon={AlertCircle}
                />
            </div>

            {/* Búsqueda y Filtros */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Verificación
                                    </label>
                                    <select
                                        value={filters.is_verified}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                "is_verified",
                                                e.target.value,
                                            )
                                        }
                                        className="w-full px-3 py-2 border border-border rounded-md"
                                    >
                                        <option value="">Todos</option>
                                        <option value="true">Verificado</option>
                                        <option value="false">
                                            No verificado
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Estado de Merge
                                    </label>
                                    <select
                                        value={filters.has_merged}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                "has_merged",
                                                e.target.value,
                                            )
                                        }
                                        className="w-full px-3 py-2 border border-border rounded-md"
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
                            <p className="mt-2 text-muted-foreground">
                                Cargando alias...
                            </p>
                        </div>
                    ) : aliases.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-2 text-sm font-medium text-foreground">
                                No hay alias registrados
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
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
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Nombre del Cliente
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Alias
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            NIT / NRC 🇸🇻
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Tipo Contribuyente
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Retención Renta/ISR 1%
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Estado
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Usos
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                    {aliases.map((alias) => (
                                        <tr
                                            key={alias.id}
                                            className="hover:bg-muted transition-colors"
                                        >
                                            {/* Nombre del Cliente */}
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-foreground">
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
                                                                    e.target.value.toUpperCase(),
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
                                                            <p className="text-xs text-destructive">
                                                                {editError}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : alias.short_name ? (
                                                    <code className="px-2 py-1 bg-primary/10 text-blue-700 rounded text-sm font-mono">
                                                        {alias.short_name}
                                                    </code>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground italic">
                                                        Sin alias
                                                    </span>
                                                )}
                                            </td>

                                            {/* NIT / NRC */}
                                            <td className="px-6 py-4">
                                                <div className="text-sm space-y-0.5">
                                                    {alias.nit && (
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-muted-foreground text-xs">
                                                                NIT:
                                                            </span>
                                                            <span className="text-foreground font-mono text-xs">
                                                                {alias.nit}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {alias.nrc && (
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-muted-foreground text-xs">
                                                                NRC:
                                                            </span>
                                                            <span className="text-foreground font-mono text-xs">
                                                                {alias.nrc}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {!alias.nit &&
                                                        !alias.nrc && (
                                                            <span className="text-muted-foreground italic text-xs">
                                                                Sin datos
                                                            </span>
                                                        )}
                                                </div>
                                            </td>

                                            {/* Tipo Contribuyente */}
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                                        alias.tipo_contribuyente ===
                                                        "gran_contribuyente"
                                                            ? "bg-purple-100 text-purple-800"
                                                            : alias.tipo_contribuyente ===
                                                                "contribuyente_normal"
                                                              ? "bg-primary/10 text-blue-800"
                                                              : alias.tipo_contribuyente ===
                                                                  "pequeño_contribuyente"
                                                                ? "bg-emerald-50 text-green-800"
                                                                : alias.tipo_contribuyente ===
                                                                    "regimen_simple"
                                                                  ? "bg-yellow-100 text-yellow-800"
                                                                  : "bg-muted text-foreground"
                                                    }`}
                                                >
                                                    {alias.tipo_contribuyente_display ||
                                                        "No especificado"}
                                                </span>
                                            </td>

                                            {/* Retención Renta/ISR */}
                                            <td className="px-6 py-4">
                                                {alias.aplica_retencion_iva ? (
                                                    <Badge
                                                        variant="warning"
                                                        className="text-xs font-semibold"
                                                    >
                                                        ⚠️ Retiene Renta/ISR 1%
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground italic text-xs">
                                                        No retiene
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
                                                <div className="flex items-center gap-1 text-sm text-foreground">
                                                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
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
                                                                        alias.id,
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
                                                                        alias,
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
                                                                        alias.original_name,
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
                                                                            alias.original_name,
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
                                                                        alias.original_name,
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
                        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                            <div className="flex items-center gap-4 text-sm text-foreground">
                                <span>
                                    Página {filters.page} de {totalPages}
                                </span>
                                <Select
                                    value={filters.page_size.toString()}
                                    onValueChange={(value) =>
                                        handleFilterChange(
                                            "page_size",
                                            parseInt(value, 10),
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="20">
                                            20 / página
                                        </SelectItem>
                                        <SelectItem value="50">
                                            50 / página
                                        </SelectItem>
                                        <SelectItem value="100">
                                            100 / página
                                        </SelectItem>
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
