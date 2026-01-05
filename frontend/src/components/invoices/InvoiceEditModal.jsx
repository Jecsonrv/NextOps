import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import PropTypes from "prop-types";
import apiClient from "../../lib/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import {
    X,
    Save,
    Loader2,
    FileText,
    Calendar,
    DollarSign,
    Hash,
    Building2,
    Receipt,
    CalendarDays,
    CalendarCheck,
    CalendarClock,
} from "lucide-react";

/**
 * Modal de edición rápida de factura - Diseño ERP profesional
 * Permite editar los campos más importantes sin navegar a otra página
 */
export function InvoiceEditModal({ invoice, isOpen, onClose, onSuccess }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        numero_factura: "",
        monto: "",
        fecha_emision: "",
        fecha_provision: "",
        fecha_facturacion: "",
        tipo_costo: "",
        estado_provision: "",
        estado_facturacion: "",
        notas: "",
    });

    // Opciones para selects
    const TIPO_COSTO_CHOICES = [
        { value: "FLETE", label: "Flete" },
        { value: "CARGOS_NAVIERA", label: "Cargos de Naviera" },
        { value: "TRANSPORTE", label: "Transporte" },
        { value: "ADUANA", label: "Aduana" },
        { value: "ALMACENAJE", label: "Almacenaje" },
        { value: "DEMORA", label: "Demora" },
        { value: "OTRO", label: "Otro" },
    ];

    const ESTADO_PROVISION_CHOICES = [
        { value: "pendiente", label: "Pendiente" },
        { value: "revision", label: "En Revisión" },
        { value: "disputada", label: "Disputada" },
        { value: "provisionada", label: "Provisionada" },
        { value: "anulada", label: "Anulada" },
        { value: "anulada_parcialmente", label: "Anulada Parcialmente" },
        { value: "rechazada", label: "Rechazada" },
    ];

    const ESTADO_FACTURACION_CHOICES = [
        { value: "pendiente", label: "Pendiente" },
        { value: "facturada", label: "Facturada" },
    ];

    // Cargar datos de la factura cuando se abre el modal
    useEffect(() => {
        if (invoice && isOpen) {
            setFormData({
                numero_factura: invoice.numero_factura || "",
                monto: invoice.monto || "",
                fecha_emision: invoice.fecha_emision || "",
                fecha_provision: invoice.fecha_provision || "",
                fecha_facturacion: invoice.fecha_facturacion || "",
                tipo_costo: invoice.tipo_costo || "",
                estado_provision: invoice.estado_provision || "pendiente",
                estado_facturacion: invoice.estado_facturacion || "pendiente",
                notas: invoice.notas || "",
            });
        }
    }, [invoice, isOpen]);

    // Mutation para actualizar
    const updateMutation = useMutation({
        mutationFn: async (data) => {
            // Limpiar campos vacíos
            const cleanData = {};
            Object.keys(data).forEach((key) => {
                if (data[key] !== "" && data[key] !== null) {
                    cleanData[key] = data[key];
                }
            });
            const response = await apiClient.patch(`/invoices/${invoice.id}/`, cleanData);
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

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    if (!isOpen || !invoice) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden">
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
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-6">
                        {/* Sección: Información Principal */}
                        <div>
                            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-4">
                                Información Principal
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                                        <Hash className="w-4 h-4 text-slate-400" />
                                        Número de Factura
                                    </label>
                                    <Input
                                        value={formData.numero_factura}
                                        onChange={(e) => handleChange("numero_factura", e.target.value)}
                                        placeholder="Ej: FAC-001234"
                                        className="bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                                        <DollarSign className="w-4 h-4 text-slate-400" />
                                        Monto
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.monto}
                                        onChange={(e) => handleChange("monto", e.target.value)}
                                        placeholder="0.00"
                                        className="bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sección: Fechas */}
                        <div>
                            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-4">
                                Fechas
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                                        <CalendarDays className="w-4 h-4 text-slate-400" />
                                        Emisión
                                    </label>
                                    <Input
                                        type="date"
                                        value={formData.fecha_emision}
                                        onChange={(e) => handleChange("fecha_emision", e.target.value)}
                                        className="bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                                        <CalendarCheck className="w-4 h-4 text-slate-400" />
                                        Provisión
                                    </label>
                                    <Input
                                        type="date"
                                        value={formData.fecha_provision}
                                        onChange={(e) => handleChange("fecha_provision", e.target.value)}
                                        className="bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                                        <CalendarClock className="w-4 h-4 text-slate-400" />
                                        Facturación
                                    </label>
                                    <Input
                                        type="date"
                                        value={formData.fecha_facturacion}
                                        onChange={(e) => handleChange("fecha_facturacion", e.target.value)}
                                        className="bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sección: Estados y Clasificación */}
                        <div>
                            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-4">
                                Estados y Clasificación
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                                        <Receipt className="w-4 h-4 text-slate-400" />
                                        Tipo de Costo
                                    </label>
                                    <select
                                        value={formData.tipo_costo}
                                        onChange={(e) => handleChange("tipo_costo", e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {TIPO_COSTO_CHOICES.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                                        Estado Provisión
                                    </label>
                                    <select
                                        value={formData.estado_provision}
                                        onChange={(e) => handleChange("estado_provision", e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {ESTADO_PROVISION_CHOICES.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                                        Estado Facturación
                                    </label>
                                    <select
                                        value={formData.estado_facturacion}
                                        onChange={(e) => handleChange("estado_facturacion", e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {ESTADO_FACTURACION_CHOICES.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Sección: Notas */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                                Notas
                            </label>
                            <textarea
                                value={formData.notas}
                                onChange={(e) => handleChange("notas", e.target.value)}
                                rows={3}
                                placeholder="Agregar notas o comentarios..."
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-200">
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
