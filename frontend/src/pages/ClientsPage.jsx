import PropTypes from "prop-types";
import { useState, useMemo } from "react";
import {
    Users,
    TrendingUp,
    Search,
    AlertCircle,
    CheckCircle2,
    FileText,
    RefreshCw,
    BarChart3,
    CheckCircle,
    Clock,
    Globe,
    Package,
    XCircle,
    Edit,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { NormalizationModal } from "../components/NormalizationModal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { showConfirm } from "../utils/toast";
import { InputDialog } from "../components/ui/InputDialog";
import {
    useSuggestAllMatches,
    useApplyNormalization,
    useSimilarityMatches,
    useClientAliases,
    useClientAliasStats,
    useRejectMerge,
    useRenameClient,
} from "../hooks/useCatalogs";

// ============================================
// COMPONENTES DE TABS
// ============================================

function OverviewTab({
    aliases,
    pendingMatches,
    approvedMatches,
    stats,
    onNavigate,
}) {
    const topAliases = useMemo(() => {
        return [...aliases]
            .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
            .slice(0, 8);
    }, [aliases]);

    const totalAliases = stats?.total_aliases || aliases.length;
    const normalizedRatio = totalAliases
        ? Math.round(
              ((stats?.approved_matches || approvedMatches.length) /
                  totalAliases) *
                  100
          )
        : 0;
    const pendingRatio = totalAliases
        ? Math.round(
              ((stats?.pending_matches || pendingMatches.length) /
                  totalAliases) *
                  100
          )
        : 0;

    return (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">
                            Sugerencias Pendientes
                        </CardTitle>
                        {pendingMatches.length > 0 && (
                            <Button size="sm" onClick={onNavigate}>
                                Ver todas
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {pendingMatches.length === 0 ? (
                            <div className="py-10 text-center text-sm text-gray-500">
                                No hay sugerencias en espera.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingMatches.slice(0, 5).map((match) => {
                                    const alias1Name =
                                        match.alias_1?.original_name ||
                                        "Cliente";
                                    const alias2Name =
                                        match.alias_2?.original_name ||
                                        "Cliente";
                                    const similarity = Math.round(
                                        match.similarity_score || 0
                                    );

                                    return (
                                        <div
                                            key={match.id}
                                            className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-3"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {alias1Name}
                                                    </p>
                                                    <p className="mt-1 text-sm text-gray-600">
                                                        ≈ {alias2Name}
                                                    </p>
                                                </div>
                                                <Badge variant="warning">
                                                    {similarity}%
                                                </Badge>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Normalizaciones recientes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {approvedMatches.length === 0 ? (
                            <div className="py-10 text-center text-sm text-gray-500">
                                Todavía no hay fusiones aprobadas.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {approvedMatches.slice(0, 5).map((match) => {
                                    const originAlias =
                                        match.alias_1?.original_name ||
                                        "Cliente";
                                    const targetAlias =
                                        match.alias_2?.original_name ||
                                        "Cliente";

                                    return (
                                        <div
                                            key={match.id}
                                            className="rounded-lg border border-green-200 bg-green-50 px-3 py-3"
                                        >
                                            <div className="flex items-start gap-3">
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                                <div className="flex-1 text-sm text-gray-700">
                                                    <p className="font-semibold text-gray-900">
                                                        {originAlias}
                                                    </p>
                                                    <p className="text-xs text-gray-600">
                                                        -&gt; {targetAlias}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Clientes Principales
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topAliases.length === 0 ? (
                            <div className="py-10 text-center text-sm text-gray-500">
                                Sin actividad registrada aún.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {topAliases.map((alias) => (
                                    <div
                                        key={alias.id}
                                        className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-3 transition-colors hover:bg-gray-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Globe className="h-5 w-5 text-gray-400" />
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {alias.original_name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {alias.usage_count?.toLocaleString(
                                                        "es-MX"
                                                    ) || 0}{" "}
                                                    OTs
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="secondary">
                                            {alias.usage_count?.toLocaleString(
                                                "es-MX"
                                            ) || 0}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Indicadores</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 text-sm text-gray-700">
                            <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2">
                                <span>Total de clientes</span>
                                <span className="font-semibold text-blue-700">
                                    {totalAliases.toLocaleString("es-MX")}
                                </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2">
                                <span>% normalizados</span>
                                <span className="font-semibold text-green-700">
                                    {normalizedRatio}%
                                </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-yellow-50 px-3 py-2">
                                <span>% pendientes</span>
                                <span className="font-semibold text-yellow-700">
                                    {pendingRatio}%
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

OverviewTab.propTypes = {
    aliases: PropTypes.array.isRequired,
    pendingMatches: PropTypes.array.isRequired,
    approvedMatches: PropTypes.array.isRequired,
    stats: PropTypes.object,
    onNavigate: PropTypes.func.isRequired,
};

function PendingTab({ matches, onApprove, onReject, isLoading }) {
    if (matches.length === 0) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            ¡Todo al día!
                        </h3>
                        <p className="mt-2 text-sm text-gray-600">
                            No hay sugerencias de duplicados pendientes de
                            revisión.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {matches.map((match) => {
                const alias1Name = match.alias_1?.original_name || "Cliente";
                const alias2Name = match.alias_2?.original_name || "Cliente";
                const alias1Count = match.alias_1?.usage_count || 0;
                const alias2Count = match.alias_2?.usage_count || 0;
                const similarity = Math.round(match.similarity_score || 0);

                return (
                    <Card
                        key={match.id}
                        className="border-yellow-200 bg-yellow-50/30"
                    >
                        <CardContent className="pt-6">
                            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">
                                                {alias1Name}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {alias1Count.toLocaleString(
                                                    "es-MX"
                                                )}{" "}
                                                OTs
                                            </p>
                                        </div>
                                    </div>
                                    <div className="pl-8 text-sm text-gray-500">
                                        ≈ Similar a
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Package className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">
                                                {alias2Name}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {alias2Count.toLocaleString(
                                                    "es-MX"
                                                )}{" "}
                                                OTs
                                            </p>
                                        </div>
                                    </div>
                                    <div className="pl-8">
                                        <Badge
                                            variant="warning"
                                            className="text-sm"
                                        >
                                            Similitud: {similarity}%
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                                    <Button
                                        size="sm"
                                        onClick={() => onApprove(match)}
                                        disabled={isLoading}
                                        className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Aprobar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onReject(match)}
                                        disabled={isLoading}
                                        className="flex-1 sm:flex-none"
                                    >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Rechazar
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

PendingTab.propTypes = {
    matches: PropTypes.array.isRequired,
    onApprove: PropTypes.func.isRequired,
    onReject: PropTypes.func.isRequired,
    isLoading: PropTypes.bool,
};

function ApprovedTab({ matches, isLoading }) {
    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-2 text-sm text-gray-600">
                            Cargando...
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (matches.length === 0) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            Sin normalizaciones
                        </h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Aún no hay clientes normalizados.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {matches.map((match) => {
                const originAlias = match.alias_1?.original_name || "Cliente";
                const targetAlias = match.alias_2?.original_name || "Cliente";

                return (
                    <Card
                        key={match.id}
                        className="border-green-200 bg-green-50/30"
                    >
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 space-y-2">
                                    <div className="text-sm text-gray-700">
                                        <p className="font-semibold text-gray-900">
                                            {originAlias}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                            -&gt; {targetAlias}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant="success"
                                            className="text-xs"
                                        >
                                            Aprobado
                                        </Badge>
                                        {match.notes && (
                                            <p className="text-xs text-gray-500">
                                                {match.notes}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

ApprovedTab.propTypes = {
    matches: PropTypes.array.isRequired,
    isLoading: PropTypes.bool,
};

function AllAliasesTab({
    aliases,
    searchTerm,
    setSearchTerm,
    isLoading,
    onRename,
}) {
    const filteredAliases = useMemo(() => {
        return [...aliases]
            .filter((alias) =>
                alias.original_name
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
    }, [aliases, searchTerm]);

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Buscar cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    {searchTerm && (
                        <p className="mt-2 text-xs text-gray-500">
                            Mostrando resultados para: {searchTerm}
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>
                        Todos los Clientes ({filteredAliases.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="py-12 text-center text-sm text-gray-600">
                            <div className="mx-auto mb-3 inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                            Cargando clientes...
                        </div>
                    ) : filteredAliases.length === 0 ? (
                        <div className="py-12 text-center text-sm text-gray-600">
                            <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                            {searchTerm
                                ? "No encontramos coincidencias para tu búsqueda."
                                : "Aún no hay clientes en el sistema."}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Cliente
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            OTs
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {filteredAliases.map((alias) => (
                                        <tr
                                            key={alias.id}
                                            className="transition-colors hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Globe className="h-5 w-5 text-gray-400" />
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {alias.original_name}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="secondary">
                                                    {alias.usage_count?.toLocaleString(
                                                        "es-MX"
                                                    ) || 0}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        onRename(alias)
                                                    }
                                                >
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Renombrar
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

AllAliasesTab.propTypes = {
    aliases: PropTypes.array.isRequired,
    searchTerm: PropTypes.string.isRequired,
    setSearchTerm: PropTypes.func.isRequired,
    isLoading: PropTypes.bool,
    onRename: PropTypes.func.isRequired,
};

export default function ClientsPage() {
    // Estados
    const [activeTab, setActiveTab] = useState("overview");
    const [searchTerm, setSearchTerm] = useState("");
    const aliasFilters = useMemo(
        () => ({
            merged: "false",
            has_ots: "true",
            page_size: 10000,
        }),
        []
    );
    const [normalizationModal, setNormalizationModal] = useState({
        isOpen: false,
        sourceAlias: null,
        targetAlias: null,
        similarityScore: 0,
        matchId: null,
    });

    // Dialogs
    const [detectDialog, setDetectDialog] = useState({ isOpen: false });
    const [rejectDialog, setRejectDialog] = useState({
        isOpen: false,
        match: null,
    });
    const [resultDialog, setResultDialog] = useState({
        isOpen: false,
        title: "",
        message: "",
    });
    const [renameDialog, setRenameDialog] = useState({
        isOpen: false,
        alias: null,
    });

    // Queries - datos reales de la BD
    const {
        data: aliasesData,
        isLoading: loadingAliases,
        refetch: refetchAliases,
    } = useClientAliases(aliasFilters);

    const {
        data: matchesData,
        isLoading: loadingMatches,
        refetch: refetchMatches,
    } = useSimilarityMatches({
        status: activeTab === "pending" ? "pending" : undefined,
        page_size: "1000", // Traer todos los matches
    });

    const { data: stats, refetch: refetchStats } = useClientAliasStats();

    // Mutations
    const suggestMatches = useSuggestAllMatches();
    const applyNormalization = useApplyNormalization();
    const rejectMerge = useRejectMerge();
    const renameClient = useRenameClient();

    // Datos procesados
    const aliases = useMemo(() => {
        const list = aliasesData?.results || [];
        return list.filter((alias) => (alias.usage_count || 0) > 0);
    }, [aliasesData]);
    const matches = matchesData?.results || [];

    // Filtrar pendientes: solo mostrar si AMBOS clientes NO están fusionados
    const pendingMatches = matches.filter(
        (m) =>
            m.status === "pending" &&
            !m.alias_1.merged_into &&
            !m.alias_2.merged_into
    );
    const approvedMatches = matches.filter((m) => m.status === "approved");

    // Handler: Detección masiva
    const handleDetectDuplicates = () => {
        setDetectDialog({ isOpen: true });
    };

    const confirmDetectDuplicates = async () => {
        setDetectDialog({ isOpen: false });

        try {
            const result = await suggestMatches.mutateAsync({
                threshold: 85,
                limit_per_alias: 5,
            });

            setResultDialog({
                isOpen: true,
                title: "✅ Análisis Completado",
                message: `Clientes analizados: ${result.total_aliases_analyzed}\nNuevas sugerencias: ${result.suggestions_created}\nYa existían: ${result.suggestions_skipped}`,
            });

            refetchMatches();
            refetchStats();
            setActiveTab("pending");
        } catch (error) {
            setResultDialog({
                isOpen: true,
                title: "❌ Error",
                message: error.response?.data?.error || error.message,
            });
        }
    };

    // Handler: Aprobar normalización
    const handleApproveMatch = (match) => {
        const alias1Uses = match.alias_1.usage_count || 0;
        const alias2Uses = match.alias_2.usage_count || 0;

        // El que tiene MENOS OTs es el "actual" (se unificará hacia el otro)
        // El que tiene MÁS OTs es el "similar" (se mantiene)
        const sourceAlias =
            alias1Uses <= alias2Uses ? match.alias_1 : match.alias_2;
        const targetAlias =
            alias1Uses > alias2Uses ? match.alias_1 : match.alias_2;

        setNormalizationModal({
            isOpen: true,
            sourceAlias, // Cliente ACTUAL (menos OTs)
            targetAlias, // Cliente SIMILAR (más OTs, se mantiene)
            similarityScore: match.similarity_score,
            matchId: match.id,
        });
    };

    // Handler: Rechazar sugerencia
    const handleRejectMatch = (match) => {
        setRejectDialog({ isOpen: true, match });
    };

    const confirmRejectMatch = async (reason) => {
        const match = rejectDialog.match;
        setRejectDialog({ isOpen: false, match: null });

        try {
            await rejectMerge.mutateAsync({
                alias_1_id: match.alias_1.id,
                alias_2_id: match.alias_2.id,
                notes: reason || "Sin razón",
            });

            setResultDialog({
                isOpen: true,
                title: "✅ Sugerencia Rechazada",
                message:
                    "La sugerencia de duplicado ha sido rechazada exitosamente.",
            });

            refetchMatches();
            refetchStats();
        } catch (error) {
            setResultDialog({
                isOpen: true,
                title: "❌ Error",
                message: error.response?.data?.error || error.message,
            });
        }
    };

    // Handler: Confirmar normalización
    const handleConfirmNormalization = async ({
        notes,
        sourceAliasId,
        targetAliasId,
        customTargetName,
        finalDisplayName,
    }) => {
        try {
            const result = await applyNormalization.mutateAsync({
                source_alias_id: sourceAliasId,
                target_alias_id: targetAliasId,
                notes,
                custom_target_name: customTargetName || undefined,
            });

            setNormalizationModal({
                isOpen: false,
                sourceAlias: null,
                targetAlias: null,
                similarityScore: 0,
                matchId: null,
            });

            setResultDialog({
                isOpen: true,
                title: "✅ " + result.message,
                message: `OTs actualizadas: ${
                    result.ots_updated
                }\nCliente final: ${
                    result.final_target_name ||
                    result.target_alias?.original_name ||
                    finalDisplayName
                }`,
            });

            refetchAliases();
            refetchMatches();
            refetchStats();
        } catch (error) {
            setResultDialog({
                isOpen: true,
                title: "❌ Error",
                message: error.response?.data?.error || error.message,
            });
        }
    };

    const handleRename = (alias) => {
        setRenameDialog({ isOpen: true, alias });
    };

    const confirmRename = async (newName) => {
        const alias = renameDialog.alias;
        setRenameDialog({ isOpen: false, alias: null });

        try {
            const result = await renameClient.mutateAsync({
                aliasId: alias.id,
                new_name: newName,
                notes: `Renombrado desde la página de Clientes.`,
            });

            if (result.status === "conflict") {
                // Conflicto de duplicado
                showConfirm(
                    `Ya existe un cliente con el nombre "${newName}". ¿Deseas fusionar "${alias.original_name}" con "${newName}"?`,
                    () => {
                        handleConfirmNormalization({
                            sourceAliasId: alias.id,
                            targetAliasId: result.existing_alias_id,
                            notes: `Fusión automática al intentar renombrar a un cliente existente.`,
                            finalDisplayName: newName,
                        });
                    }
                );
            } else {
                setResultDialog({
                    isOpen: true,
                    title: "✅ Cliente Renombrado",
                    message: result.message,
                });

                refetchAliases();
                refetchStats();
            }
        } catch (error) {
            setResultDialog({
                isOpen: true,
                title: "❌ Error al Renombrar",
                message: error.response?.data?.error || error.message,
            });
        }
    };

    // Tabs
    const tabs = [
        {
            id: "overview",
            label: "Vista General",
            icon: BarChart3,
            count: stats?.total_aliases || aliases.length,
        },
        {
            id: "pending",
            label: "Pendientes",
            icon: Clock,
            count: stats?.pending_matches || pendingMatches.length,
            badge: "warning",
        },
        {
            id: "approved",
            label: "Normalizados",
            icon: CheckCircle,
            count: stats?.approved_matches || approvedMatches.length,
            badge: "success",
        },
        {
            id: "all",
            label: "Todos",
            icon: Users,
            count: stats?.total_aliases || aliases.length,
        },
    ];

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                            Total Clientes
                        </CardTitle>
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                            {stats?.total_aliases || 0}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Nombres en el sistema
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                            Duplicados Pendientes
                        </CardTitle>
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-yellow-600">
                            {stats?.pending_matches || 0}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Requieren revisión
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                            Normalizados
                        </CardTitle>
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-green-600">
                            {stats?.approved_matches || 0}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Fusiones aprobadas
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                            Verificados
                        </CardTitle>
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                            {stats?.verified_count || 0}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Revisados manualmente
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Barra de búsqueda y acciones */}
            <Card>
                <CardContent className="pt-4 sm:pt-6">
                    <div className="flex flex-col gap-3 sm:gap-4">
                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    refetchAliases();
                                    refetchMatches();
                                    refetchStats();
                                }}
                                disabled={loadingAliases || loadingMatches}
                                className="flex-1 sm:flex-none"
                            >
                                <RefreshCw
                                    className={`w-4 h-4 sm:mr-2 ${
                                        loadingAliases || loadingMatches
                                            ? "animate-spin"
                                            : ""
                                    }`}
                                />
                                <span className="hidden sm:inline">
                                    Actualizar
                                </span>
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleDetectDuplicates}
                                disabled={suggestMatches.isPending}
                                className="flex-1 sm:flex-none"
                            >
                                <TrendingUp className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">
                                    {suggestMatches.isPending
                                        ? "Analizando..."
                                        : "Detectar Duplicados"}
                                </span>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <div className="border-b border-gray-200 overflow-x-auto">
                <nav className="-mb-px flex space-x-2 sm:space-x-4">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap
                                    ${
                                        isActive
                                            ? "border-blue-500 text-blue-600"
                                            : "border-transparent text-gray-500 hover:text-gray-700"
                                    }
                                `}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="hidden sm:inline">
                                    {tab.label}
                                </span>
                                {tab.count > 0 && (
                                    <Badge
                                        variant={tab.badge || "secondary"}
                                        className="text-xs"
                                    >
                                        {tab.count}
                                    </Badge>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Contenido según tab */}
            {activeTab === "overview" && (
                <OverviewTab
                    aliases={aliases}
                    pendingMatches={pendingMatches}
                    approvedMatches={approvedMatches}
                    stats={stats}
                    onNavigate={() => setActiveTab("pending")}
                />
            )}

            {activeTab === "pending" && (
                <PendingTab
                    matches={pendingMatches}
                    onApprove={handleApproveMatch}
                    onReject={handleRejectMatch}
                    isLoading={
                        loadingMatches ||
                        applyNormalization.isPending ||
                        rejectMerge.isPending
                    }
                />
            )}

            {activeTab === "approved" && (
                <ApprovedTab
                    matches={approvedMatches}
                    isLoading={loadingMatches}
                />
            )}

            {activeTab === "all" && (
                <AllAliasesTab
                    aliases={aliases}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    isLoading={loadingAliases}
                    onRename={handleRename}
                />
            )}

            {/* Modal de Normalización */}
            {normalizationModal.isOpen && (
                <NormalizationModal
                    sourceAlias={normalizationModal.sourceAlias}
                    targetAlias={normalizationModal.targetAlias}
                    similarityScore={normalizationModal.similarityScore}
                    onConfirm={handleConfirmNormalization}
                    onCancel={() =>
                        setNormalizationModal({
                            isOpen: false,
                            sourceAlias: null,
                            targetAlias: null,
                            similarityScore: 0,
                            matchId: null,
                        })
                    }
                    isLoading={applyNormalization.isPending}
                />
            )}

            {/* Dialog: Detectar Duplicados */}
            <ConfirmDialog
                isOpen={detectDialog.isOpen}
                onClose={() => setDetectDialog({ isOpen: false })}
                onConfirm={confirmDetectDuplicates}
                title="¿Analizar TODOS los clientes?"
                message="Esto comparará todos los nombres con fuzzy matching para detectar posibles duplicados.\r\n\r\nSolo genera sugerencias, no fusiona automáticamente."
                confirmText="Analizar"
                variant="default"
                isConfirming={suggestMatches.isPending}
            />

            {/* Dialog: Rechazar Duplicado */}
            {rejectDialog.match && (
                <InputDialog
                    isOpen={rejectDialog.isOpen}
                    onClose={() =>
                        setRejectDialog({ isOpen: false, match: null })
                    }
                    onConfirm={confirmRejectMatch}
                    title="¿Por qué no son duplicados?"
                    message={`"${rejectDialog.match.alias_1.original_name}"\nvs\n"${rejectDialog.match.alias_2.original_name}"`}
                    placeholder="Ej: Son de diferentes países, diferentes empresas, etc."
                    multiline
                    confirmText="Rechazar"
                    isConfirming={rejectMerge.isPending}
                />
            )}

            {/* Dialog: Resultados */}
            <ConfirmDialog
                isOpen={resultDialog.isOpen}
                onClose={() =>
                    setResultDialog({ isOpen: false, title: "", message: "" })
                }
                onConfirm={() =>
                    setResultDialog({ isOpen: false, title: "", message: "" })
                }
                title={resultDialog.title}
                message={resultDialog.message}
                confirmText="Entendido"
                cancelText=""
                variant="default"
            />

            {/* Dialog: Renombrar Cliente */}
            {renameDialog.alias && (
                <InputDialog
                    isOpen={renameDialog.isOpen}
                    onClose={() =>
                        setRenameDialog({ isOpen: false, alias: null })
                    }
                    onConfirm={confirmRename}
                    title={`Renombrar a "${renameDialog.alias.original_name}"`}
                    message="Ingrese el nuevo nombre para este cliente"
                    placeholder="Nuevo nombre"
                    confirmText="Renombrar"
                    isConfirming={renameClient.isPending}
                />
            )}
        </div>
    );
}
