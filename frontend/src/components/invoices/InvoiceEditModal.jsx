import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import PropTypes from "prop-types";
import apiClient from "../../lib/api";
import { useProviders } from "../../hooks/useInvoices";
import { useCostTypes } from "../../hooks/useCostTypes";
import { useProviderTypes } from "../../hooks/useProviderTypes";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import {
    X,
    Save,
    Loader2,
    FileText,
    Info,
} from "lucide-react";

const ESTADO_PROVISION_OPTIONS = [
    { value: "pendiente", label: "Pendiente" },
    { value: "provisionada", label: "Provisionada" },
    { value: "revision", label: "En Revisión" },
    { value: "disputada", label: "Disputada" },
];

const ESTADO_FACTURACION_OPTIONS = [
    { value: "pendiente", label: "Pendiente" },
    { value: "facturada", label: "Facturada" },
];

const MANUAL_PROVISION_STATES = new Set(["revision", "disputada"]);

/**
 * Modal de edición completa de factura - Mismos campos que InvoiceEditPage
 * Permite editar todos los campos sin navegar a otra página
 */
export function InvoiceEditModal({ invoice, isOpen, onClose, onSuccess }) {
    const queryClient = useQueryClient();

    // Cargar datos dinámicos
    const { data: providers, isLoading: providersLoading } = useProviders({ page_size: 1000 });
    const { data: costTypes, isLoading: costTypesLoading } = useCostTypes();
    const { data: providerTypes, isLoading: providerTypesLoading } = useProviderTypes();

    const [formData, setFormData] = useState({
        numero_factura: "",
        monto: "",
        fecha_emision: "",
        fecha_vencimiento: "",
        fecha_provision: "",
        fecha_facturacion: "",
        tipo_costo: "",
        proveedor_id: "",
        tipo_proveedor: "",
        estado_provision: "pendiente",
        estado_facturacion: "pendiente",
        notas: "",
    });

    // Helper function para determinar si un tipo de costo está vinculado a OT
    const isCostTypeLinkedToOT = (tipoCosto) => {
        if (!tipoCosto) return false;
        if (tipoCosto === 'FLETE' || tipoCosto === 'CARGOS_NAVIERA') return true;
        if (tipoCosto.startsWith('FLETE') || tipoCosto.startsWith('CARGOS_NAVIERA')) return true;
        const costType = costTypes?.results?.find(ct => ct.code === tipoCosto);
        return costType?.is_linked_to_ot === true;
    };

    // Cargar datos cuando se abre el modal
    useEffect(() => {
        if (invoice && isOpen) {
            const shouldSyncWithOT =
                (invoice.tipo_costo?.startsWith("FLETE") ||
                    invoice.tipo_costo === "CARGOS_NAVIERA") &&
                invoice.tipo_proveedor === "naviera" &&
                invoice.ot_data;

            const safeDate = (value) => value || "";

            const fechaProvision =
                shouldSyncWithOT && !invoice.fecha_provision
                    ? safeDate(invoice.ot_data?.fecha_provision)
                    : safeDate(invoice.fecha_provision);

            const fechaFacturacion =
                shouldSyncWithOT && !invoice.fecha_facturacion
                    ? safeDate(invoice.ot_data?.fecha_recepcion_factura)
                    : safeDate(invoice.fecha_facturacion);

            const rawEstadoProvision = invoice.estado_provision || "pendiente";
            const estadoProvision = fechaProvision
                ? "provisionada"
                : rawEstadoProvision === "provisionada"
                ? "provisionada"
                : MANUAL_PROVISION_STATES.has(rawEstadoProvision)
                ? rawEstadoProvision
                : "pendiente";

            const estadoFacturacion = fechaFacturacion
                ? "facturada"
                : invoice.estado_facturacion || "pendiente";

            const resolveProveedorId = () => {
                const rawProveedor = invoice.proveedor;
                if (typeof rawProveedor === "number" || typeof rawProveedor === "string") {
                    return String(rawProveedor);
                }
                if (rawProveedor && typeof rawProveedor === "object" && rawProveedor.id) {
                    return String(rawProveedor.id);
                }
                if (invoice.proveedor_data?.id != null) {
                    return String(invoice.proveedor_data.id);
                }
                return "";
            };

            setFormData({
                numero_factura: invoice.numero_factura || "",
                monto: invoice.monto !== null && invoice.monto !== undefined ? String(invoice.monto) : "",
                fecha_emision: invoice.fecha_emision || "",
                fecha_vencimiento: invoice.fecha_vencimiento || "",
                fecha_provision: fechaProvision,
                fecha_facturacion: fechaFacturacion,
                tipo_costo: invoice.tipo_costo || "",
                proveedor_id: resolveProveedorId(),
                tipo_proveedor: invoice.tipo_proveedor || invoice.proveedor_data?.tipo || "",
                estado_provision: estadoProvision,
                estado_facturacion: estadoFacturacion,
                notas: invoice.notas || "",
            });
        }
    }, [invoice, isOpen]);

    // Mutation para actualizar
    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const normalizeDate = (value) => (value ? value : null);
            let normalizedMonto = data.monto === "" ? null : Number(data.monto);
            if (normalizedMonto !== null && Number.isNaN(normalizedMonto)) {
                normalizedMonto = null;
            }

            const payload = {
                ...data,
                monto: normalizedMonto,
                proveedor_id: data.proveedor_id ? Number(data.proveedor_id) : null,
                fecha_emision: normalizeDate(data.fecha_emision),
                fecha_vencimiento: normalizeDate(data.fecha_vencimiento),
                fecha_provision: normalizeDate(data.fecha_provision),
                fecha_facturacion: normalizeDate(data.fecha_facturacion),
            };

            const response = await apiClient.patch(`/invoices/${invoice.id}/`, payload);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["invoices"]);
            queryClient.invalidateQueries(["invoices-stats"]);
            queryClient.invalidateQueries(["invoice", invoice.id]);
            toast.success("Factura actualizada exitosamente");
            onSuccess?.();
            onClose();
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.detail ||
                                 error.response?.data?.message ||
                                 Object.values(error.response?.data || {})[0]?.[0] ||
                                 "Error al actualizar la factura";
            toast.error(errorMessage);
        },
    });

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => {
            const newData = { ...prev, [name]: value };

            // Lógica de sincronización de tipo de costo
            if (name === "tipo_costo") {
                const oldLinked = isCostTypeLinkedToOT(prev.tipo_costo);
                const newLinked = isCostTypeLinkedToOT(value);
                if (oldLinked && !newLinked) {
                    newData.fecha_provision = "";
                    newData.fecha_facturacion = "";
                    if (!MANUAL_PROVISION_STATES.has(prev.estado_provision)) {
                        newData.estado_provision = "pendiente";
                    }
                    newData.estado_facturacion = "pendiente";
                }
            }

            // Auto-marcado de estados según fechas
            if (name === "fecha_provision") {
                if (value) {
                    newData.estado_provision = "provisionada";
                } else if (!MANUAL_PROVISION_STATES.has(prev.estado_provision)) {
                    newData.estado_provision = "pendiente";
                }
            }

            if (name === "fecha_facturacion") {
                newData.estado_facturacion = value ? "facturada" : "pendiente";
            }

            if (name === "estado_provision") {
                if (value === "pendiente" || MANUAL_PROVISION_STATES.has(value)) {
                    newData.fecha_provision = "";
                }
            }

            return newData;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    if (!isOpen || !invoice) return null;

    const isLinkedToOT = isCostTypeLinkedToOT(formData.tipo_costo);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Editar Factura
                            </h2>
                            <p className="text-sm text-slate-500">
                                {invoice.numero_factura || `ID: ${invoice.id}`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-6">
                        {/* Sección: Información General */}
                        <div className="bg-white border border-slate-200 rounded-lg">
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                                <h3 className="text-sm font-semibold text-slate-700">Información General</h3>
                            </div>
                            <div className="p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Número de Factura *
                                        </label>
                                        <Input
                                            name="numero_factura"
                                            value={formData.numero_factura}
                                            onChange={handleChange}
                                            required
                                            className="bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Monto (USD) *
                                        </label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            name="monto"
                                            value={formData.monto}
                                            onChange={handleChange}
                                            required
                                            className="bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Fecha de Emisión *
                                        </label>
                                        <Input
                                            type="date"
                                            name="fecha_emision"
                                            value={formData.fecha_emision}
                                            onChange={handleChange}
                                            required
                                            className="bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Fecha de Vencimiento
                                        </label>
                                        <Input
                                            type="date"
                                            name="fecha_vencimiento"
                                            value={formData.fecha_vencimiento}
                                            onChange={handleChange}
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Tipo de Costo *
                                        </label>
                                        <select
                                            name="tipo_costo"
                                            value={formData.tipo_costo}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                            disabled={costTypesLoading}
                                        >
                                            <option value="">Selecciona un tipo de costo...</option>
                                            {costTypes?.results?.map((option) => (
                                                <option key={option.code} value={option.code}>
                                                    {option.name}
                                                    {option.is_linked_to_ot ? ' (Vinculado a OT)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                        {isLinkedToOT && invoice?.ot_data && (
                                            <p className="mt-1.5 text-xs text-blue-600 flex items-center gap-1">
                                                <Info className="w-3 h-3" />
                                                Este tipo de costo está vinculado a la OT. Las fechas se sincronizan automáticamente.
                                            </p>
                                        )}
                                        {!isLinkedToOT && formData.tipo_costo && (
                                            <p className="mt-1.5 text-xs text-slate-500">
                                                Este tipo de costo no está vinculado a OT. Las fechas son independientes.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sección: Información del Proveedor */}
                        <div className="bg-white border border-slate-200 rounded-lg">
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                                <h3 className="text-sm font-semibold text-slate-700">Información del Proveedor</h3>
                            </div>
                            <div className="p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Proveedor *
                                        </label>
                                        <select
                                            name="proveedor_id"
                                            value={formData.proveedor_id}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                            disabled={providersLoading}
                                        >
                                            <option value="">Selecciona un proveedor...</option>
                                            {providers?.results?.map((proveedor) => (
                                                <option key={proveedor.id} value={String(proveedor.id)}>
                                                    {proveedor.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Tipo de Proveedor
                                        </label>
                                        <select
                                            name="tipo_proveedor"
                                            value={formData.tipo_proveedor}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            disabled={providerTypesLoading}
                                        >
                                            <option value="">Selecciona tipo...</option>
                                            {providerTypes?.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sección: Estados y Fechas */}
                        <div className="bg-white border border-slate-200 rounded-lg">
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                                <h3 className="text-sm font-semibold text-slate-700">Estados y Fechas</h3>
                            </div>
                            <div className="p-4">
                                {isLinkedToOT && invoice?.ot_data && (
                                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-sm text-blue-700">
                                            <strong>Sincronización Activa:</strong> Las fechas se sincronizan con la OT{" "}
                                            <span className="font-mono">{invoice.ot_data.numero_ot}</span>
                                        </p>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Estado de Provisión
                                        </label>
                                        <select
                                            name="estado_provision"
                                            value={formData.estado_provision}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            {ESTADO_PROVISION_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Fecha de Provisión
                                        </label>
                                        <Input
                                            type="date"
                                            name="fecha_provision"
                                            value={formData.fecha_provision}
                                            onChange={handleChange}
                                            className="bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Estado de Facturación
                                        </label>
                                        <select
                                            name="estado_facturacion"
                                            value={formData.estado_facturacion}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            {ESTADO_FACTURACION_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Fecha de Facturación
                                        </label>
                                        <Input
                                            type="date"
                                            name="fecha_facturacion"
                                            value={formData.fecha_facturacion}
                                            onChange={handleChange}
                                            className="bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sección: Notas */}
                        <div className="bg-white border border-slate-200 rounded-lg">
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                                <h3 className="text-sm font-semibold text-slate-700">Notas</h3>
                            </div>
                            <div className="p-4">
                                <textarea
                                    name="notas"
                                    value={formData.notas}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder="Agrega notas u observaciones sobre esta factura..."
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={updateMutation.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={updateMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {updateMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Guardar Cambios
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

InvoiceEditModal.propTypes = {
    invoice: PropTypes.object,
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func,
};

export default InvoiceEditModal;
