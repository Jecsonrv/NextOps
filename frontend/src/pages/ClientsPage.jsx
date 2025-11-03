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
import { NormalizationModal } from "../components/NormalizationModal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { showConfirm } from "../utils/toast";
import { InputDialog } from "../components/ui/InputDialog";
import {
    useSuggestAllMatches,
    useApplyNormalization,
    useSimilarityMatches,
    useClientAliasStats,
    useRejectMerge,
    useRenameClient,
} from "../hooks/useCatalogs";

import { useQuery } from "@tanstack/react-query";
import apiClient from "../lib/api";

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
        has_ots: "",
    });
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
    } = useQuery({
        queryKey: ["clients-from-ots", filters, searchTerm],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append("page_size", "10000"); // Fetch all OTs to get all clients
            if (searchTerm) {
                params.append("search", searchTerm);
            }
            if (filters.merged) {
                params.append("merged", filters.merged);
            }
            if (filters.has_ots) {
                params.append("has_ots", filters.has_ots);
            }

            const response = await apiClient.get(`/ots/?${params}`);
            const clients = [
                ...new Set(
                    response.data.results
                        .map((ot) => ot.cliente_nombre)
                        .filter(Boolean)
                ),
            ].map((clientName) => ({
                id: clientName, // Using clientName as id, since we don't have a client id from this endpoint
                original_name: clientName,
                usage_count: response.data.results.filter(
                    (ot) => ot.cliente_nombre === clientName
                ).length,
            }));
            return { results: clients, count: clients.length };
        },
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
    const renameClient = useRenameClient();

    // Datos procesados
    const aliases = useMemo(() => aliasesData?.results || [], [aliasesData]);
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
                    filters={filters}
                    setFilters={setFilters}
                    isLoading={loadingAliases}
                    matches={matches}
                    aliasesData={aliasesData}
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
