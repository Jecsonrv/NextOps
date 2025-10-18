/* eslint-disable react/prop-types */
/**
 * Página profesional de gestión de Clientes y Normalización de Aliases
 *
 * Sistema completo con datos reales:
 * - Visualización de aliases REALES de la BD
 * - Detección masiva de duplicados
 * - Tabs organizados por flujo de trabajo
 * - Proceso guiado de revisión y aprobación
 * - Analytics y métricas en tiempo real
 */

import { useState } from "react";
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
} from "lucide-react";
import { Button } from "../components/ui/Button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { NormalizationModal } from "../components/NormalizationModal";
import {
    useClientAliases,
    useSuggestAllMatches,
    useApplyNormalization,
    useSimilarityMatches,
    useClientAliasStats,
    useRejectMerge,
} from "../hooks/useCatalogs";

export default function ClientsPage() {
    // Estados
    const [activeTab, setActiveTab] = useState("overview");
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({
        country: "",
        verified: "",
        merged: "false", // Solo activos por defecto
        page: 1,
        page_size: 20,
    });
    const [normalizationModal, setNormalizationModal] = useState({
        isOpen: false,
        sourceAlias: null,
        targetAlias: null,
        similarityScore: 0,
        matchId: null,
    });

    // Queries - datos reales de la BD
    const {
        data: aliasesData,
        isLoading: loadingAliases,
        refetch: refetchAliases,
    } = useClientAliases({
        search: searchTerm,
        ...filters,
    });

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

    // Datos procesados
    const aliases = aliasesData?.results || [];
    const matches = matchesData?.results || [];
    const pendingMatches = matches.filter((m) => m.status === "pending");
    const approvedMatches = matches.filter((m) => m.status === "approved");

    // Handler: Detección masiva
    const handleDetectDuplicates = async () => {
        const confirmed = confirm(
            "¿Analizar TODOS los aliases de clientes?\n\n" +
                "Esto comparará todos los nombres con fuzzy matching.\n" +
                "Solo genera sugerencias, no fusiona automáticamente."
        );

        if (!confirmed) return;

        try {
            const result = await suggestMatches.mutateAsync({
                threshold: 85,
                limit_per_alias: 5,
            });

            alert(
                `✅ Análisis completado\n\n` +
                    `• Aliases analizados: ${result.total_aliases_analyzed}\n` +
                    `• Nuevas sugerencias: ${result.suggestions_created}\n` +
                    `• Ya existían: ${result.suggestions_skipped}`
            );

            refetchMatches();
            refetchStats();
            setActiveTab("pending");
        } catch (error) {
            alert(
                "❌ Error:\n" + (error.response?.data?.error || error.message)
            );
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
    const handleRejectMatch = async (match) => {
        const reason = prompt(
            `¿Por qué rechazas?\n\n` +
                `"${match.alias_1.original_name}"\n` +
                `vs\n` +
                `"${match.alias_2.original_name}"\n\n` +
                `Razón (opcional):`
        );

        if (reason === null) return;

        try {
            await rejectMerge.mutateAsync({
                source_alias_id: match.alias_1.id,
                target_alias_id: match.alias_2.id,
                reason: reason || "Sin razón",
            });

            alert("✅ Sugerencia rechazada");
            refetchMatches();
            refetchStats();
        } catch (error) {
            alert(
                "❌ Error:\n" + (error.response?.data?.error || error.message)
            );
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

            alert(
                `✅ ${result.message}\n\n` +
                    `• OTs actualizadas: ${result.ots_updated}\n` +
                    `• Cliente final: ${
                        result.final_target_name ||
                        result.target_alias?.original_name ||
                        finalDisplayName
                    }`
            );

            setNormalizationModal({
                isOpen: false,
                sourceAlias: null,
                targetAlias: null,
                similarityScore: 0,
                matchId: null,
            });

            refetchAliases();
            refetchMatches();
            refetchStats();
        } catch (error) {
            alert(
                "❌ Error:\n" + (error.response?.data?.error || error.message)
            );
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
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-8 h-8 text-blue-600" />
                        Gestión de Clientes
                    </h1>
                    <p className="text-gray-500 mt-2">
                        Normalización de clientes de tus OTs importadas
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                        ✓ {stats?.total_aliases || aliases.length} clientes
                        reales de tu base de datos
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => {
                            refetchAliases();
                            refetchMatches();
                            refetchStats();
                        }}
                        variant="outline"
                        disabled={loadingAliases || loadingMatches}
                    >
                        <RefreshCw
                            className={`w-4 h-4 mr-2 ${
                                loadingAliases || loadingMatches
                                    ? "animate-spin"
                                    : ""
                            }`}
                        />
                        Actualizar
                    </Button>
                    <Button
                        onClick={handleDetectDuplicates}
                        disabled={suggestMatches.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        {suggestMatches.isPending
                            ? "Analizando..."
                            : "Detectar Duplicados"}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Total Clientes
                                </p>
                                <p className="text-2xl font-bold">
                                    {stats?.total_aliases || 0}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Aliases únicos activos
                                </p>
                            </div>
                            <Users className="w-10 h-10 text-blue-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Pendientes
                                </p>
                                <p className="text-2xl font-bold text-orange-600">
                                    {stats?.pending_matches || 0}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Requieren revisión
                                </p>
                            </div>
                            <Clock className="w-10 h-10 text-orange-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Normalizados
                                </p>
                                <p className="text-2xl font-bold text-green-600">
                                    {stats?.approved_matches || 0}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Fusiones aprobadas
                                </p>
                            </div>
                            <CheckCircle2 className="w-10 h-10 text-green-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Verificados
                                </p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {stats?.verified_count || 0}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Revisados manualmente
                                </p>
                            </div>
                            <CheckCircle className="w-10 h-10 text-blue-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-4">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm
                                    ${
                                        isActive
                                            ? "border-blue-500 text-blue-600"
                                            : "border-transparent text-gray-500 hover:text-gray-700"
                                    }
                                `}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                                {tab.count > 0 && (
                                    <Badge variant={tab.badge || "secondary"}>
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
                    filters={filters}
                    setFilters={setFilters}
                    isLoading={loadingAliases}
                    matches={matches}
                    aliasesData={aliasesData}
                />
            )}

            {/* Modal */}
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
        </div>
    );
}

// ============= SUB-COMPONENTES =============

function OverviewTab({
    aliases,
    pendingMatches,
    approvedMatches,
    stats,
    onNavigate,
}) {
    // Usar top_clients del backend si está disponible, sino calcular localmente
    const topClients =
        stats?.top_clients && stats.top_clients.length > 0
            ? stats.top_clients
            : [...aliases]
                  .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
                  .slice(0, 10);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Estado del Sistema</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {pendingMatches.length > 0 && (
                            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white/70 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                                        <AlertCircle className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {pendingMatches.length} pendientes
                                            por revisar
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Prioriza estas sugerencias para
                                            mantener la base limpia.
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={onNavigate}
                                >
                                    Revisar
                                </Button>
                            </div>
                        )}

                        {approvedMatches.length > 0 && (
                            <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white/70 p-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                    <CheckCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {approvedMatches.length} normalizaciones
                                        completadas
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Tus clientes duplicados ya fueron
                                        consolidados.
                                    </p>
                                </div>
                            </div>
                        )}

                        {pendingMatches.length === 0 &&
                            approvedMatches.length === 0 && (
                                <div className="text-center py-8 text-sm text-gray-500">
                                    <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                                    No hay sugerencias por el momento.
                                </div>
                            )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Top 10 Clientes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {topClients.length > 0 ? (
                        <div className="space-y-2">
                            {topClients.map((alias, idx) => (
                                <div
                                    key={alias.id}
                                    className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white/60 p-3 transition-colors hover:border-gray-200"
                                >
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                        <span className="w-6 text-sm font-semibold text-gray-400">
                                            #{idx + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-gray-900">
                                                {alias.original_name}
                                            </p>
                                            {alias.country && (
                                                <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                                                    <Globe className="h-3 w-3 text-gray-400" />
                                                    <span>{alias.country}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
                                        <FileText className="h-3 w-3 text-gray-400" />
                                        {alias.usage_count || 0}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">Sin datos</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function PendingTab({ matches, onApprove, onReject, isLoading }) {
    const [sortBy, setSortBy] = useState("score"); // score, date, impact
    const [filterScore, setFilterScore] = useState("all"); // all, high, medium
    const [expandedMatch, setExpandedMatch] = useState(null);

    const highSimilarityCount = matches.filter(
        (match) => match.similarity_score >= 90
    ).length;
    const mediumSimilarityCount = matches.filter(
        (match) => match.similarity_score >= 75 && match.similarity_score < 90
    ).length;

    // Filtrar matches por score
    const filteredMatches = matches.filter((match) => {
        if (filterScore === "high") return match.similarity_score >= 90;
        if (filterScore === "medium")
            return match.similarity_score >= 75 && match.similarity_score < 90;
        return true; // all
    });

    // Ordenar matches
    const sortedMatches = [...filteredMatches].sort((a, b) => {
        if (sortBy === "score") return b.similarity_score - a.similarity_score;
        if (sortBy === "date")
            return new Date(b.created_at) - new Date(a.created_at);
        if (sortBy === "impact") {
            const impactA =
                (a.alias_1.usage_count || 0) + (a.alias_2.usage_count || 0);
            const impactB =
                (b.alias_1.usage_count || 0) + (b.alias_2.usage_count || 0);
            return impactB - impactA;
        }
        return 0;
    });

    const getScoreLabel = (score) => {
        if (score >= 95) return "Casi Exacto";
        if (score >= 85) return "Alta Similitud";
        if (score >= 75) return "Media Similitud";
        return "Baja Similitud";
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-500">Cargando sugerencias...</p>
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
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                            ¡Todo revisado!
                        </h3>
                        <p className="text-gray-500 mb-4">
                            No hay sugerencias pendientes de revisión
                        </p>
                        <p className="text-sm text-gray-400">
                            Usa &quot;Detectar Duplicados&quot; para generar
                            nuevas sugerencias
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-5">
            {/* Filtros y ordenamiento */}
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Ordenar por
                            </label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                            >
                                <option value="score">Mayor similitud</option>
                                <option value="impact">Mayor impacto</option>
                                <option value="date">Más recientes</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Filtrar por similitud
                            </label>
                            <select
                                value={filterScore}
                                onChange={(e) => setFilterScore(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                            >
                                <option value="all">
                                    Todas ({matches.length})
                                </option>
                                <option value="high">
                                    Alta similitud ≥90% ({highSimilarityCount})
                                </option>
                                <option value="medium">
                                    Media 75-90% ({mediumSimilarityCount})
                                </option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-gray-800">
                                {sortedMatches.length} sugerencias activas
                            </p>
                            <p className="text-xs text-gray-500">
                                Usá los filtros para enfocarte en las
                                coincidencias más relevantes.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-600">
                            <span className="rounded-full border border-green-100 bg-white px-3 py-1 text-green-600">
                                ≥90%: {highSimilarityCount}
                            </span>
                            <span className="rounded-full border border-amber-100 bg-white px-3 py-1 text-amber-600">
                                75-90%: {mediumSimilarityCount}
                            </span>
                            <span className="rounded-full border border-gray-200 bg-white px-3 py-1">
                                Total: {matches.length}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Lista de sugerencias */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Sugerencias Pendientes</span>
                        <Badge variant="warning">{sortedMatches.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {sortedMatches.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No hay sugerencias con los filtros seleccionados
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sortedMatches.map((match) => {
                                const isExpanded = expandedMatch === match.id;
                                const totalImpact =
                                    (match.alias_1.usage_count || 0) +
                                    (match.alias_2.usage_count || 0);

                                // Determinar cuál es "actual" (menos OTs) y cuál es "similar" (más OTs)
                                const alias1Uses =
                                    match.alias_1.usage_count || 0;
                                const alias2Uses =
                                    match.alias_2.usage_count || 0;
                                const currentAlias =
                                    alias1Uses <= alias2Uses
                                        ? match.alias_1
                                        : match.alias_2;
                                const similarAlias =
                                    alias1Uses > alias2Uses
                                        ? match.alias_1
                                        : match.alias_2;
                                const detectionIsAuto =
                                    match.detection_method ===
                                    "batch_fuzzywuzzy";

                                return (
                                    <div
                                        key={match.id}
                                        className="rounded-2xl border border-gray-200 bg-white/70 p-5 transition-all hover:border-gray-300 hover:shadow-sm"
                                    >
                                        <div className="flex flex-col gap-5">
                                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                                <div className="flex-1 space-y-2">
                                                    <p className="text-xs uppercase tracking-wide text-gray-400">
                                                        Alias actual
                                                    </p>
                                                    <p className="text-base font-semibold text-gray-900">
                                                        {
                                                            currentAlias.original_name
                                                        }
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                                        {currentAlias.country && (
                                                            <span className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5">
                                                                {
                                                                    currentAlias.country
                                                                }
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-0.5">
                                                            <FileText className="h-3.5 w-3.5 text-gray-400" />
                                                            {currentAlias.usage_count ||
                                                                0}{" "}
                                                            usos
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3 text-sm text-gray-600 md:flex-col md:items-end">
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                                                            match.similarity_score >=
                                                            95
                                                                ? "bg-green-50 text-green-700"
                                                                : match.similarity_score >=
                                                                  85
                                                                ? "bg-blue-50 text-blue-700"
                                                                : match.similarity_score >=
                                                                  75
                                                                ? "bg-amber-50 text-amber-700"
                                                                : "bg-gray-100 text-gray-600"
                                                        }`}
                                                    >
                                                        {match.similarity_score.toFixed(
                                                            1
                                                        )}
                                                        %
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {getScoreLabel(
                                                            match.similarity_score
                                                        )}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        Impacto: {totalImpact}{" "}
                                                        OTs
                                                    </span>
                                                </div>

                                                <div className="flex-1 space-y-2 text-left md:text-right">
                                                    <p className="text-xs uppercase tracking-wide text-gray-400">
                                                        Alias sugerido
                                                    </p>
                                                    <p className="text-base font-semibold text-gray-900">
                                                        {
                                                            similarAlias.original_name
                                                        }
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 md:justify-end">
                                                        <span className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-0.5">
                                                            <FileText className="h-3.5 w-3.5 text-gray-400" />
                                                            {similarAlias.usage_count ||
                                                                0}{" "}
                                                            usos
                                                        </span>
                                                        {similarAlias.country && (
                                                            <span className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5">
                                                                {
                                                                    similarAlias.country
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 md:flex-row md:items-center md:justify-between">
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                                    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 font-medium text-gray-600">
                                                        {detectionIsAuto
                                                            ? "Detectado automáticamente"
                                                            : "Cargado manualmente"}
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            setExpandedMatch(
                                                                isExpanded
                                                                    ? null
                                                                    : match.id
                                                            )
                                                        }
                                                        className="text-blue-600 transition-colors hover:text-blue-700"
                                                    >
                                                        {isExpanded
                                                            ? "Ocultar detalles"
                                                            : "Ver detalles"}
                                                    </button>
                                                </div>

                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            onApprove(match)
                                                        }
                                                        disabled={isLoading}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        <CheckCircle className="mr-1 h-4 w-4" />
                                                        Normalizar
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            onReject(match)
                                                        }
                                                        disabled={isLoading}
                                                        className="border-red-300 text-red-700 hover:bg-red-50"
                                                    >
                                                        <XCircle className="mr-1 h-4 w-4" />
                                                        Rechazar
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Panel expandido */}
                                        {isExpanded && (
                                            <div className="border-t border-gray-100 bg-white px-5 pb-5 pt-4">
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="rounded-xl border border-gray-100 bg-white p-3">
                                                        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                                            Alias 1 (Origen)
                                                        </h4>
                                                        <p className="mt-2 text-sm font-medium text-gray-900">
                                                            {
                                                                match.alias_1
                                                                    .original_name
                                                            }
                                                        </p>
                                                        <div className="mt-2 space-y-1 text-xs text-gray-600">
                                                            <p>
                                                                • ID:{" "}
                                                                {
                                                                    match
                                                                        .alias_1
                                                                        .id
                                                                }
                                                            </p>
                                                            <p>
                                                                • País:{" "}
                                                                {match.alias_1
                                                                    .country ||
                                                                    "-"}
                                                            </p>
                                                            <p>
                                                                • Usos:{" "}
                                                                {match.alias_1
                                                                    .usage_count ||
                                                                    0}{" "}
                                                                OTs
                                                            </p>
                                                            {match.alias_1
                                                                .normalized_name && (
                                                                <p>
                                                                    •
                                                                    Normalizado:{" "}
                                                                    {
                                                                        match
                                                                            .alias_1
                                                                            .normalized_name
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="rounded-xl border border-gray-100 bg-white p-3">
                                                        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                                            Alias 2 (Destino)
                                                        </h4>
                                                        <p className="mt-2 text-sm font-medium text-gray-900">
                                                            {
                                                                match.alias_2
                                                                    .original_name
                                                            }
                                                        </p>
                                                        <div className="mt-2 space-y-1 text-xs text-gray-600">
                                                            <p>
                                                                • ID:{" "}
                                                                {
                                                                    match
                                                                        .alias_2
                                                                        .id
                                                                }
                                                            </p>
                                                            <p>
                                                                • País:{" "}
                                                                {match.alias_2
                                                                    .country ||
                                                                    "-"}
                                                            </p>
                                                            <p>
                                                                • Usos:{" "}
                                                                {match.alias_2
                                                                    .usage_count ||
                                                                    0}{" "}
                                                                OTs
                                                            </p>
                                                            {match.alias_2
                                                                .normalized_name && (
                                                                <p>
                                                                    •
                                                                    Normalizado:{" "}
                                                                    {
                                                                        match
                                                                            .alias_2
                                                                            .normalized_name
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-600">
                                                    <p className="leading-relaxed">
                                                        <strong className="text-gray-700">
                                                            ℹ️ Impacto estimado:
                                                        </strong>{" "}
                                                        Se actualizarán{" "}
                                                        {match.alias_1
                                                            .usage_count ||
                                                            0}{" "}
                                                        OTs que hoy usan “
                                                        <span className="font-semibold text-gray-800">
                                                            {
                                                                match.alias_1
                                                                    .original_name
                                                            }
                                                        </span>
                                                        ” para que utilicen “
                                                        <span className="font-semibold text-gray-800">
                                                            {
                                                                match.alias_2
                                                                    .original_name
                                                            }
                                                        </span>
                                                        ”. Total: {totalImpact}{" "}
                                                        OTs afectadas.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function ApprovedTab({ matches, isLoading }) {
    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-500">Cargando...</p>
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
                        <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                            Sin historial
                        </h3>
                        <p className="text-gray-500">
                            Aún no hay normalizaciones
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Historial ({matches.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {matches.map((match) => (
                        <div
                            key={match.id}
                            className="rounded-2xl border border-gray-200 bg-white/70 p-4"
                        >
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="min-w-0">
                                    <p className="text-xs uppercase tracking-wide text-gray-400">
                                        Alias fusionado
                                    </p>
                                    <p className="truncate text-sm text-gray-500 line-through">
                                        {match.alias_1.original_name}
                                    </p>
                                </div>
                                <div className="min-w-0 text-left md:text-center">
                                    <p className="text-xs uppercase tracking-wide text-gray-400">
                                        Alias principal
                                    </p>
                                    <p className="truncate text-sm font-semibold text-gray-900">
                                        {match.alias_2.original_name}
                                    </p>
                                </div>
                                <div className="flex flex-col items-start gap-1 text-xs text-gray-500 md:items-end">
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-white px-3 py-1 text-emerald-600">
                                        {match.similarity_score.toFixed(1)}%
                                        similitud
                                    </span>
                                    <span className="text-[11px] text-gray-400">
                                        {match.review_notes || "Sin notas"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function AllAliasesTab({
    aliases,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    isLoading,
    matches,
    aliasesData,
}) {
    const totalPages = aliasesData?.count
        ? Math.ceil(aliasesData.count / filters.page_size)
        : 1;

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages) {
            setFilters({ ...filters, page: newPage });
        }
    };

    const handlePageSizeChange = (newPageSize) => {
        setFilters({ ...filters, page_size: newPageSize, page: 1 });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Todos los Aliases</span>
                    <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
                        {aliasesData?.count || 0}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Filtros */}
                <div className="mb-6 space-y-3">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                            />
                        </div>
                        <select
                            value={filters.merged}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    merged: e.target.value,
                                })
                            }
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                        >
                            <option value="false">Solo activos</option>
                            <option value="true">Fusionados</option>
                            <option value="">Todos</option>
                        </select>
                    </div>
                </div>

                {/* Tabla */}
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-500">Cargando...</p>
                    </div>
                ) : aliases.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                            Sin resultados
                        </h3>
                        <p className="text-gray-500">
                            {searchTerm
                                ? "Intenta otro término"
                                : "Sin clientes"}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="min-w-full overflow-hidden rounded-2xl border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50/80">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            Cliente
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            País
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            Usos
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            Estado
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {aliases.map((alias) => {
                                        const hasPending = matches.some(
                                            (m) =>
                                                (m.alias_1.id === alias.id ||
                                                    m.alias_2.id ===
                                                        alias.id) &&
                                                m.status === "pending"
                                        );

                                        return (
                                            <tr
                                                key={alias.id}
                                                className="hover:bg-gray-50/80"
                                            >
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                    {alias.original_name}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {alias.country ? (
                                                        <div className="flex items-center gap-1 text-sm text-gray-500">
                                                            <Globe className="h-3 w-3 text-gray-400" />
                                                            <span>
                                                                {alias.country}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-400">
                                                            -
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
                                                        <FileText className="h-3 w-3 text-gray-400" />
                                                        {alias.usage_count || 0}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-2 text-xs font-medium text-gray-600">
                                                        {hasPending && (
                                                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-white px-3 py-1 text-amber-600">
                                                                <AlertCircle className="h-3 w-3" />
                                                                Duplicado
                                                            </span>
                                                        )}
                                                        {alias.is_verified && (
                                                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-white px-3 py-1 text-emerald-600">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Verificado
                                                            </span>
                                                        )}
                                                        {alias.merged_into && (
                                                            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-600">
                                                                <XCircle className="h-3 w-3" />
                                                                Fusionado
                                                            </span>
                                                        )}
                                                        {!hasPending &&
                                                            !alias.is_verified &&
                                                            !alias.merged_into && (
                                                                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-500">
                                                                    Normal
                                                                </span>
                                                            )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                         {totalPages > 1 && (
                            <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                                <div className="flex items-center gap-4 text-sm text-gray-700">
                                    <span>Página {filters.page} de {totalPages}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={filters.page === 1}
                                        onClick={() => handlePageChange(filters.page - 1)}
                                    >
                                        Anterior
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={filters.page === totalPages}
                                        onClick={() => handlePageChange(filters.page + 1)}
                                    >
                                        Siguiente
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
