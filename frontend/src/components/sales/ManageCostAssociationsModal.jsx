import PropTypes from 'prop-types';
import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../lib/api";
import toast from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import {
    X,
    Plus,
    Trash2,
    AlertCircle,
    CheckCircle2,
    Search,
} from "lucide-react";

// Helper para formatear moneda (SIN símbolo $, lo agregamos manualmente)
const formatCurrency = (value) => {
    const number = parseFloat(value);
    if (isNaN(number)) {
        return "0.00";
    }
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(number);
};

// Componente Spinner reutilizable
const Spinner = () => (
    <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
);

// Modal de confirmación para eliminar
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100]">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-600">{message}</p>
                <div className="mt-6 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button variant="destructive" onClick={onConfirm}>
                        Confirmar
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

ConfirmationModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
};

export function ManageCostAssociationsModal({
    salesInvoice,
    onClose,
    onSuccess,
}) {
    const queryClient = useQueryClient();
    const [selectedCosts, setSelectedCosts] = useState({}); // Object: { invoiceId: monto }
    const [searchTerm, setSearchTerm] = useState("");
    const [itemToRemove, setItemToRemove] = useState(null);

    // Obtener asociaciones actuales
    const { data: mappingsData, isLoading: loadingMappings } = useQuery({
        queryKey: ["cost-mappings", salesInvoice.id],
        queryFn: async () => {
            const response = await apiClient.get(
                `/sales/invoices/${salesInvoice.id}/cost_mappings/`
            );
            return response.data;
        },
    });

    // Obtener facturas disponibles
    const { data: availableData, isLoading: loadingAvailable } = useQuery({
        queryKey: ["available-costs", salesInvoice.id],
        queryFn: async () => {
            const response = await apiClient.get(
                `/sales/invoices/${salesInvoice.id}/available_costs/`
            );
            return response.data;
        },
    });

    const filteredAvailableInvoices = useMemo(() => {
        if (!availableData?.available_invoices) return [];
        return availableData.available_invoices.filter(
            (invoice) =>
                invoice.numero_factura
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                invoice.proveedor_nombre
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
        );
    }, [availableData, searchTerm]);

    // Handler para checkbox
    const handleCheckboxChange = (invoice) => {
        setSelectedCosts((prev) => {
            const newSelected = { ...prev };
            if (newSelected[invoice.id]) {
                // Si ya está seleccionado, deseleccionar
                delete newSelected[invoice.id];
            } else {
                // Si no está seleccionado, seleccionar con monto disponible
                newSelected[invoice.id] = invoice.monto_disponible;
            }
            return newSelected;
        });
    };

    // Handler para cambiar monto
    const handleMontoChange = (invoiceId, value) => {
        setSelectedCosts((prev) => ({
            ...prev,
            [invoiceId]: value,
        }));
    };

    // Seleccionar/Deseleccionar todos
    const handleSelectAll = () => {
        if (
            Object.keys(selectedCosts).length ===
            filteredAvailableInvoices.length
        ) {
            // Deseleccionar todos
            setSelectedCosts({});
        } else {
            // Seleccionar todos
            const allSelected = {};
            filteredAvailableInvoices.forEach((invoice) => {
                allSelected[invoice.id] = invoice.monto_disponible;
            });
            setSelectedCosts(allSelected);
        }
    };

    // Mutation para agregar costos (batch)
    const addCostsMutation = useMutation({
        mutationFn: async (costsToAdd) => {
            // Agregar costos uno por uno
            const promises = costsToAdd.map(
                ({ cost_invoice_id, monto_asignado }) =>
                    apiClient.post(
                        `/sales/invoices/${salesInvoice.id}/add_cost/`,
                        { cost_invoice_id, monto_asignado }
                    )
            );
            return await Promise.all(promises);
        },
        onSuccess: (responses) => {
            queryClient.invalidateQueries({
                queryKey: ["cost-mappings", salesInvoice.id],
            });
            queryClient.invalidateQueries({
                queryKey: ["available-costs", salesInvoice.id],
            });
            queryClient.invalidateQueries({
                queryKey: ["salesInvoice", salesInvoice.id],
            });
            queryClient.invalidateQueries({ queryKey: ["salesInvoices"] });

            // Mostrar toast con resultado del último
            const lastResponse = responses[responses.length - 1]?.data;
            toast.success(
                <div>
                    <p className="font-semibold">
                        {responses.length} factura(s) asociada(s)
                    </p>
                    {lastResponse?.updated_margins && (
                        <p className="text-sm mt-1">
                            Nuevo margen: $
                            {formatCurrency(
                                lastResponse.updated_margins.margen_bruto
                            )}{" "}
                            ({lastResponse.updated_margins.porcentaje_margen}%)
                        </p>
                    )}
                </div>,
                { duration: 4000 }
            );

            setSelectedCosts({});
            onSuccess?.();
        },
        onError: (error) => {
            toast.error(
                error.response?.data?.error || "Error al asociar facturas"
            );
        },
    });

    // Mutation para quitar costo
    const removeCostMutation = useMutation({
        mutationFn: async (mappingId) => {
            const response = await apiClient.delete(
                `/sales/invoices/${salesInvoice.id}/remove_cost/${mappingId}/`
            );
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: ["cost-mappings", salesInvoice.id],
            });
            queryClient.invalidateQueries({
                queryKey: ["available-costs", salesInvoice.id],
            });
            queryClient.invalidateQueries({
                queryKey: ["salesInvoice", salesInvoice.id],
            });
            queryClient.invalidateQueries({ queryKey: ["salesInvoices"] });

            toast.success(
                <div>
                    <p className="font-semibold">Asociación eliminada</p>
                    <p className="text-sm mt-1">
                        Nuevo margen: $
                        {formatCurrency(data.updated_margins.margen_bruto)} (
                        {data.updated_margins.porcentaje_margen}%)
                    </p>
                </div>,
                { duration: 4000 }
            );
            setItemToRemove(null);
            onSuccess?.();
        },
        onError: (error) => {
            toast.error(
                error.response?.data?.error || "Error al eliminar asociación"
            );
            setItemToRemove(null);
        },
    });

    const handleAddCosts = () => {
        const selectedIds = Object.keys(selectedCosts);

        if (selectedIds.length === 0) {
            toast.error("Selecciona al menos una factura de costo");
            return;
        }

        // Validar cada selección
        const costsToAdd = [];
        for (const id of selectedIds) {
            const monto = parseFloat(selectedCosts[id]);
            const invoice = availableData.available_invoices.find(
                (inv) => inv.id === parseInt(id)
            );

            if (!invoice) continue;

            const disponible = parseFloat(invoice.monto_disponible);

            if (monto <= 0) {
                toast.error(
                    `El monto para ${invoice.numero_factura} debe ser mayor a 0`
                );
                return;
            }

            if (monto > disponible) {
                toast.error(
                    `El monto para ${
                        invoice.numero_factura
                    } excede el disponible ($${formatCurrency(disponible)})`
                );
                return;
            }

            costsToAdd.push({
                cost_invoice_id: parseInt(id),
                monto_asignado: monto.toString(),
            });
        }

        addCostsMutation.mutate(costsToAdd);
    };

    const handleRemoveRequest = (mappingId, facturaNombre) => {
        setItemToRemove({ mappingId, facturaNombre });
    };

    const handleConfirmRemove = () => {
        if (itemToRemove) {
            removeCostMutation.mutate(itemToRemove.mappingId);
        }
    };

    const getMarginColor = (percentage) => {
        const pct = parseFloat(percentage);
        if (pct < 10) return "text-red-600";
        if (pct < 20) return "text-yellow-600";
        if (pct < 30) return "text-blue-600";
        return "text-green-600";
    };

    return createPortal(
        <>
            <ConfirmationModal
                isOpen={!!itemToRemove}
                onClose={() => setItemToRemove(null)}
                onConfirm={handleConfirmRemove}
                title="Confirmar Eliminación"
                message={`¿Estás seguro de que deseas eliminar la asociación con la factura ${itemToRemove?.facturaNombre}? Esta acción no se puede deshacer.`}
            />
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>
                                Gestionar Facturas de Costo Asociadas
                            </CardTitle>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Info de la factura de venta - RESUMEN FINANCIERO */}
                        <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Información de la factura */}
                                <div>
                                    <h3 className="font-bold text-blue-900 text-xl mb-2">
                                        {salesInvoice.numero_factura}
                                    </h3>
                                    <p className="text-sm text-blue-700">
                                        <span className="font-medium">
                                            Cliente:
                                        </span>{" "}
                                        {salesInvoice.cliente_nombre || "N/A"}
                                    </p>
                                    {salesInvoice.ot_display && (
                                        <p className="text-sm text-blue-700">
                                            <span className="font-medium">
                                                OT:
                                            </span>{" "}
                                            {salesInvoice.ot_display}
                                        </p>
                                    )}
                                </div>

                                {/* Cálculo financiero detallado */}
                                {mappingsData && (
                                    <div className="bg-white rounded-md p-4 border border-blue-200">
                                        <div className="space-y-2">
                                            {/* Total de la factura */}
                                            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                                <span className="text-sm font-medium text-gray-700">
                                                    Total Factura Venta:
                                                </span>
                                                <span className="text-base font-bold text-blue-900">
                                                    $
                                                    {formatCurrency(
                                                        salesInvoice.monto_total
                                                    )}
                                                </span>
                                            </div>

                                            {/* Total de costos */}
                                            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                                <span className="text-sm font-medium text-gray-700">
                                                    Total Costos Asociados:
                                                </span>
                                                <span className="text-base font-bold text-red-600">
                                                    -$
                                                    {formatCurrency(
                                                        mappingsData.total_costos_asignados
                                                    )}
                                                </span>
                                            </div>

                                            {/* Margen resultante */}
                                            <div className="flex justify-between items-center pt-2">
                                                <span className="text-sm font-semibold text-gray-900">
                                                    Margen Bruto:
                                                </span>
                                                <div className="text-right">
                                                    <div className="flex items-center gap-1">
                                                        <span
                                                            className={`text-xl font-bold ${getMarginColor(
                                                                mappingsData.porcentaje_margen
                                                            )}`}
                                                        >
                                                            $
                                                            {formatCurrency(
                                                                mappingsData.margen_actual
                                                            )}
                                                        </span>
                                                    </div>
                                                    <span
                                                        className={`text-sm font-semibold ${getMarginColor(
                                                            mappingsData.porcentaje_margen
                                                        )}`}
                                                    >
                                                        (
                                                        {
                                                            mappingsData.porcentaje_margen
                                                        }
                                                        %)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Asociaciones actuales */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                Facturas de Costo Asociadas
                            </h3>
                            {loadingMappings ? (
                                <Spinner />
                            ) : mappingsData?.cost_mappings?.length === 0 ? (
                                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-500">
                                        No hay facturas de costo asociadas
                                    </p>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Agrega facturas para calcular el margen
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {mappingsData?.cost_mappings?.map(
                                        (mapping) => (
                                            <div
                                                key={mapping.id}
                                                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors bg-white"
                                            >
                                                <div className="flex-1">
                                                    {/* Línea 1: Número de factura */}
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="font-bold text-gray-900 text-base">
                                                            {mapping.cost_invoice_numero ||
                                                                mapping
                                                                    .cost_invoice_data
                                                                    ?.numero_factura ||
                                                                "N/A"}
                                                        </span>
                                                    </div>

                                                    {/* Línea 2: Proveedor y Tipo de Costo */}
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-xs text-gray-500 font-medium">
                                                            Proveedor:
                                                        </span>
                                                        <Badge
                                                            variant="info"
                                                            className="text-xs"
                                                        >
                                                            {mapping.proveedor_nombre ||
                                                                mapping
                                                                    .cost_invoice_data
                                                                    ?.proveedor_nombre ||
                                                                "N/A"}
                                                        </Badge>
                                                        {(mapping.tipo_costo_display ||
                                                            mapping
                                                                .cost_invoice_data
                                                                ?.tipo_costo_display) && (
                                                            <>
                                                                <span className="text-gray-300">
                                                                    |
                                                                </span>
                                                                <span className="text-xs text-gray-500 font-medium">
                                                                    Tipo:
                                                                </span>
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-xs"
                                                                >
                                                                    {mapping.tipo_costo_display ||
                                                                        mapping
                                                                            .cost_invoice_data
                                                                            ?.tipo_costo_display}
                                                                </Badge>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Línea 3: Montos */}
                                                    <div className="flex items-center gap-4 text-sm text-gray-700">
                                                        <span>
                                                            <span className="text-gray-500">
                                                                Total Factura:
                                                            </span>{" "}
                                                            <span className="font-semibold text-gray-900">
                                                                $
                                                                {formatCurrency(
                                                                    mapping
                                                                        .cost_invoice_data
                                                                        ?.monto_aplicable ||
                                                                        mapping
                                                                            .cost_invoice_data
                                                                            ?.monto_total ||
                                                                        "0"
                                                                )}
                                                            </span>
                                                        </span>
                                                        <span className="text-gray-300">
                                                            |
                                                        </span>
                                                        <span>
                                                            <span className="text-gray-500">
                                                                Monto Asignado:
                                                            </span>{" "}
                                                            <span className="font-bold text-blue-600">
                                                                $
                                                                {formatCurrency(
                                                                    mapping.monto_asignado
                                                                )}
                                                            </span>
                                                        </span>
                                                        {mapping.porcentaje_markup && (
                                                            <>
                                                                <span className="text-gray-300">
                                                                    |
                                                                </span>
                                                                <span className="text-green-600 font-medium">
                                                                    Markup:{" "}
                                                                    {parseFloat(
                                                                        mapping.porcentaje_markup
                                                                    ).toFixed(
                                                                        2
                                                                    )}
                                                                    %
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Línea 4: Notas (si existen) */}
                                                    {mapping.notas && (
                                                        <p className="text-xs text-gray-500 mt-2 italic border-l-2 border-gray-300 pl-2">
                                                            {mapping.notas}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Botón eliminar */}
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleRemoveRequest(
                                                            mapping.id,
                                                            mapping.cost_invoice_numero ||
                                                                mapping
                                                                    .cost_invoice_data
                                                                    ?.numero_factura ||
                                                                "esta factura"
                                                        )
                                                    }
                                                    disabled={
                                                        removeCostMutation.isPending
                                                    }
                                                    className="ml-4"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Agregar nuevas facturas con checkboxes */}
                        <div className="border-t pt-6">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Plus className="h-5 w-5 text-blue-600" />
                                    Agregar Facturas de Costo
                                </h3>
                                {filteredAvailableInvoices.length > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSelectAll}
                                    >
                                        {Object.keys(selectedCosts).length ===
                                        filteredAvailableInvoices.length
                                            ? "Deseleccionar Todas"
                                            : "Seleccionar Todas"}
                                    </Button>
                                )}
                            </div>

                            {loadingAvailable ? (
                                <Spinner />
                            ) : availableData?.available_invoices?.length ===
                              0 ? (
                                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-500">
                                        No hay facturas disponibles para asociar
                                    </p>
                                    <p className="text-sm text-gray-400 mt-1">
                                        {salesInvoice.ot
                                            ? "No hay facturas provisionadas para esta OT"
                                            : "Asigna una OT a esta factura"}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Buscador */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar por número de factura o proveedor..."
                                            value={searchTerm}
                                            onChange={(e) =>
                                                setSearchTerm(e.target.value)
                                            }
                                            className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Lista de facturas con checkboxes */}
                                    <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-3 bg-gray-50">
                                        {filteredAvailableInvoices.length ===
                                        0 ? (
                                            <p className="text-center text-gray-500 py-4">
                                                No se encontraron facturas
                                            </p>
                                        ) : (
                                            filteredAvailableInvoices.map(
                                                (invoice) => {
                                                    const isSelected =
                                                        !!selectedCosts[
                                                            invoice.id
                                                        ];
                                                    const isDisabled =
                                                        parseFloat(
                                                            invoice.monto_disponible
                                                        ) <= 0;

                                                    return (
                                                        <div
                                                            key={invoice.id}
                                                            className={`p-3 border rounded-lg bg-white transition-all ${
                                                                isSelected
                                                                    ? "border-blue-500 bg-blue-50"
                                                                    : "border-gray-200"
                                                            } ${
                                                                isDisabled
                                                                    ? "opacity-50 cursor-not-allowed"
                                                                    : "hover:border-blue-300 cursor-pointer"
                                                            }`}
                                                        >
                                                            {/* Checkbox y datos básicos */}
                                                            <div className="flex items-start gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        isSelected
                                                                    }
                                                                    disabled={
                                                                        isDisabled
                                                                    }
                                                                    onChange={() =>
                                                                        handleCheckboxChange(
                                                                            invoice
                                                                        )
                                                                    }
                                                                    className="mt-1 h-4 w-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    {/* Línea 1: Número de factura */}
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <span className="font-bold text-gray-900 text-sm">
                                                                            {
                                                                                invoice.numero_factura
                                                                            }
                                                                        </span>
                                                                    </div>

                                                                    {/* Línea 2: Proveedor y Tipo */}
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <span className="text-xs text-gray-500 font-medium">
                                                                            Proveedor:
                                                                        </span>
                                                                        <Badge
                                                                            variant="info"
                                                                            className="text-xs"
                                                                        >
                                                                            {
                                                                                invoice.proveedor_nombre
                                                                            }
                                                                        </Badge>
                                                                        {invoice.tipo_costo_display && (
                                                                            <>
                                                                                <span className="text-gray-300">
                                                                                    |
                                                                                </span>
                                                                                <span className="text-xs text-gray-500 font-medium">
                                                                                    Tipo:
                                                                                </span>
                                                                                <Badge
                                                                                    variant="outline"
                                                                                    className="text-xs"
                                                                                >
                                                                                    {
                                                                                        invoice.tipo_costo_display
                                                                                    }
                                                                                </Badge>
                                                                            </>
                                                                        )}
                                                                    </div>

                                                                    {/* Línea 3: Montos */}
                                                                    <div className="flex items-center gap-3 text-xs text-gray-700">
                                                                        <span>
                                                                            <span className="text-gray-500">
                                                                                Total:
                                                                            </span>{" "}
                                                                            <span className="font-semibold text-gray-900">
                                                                                $
                                                                                {formatCurrency(
                                                                                    invoice.monto_aplicable
                                                                                )}
                                                                            </span>
                                                                        </span>
                                                                        <span className="text-gray-300">
                                                                            |
                                                                        </span>
                                                                        <span
                                                                            className={
                                                                                parseFloat(
                                                                                    invoice.monto_disponible
                                                                                ) >
                                                                                0
                                                                                    ? "text-green-600 font-medium"
                                                                                    : "text-red-600 font-medium"
                                                                            }
                                                                        >
                                                                            <span className="text-gray-500">
                                                                                Disponible:
                                                                            </span>{" "}
                                                                            $
                                                                            {formatCurrency(
                                                                                invoice.monto_disponible
                                                                            )}
                                                                        </span>
                                                                    </div>

                                                                    {/* Input de monto si está seleccionado */}
                                                                    {isSelected && (
                                                                        <div className="mt-2">
                                                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                                Monto
                                                                                a
                                                                                Asignar
                                                                            </label>
                                                                            <input
                                                                                type="number"
                                                                                step="0.01"
                                                                                min="0.01"
                                                                                max={
                                                                                    invoice.monto_disponible
                                                                                }
                                                                                value={
                                                                                    selectedCosts[
                                                                                        invoice
                                                                                            .id
                                                                                    ]
                                                                                }
                                                                                onChange={(
                                                                                    e
                                                                                ) =>
                                                                                    handleMontoChange(
                                                                                        invoice.id,
                                                                                        e
                                                                                            .target
                                                                                            .value
                                                                                    )
                                                                                }
                                                                                onClick={(
                                                                                    e
                                                                                ) =>
                                                                                    e.stopPropagation()
                                                                                }
                                                                                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                                placeholder="0.00"
                                                                            />
                                                                            <p className="text-xs text-gray-500 mt-1">
                                                                                Máximo:
                                                                                $
                                                                                {formatCurrency(
                                                                                    invoice.monto_disponible
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            )
                                        )}
                                    </div>

                                    {/* Botón de asociar */}
                                    {Object.keys(selectedCosts).length > 0 && (
                                        <div className="flex gap-3 pt-2">
                                            <Button
                                                onClick={handleAddCosts}
                                                disabled={
                                                    addCostsMutation.isPending
                                                }
                                                className="flex-1"
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                {addCostsMutation.isPending
                                                    ? "Asociando..."
                                                    : `Asociar ${
                                                          Object.keys(
                                                              selectedCosts
                                                          ).length
                                                      } Factura${
                                                          Object.keys(
                                                              selectedCosts
                                                          ).length > 1
                                                              ? "s"
                                                              : ""
                                                      }`}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() =>
                                                    setSelectedCosts({})
                                                }
                                                disabled={
                                                    addCostsMutation.isPending
                                                }
                                            >
                                                Limpiar Selección
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer con ayuda */}
                        <div className="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-xs text-gray-600">
                                <strong>Tip:</strong> Los márgenes se calculan
                                automáticamente al agregar o quitar facturas de
                                costo. Un margen bajo (menos del 10%) aparecerá
                                en rojo como advertencia.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>,
        document.body
    );
}

ManageCostAssociationsModal.propTypes = {
    salesInvoice: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func,
};
