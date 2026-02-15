/**
 * Página de Catálogo de Patrones de Facturas - VERSIÓN SIMPLIFICADA
 *
 * Sistema de patrones regex para extracción automática:
 * - COSTO: Patrones agrupados por proveedor
 * - VENTA: Patrones agrupados por tipo de documento
 *
 * Cada patrón extrae un campo específico (número factura, MBL, total, IVA, etc.)
 */

import { useState, useEffect } from "react";
import {
    Search,
    RefreshCw,
    Plus,
    Edit2,
    Trash2,
    Package,
    FileText,
    AlertCircle,
    PlayCircle,
    Regex,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { StatCard } from "../components/common/StatCard";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import InvoicePatternForm from "../components/patterns/InvoicePatternForm";
import PatternTestModal from "../components/patterns/PatternTestModal";
import apiClient from "../lib/api";

const CATALOG_URL = "/catalogs/invoice-pattern-catalog/";

export default function InvoicePatternCatalogPage() {
    const [patterns, setPatterns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterTipoPatron, setFilterTipoPatron] = useState(""); // 'costo' o 'venta'
    const [filterTipoFactura, setFilterTipoFactura] = useState("");
    const [showInactive, setShowInactive] = useState(false);

    // Dialogs
    const [formOpen, setFormOpen] = useState(false);
    const [editingPattern, setEditingPattern] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedPattern, setSelectedPattern] = useState(null);
    const [testModalOpen, setTestModalOpen] = useState(false);
    const [testingPattern, setTestingPattern] = useState(null);

    // Notification
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
            // Solicitar todos los patrones (sin límite de 25)
            const response = await apiClient.get(
                `${CATALOG_URL}?page_size=1000`,
                getAuthHeaders(),
            );
            const allPatterns = response.data.results || response.data || [];

            // Filtrar en el frontend
            let filtered = allPatterns;

            if (!showInactive) {
                filtered = filtered.filter((p) => p.activo);
            }

            if (filterTipoPatron) {
                filtered = filtered.filter(
                    (p) => p.tipo_patron === filterTipoPatron,
                );
            }

            if (filterTipoFactura) {
                filtered = filtered.filter(
                    (p) => p.tipo_factura === filterTipoFactura,
                );
            }

            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                filtered = filtered.filter(
                    (p) =>
                        p.nombre?.toLowerCase().includes(term) ||
                        p.campo_objetivo?.toLowerCase().includes(term) ||
                        p.proveedor_nombre?.toLowerCase().includes(term) ||
                        p.tipo_documento?.toLowerCase().includes(term),
                );
            }

            setPatterns(filtered);
        } catch (error) {
            console.error("Error loading patterns:", error);
            showNotification("Error al cargar patrones", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPatterns();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showInactive, filterTipoPatron, filterTipoFactura]);

    const showNotification = (message, type = "success") => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleCreatePattern = () => {
        setEditingPattern(null);
        setFormOpen(true);
    };

    const handleEditPattern = (pattern) => {
        setEditingPattern(pattern);
        setFormOpen(true);
    };

    const handleFormClose = (success) => {
        setFormOpen(false);
        setEditingPattern(null);
        if (success) {
            showNotification(
                `Patrón ${
                    editingPattern ? "actualizado" : "creado"
                } exitosamente`,
            );
            loadPatterns();
        }
    };

    const handleDeletePattern = async () => {
        if (!selectedPattern) return;

        try {
            await apiClient.delete(
                `${CATALOG_URL}${selectedPattern.id}/`,
                getAuthHeaders(),
            );
            showNotification("Patrón eliminado exitosamente");
            setDeleteDialogOpen(false);
            setSelectedPattern(null);
            loadPatterns();
        } catch (error) {
            console.error("Error deleting pattern:", error);
            showNotification("Error al eliminar patrón", "error");
        }
    };

    const handleToggleActive = async (pattern) => {
        try {
            await apiClient.patch(
                `${CATALOG_URL}${pattern.id}/`,
                { activo: !pattern.activo },
                getAuthHeaders(),
            );
            showNotification(
                `Patrón ${
                    !pattern.activo ? "activado" : "desactivado"
                } exitosamente`,
            );
            loadPatterns();
        } catch (error) {
            console.error("Error toggling pattern:", error);
            showNotification("Error al cambiar estado del patrón", "error");
        }
    };

    const handleTestPattern = (pattern) => {
        setTestingPattern(pattern);
        setTestModalOpen(true);
    };

    // Agrupar patrones por proveedor (COSTO) o tipo_documento (VENTA)
    const groupedPatterns = patterns.reduce((acc, pattern) => {
        let groupKey;
        let groupName;

        if (pattern.tipo_patron === "costo") {
            groupKey = `costo_${pattern.proveedor_id || "sin_proveedor"}`;
            groupName = pattern.proveedor_nombre || "Sin Proveedor";
        } else {
            groupKey = `venta_${pattern.tipo_documento || "sin_tipo"}`;
            groupName = pattern.tipo_documento || "Sin Tipo Documento";
        }

        if (!acc[groupKey]) {
            acc[groupKey] = {
                key: groupKey,
                name: groupName,
                tipo_patron: pattern.tipo_patron,
                tipo_factura: pattern.tipo_factura,
                patterns: [],
            };
        }

        acc[groupKey].patterns.push(pattern);

        return acc;
    }, {});

    const groups = Object.values(groupedPatterns).sort((a, b) =>
        a.name.localeCompare(b.name),
    );

    const stats = {
        total: patterns.length,
        active: patterns.filter((p) => p.activo).length,
        costo: patterns.filter((p) => p.tipo_patron === "costo").length,
        venta: patterns.filter((p) => p.tipo_patron === "venta").length,
    };

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Patrones"
                    value={stats.total}
                    icon={FileText}
                />
                <StatCard
                    label="Activos"
                    value={stats.active}
                    icon={PlayCircle}
                />
                <StatCard label="Costo" value={stats.costo} icon={Package} />
                <StatCard label="Venta" value={stats.venta} icon={FileText} />
            </div>

            {/* Notification */}
            {notification && (
                <div
                    className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
                        notification.type === "success"
                            ? "bg-emerald-50 text-green-800 border border-green-200"
                            : "bg-destructive/10 text-red-800 border border-destructive/20"
                    }`}
                >
                    <AlertCircle className="w-5 h-5" />
                    <span>{notification.message}</span>
                </div>
            )}

            {/* Filters & Actions */}
            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Buscar patrones..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Tipo Patrón Filter */}
                        <select
                            value={filterTipoPatron}
                            onChange={(e) =>
                                setFilterTipoPatron(e.target.value)
                            }
                            className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Todos los tipos</option>
                            <option value="costo">Costo (Proveedores)</option>
                            <option value="venta">Venta (Clientes)</option>
                        </select>

                        {/* Tipo Factura Filter */}
                        <select
                            value={filterTipoFactura}
                            onChange={(e) =>
                                setFilterTipoFactura(e.target.value)
                            }
                            className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Nacional/Internacional</option>
                            <option value="nacional">Nacional</option>
                            <option value="internacional">Internacional</option>
                        </select>

                        {/* Show Inactive Toggle */}
                        <label className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg border border-border cursor-pointer hover:bg-muted">
                            <input
                                type="checkbox"
                                checked={showInactive}
                                onChange={(e) =>
                                    setShowInactive(e.target.checked)
                                }
                                className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-foreground">
                                Mostrar inactivos
                            </span>
                        </label>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={loadPatterns}
                                disabled={loading}
                            >
                                <RefreshCw
                                    className={`w-4 h-4 ${
                                        loading ? "animate-spin" : ""
                                    }`}
                                />
                            </Button>
                            <Button size="sm" onClick={handleCreatePattern}>
                                <Plus className="w-4 h-4 mr-2" />
                                Nuevo Patrón
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Grouped Patterns List */}
            {loading ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <RefreshCw className="w-8 h-8 mx-auto mb-4 text-muted-foreground animate-spin" />
                        <p className="text-muted-foreground">
                            Cargando patrones...
                        </p>
                    </CardContent>
                </Card>
            ) : groups.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-muted-foreground mb-4">
                            No se encontraron patrones
                        </p>
                        <Button onClick={handleCreatePattern}>
                            <Plus className="w-4 h-4 mr-2" />
                            Crear Primer Patrón
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {groups.map((group) => (
                        <Card key={group.key}>
                            <CardHeader className="border-b bg-muted">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {group.tipo_patron === "costo" ? (
                                            <Package className="w-6 h-6 text-purple-600" />
                                        ) : (
                                            <FileText className="w-6 h-6 text-primary" />
                                        )}
                                        <div>
                                            <CardTitle className="text-xl">
                                                {group.name}
                                            </CardTitle>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {group.patterns.length}{" "}
                                                patrón(es) •{" "}
                                                {group.tipo_factura ===
                                                "nacional"
                                                    ? "Nacional"
                                                    : "Internacional"}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge
                                        className={
                                            group.tipo_patron === "costo"
                                                ? "bg-purple-100 text-purple-800"
                                                : "bg-primary/10 text-blue-800"
                                        }
                                    >
                                        {group.tipo_patron === "costo"
                                            ? "Costo"
                                            : "Venta"}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-3">
                                    {group.patterns.map((pattern) => (
                                        <div
                                            key={pattern.id}
                                            className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-border hover:shadow-sm transition-all"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="font-semibold text-foreground">
                                                        {pattern.nombre}
                                                    </h4>
                                                    {pattern.campo_objetivo && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs"
                                                        >
                                                            {
                                                                pattern.campo_objetivo
                                                            }
                                                        </Badge>
                                                    )}
                                                    {!pattern.activo && (
                                                        <Badge className="bg-muted text-muted-foreground text-xs">
                                                            Inactivo
                                                        </Badge>
                                                    )}
                                                </div>
                                                {pattern.patron_regex && (
                                                    <div className="flex items-start gap-2 text-sm">
                                                        <code className="flex-1 px-3 py-2 bg-muted border border-border rounded font-mono text-xs text-foreground overflow-x-auto">
                                                            {
                                                                pattern.patron_regex
                                                            }
                                                        </code>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                    <span>
                                                        Prioridad:{" "}
                                                        {pattern.prioridad}
                                                    </span>
                                                    {pattern.uso_count > 0 && (
                                                        <span>
                                                            Usos:{" "}
                                                            {pattern.uso_count}
                                                        </span>
                                                    )}
                                                    {pattern.exito_count >
                                                        0 && (
                                                        <span>
                                                            Éxitos:{" "}
                                                            {
                                                                pattern.exito_count
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 ml-4">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleTestPattern(
                                                            pattern,
                                                        )
                                                    }
                                                    title="Probar patrón"
                                                >
                                                    <PlayCircle className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleToggleActive(
                                                            pattern,
                                                        )
                                                    }
                                                    title={
                                                        pattern.activo
                                                            ? "Desactivar"
                                                            : "Activar"
                                                    }
                                                >
                                                    {pattern.activo ? (
                                                        <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                                                    ) : (
                                                        <span className="w-3 h-3 bg-muted rounded-full"></span>
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleEditPattern(
                                                            pattern,
                                                        )
                                                    }
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedPattern(
                                                            pattern,
                                                        );
                                                        setDeleteDialogOpen(
                                                            true,
                                                        );
                                                    }}
                                                    className="text-destructive hover:text-red-700"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Form Modal */}
            <InvoicePatternForm
                open={formOpen}
                onClose={handleFormClose}
                pattern={editingPattern}
                initialTipoPatron={filterTipoPatron || "costo"}
            />

            {/* Test Modal */}
            <PatternTestModal
                isOpen={testModalOpen}
                onClose={() => {
                    setTestModalOpen(false);
                    setTestingPattern(null);
                }}
                pattern={testingPattern}
            />

            {/* Delete Confirmation Dialog */}
            {deleteDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Confirmar Eliminación</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-6">
                                ¿Estás seguro de eliminar el patrón &quot;
                                {selectedPattern?.nombre}&quot;? Esta acción no
                                se puede deshacer.
                            </p>
                            <div className="flex justify-end gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setDeleteDialogOpen(false);
                                        setSelectedPattern(null);
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleDeletePattern}
                                    className="bg-red-600 hover:bg-red-700"
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
