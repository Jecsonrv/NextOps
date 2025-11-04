import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
    useSalesInvoice,
    useSalesInvoices,
} from "../../hooks/useSalesInvoices";
import { usePayments } from "../../hooks/usePayments";
import { useSalesCreditNotes } from "../../hooks/useSalesCreditNotes";
import { formatDate, formatDateTime } from "../../lib/dateUtils";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ManageCostAssociationsModal } from "../../components/sales/ManageCostAssociationsModal";
import { CreateSalesCreditNoteModal } from "../../components/sales/CreateSalesCreditNoteModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showConfirm, showError, showSuccess } from "../../utils/toast";
import apiClient from "../../lib/api";
import {
    ArrowLeft,
    Edit,
    FileText,
    DollarSign,
    Calendar,
    Building2,
    Receipt,
    Download,
    Link as LinkIcon,
    Settings,
    Trash2,
    Package,
    Eye,
    Loader2,
    Plus,
    AlertCircle,
} from "lucide-react";

import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { FilePreview } from "../../components/ui/FilePreview";

const ESTADO_FACTURACION_CHOICES = [
    { value: "facturada", label: "Facturada", variant: "info" },
    {
        value: "pendiente_cobro",
        label: "Pendiente de Cobro",
        variant: "warning",
    },
    { value: "pagada", label: "Pagada", variant: "success" },
    {
        value: "anulada_parcial",
        label: "Anulada Parcialmente",
        variant: "amber",
    },
    { value: "anulada", label: "Anulada", variant: "destructive" },
];

const ESTADO_PAGO_CHOICES = [
    { value: "pendiente", label: "Pendiente", variant: "warning" },
    { value: "pagado_parcial", label: "Pagado Parcial", variant: "info" },
    { value: "pagado_total", label: "Pagado Total", variant: "success" },
];

export default function SalesInvoiceDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: invoice, isLoading, error, refetch } = useSalesInvoice(id);
    const { data: payments } = usePayments({ sales_invoice: id });
    const { data: creditNotes } = useSalesCreditNotes({ sales_invoice: id });
    const [showManageCosts, setShowManageCosts] = useState(false);
    const [showCreateCreditNote, setShowCreateCreditNote] = useState(false);
    const [fileCache, setFileCache] = useState(null);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Obtener otras facturas de la MISMA OT (excluir la actual)
    const { data: otherSalesInvoices } = useSalesInvoices({
        ot: invoice?.ot, // Backend filtro es 'ot' no 'ot_id'
    });

    const handleFileLoaded = (payload) => {
        if (payload?.blob) {
            setFileCache(payload);
        }
    };

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/sales/invoices/${id}/`);
        },

        onSuccess: () => {
            showSuccess("Factura de venta eliminada exitosamente");

            queryClient.invalidateQueries(["salesInvoices"]);

            navigate("/sales/invoices");
        },

        onError: (err) => {
            // Extraer mensaje de error con logging para debug
            let errorMessage = "Error al eliminar la factura de venta";

            if (err.response?.data) {
                const data = err.response.data;

                // DEBUG: Ver estructura completa
                console.log("🔍 Error data:", data);
                console.log("🔍 Error detail:", data.detail);
                console.log("🔍 Type of detail:", typeof data.detail);

                // Intentar extraer el mensaje del ErrorDetail
                if (data.detail) {
                    // Si es string, usar directamente
                    if (typeof data.detail === "string") {
                        errorMessage = data.detail;
                    }
                    // Si es objeto, intentar diferentes propiedades
                    else if (typeof data.detail === "object") {
                        // Intentar acceder a propiedades comunes
                        errorMessage =
                            data.detail.message ||
                            data.detail.string ||
                            data.detail.msg ||
                            JSON.stringify(data.detail);
                    }
                    // Último recurso: convertir a string
                    else {
                        errorMessage = String(data.detail);
                    }
                }
                // Caso 2: { error: "mensaje" }
                else if (data.error) {
                    errorMessage = data.error;
                }
                // Caso 3: String directo
                else if (typeof data === "string") {
                    errorMessage = data;
                }
            }

            console.log("✉️ Mensaje final:", errorMessage);
            showError(errorMessage);
        },
    });

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = () => {
        deleteMutation.mutate(id);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("es-EC", {
            style: "currency",
            currency: "USD",
        }).format(amount || 0);
    };

    const getStatusBadge = (status, choices) => {
        const statusConfig = choices.find((c) => c.value === status);
        return statusConfig ? (
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        ) : null;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
                    <p className="text-gray-500">Cargando factura...</p>
                </div>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-red-500 mb-4">
                        Error al cargar la factura
                    </p>
                    <Button onClick={() => navigate("/sales/invoices")}>
                        Volver a la lista
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/sales/invoices")}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                            {invoice.numero_factura}
                        </h1>
                        <p className="text-gray-600 mt-1 text-sm truncate">
                            {invoice.cliente_nombre || "Sin cliente"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowManageCosts(true)}
                    >
                        <Settings className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">
                            Gestionar Costos
                        </span>
                    </Button>
                    <Link to={`/sales/payments/new?invoice=${id}`}>
                        <Button variant="success" size="sm">
                            <DollarSign className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">
                                Registrar Pago
                            </span>
                        </Button>
                    </Link>
                    <Link to={`/sales/invoices/${id}/edit`}>
                        <Button size="sm">
                            <Edit className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Editar</span>
                        </Button>
                    </Link>
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={handleDelete}
                        disabled={deleteMutation.isLoading}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Eliminar</span>
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Información General
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Número de Factura
                                </p>
                                <p className="text-base font-semibold break-all">
                                    {invoice.numero_factura}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Cliente
                                </p>
                                <p className="text-base">
                                    {invoice.cliente_nombre_completo ||
                                        invoice.cliente_nombre ||
                                        "N/A"}
                                </p>
                                {invoice.cliente_nombre &&
                                    invoice.cliente_nombre !==
                                        invoice.cliente_nombre_completo && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Alias: {invoice.cliente_nombre}
                                        </p>
                                    )}
                            </div>
                            {invoice.ot && (
                                <div>
                                    <p className="text-sm font-medium text-gray-500">
                                        OT Asociada
                                    </p>
                                    <Link
                                        to={`/ots/${invoice.ot}`}
                                        className="text-base text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        {invoice.ot_numero || invoice.ot}
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Desglose Financiero
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Subtotales e IVA - SOLO para facturas nacionales */}
                            {invoice.tipo_operacion === "nacional" && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">
                                            Subtotal Gravado
                                        </p>
                                        <p className="text-base font-semibold">
                                            {formatCurrency(
                                                invoice.subtotal_gravado
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">
                                            Subtotal Exento
                                        </p>
                                        <p className="text-base font-semibold">
                                            {formatCurrency(
                                                invoice.subtotal_exento
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">
                                            IVA (13%)
                                        </p>
                                        <p className="text-base font-semibold">
                                            {formatCurrency(invoice.iva_total)}
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div
                                className={
                                    invoice.tipo_operacion === "nacional"
                                        ? "border-t pt-4"
                                        : ""
                                }
                            >
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-medium text-gray-500">
                                        Monto Total
                                    </p>
                                    <p className="text-lg font-bold text-gray-900">
                                        {formatCurrency(invoice.monto_total)}
                                    </p>
                                </div>
                            </div>

                            {/* Mostrar retenciones si el cliente es gran contribuyente o si hay retenciones */}
                            {(invoice.cliente_data?.tipo_contribuyente ===
                                "gran_contribuyente" ||
                                invoice.monto_retencion_iva > 0 ||
                                invoice.monto_retencion_renta > 0) && (
                                <div className="border-t pt-4 space-y-2">
                                    {invoice.monto_retencion_iva > 0 && (
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm font-medium text-amber-600">
                                                Retención IVA (1%)
                                            </p>
                                            <p className="text-sm font-semibold text-amber-700">
                                                -
                                                {formatCurrency(
                                                    invoice.monto_retencion_iva
                                                )}
                                            </p>
                                        </div>
                                    )}
                                    {invoice.monto_retencion_renta > 0 && (
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm font-medium text-amber-600">
                                                Retención Renta
                                            </p>
                                            <p className="text-sm font-semibold text-amber-700">
                                                -
                                                {formatCurrency(
                                                    invoice.monto_retencion_renta
                                                )}
                                            </p>
                                        </div>
                                    )}
                                    <div className="border-t pt-2 mt-2 flex justify-between items-center bg-blue-50 p-3 rounded-lg">
                                        <p className="text-sm font-bold text-blue-700">
                                            Valor a Cobrar
                                        </p>
                                        <p className="text-xl font-bold text-blue-700">
                                            {formatCurrency(
                                                invoice.monto_neto_cobrar ||
                                                    invoice.monto_total
                                            )}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Notas de Crédito */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-amber-600" />
                                    Notas de Crédito
                                </CardTitle>
                                {invoice.estado_facturacion !== "anulada" && (
                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            setShowCreateCreditNote(true)
                                        }
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Nueva NC
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {creditNotes &&
                            Array.isArray(creditNotes) &&
                            creditNotes.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                        Número NC
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                        Fecha
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                        Monto
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                        Motivo
                                                    </th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                                        Archivo
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {creditNotes.map((cn) => (
                                                    <tr key={cn.id}>
                                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                            {
                                                                cn.numero_nota_credito
                                                            }
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-500">
                                                            {formatDate(
                                                                cn.fecha_emision
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-medium text-red-600">
                                                            -
                                                            {formatCurrency(
                                                                cn.monto
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                                                            {cn.motivo}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex justify-end">
                                                                {cn.archivo_pdf_url && (
                                                                    <a
                                                                        href={
                                                                            cn.archivo_pdf_url
                                                                        }
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-600 hover:text-blue-800"
                                                                    >
                                                                        <Eye className="h-5 w-5" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Resumen de Credit Notes */}
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-amber-900">
                                                Total Acreditado:
                                            </span>
                                            <span className="text-lg font-bold text-amber-900">
                                                -
                                                {formatCurrency(
                                                    creditNotes.reduce(
                                                        (sum, cn) =>
                                                            sum +
                                                            parseFloat(
                                                                cn.monto
                                                            ),
                                                        0
                                                    )
                                                )}
                                            </span>
                                        </div>
                                        {invoice.monto_total && (
                                            <div className="mt-2 pt-2 border-t border-amber-300 flex justify-between items-center">
                                                <span className="text-sm font-medium text-amber-900">
                                                    Balance Efectivo:
                                                </span>
                                                <span className="text-lg font-bold text-green-700">
                                                    {formatCurrency(
                                                        parseFloat(
                                                            invoice.monto_total
                                                        ) -
                                                            creditNotes.reduce(
                                                                (sum, cn) =>
                                                                    sum +
                                                                    parseFloat(
                                                                        cn.monto
                                                                    ),
                                                                0
                                                            )
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-sm">
                                        No hay notas de crédito asociadas
                                    </p>
                                    {invoice.estado_facturacion !==
                                        "anulada" && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="mt-3"
                                            onClick={() =>
                                                setShowCreateCreditNote(true)
                                            }
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Crear Primera NC
                                        </Button>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {invoice.cost_mappings &&
                        invoice.cost_mappings.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Package className="h-5 w-5" />
                                        Facturas de Costo Asociadas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                        Factura
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                        Proveedor
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                        Monto Asignado
                                                    </th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                                        Acciones
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {invoice.cost_mappings.map(
                                                    (mapping) => (
                                                        <tr key={mapping.id}>
                                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                                <Link
                                                                    to={`/invoices/${mapping.cost_invoice}`}
                                                                    className="text-blue-600 hover:text-blue-800"
                                                                >
                                                                    {mapping.cost_invoice_numero ||
                                                                        mapping.cost_invoice}
                                                                </Link>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                                {
                                                                    mapping.proveedor_nombre
                                                                }
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                                {formatCurrency(
                                                                    mapping.monto_asignado
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex justify-end">
                                                                    {mapping.cost_invoice_file_url && (
                                                                        <a
                                                                            href={
                                                                                mapping.cost_invoice_file_url
                                                                            }
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-blue-600 hover:text-blue-800"
                                                                        >
                                                                            <Eye className="h-5 w-5" />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                    {invoice.tiene_archivo_pdf && invoice.archivo_pdf_url && (
                        <FilePreview
                            fileUrl={invoice.archivo_pdf_url}
                            fileName={invoice.numero_factura}
                            clientName={invoice.cliente_nombre}
                            contentType="application/pdf"
                        />
                    )}
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Estados</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Estado Facturación
                                </p>
                                <dd className="mt-1">
                                    {getStatusBadge(
                                        invoice.estado_facturacion,
                                        ESTADO_FACTURACION_CHOICES
                                    )}
                                </dd>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Estado Pago
                                </p>
                                <dd className="mt-1">
                                    {getStatusBadge(
                                        invoice.estado_pago,
                                        ESTADO_PAGO_CHOICES
                                    )}
                                </dd>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Historial de Pagos</CardTitle>
                                <Link to={`/sales/payments/new?invoice=${id}`}>
                                    <Button size="sm">
                                        <DollarSign className="mr-2 h-4 w-4" />
                                        Registrar Pago
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        {payments?.results && payments.results.length > 0 ? (
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Fecha
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Monto
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Método
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Estado
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {payments.results.map((payment) => (
                                                <tr key={payment.id}>
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        {formatDate(
                                                            payment.fecha_pago
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                        {formatCurrency(
                                                            payment.monto
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-500">
                                                        {payment.metodo_pago}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge
                                                            variant={
                                                                payment.estado ===
                                                                "validado"
                                                                    ? "success"
                                                                    : payment.estado ===
                                                                      "rechazado"
                                                                    ? "destructive"
                                                                    : "warning"
                                                            }
                                                        >
                                                            {payment.estado}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        ) : (
                            <CardContent>
                                <p className="text-sm text-gray-500 text-center py-4">
                                    No hay pagos registrados.
                                </p>
                            </CardContent>
                        )}
                    </Card>

                    {otherSalesInvoices?.results &&
                        otherSalesInvoices.results.length > 1 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Otras Facturas de Venta en esta OT
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {otherSalesInvoices.results.map(
                                            (si) =>
                                                si.id !== invoice.id && (
                                                    <Link
                                                        key={si.id}
                                                        to={`/sales/invoices/${si.id}`}
                                                    >
                                                        <div className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50">
                                                            <div>
                                                                <p className="font-medium">
                                                                    {
                                                                        si.numero_factura
                                                                    }
                                                                </p>
                                                                <p className="text-sm text-gray-500">
                                                                    {formatDate(
                                                                        si.fecha_emision
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-medium">
                                                                    {formatCurrency(
                                                                        si.monto_total
                                                                    )}
                                                                </p>
                                                                <Badge
                                                                    variant={
                                                                        si.estado_pago ===
                                                                        "pagado_total"
                                                                            ? "success"
                                                                            : "warning"
                                                                    }
                                                                >
                                                                    {
                                                                        si.estado_pago
                                                                    }
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                )
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                    {invoice.notas && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Notas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {invoice.notas}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {showManageCosts && (
                <ManageCostAssociationsModal
                    salesInvoice={invoice}
                    onClose={() => setShowManageCosts(false)}
                    onSuccess={() => {
                        refetch();
                    }}
                />
            )}

            {showCreateCreditNote && (
                <CreateSalesCreditNoteModal
                    isOpen={showCreateCreditNote}
                    onClose={() => setShowCreateCreditNote(false)}
                    onSuccess={() => {
                        setShowCreateCreditNote(false);
                        refetch();
                    }}
                    preSelectedInvoiceId={id}
                />
            )}

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
                message={`¿Estás seguro de que deseas eliminar la factura ${invoice.numero_factura}? Esta acción no se puede deshacer.`}
                confirmText="Sí, eliminar"
                cancelText="Cancelar"
                isConfirming={deleteMutation.isLoading}
            />
        </div>
    );
}
