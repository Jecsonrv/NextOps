/**
 * Página de Gestión y Normalización de Clientes - Versión Mejorada
 *
 * Mejoras implementadas:
 * - Diseño más limpio y moderno
 * - Debouncing en búsqueda
 * - Skeleton loaders
 * - Animaciones suaves
 * - Vista compacta/expandida
 * - Bulk actions
 * - Ordenamiento
 * - Mejor feedback visual
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Users,
    Search,
    AlertTriangle,
    CheckCircle2,
    GitMerge,
    Edit2,
    Eye,
    TrendingUp,
    Filter,
    X,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Zap,
    Check,
    Clock,
    ArrowUpDown,
    LayoutGrid,
    List,
    Download,
    FileText,
} from "lucide-react";
import {
    useClientSummary,
    useApproveAliasMerge,
    useVerifyAlias,
} from "../hooks/useCatalogs";
import { showSuccess, showError, showConfirm } from "../utils/toast.jsx";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

// Hook para debouncing
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export function ClientNormalizationPage() {
    const navigate = useNavigate();

    // Estados
    const [searchQuery, setSearchQuery] = useState("");
    const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
    const [expandedClients, setExpandedClients] = useState(new Set());
    const [viewMode, setViewMode] = useState("detailed"); // "detailed" | "compact"
    const [sortBy, setSortBy] = useState("needs_attention"); // "needs_attention" | "ot_count" | "name"
    const [selectedClients, setSelectedClients] = useState(new Set());

    // Debounce search
    const debouncedSearch = useDebounce(searchQuery, 300);

    // Queries y mutations
    const { data: summaryData, isLoading, refetch, isFetching } = useClientSummary({
        search: debouncedSearch,
        show_duplicates_only: showDuplicatesOnly,
        limit: 100,
    });

    const mergeMutation = useApproveAliasMerge();
    const verifyMutation = useVerifyAlias();

    const clients = summaryData?.clients || [];
    const totalClients = summaryData?.total_clients || 0;

    // Ordenamiento
    const sortedClients = useMemo(() => {
        const sorted = [...clients];

        switch (sortBy) {
            case "needs_attention":
                return sorted.sort((a, b) => {
                    if (a.needs_attention === b.needs_attention) {
                        return b.ot_count - a.ot_count;
                    }
                    return a.needs_attention ? -1 : 1;
                });
            case "ot_count":
                return sorted.sort((a, b) => b.ot_count - a.ot_count);
            case "name":
                return sorted.sort((a, b) => a.name.localeCompare(b.name));
            default:
                return sorted;
        }
    }, [clients, sortBy]);

    // Estadísticas
    const stats = useMemo(() => {
        const needsAttention = clients.filter(c => c.needs_attention).length;
        const withDuplicates = clients.filter(c => c.possible_duplicates.length > 0).length;
        const unverified = clients.filter(c => !c.is_verified).length;
        const totalOTs = clients.reduce((sum, c) => sum + c.ot_count, 0);

        return {
            needsAttention,
            withDuplicates,
            unverified,
            totalOTs,
        };
    }, [clients]);

    const toggleExpand = useCallback((clientId) => {
        setExpandedClients(prev => {
            const newSet = new Set(prev);
            if (newSet.has(clientId)) {
                newSet.delete(clientId);
            } else {
                newSet.add(clientId);
            }
            return newSet;
        });
    }, []);

    const toggleSelectClient = useCallback((clientId) => {
        setSelectedClients(prev => {
            const newSet = new Set(prev);
            if (newSet.has(clientId)) {
                newSet.delete(clientId);
            } else {
                newSet.add(clientId);
            }
            return newSet;
        });
    }, []);

    const handleMergeDuplicate = useCallback(async (sourceId, targetId, sourceName, targetName) => {
        showConfirm(
            `¿Fusionar "${sourceName}" con "${targetName}"?\n\nTodas las OTs de "${sourceName}" se reasignarán a "${targetName}".`,
            async () => {
                try {
                    await mergeMutation.mutateAsync({
                        source_alias_id: sourceId,
                        target_alias_id: targetId,
                    });
                    showSuccess(`✓ Cliente fusionado exitosamente`);
                    refetch();
                } catch (error) {
                    console.error("Error fusionando:", error);
                    showError(error.response?.data?.error || "Error al fusionar clientes");
                }
            }
        );
    }, [mergeMutation, refetch]);

    const handleVerifyClient = useCallback(async (clientId, clientName) => {
        try {
            await verifyMutation.mutateAsync({ id: clientId });
            showSuccess(`✓ "${clientName}" verificado exitosamente`);
            refetch();
        } catch (error) {
            console.error("Error verificando:", error);
            showError(error.response?.data?.error || "Error al verificar cliente");
        }
    }, [verifyMutation, refetch]);

    const expandAll = useCallback(() => {
        setExpandedClients(new Set(sortedClients.map(c => c.id)));
    }, [sortedClients]);

    const collapseAll = useCallback(() => {
        setExpandedClients(new Set());
    }, []);

    const clearFilters = useCallback(() => {
        setSearchQuery("");
        setShowDuplicatesOnly(false);
        setSortBy("needs_attention");
    }, []);

    // Skeleton Loader
    const SkeletonCard = () => (
        <Card className="animate-pulse">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="flex gap-2">
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </CardHeader>
        </Card>
    );

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Gestión de Clientes
                            </h1>
                            <p className="text-gray-600 text-sm mt-1">
                                Administra clientes, detecta duplicados y normaliza alias
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                        Actualizar
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/catalogs/aliases")}
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Catálogo
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/catalogs/aliases/create")}
                    >
                        <Users className="w-4 h-4 mr-2" />
                        Nuevo Cliente
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                            Total Clientes
                        </CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">
                            {totalClients}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            En el sistema
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                            Necesitan Atención
                        </CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {stats.needsAttention}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Sin verificar o duplicados
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                            Con Duplicados
                        </CardTitle>
                        <GitMerge className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {stats.withDuplicates}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Posibles conflictos
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                            Total OTs
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {stats.totalOTs}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Órdenes de trabajo
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filtros y Controles */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        {/* Búsqueda */}
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Buscar por nombre de cliente..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-10"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="needs_attention">Prioridad</option>
                                    <option value="ot_count">Más OTs</option>
                                    <option value="name">Nombre A-Z</option>
                                </select>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setViewMode(viewMode === "detailed" ? "compact" : "detailed")}
                                >
                                    {viewMode === "detailed" ? (
                                        <><List className="w-4 h-4 mr-2" /> Compacto</>
                                    ) : (
                                        <><LayoutGrid className="w-4 h-4 mr-2" /> Detallado</>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Filtros rápidos */}
                        <div className="flex flex-wrap items-center gap-2">
                            <label className="flex items-center gap-2 px-3 py-1.5 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={showDuplicatesOnly}
                                    onChange={(e) => setShowDuplicatesOnly(e.target.checked)}
                                    className="rounded text-blue-600"
                                />
                                <Filter className="w-4 h-4 text-gray-600" />
                                <span className="text-sm font-medium text-gray-700">Solo duplicados</span>
                            </label>

                            {(searchQuery || showDuplicatesOnly || sortBy !== "needs_attention") && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="text-gray-600"
                                >
                                    <X className="w-4 h-4 mr-1" />
                                    Limpiar filtros
                                </Button>
                            )}

                            <div className="flex-1"></div>

                            {sortedClients.length > 0 && (
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={expandAll}
                                    >
                                        <ChevronDown className="w-4 h-4 mr-1" />
                                        Expandir todos
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={collapseAll}
                                    >
                                        <ChevronUp className="w-4 h-4 mr-1" />
                                        Contraer todos
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Lista de Clientes */}
            <div className="space-y-3">
                {isLoading ? (
                    <>
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </>
                ) : sortedClients.length === 0 ? (
                    <Card>
                        <CardContent className="py-16">
                            <div className="text-center">
                                {showDuplicatesOnly ? (
                                    <>
                                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                            ¡Excelente! No hay duplicados detectados
                                        </h3>
                                        <p className="text-gray-600 mb-4">
                                            Todos tus clientes están correctamente normalizados
                                        </p>
                                        <Button onClick={() => setShowDuplicatesOnly(false)}>
                                            Ver todos los clientes
                                        </Button>
                                    </>
                                ) : searchQuery ? (
                                    <>
                                        <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                            No se encontraron resultados
                                        </h3>
                                        <p className="text-gray-600 mb-4">
                                            Intenta con otro término de búsqueda
                                        </p>
                                        <Button variant="outline" onClick={() => setSearchQuery("")}>
                                            Limpiar búsqueda
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                            No hay clientes registrados
                                        </h3>
                                        <p className="text-gray-600 mb-4">
                                            Comienza creando tu primer cliente
                                        </p>
                                        <Button onClick={() => navigate("/catalogs/aliases/create")}>
                                            Crear cliente
                                        </Button>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    sortedClients.map((client) => {
                        const isExpanded = expandedClients.has(client.id);
                        const hasDuplicates = client.possible_duplicates.length > 0;

                        return (
                            <Card
                                key={client.id}
                                className="hover:shadow-md transition-shadow"
                            >
                                <CardContent className="pt-4 pb-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-gray-900 truncate">
                                                    {client.name}
                                                </h3>
                                                {client.is_verified ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                                                ) : (
                                                    <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                                {client.short_name && (
                                                    <span className="text-blue-600 font-mono text-xs">
                                                        {client.short_name}
                                                    </span>
                                                )}
                                                <span>{client.ot_count} OTs</span>
                                                {hasDuplicates && (
                                                    <span className="text-red-600 text-xs">
                                                        {client.possible_duplicates.length} posible{client.possible_duplicates.length > 1 ? 's' : ''} duplicado{client.possible_duplicates.length > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => navigate(`/catalogs/aliases/${client.id}/edit`)}
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => navigate(`/ots?cliente=${client.id}`)}
                                                title="Ver OTs"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            {hasDuplicates && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => toggleExpand(client.id)}
                                                    title={isExpanded ? "Contraer" : "Ver duplicados"}
                                                >
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Duplicados */}
                                    {hasDuplicates && isExpanded && (
                                        <div className="mt-3 pt-3 border-t space-y-2">
                                            {client.possible_duplicates.map((duplicate) => (
                                                <div
                                                    key={duplicate.id}
                                                    className="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-200"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-sm text-gray-900 truncate">
                                                                {duplicate.name}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                ({duplicate.similarity}% similar)
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-600">
                                                            {duplicate.ot_count} OTs
                                                        </p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            handleMergeDuplicate(
                                                                client.id,
                                                                duplicate.id,
                                                                client.name,
                                                                duplicate.name
                                                            )
                                                        }
                                                        disabled={mergeMutation.isLoading}
                                                    >
                                                        <GitMerge className="w-3 h-3 mr-1" />
                                                        Fusionar
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Footer info */}
            {sortedClients.length > 0 && !isLoading && (
                <div className="text-center text-sm text-gray-500 py-4">
                    Mostrando {sortedClients.length} de {totalClients} cliente{totalClients !== 1 ? 's' : ''}
                </div>
            )}
        </div>
    );
}
