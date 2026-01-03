import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import PropTypes from "prop-types";
import apiClient from "../../lib/api";
import { formatDate, formatDateLocalized } from "../../lib/dateUtils";
import { SlideOver } from "../ui/SlideOver";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { AddProvisionDateModal } from "./AddProvisionDateModal";
import { QuickPaymentModal } from "./QuickPaymentModal";
import {
    FileText,
    Download,
    Edit,
    Link2,
    Calendar,
    DollarSign,
    Building,
    Package,
    Eye,
    Loader2,
    Ship,
    User,
    AlertTriangle,
    CreditCard,
    CheckCircle,
    ExternalLink,
    ClipboardCheck,
} from "lucide-react";

/**
 * Vista rápida de factura en panel lateral
 * Permite ver detalles y realizar acciones sin cambiar de página
 */
export function InvoiceQuickView({ invoice, isOpen, onClose, onUpdate }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
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
            onUpdate?.();
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

    if (!invoice) return null;

    const estadoVariant = {
        pendiente: "pending",
        provisionada: "provisioned",
        revision: "warning",
        disputada: "disputed",
        anulada: "cancelled",
        anulada_parcialmente: "cancelled",
    };

    const montoAplicable =
        invoice.monto_aplicable ?? invoice.monto_original ?? invoice.monto ?? 0;
    const montoPagado = invoice.monto_pagado ?? 0;
    const montoPendiente = invoice.monto_pendiente ?? montoAplicable;
    const porcentajePagado =
        montoAplicable > 0 ? (montoPagado / montoAplicable) * 100 : 0;

    return (
        <>
            <SlideOver
                isOpen={isOpen}
                onClose={onClose}
                title={invoice.numero_factura || `Factura #${invoice.id}`}
                subtitle={invoice.proveedor_data?.nombre || invoice.proveedor_nombre}
                size="lg"
                footer={
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            {invoice.estado_provision === "pendiente" && (
                                <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => provisionMutation.mutate()}
                                    loading={provisionMutation.isPending}
                                >
                                    <ClipboardCheck className="w-4 h-4 mr-1.5" />
                                    Provisionar Hoy
                                </Button>
                            )}
                            {invoice.estado_provision === "provisionada" &&
                                invoice.estado_pago !== "pagado_total" && (
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => setIsPaymentModalOpen(true)}
                                    >
                                        <CreditCard className="w-4 h-4 mr-1.5" />
                                        Registrar Pago
                                    </Button>
                                )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                            >
                                <Edit className="w-4 h-4 mr-1.5" />
                                Editar
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/invoices/${invoice.id}`)}
                            >
                                <ExternalLink className="w-4 h-4 mr-1.5" />
                                Ver Completo
                            </Button>
                        </div>
                    </div>
                }
            >
                <div className="space-y-6">
                    {/* Estados */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            variant={estadoVariant[invoice.estado_provision] || "default"}
                            size="md"
                        >
                            {invoice.estado_provision_display?.toUpperCase() ||
                                invoice.estado_provision?.toUpperCase()}
                        </Badge>
                        {invoice.estado_pago === "pagado_total" && (
                            <Badge variant="paid" size="md">
                                PAGADO
                            </Badge>
                        )}
                        {invoice.estado_pago === "pagado_parcial" && (
                            <Badge variant="warning" size="md">
                                PAGO PARCIAL
                            </Badge>
                        )}
                        {invoice.requiere_revision && (
                            <Badge variant="warning" size="md">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                REVISIÓN
                            </Badge>
                        )}
                    </div>

                    {/* Información de Montos */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide">
                                    Total
                                </p>
                                <p className="text-lg font-bold text-slate-900">
                                    ${parseFloat(montoAplicable).toLocaleString("es-MX", {
                                        minimumFractionDigits: 2,
                                    })}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide">
                                    Pagado
                                </p>
                                <p className="text-lg font-bold text-emerald-600">
                                    ${parseFloat(montoPagado).toLocaleString("es-MX", {
                                        minimumFractionDigits: 2,
                                    })}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide">
                                    Pendiente
                                </p>
                                <p className="text-lg font-bold text-amber-600">
                                    ${parseFloat(montoPendiente).toLocaleString("es-MX", {
                                        minimumFractionDigits: 2,
                                    })}
                                </p>
                            </div>
                        </div>
                        {/* Barra de progreso */}
                        <div className="mt-3">
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                <span>Progreso de pago</span>
                                <span>{Math.round(porcentajePagado)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                                <div
                                    className={`h-1.5 rounded-full transition-all ${
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

                    {/* OT Asignada */}
                    {invoice.ot_data && (
                        <div className="border border-slate-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <Package className="w-4 h-4" />
                                    Orden de Transporte
                                </div>
                                <Link
                                    to={`/ots/${invoice.ot_data.id}`}
                                    className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                                >
                                    <Eye className="w-3 h-3" />
                                    Ver OT
                                </Link>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-slate-500">OT:</span>{" "}
                                    <span className="font-medium text-slate-900">
                                        {invoice.ot_data.numero_ot}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Cliente:</span>{" "}
                                    <span className="font-medium text-slate-900">
                                        {invoice.ot_data.cliente || "-"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500">MBL:</span>{" "}
                                    <span className="font-mono text-slate-900">
                                        {invoice.ot_data.mbl || "-"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Naviera:</span>{" "}
                                    <span className="text-slate-900">
                                        {invoice.ot_data.naviera || "-"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Detalles de la Factura */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Detalles
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-500 block text-xs uppercase tracking-wide mb-1">
                                    Proveedor
                                </span>
                                <span className="text-slate-900">
                                    {invoice.proveedor_data?.nombre ||
                                        invoice.proveedor_nombre ||
                                        "-"}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500 block text-xs uppercase tracking-wide mb-1">
                                    Tipo Costo
                                </span>
                                <span className="text-slate-900">
                                    {invoice.tipo_costo_display || invoice.tipo_costo || "-"}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500 block text-xs uppercase tracking-wide mb-1">
                                    Fecha Emisión
                                </span>
                                <span className="text-slate-900">
                                    {formatDateLocalized(invoice.fecha_emision)}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500 block text-xs uppercase tracking-wide mb-1">
                                    Fecha Provisión
                                </span>
                                <span className="text-slate-900">
                                    {invoice.fecha_provision
                                        ? formatDate(invoice.fecha_provision)
                                        : "-"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Acciones de Archivo */}
                    {invoice.file_url && (
                        <div className="flex gap-2 pt-4 border-t border-slate-100">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                                disabled={downloading}
                                className="flex-1"
                            >
                                {downloading ? (
                                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4 mr-1.5" />
                                )}
                                Descargar PDF
                            </Button>
                        </div>
                    )}

                    {/* Disputas */}
                    {invoice.disputas?.length > 0 && (
                        <div className="border-t border-slate-100 pt-4">
                            <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                Disputas ({invoice.disputas.length})
                            </h4>
                            <div className="space-y-2">
                                {invoice.disputas.slice(0, 3).map((d) => (
                                    <Link
                                        key={d.id}
                                        to={`/disputes/${d.id}`}
                                        className="block p-2 bg-slate-50 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-700">
                                                {d.tipo_disputa_display}
                                            </span>
                                            <Badge variant="disputed" size="xs">
                                                {d.estado_display}
                                            </Badge>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notas de Crédito */}
                    {invoice.notas_credito?.length > 0 && (
                        <div className="border-t border-slate-100 pt-4">
                            <h4 className="text-sm font-medium text-slate-700 mb-3">
                                Notas de Crédito ({invoice.notas_credito.length})
                            </h4>
                            <div className="space-y-2">
                                {invoice.notas_credito.slice(0, 3).map((nc) => (
                                    <div
                                        key={nc.id}
                                        className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-200"
                                    >
                                        <span className="text-sm text-slate-700">
                                            NC {nc.numero_nota}
                                        </span>
                                        <span className="text-sm font-medium text-slate-900">
                                            -$
                                            {parseFloat(nc.monto).toLocaleString("es-MX", {
                                                minimumFractionDigits: 2,
                                            })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </SlideOver>

            {/* Modales */}
            <AddProvisionDateModal
                isOpen={isProvisionModalOpen}
                onClose={() => setIsProvisionModalOpen(false)}
                invoice={invoice}
            />

            <QuickPaymentModal
                invoice={invoice}
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
            />
        </>
    );
}

InvoiceQuickView.propTypes = {
    invoice: PropTypes.object,
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onUpdate: PropTypes.func,
};

export default InvoiceQuickView;
