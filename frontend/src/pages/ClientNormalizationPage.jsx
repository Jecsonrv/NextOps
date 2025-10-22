/**
 * Página de Normalización Inteligente de Clientes desde Facturas
 *
 * Permite:
 * - Detectar clientes únicos de facturas
 * - Agrupar variantes similares automáticamente
 * - Crear aliases masivamente
 * - Fusionar con clientes existentes
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Users,
    Search,
    Filter,
    GitMerge,
    PlusCircle,
    CheckCircle2,
    AlertTriangle,
    TrendingUp,
    FileText,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Sparkles,
    Download,
    X,
    Check,
} from "lucide-react";
import {
    useClientAliasesFromInvoices,
    useBulkCreateFromInvoices,
    useBulkMergeFromInvoices,
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

export function ClientNormalizationPage() {
    const navigate = useNavigate();

    // Estados
    const [threshold, setThreshold] = useState(85);
    const [limit, setLimit] = useState(50);
    const [includeExisting, setIncludeExisting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [editingGroup, setEditingGroup] = useState(null);
    const [editedCanonicalName, setEditedCanonicalName] = useState("");
    const [editedShortName, setEditedShortName] = useState("");

    // Queries y mutations
    const { data: invoicesData, isLoading, refetch } = useClientAliasesFromInvoices({
        threshold,
        limit,
        include_existing: includeExisting,
    });

    const createMutation = useBulkCreateFromInvoices();
    const mergeMutation = useBulkMergeFromInvoices();

    const groups = invoicesData?.groups || [];
    const totalUniqueNames = invoicesData?.total_unique_names || 0;
    const totalGroups = invoicesData?.total_groups || 0;

    // Filtrar grupos por búsqueda
    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return groups;

        const query = searchQuery.toLowerCase();
        return groups.filter(group =>
            group.canonical_name.toLowerCase().includes(query) ||
            group.suggested_short_name?.toLowerCase().includes(query) ||
            group.variants.some(v => v.name.toLowerCase().includes(query))
        );
    }, [groups, searchQuery]);

    // Estadísticas
    const stats = useMemo(() => {
        return {
            total_invoices: groups.reduce((sum, g) => sum + g.total_invoices, 0),
            to_create: groups.filter(g => g.recommendation === "create_new").length,
            to_merge: groups.filter(g => g.recommendation === "merge_with_existing").length,
        };
    }, [groups]);

    const toggleGroup = (index) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedGroups(newExpanded);
    };

    const expandAll = () => {
        setExpandedGroups(new Set(filteredGroups.map((_, i) => i)));
    };

    const collapseAll = () => {
        setExpandedGroups(new Set());
    };

    const startEdit = (group, index) => {
        setEditingGroup(index);
        setEditedCanonicalName(group.canonical_name);
        setEditedShortName(group.suggested_short_name || "");
    };

    const cancelEdit = () => {
        setEditingGroup(null);
        setEditedCanonicalName("");
        setEditedShortName("");
    };

    const handleCreateNew = async (group, customCanonicalName = null, customShortName = null) => {
        const canonicalName = customCanonicalName || group.canonical_name;
        const shortName = customShortName || group.suggested_short_name;
        const variants = group.variants.map(v => v.name);

        showConfirm(
            `¿Crear nuevo alias "${canonicalName}" para ${variants.length} variante(s) con ${group.total_invoices} factura(s)?`,
            async () => {
                try {
                    const result = await createMutation.mutateAsync({
                        canonical_name: canonicalName,
                        variants: variants,
                        short_name: shortName,
                        notes: `Creado desde normalización automática. Agrupa ${variants.length} variantes.`,
                    });

                    showSuccess(`Alias creado: ${result.alias.original_name}. ${result.invoices_updated} facturas actualizadas.`);
                    cancelEdit();
                    refetch();
                } catch (error) {
                    console.error("Error creando alias:", error);
                    showError(error.response?.data?.error || "Error al crear el alias");
                }
            }
        );
    };

    const handleMergeWithExisting = async (group) => {
        const existing = group.existing_alias;
        const variants = group.variants.map(v => v.name);

        showConfirm(
            `¿Fusionar ${variants.length} variante(s) con el alias existente "${existing.name}" (${existing.short_name})?`,
            async () => {
                try {
                    const result = await mergeMutation.mutateAsync({
                        target_alias_id: existing.id,
                        variants: variants,
                        notes: `Fusionado desde normalización. Similitud: ${existing.similarity}%`,
                    });

                    showSuccess(`Fusionado exitosamente. ${result.invoices_updated} facturas actualizadas.`);
                    refetch();
                } catch (error) {
                    console.error("Error fusionando:", error);
                    showError(error.response?.data?.error || "Error al fusionar");
                }
            }
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <Sparkles className="w-8 h-8 text-blue-600" />
                        Normalización Inteligente de Clientes
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Detecta y agrupa automáticamente variantes de clientes desde facturas
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => navigate("/catalogs/aliases")}
                    >
                        Ver Catálogo
                    </Button>
                    <Button
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        Actualizar
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Nombres Únicos</p>
                                <p className="text-2xl font-bold">{totalUniqueNames}</p>
                            </div>
                            <Users className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Grupos Detectados</p>
                                <p className="text-2xl font-bold text-purple-600">{totalGroups}</p>
                            </div>
                            <GitMerge className="w-8 h-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Facturas</p>
                                <p className="text-2xl font-bold text-green-600">{stats.total_invoices}</p>
                            </div>
                            <FileText className="w-8 h-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Para Normalizar</p>
                                <p className="text-2xl font-bold text-orange-600">{stats.to_create + stats.to_merge}</p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-orange-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Controles */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Umbral de Similitud: {threshold}%
                            </label>
                            <input
                                type="range"
                                min="70"
                                max="95"
                                step="5"
                                value={threshold}
                                onChange={(e) => setThreshold(Number(e.target.value))}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>70% (Flexible)</span>
                                <span>95% (Estricto)</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Máximo de Grupos: {limit}
                            </label>
                            <input
                                type="range"
                                min="10"
                                max="100"
                                step="10"
                                value={limit}
                                onChange={(e) => setLimit(Number(e.target.value))}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>10</span>
                                <span>100</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Opciones
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={includeExisting}
                                    onChange={(e) => setIncludeExisting(e.target.checked)}
                                    className="rounded"
                                />
                                <span className="text-sm text-gray-700">
                                    Incluir clientes ya registrados
                                </span>
                            </label>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Búsqueda y Acciones */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Buscar en grupos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button variant="outline" onClick={expandAll}>
                            Expandir Todos
                        </Button>
                        <Button variant="outline" onClick={collapseAll}>
                            Contraer Todos
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Lista de Grupos */}
            <div className="space-y-4">
                {isLoading ? (
                    <Card>
                        <CardContent className="py-12">
                            <div className="text-center">
                                <RefreshCw className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
                                <p className="text-gray-600">Analizando facturas y agrupando variantes...</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : filteredGroups.length === 0 ? (
                    <Card>
                        <CardContent className="py-12">
                            <div className="text-center">
                                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    {searchQuery ? "No se encontraron grupos" : "¡Todos los clientes están normalizados!"}
                                </h3>
                                <p className="text-gray-600">
                                    {searchQuery
                                        ? "Intenta con otro término de búsqueda o ajusta los filtros"
                                        : "No hay variantes de clientes pendientes de normalización"}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    filteredGroups.map((group, index) => {
                        const isExpanded = expandedGroups.has(index);
                        const isEditing = editingGroup === index;
                        const isCreateRecommended = group.recommendation === "create_new";

                        return (
                            <Card key={index} className={isExpanded ? "border-blue-200 shadow-md" : ""}>
                                <CardHeader className="cursor-pointer" onClick={() => !isEditing && toggleGroup(index)}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <CardTitle className="text-lg">
                                                    {isEditing ? (
                                                        <Input
                                                            value={editedCanonicalName}
                                                            onChange={(e) => setEditedCanonicalName(e.target.value)}
                                                            className="font-bold text-lg"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    ) : (
                                                        group.canonical_name
                                                    )}
                                                </CardTitle>
                                                {isCreateRecommended ? (
                                                    <Badge variant="success">
                                                        <PlusCircle className="w-3 h-3 mr-1" />
                                                        Crear Nuevo
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="warning">
                                                        <GitMerge className="w-3 h-3 mr-1" />
                                                        Fusionar Existente
                                                    </Badge>
                                                )}
                                            </div>
                                            <CardDescription>
                                                <div className="flex items-center gap-4 text-sm">
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-4 h-4" />
                                                        {group.variants.length} variante(s)
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <FileText className="w-4 h-4" />
                                                        {group.total_invoices} factura(s)
                                                    </span>
                                                    {isEditing ? (
                                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                            <span className="text-xs">Alias:</span>
                                                            <Input
                                                                value={editedShortName}
                                                                onChange={(e) => setEditedShortName(e.target.value.toUpperCase())}
                                                                className="h-6 text-xs font-mono w-40"
                                                                placeholder="ALIAS_CORTO"
                                                                maxLength={50}
                                                            />
                                                        </div>
                                                    ) : group.suggested_short_name && (
                                                        <code className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono">
                                                            {group.suggested_short_name}
                                                        </code>
                                                    )}
                                                </div>
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isExpanded && !isEditing && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            startEdit(group, index);
                                                        }}
                                                    >
                                                        Personalizar
                                                    </Button>
                                                    {isCreateRecommended ? (
                                                        <Button
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCreateNew(group);
                                                            }}
                                                            disabled={createMutation.isLoading}
                                                        >
                                                            <PlusCircle className="w-4 h-4 mr-1" />
                                                            Crear Alias
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="warning"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMergeWithExisting(group);
                                                            }}
                                                            disabled={mergeMutation.isLoading}
                                                        >
                                                            <GitMerge className="w-4 h-4 mr-1" />
                                                            Fusionar
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                            {isEditing && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCreateNew(group, editedCanonicalName, editedShortName);
                                                        }}
                                                        disabled={!editedCanonicalName.trim() || createMutation.isLoading}
                                                    >
                                                        <Check className="w-4 h-4 mr-1" />
                                                        Guardar
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            cancelEdit();
                                                        }}
                                                    >
                                                        <X className="w-4 h-4 mr-1" />
                                                        Cancelar
                                                    </Button>
                                                </>
                                            )}
                                            {!isEditing && (
                                                isExpanded ? (
                                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                                )
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>

                                {isExpanded && (
                                    <CardContent className="border-t">
                                        {/* Alias Existente (si aplica) */}
                                        {group.existing_alias && (
                                            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-medium text-yellow-900">
                                                            Alias Existente Detectado
                                                        </p>
                                                        <p className="text-sm text-yellow-700 mt-1">
                                                            <strong>{group.existing_alias.name}</strong> ({group.existing_alias.short_name}) - Similitud: {group.existing_alias.similarity}%
                                                        </p>
                                                    </div>
                                                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Lista de Variantes */}
                                        <div className="space-y-2">
                                            <h4 className="font-medium text-gray-700 text-sm mb-2">Variantes Detectadas:</h4>
                                            <div className="space-y-1">
                                                {group.variants.map((variant, vIndex) => (
                                                    <div
                                                        key={vIndex}
                                                        className={`flex items-center justify-between p-2 rounded ${
                                                            variant.is_canonical
                                                                ? "bg-blue-50 border border-blue-200"
                                                                : "bg-gray-50"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {variant.is_canonical && (
                                                                <Badge variant="primary" className="text-xs">
                                                                    Canónico
                                                                </Badge>
                                                            )}
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {variant.name}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-gray-600">
                                                            <span>{variant.invoice_count} factura(s)</span>
                                                            {!variant.is_canonical && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    {variant.similarity_to_canonical}% similar
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
