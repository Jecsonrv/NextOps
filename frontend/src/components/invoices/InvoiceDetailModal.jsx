import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import PropTypes from "prop-types";
import apiClient from "../../lib/api";
import { formatDate } from "../../lib/dateUtils";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import {
    X,
    FileText,
    Download,
    Edit,
    Link2,
    Calendar,
    DollarSign,
    Building2,
    Package,
    Loader2,
    User,
    AlertTriangle,
    CreditCard,
    CheckCircle,
    Clock,
    FileCheck,
    Banknote,
    Receipt,
    Ship,
    Hash,
    CalendarDays,
    CalendarCheck,
    CalendarClock,
    ExternalLink,
    Printer,
} from "lucide-react";

/**
 * Modal de detalle completo de factura - Diseño ERP profesional
 * Muestra toda la información relevante y permite acciones rápidas
 */
export function InvoiceDetailModal({
    invoice,
    isOpen,
    onClose,
    onEdit,
    onAssignOT,
    onCreateDispute
}) {
    const queryClient = useQueryClient();
    const [downloading, setDownloading] = useState(false);

    // Mutation para provisionar rápidamente
    const provisionMutation = useMutation({
        mutationFn: async () => {
            const today = new Date().toISOString().split("T")[0];
            const response = await apiClient.patch(`/invoices/${invoice.id}/`, {
                estado_provision: "provisionada",
                fecha_provision: today,
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["invoices"]);
            queryClient.invalidateQueries(["invoices-stats"]);
            toast.success("Factura provisionada exitosamente");
        },
        onError: () => {
            toast.error("Error al provisionar la factura");
        },
    });

    const handleDownload = async () => {
        if (!invoice?.id) return;
        setDownloading(true);
        try {
            const response = await apiClient.get(
                `/invoices/${invoice.id}/file/?download=true`,
                { responseType: "blob" }
            );
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const contentDisposition = response.headers["content-disposition"];
            let filename = invoice.numero_factura
                ? `${invoice.numero_factura}.pdf`
                : `factura-${invoice.id}.pdf`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="([^"]+)"/i);
                if (match?.[1]) filename = match[1];
            }
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error("Error al descargar el archivo");
        } finally {
            setDownloading(false);
        }
    };

    if (!isOpen || !invoice) return null;

    const montoOriginal = parseFloat(invoice.monto || 0);
    const montoAplicable = parseFloat(invoice.monto_aplicable ?? invoice.monto ?? 0);
    const montoPagado = parseFloat(invoice.monto_pagado ?? 0);
    const montoPendiente = parseFloat(invoice.monto_pendiente ?? (montoAplicable - montoPagado));
    const porcentajePagado = montoAplicable > 0 ? (montoPagado / montoAplicable) * 100 : 0;

    // Configuración de estados
    const estadoConfig = {
        pendiente: { label: "Pendiente", color: "bg-amber-50 text-amber-700 border-amber-200" },
        revision: { label: "En Revisión", color: "bg-blue-50 text-blue-700 border-blue-200" },
        disputada: { label: "Disputada", color: "bg-orange-50 text-orange-700 border-orange-200" },
        provisionada: { label: "Provisionada", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
        anulada: { label: "Anulada", color: "bg-red-50 text-red-700 border-red-200" },
        anulada_parcialmente: { label: "Anulada Parcial", color: "bg-orange-50 text-orange-700 border-orange-200" },
        rechazada: { label: "Rechazada", color: "bg-red-50 text-red-700 border-red-200" },
    };

    const estadoPagoConfig = {
        pendiente: { label: "Pendiente", color: "bg-slate-50 text-slate-600 border-slate-200" },
        pagado_parcial: { label: "Pago Parcial", color: "bg-amber-50 text-amber-700 border-amber-200" },
        pagado_total: { label: "Pagado", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    };

    const currentEstado = estadoConfig[invoice.estado_provision] || estadoConfig.pendiente;
    const currentEstadoPago = estadoPagoConfig[invoice.estado_pago] || estadoPagoConfig.pendiente;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                            <Receipt className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                {invoice.numero_factura || "Sin Número"}
                            </h2>
                            <p className="text-sm text-slate-500">
                                {invoice.proveedor_data?.nombre || invoice.proveedor_nombre || "Proveedor desconocido"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${currentEstado.color}`}>
                            {currentEstado.label}
                        </span>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${currentEstadoPago.color}`}>
                            {currentEstadoPago.label}
                        </span>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Columna Principal - 2/3 */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Montos */}
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-4">
                                    Información de Montos
                                </h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-3 bg-white rounded-lg border border-slate-100">
                                        <p className="text-xs text-slate-500 mb-1">Monto Original</p>
                                        <p className="text-xl font-bold text-slate-900">
                                            ${montoOriginal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="text-center p-3 bg-white rounded-lg border border-slate-100">
                                        <p className="text-xs text-slate-500 mb-1">Pagado</p>
                                        <p className="text-xl font-bold text-emerald-600">
                                            ${montoPagado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="text-center p-3 bg-white rounded-lg border border-slate-100">
                                        <p className="text-xs text-slate-500 mb-1">Pendiente</p>
                                        <p className="text-xl font-bold text-amber-600">
                                            ${montoPendiente.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                                {/* Barra de progreso */}
                                <div className="mt-4">
                                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                                        <span>Progreso de pago</span>
                                        <span>{Math.round(porcentajePagado)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all ${
                                                porcentajePagado >= 100
                                                    ? "bg-emerald-500"
                                                    : porcentajePagado > 0
                                                    ? "bg-amber-500"
                                                    : "bg-slate-300"
                                            }`}
                                            style={{ width: `${Math.min(100, porcentajePagado)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Detalles de la Factura */}
                            <div className="bg-white rounded-lg border border-slate-200">
                                <div className="px-4 py-3 border-b border-slate-100">
                                    <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                        Detalles de la Factura
                                    </h3>
                                </div>
                                <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <Hash className="w-4 h-4 text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-slate-500">Número de Factura</p>
                                                <p className="font-medium text-slate-900">{invoice.numero_factura || "-"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Building2 className="w-4 h-4 text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-slate-500">Proveedor</p>
                                                <p className="font-medium text-slate-900">
                                                    {invoice.proveedor_data?.nombre || invoice.proveedor_nombre || "-"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Receipt className="w-4 h-4 text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-slate-500">Concepto / Tipo Costo</p>
                                                <p className="font-medium text-slate-900">
                                                    {invoice.tipo_costo_display || invoice.tipo_costo || "-"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <CalendarDays className="w-4 h-4 text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-slate-500">Fecha de Emisión</p>
                                                <p className="font-medium text-slate-900">{formatDate(invoice.fecha_emision) || "-"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <CalendarCheck className="w-4 h-4 text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-slate-500">Fecha de Provisión</p>
                                                <p className="font-medium text-slate-900">{formatDate(invoice.fecha_provision) || "-"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <CalendarClock className="w-4 h-4 text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-slate-500">Fecha de Facturación</p>
                                                <p className="font-medium text-slate-900">{formatDate(invoice.fecha_facturacion) || "-"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* OT Asignada */}
                            {invoice.ot_data ? (
                                <div className="bg-white rounded-lg border border-slate-200">
                                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                        <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                            <Package className="w-4 h-4 text-slate-400" />
                                            Orden de Transporte Asignada
                                        </h3>
                                        <a
                                            href={`/ots/${invoice.ot_data.id}`}
                                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                        >
                                            Ver OT <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                    <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <p className="text-xs text-slate-500">OT</p>
                                            <p className="font-semibold text-slate-900">{invoice.ot_data.numero_ot}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Cliente</p>
                                            <p className="font-medium text-slate-900">{invoice.ot_data.cliente || "-"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Operativo</p>
                                            <p className="font-medium text-slate-900">{invoice.ot_data.operativo || "-"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">MBL</p>
                                            <p className="font-mono text-slate-900 text-xs">{invoice.ot_data.mbl || "-"}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 rounded-lg border border-dashed border-slate-300 p-6 text-center">
                                    <Package className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                    <p className="text-sm text-slate-600 mb-3">Sin OT asignada</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            onClose();
                                            onAssignOT?.(invoice);
                                        }}
                                    >
                                        <Link2 className="w-4 h-4 mr-2" />
                                        Asignar OT
                                    </Button>
                                </div>
                            )}

                            {/* Disputas */}
                            {invoice.disputas?.length > 0 && (
                                <div className="bg-white rounded-lg border border-orange-200">
                                    <div className="px-4 py-3 border-b border-orange-100 bg-orange-50">
                                        <h3 className="text-sm font-medium text-orange-700 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            Disputas ({invoice.disputas.length})
                                        </h3>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        {invoice.disputas.map((d) => (
                                            <div
                                                key={d.id}
                                                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {d.tipo_disputa_display || d.tipo_disputa}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        Caso: {d.numero_caso}
                                                    </p>
                                                </div>
                                                <span className={`px-2 py-1 text-xs font-medium rounded ${
                                                    d.estado === 'abierta' ? 'bg-amber-100 text-amber-700' :
                                                    d.estado === 'resuelta' ? 'bg-emerald-100 text-emerald-700' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {d.estado_display || d.estado}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Columna Lateral - 1/3 */}
                        <div className="space-y-4">
                            {/* Acciones Rápidas */}
                            <div className="bg-white rounded-lg border border-slate-200 p-4">
                                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                                    Acciones Rápidas
                                </h3>
                                <div className="space-y-2">
                                    {invoice.estado_provision === "pendiente" && (
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="w-full justify-start bg-emerald-600 hover:bg-emerald-700"
                                            onClick={() => provisionMutation.mutate()}
                                            disabled={provisionMutation.isPending}
                                        >
                                            {provisionMutation.isPending ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                            )}
                                            Provisionar Hoy
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start"
                                        onClick={() => {
                                            onClose();
                                            onEdit?.(invoice);
                                        }}
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Editar Factura
                                    </Button>
                                    {invoice.ot_data && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full justify-start"
                                            onClick={() => {
                                                onClose();
                                                onAssignOT?.(invoice);
                                            }}
                                        >
                                            <Link2 className="w-4 h-4 mr-2" />
                                            Cambiar OT
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start"
                                        onClick={() => {
                                            onClose();
                                            onCreateDispute?.(invoice);
                                        }}
                                    >
                                        <AlertTriangle className="w-4 h-4 mr-2" />
                                        Crear Disputa
                                    </Button>
                                </div>
                            </div>

                            {/* Archivo */}
                            {invoice.file_url && (
                                <div className="bg-white rounded-lg border border-slate-200 p-4">
                                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                                        Documento
                                    </h3>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={handleDownload}
                                            disabled={downloading}
                                        >
                                            {downloading ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Download className="w-4 h-4 mr-2" />
                                            )}
                                            Descargar
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Notas de Crédito */}
                            {invoice.notas_credito?.length > 0 && (
                                <div className="bg-white rounded-lg border border-slate-200">
                                    <div className="px-4 py-3 border-b border-slate-100">
                                        <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                            Notas de Crédito ({invoice.notas_credito.length})
                                        </h3>
                                    </div>
                                    <div className="p-3 space-y-2">
                                        {invoice.notas_credito.map((nc) => (
                                            <div
                                                key={nc.id}
                                                className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm"
                                            >
                                                <span className="text-slate-600">NC {nc.numero_nota}</span>
                                                <span className="font-medium text-red-600">
                                                    -${Math.abs(parseFloat(nc.monto)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Información Adicional */}
                            <div className="bg-slate-50 rounded-lg p-4 text-xs text-slate-500">
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span>ID:</span>
                                        <span className="font-mono">{invoice.id}</span>
                                    </div>
                                    {invoice.processed_at && (
                                        <div className="flex justify-between">
                                            <span>Procesada:</span>
                                            <span>{formatDate(invoice.processed_at)}</span>
                                        </div>
                                    )}
                                    {invoice.assignment_method && (
                                        <div className="flex justify-between">
                                            <span>Método asignación:</span>
                                            <span>{invoice.assignment_method}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock className="w-4 h-4" />
                        <span>Última actualización: {formatDate(invoice.updated_at) || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={onClose}>
                            Cerrar
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                onClose();
                                onEdit?.(invoice);
                            }}
                        >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

InvoiceDetailModal.propTypes = {
    invoice: PropTypes.object,
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onEdit: PropTypes.func,
    onAssignOT: PropTypes.func,
    onCreateDispute: PropTypes.func,
};

export default InvoiceDetailModal;
