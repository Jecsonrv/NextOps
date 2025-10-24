/**
 * Página profesional de gestión de Patrones de Proveedor
 *
 * Sistema completo con:
 * - Visualización de patrones regex por proveedor
 * - Herramienta de prueba en tiempo real
 * - Estadísticas de uso y rendimiento
 * - Sistema de priorización
 * - Identificación automática de proveedores
 */

import { useState, useEffect } from "react";
import {
    Code,
    Search,
    RefreshCw,
    Plus,
    Edit2,
    Trash2,
    PlayCircle,
    CheckCircle,
    XCircle,
    Building2,
    TrendingUp,
    AlertCircle,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import apiClient from "../lib/api";
import ProviderPatternForm from "../components/ProviderPatternForm";
import ProviderPatternTestTool from "../components/ProviderPatternTestTool";

const PATTERNS_URL = "/patterns/provider-patterns/";
const PROVIDERS_URL = "/catalogs/providers/";
const TARGET_FIELDS_URL = "/patterns/target-fields/";

export default function ProviderPatternsPage() {
    const [patterns, setPatterns] = useState([]);
    const [providers, setProviders] = useState([]);
    const [targetFields, setTargetFields] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProvider, setSelectedProvider] = useState("");
    const [selectedTargetField, setSelectedTargetField] = useState("");
    const [showInactive, setShowInactive] = useState(false);

    // Dialogs
    const [formOpen, setFormOpen] = useState(false);
    const [testToolOpen, setTestToolOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // Selected items
    const [editingPattern, setEditingPattern] = useState(null);
    const [selectedPattern, setSelectedPattern] = useState(null);

    // Notifications
    const [notification, setNotification] = useState(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("access_token");
        return {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };
    };

    const loadPatterns = async () => {
        try {
            setLoading(true);
            let url = PATTERNS_URL;
            const params = [];

            if (selectedProvider) params.push(`provider=${selectedProvider}`);
            if (selectedTargetField)
                params.push(`target_field=${selectedTargetField}`);
            if (showInactive) params.push("include_inactive=true");

            if (params.length > 0) {
                url += `?${params.join("&")}`;
            }

            const response = await apiClient.get(url, getAuthHeaders());
            setPatterns(response.data.results || []);
        } catch (error) {
            console.error("Error loading patterns:", error);
            showNotification("Error al cargar patrones", "error");
        } finally {
            setLoading(false);
        }
    };

    const loadProviders = async () => {
        try {
            let allProviders = [];
            let page = 1;
            let hasNext = true;

            while (hasNext) {
                const response = await apiClient.get(`${PROVIDERS_URL}`, {
                    ...getAuthHeaders(),
                    params: {
                        page,
                        page_size: 200,
                    },
                });

                const { results = [], next } = response.data;
                allProviders = [...allProviders, ...results];

                if (!next) {
                    hasNext = false;
                } else {
                    page += 1;
                }
            }

            setProviders(allProviders);
        } catch (error) {
            console.error("Error loading providers:", error);
        }
    };

    const loadTargetFields = async () => {
        try {
            const response = await apiClient.get(
                `${TARGET_FIELDS_URL}?is_active=true`,
                getAuthHeaders()
            );
            setTargetFields(response.data.results || []);
        } catch (error) {
            console.error("Error loading target fields:", error);
        }
    };

    useEffect(() => {
        loadPatterns();
        loadProviders();
        loadTargetFields();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProvider, selectedTargetField, showInactive]);

    const handleCreatePattern = () => {
        setEditingPattern(null);
        setFormOpen(true);
    };

    const handleEditPattern = (pattern) => {
        setEditingPattern(pattern);
        setFormOpen(true);
    };

    const handleDeletePattern = async () => {
        if (!selectedPattern) return;

        try {
            await apiClient.delete(
                `${PATTERNS_URL}${selectedPattern.id}/`,
                getAuthHeaders()
            );
            showNotification("Patrón eliminado exitosamente", "success");
            setDeleteDialogOpen(false);
            loadPatterns();
        } catch (error) {
            console.error("Error deleting pattern:", error);
            showNotification("Error al eliminar patrón", "error");
        }
    };

    const handleToggleActive = async (pattern) => {
        try {
            const response = await apiClient.post(
                `${PATTERNS_URL}${pattern.id}/toggle_active/`,
                {},
                getAuthHeaders()
            );
            showNotification(response.data.message, "success");
            loadPatterns();
        } catch (error) {
            console.error("Error toggling pattern:", error);
            showNotification("Error al cambiar estado del patrón", "error");
        }
    };

    const handleTestPattern = (pattern) => {
        setSelectedPattern(pattern);
        setTestToolOpen(true);
    };

    const handleFormClose = (saved) => {
        setFormOpen(false);
        setEditingPattern(null);
        if (saved) {
            loadPatterns();
        }
    };

    const showNotification = (message, type = "info") => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const filteredPatterns = patterns.filter((pattern) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            pattern.name.toLowerCase().includes(search) ||
            pattern.description?.toLowerCase().includes(search) ||
            pattern.provider_nombre?.toLowerCase().includes(search) ||
            pattern.pattern.toLowerCase().includes(search)
        );
    });

    const stats = {
        total: patterns.length,
        active: patterns.filter((p) => p.is_active).length,
        inactive: patterns.filter((p) => !p.is_active).length,
        avgSuccessRate:
            patterns.length > 0
                ? patterns.reduce((sum, p) => sum + (p.success_rate || 0), 0) /
                  patterns.length
                : 0,
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Notification */}
            {notification && (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
                    <div
                        className={`rounded-lg shadow-lg p-4 ${
                            notification.type === "success"
                                ? "bg-green-50 border border-green-200"
                                : "bg-red-50 border border-red-200"
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            {notification.type === "success" ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-red-600" />
                            )}
                            <span
                                className={
                                    notification.type === "success"
                                        ? "text-green-800"
                                        : "text-red-800"
                                }
                            >
                                {notification.message}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-3 rounded-lg">
                            <Code className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Patrones de Proveedor
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Gestión de patrones regex para identificación
                                automática
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={loadPatterns}
                            disabled={loading}
                        >
                            <RefreshCw
                                className={`w-4 h-4 mr-2 ${
                                    loading ? "animate-spin" : ""
                                }`}
                            />
                            Refrescar
                        </Button>
                        <Button onClick={handleCreatePattern}>
                            <Plus className="w-4 h-4 mr-2" />
                            Nuevo Patrón
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">
                                        Total Patrones
                                    </p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {stats.total}
                                    </p>
                                </div>
                                <div className="bg-blue-100 p-3 rounded-lg">
                                    <Code className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">
                                        Activos
                                    </p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {stats.active}
                                    </p>
                                </div>
                                <div className="bg-green-100 p-3 rounded-lg">
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">
                                        Inactivos
                                    </p>
                                    <p className="text-2xl font-bold text-gray-600">
                                        {stats.inactive}
                                    </p>
                                </div>
                                <div className="bg-gray-100 p-3 rounded-lg">
                                    <XCircle className="w-6 h-6 text-gray-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">
                                        Tasa Éxito Promedio
                                    </p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {stats.avgSuccessRate.toFixed(1)}%
                                    </p>
                                </div>
                                <div className="bg-blue-100 p-3 rounded-lg">
                                    <TrendingUp className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search and Filters */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Buscar patrones..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Provider Filter */}
                            <select
                                value={selectedProvider}
                                onChange={(e) =>
                                    setSelectedProvider(e.target.value)
                                }
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Todos los proveedores</option>
                                {providers.map((provider) => (
                                    <option
                                        key={provider.id}
                                        value={provider.id}
                                    >
                                        {provider.nombre}
                                    </option>
                                ))}
                            </select>

                            {/* Campo Objetivo Filter */}
                            <select
                                value={selectedTargetField}
                                onChange={(e) =>
                                    setSelectedTargetField(e.target.value)
                                }
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Todos los campos</option>
                                {targetFields.map((field) => (
                                    <option key={field.id} value={field.id}>
                                        {field.name}
                                    </option>
                                ))}
                            </select>

                            {/* Show Inactive Toggle */}
                            <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-100">
                                <input
                                    type="checkbox"
                                    checked={showInactive}
                                    onChange={(e) =>
                                        setShowInactive(e.target.checked)
                                    }
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Mostrar inactivos
                                </span>
                            </label>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Patterns Grid */}
            {filteredPatterns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPatterns.map((pattern) => (
                        <Card
                            key={pattern.id}
                            className={`transition-all duration-200 ${
                                pattern.is_active
                                    ? "border border-gray-200 hover:border-blue-300 hover:shadow-md"
                                    : "border border-gray-200 opacity-50"
                            }`}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                            <CardTitle className="text-base font-semibold text-gray-900 truncate">
                                                {pattern.name}
                                            </CardTitle>
                                        </div>
                                        <p className="text-sm text-gray-600 truncate">
                                            {pattern.provider_nombre}
                                        </p>
                                    </div>
                                    {pattern.is_active ? (
                                        <span
                                            className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full"
                                            title="Activo"
                                        ></span>
                                    ) : (
                                        <span
                                            className="flex-shrink-0 w-2 h-2 bg-gray-300 rounded-full"
                                            title="Inactivo"
                                        ></span>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {/* Pattern Preview */}
                                <div className="bg-gray-50 rounded p-2 mb-3 font-mono text-xs text-gray-700 overflow-hidden text-ellipsis whitespace-nowrap">
                                    {pattern.pattern}
                                </div>

                                {/* Campo Objetivo Badge */}
                                <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                                    <Badge className="bg-blue-50 text-blue-700 border-0 text-xs">
                                        {pattern.target_field_name ||
                                            "Sin campo"}
                                    </Badge>
                                    {pattern.usage_count > 0 && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-gray-500">
                                                {pattern.usage_count} usos
                                            </span>
                                            {pattern.success_rate >= 80 ? (
                                                <CheckCircle className="w-3 h-3 text-green-500" />
                                            ) : (
                                                <AlertCircle className="w-3 h-3 text-yellow-500" />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() =>
                                                handleEditPattern(pattern)
                                            }
                                            className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleTestPattern(pattern)
                                            }
                                            className="p-1.5 hover:bg-green-50 rounded text-green-600 transition-colors"
                                            title="Probar patrón"
                                        >
                                            <PlayCircle className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleToggleActive(pattern)
                                            }
                                            className={`p-1.5 rounded transition-colors ${
                                                pattern.is_active
                                                    ? "hover:bg-orange-50 text-orange-600"
                                                    : "hover:bg-green-50 text-green-600"
                                            }`}
                                            title={
                                                pattern.is_active
                                                    ? "Desactivar"
                                                    : "Activar"
                                            }
                                        >
                                            {pattern.is_active ? (
                                                <XCircle className="w-4 h-4" />
                                            ) : (
                                                <CheckCircle className="w-4 h-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedPattern(pattern);
                                                setDeleteDialogOpen(true);
                                            }}
                                            className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        P: {pattern.priority}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="py-12 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="bg-gray-100 p-4 rounded-full">
                                <Code className="w-12 h-12 text-gray-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    No se encontraron patrones
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    {searchTerm ||
                                    selectedProvider ||
                                    selectedTargetField
                                        ? "Intenta ajustar los filtros de búsqueda"
                                        : "Comienza creando tu primer patrón de proveedor"}
                                </p>
                                {!searchTerm &&
                                    !selectedProvider &&
                                    !selectedTargetField && (
                                        <Button onClick={handleCreatePattern}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Crear Primer Patrón
                                        </Button>
                                    )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Form Dialog */}
            {formOpen && (
                <ProviderPatternForm
                    open={formOpen}
                    onClose={handleFormClose}
                    pattern={editingPattern}
                />
            )}

            {/* Test Tool Dialog */}
            {testToolOpen && (
                <ProviderPatternTestTool
                    open={testToolOpen}
                    onClose={() => setTestToolOpen(false)}
                    pattern={selectedPattern}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {deleteDialogOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md mx-4">
                        <CardHeader>
                            <CardTitle>Confirmar Eliminación</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-700 mb-4">
                                ¿Estás seguro de que deseas eliminar el patrón{" "}
                                <strong>{selectedPattern?.name}</strong>?
                            </p>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-yellow-800">
                                        Esta acción no se puede deshacer.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setDeleteDialogOpen(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDeletePattern}
                                >
                                    Eliminar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
