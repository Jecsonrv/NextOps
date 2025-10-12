/**
 * Página de detalle de una factura - REDISEÑADA
 * Muestra información estructurada similar a OTDetailPage
 */

import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import apiClient from "../lib/api";
import { useInvoiceDetail } from "../hooks/useInvoices";
import {
    formatDate,
    formatDateLocalized,
    formatDateTime,
} from "../lib/dateUtils";
import { FilePreview } from "../components/ui/FilePreview";
import { InvoiceAssignOTModal } from "../components/invoices/InvoiceAssignOTModal";
import { DisputeFormModal } from "../components/disputes/DisputeFormModal";
import { AddProvisionDateModal } from "../components/invoices/AddProvisionDateModal";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
    ArrowLeft,
    FileText,
    Download,
    Edit,
    Link2,
    AlertCircle,
    CheckCircle,
    Calendar,
    DollarSign,
    Building,
    Package,
    Trash2,
    Eye,
    Loader2,
    Ship,
    User,
    AlertTriangle,
    FileMinus,
} from "lucide-react";

const estadoProvisionColors = {
    pendiente: "warning",
    provisionada: "success",
    revision: "warning",
    disputada: "destructive",
};

const estadoFacturacionColors = {
    pendiente: "warning",
    facturada: "success",
};

const confidenceLevelColors = {
    Alta: "success",
    Media: "warning",
    Baja: "destructive",
    "Muy Baja": "destructive",
    "N/A": "secondary",
};

export function InvoiceDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();

    // Determinar página de origen para navegación contextual
    const originPage = location.state?.from || "/invoices";

    const { data: invoice, isLoading, error } = useInvoiceDetail(id);
    const [isAssignOTModalOpen, setIsAssignOTModalOpen] = useState(false);
    const [fileCache, setFileCache] = useState(null);
    const [fileActions, setFileActions] = useState({
        downloading: false,
        opening: false,
        error: null,
    });
    const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
    const [isAddProvisionDateModalOpen, setIsAddProvisionDateModalOpen] = useState(false);

    useEffect(() => {
        setFileCache(null);
        setFileActions({ downloading: false, opening: false, error: null });
    }, [id]);

    const fetchInvoiceBlob = async () => {
        const response = await apiClient.get(`/invoices/${id}/file/`, {
            responseType: "blob",
        });
        return response.data;
    };

    const getInvoiceBlob = async () => {
        if (fileCache?.blob) {
            return fileCache.blob;
        }

        const blob = await fetchInvoiceBlob();
        setFileCache((prev) =>
            prev?.blob
                ? prev
                : {
                      blob,
                      filename: invoice?.uploaded_file_data?.filename,
                      contentType: invoice?.uploaded_file_data?.content_type,
                  }
        );
        return blob;
    };

    const handleDownloadFile = async () => {
        if (!invoice?.uploaded_file_data) return;

        setFileActions((prev) => ({
            ...prev,
            downloading: true,
            error: null,
        }));

        try {
            // Usar el endpoint con download=true para obtener el nombre amigable
            const response = await apiClient.get(
                `/invoices/${id}/file/?download=true`,
                {
                    responseType: "blob",
                }
            );

            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            
            // Extraer nombre del archivo del header Content-Disposition
            const contentDisposition = response.headers["content-disposition"];
            let filename = `${invoice.numero_factura || `factura-${id}`}.pdf`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="([^"]+)"/i);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            }

            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (downloadError) {
            setFileActions((prev) => ({
                ...prev,
                error: "No pudimos descargar el archivo. Intenta nuevamente más tarde.",
            }));
        } finally {
            setFileActions((prev) => ({ ...prev, downloading: false }));
        }
    };

    const handleOpenFile = async () => {
        if (!invoice?.uploaded_file_data) return;

        setFileActions((prev) => ({
            ...prev,
            opening: true,
            error: null,
        }));

        try {
            const blob = await getInvoiceBlob();
            const url = window.URL.createObjectURL(blob);
            window.open(url, "_blank", "noopener,noreferrer");
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 60_000);
        } catch (openError) {
            setFileActions((prev) => ({
                ...prev,
                error: "No pudimos abrir el archivo en el navegador. Descárgalo para revisarlo.",
            }));
        } finally {
            setFileActions((prev) => ({ ...prev, opening: false }));
        }
    };

    const handleFileLoaded = (payload) => {
        if (payload?.blob) {
            setFileCache(payload);
            setFileActions((prev) => ({ ...prev, error: null }));
        }
    };

    // Mutation para eliminar factura
    const deleteMutation = useMutation({
        mutationFn: async () => {
            await apiClient.delete(`/invoices/${id}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["invoices"]);
            navigate("/invoices");
        },
    });

    // Mutation para asignar OT
    const assignOTMutation = useMutation({
        mutationFn: async (otId) => {
            const response = await apiClient.patch(`/invoices/${id}/`, {
                ot_id: otId,
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["invoice", id]);
            queryClient.invalidateQueries(["invoices"]);
        },
        onError: () => {
            toast.error("Error al asignar OT");
        },
    });

    const handleDelete = async () => {
        if (
            window.confirm(
                `¿Estás seguro de eliminar la factura ${
                    invoice.numero_factura || "#" + id
                }?\n\nEsta acción no se puede deshacer.`
            )
        ) {
            deleteMutation.mutate();
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">Cargando factura...</p>
                </div>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Error al cargar factura
                </h2>
                <p className="text-gray-600 mb-6">
                    {error?.message || "No se encontró la factura"}
                </p>
                <Button onClick={() => navigate("/invoices")}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver a facturas
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header con botones de acción */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(originPage)}
                        title="Volver"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-bold text-gray-900">
                                {invoice.numero_factura || `Factura #${id}`}
                            </h1>
                            {invoice.requiere_revision && (
                                <Badge variant="warning" className="text-sm">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Requiere Revisión
                                </Badge>
                            )}
                        </div>
                        <p className="text-gray-600 mt-1 text-sm">
                            {invoice.proveedor_data?.nombre ||
                                invoice.proveedor_nombre ||
                                "Sin proveedor"}{" "}
                            • Creada {formatDateTime(invoice.created_at)}
                        </p>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAssignOTModalOpen(true)}
                    >
                        <Link2 className="w-4 h-4 mr-2" />
                        Asignar OT
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/invoices/${id}/edit`)}
                    >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-orange-600 hover:bg-orange-50"
                        onClick={() => setIsDisputeModalOpen(true)}
                        disabled={invoice.disputas?.some(d => ['abierta', 'en_revision'].includes(d.estado))}
                        title={invoice.disputas?.some(d => ['abierta', 'en_revision'].includes(d.estado)) 
                            ? 'Ya existe una disputa activa para esta factura' 
                            : 'Crear nueva disputa'}
                    >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Crear Disputa
                    </Button>
                    {['anulada', 'anulada_parcialmente'].includes(invoice.estado_provision) && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:bg-blue-50"
                            onClick={() => setIsAddProvisionDateModalOpen(true)}
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            {invoice.fecha_provision ? 'Actualizar' : 'Agregar'} Fecha de Provisión
                        </Button>
                    )}
                    {invoice.uploaded_file_data && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadFile}
                            disabled={fileActions.downloading}
                        >
                            {fileActions.downloading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4 mr-2" />
                            )}
                            {fileActions.downloading
                                ? "Descargando..."
                                : "Descargar"}
                        </Button>
                    )}
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                    </Button>
                </div>
            </div>

            {/* Alert de revisión */}
            {invoice.requiere_revision && (
                <Card className="border-yellow-300 bg-yellow-50">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-yellow-900 mb-1">
                                    ⚠️ Esta factura requiere revisión manual
                                </h3>
                                <p className="text-sm text-yellow-800">
                                    El matching automático tiene confianza{" "}
                                    {invoice.confidence_level} (
                                    {invoice.confianza_match ? (invoice.confianza_match * 100).toFixed(1) : '0'}
                                    %). Por favor revisa los datos y asigna la
                                    OT manualmente si es necesario.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                {/* COLUMNA IZQUIERDA - Información Principal */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Información de la OT Asignada */}
                    {invoice.ot_data && (
                        <Card className="border-blue-200">
                            <CardHeader className="bg-blue-50 border-b border-blue-200">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-blue-900">
                                        <Package className="w-5 h-5" />
                                        Orden de Transporte
                                    </CardTitle>
                                    <Link
                                        to={`/ots/${invoice.ot_data.id}`}
                                        state={{ from: `/invoices/${id}` }}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 hover:border-blue-400 transition-colors"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Ver Detalle
                                    </Link>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                            Operativo
                                        </label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <p className="font-medium text-gray-900">
                                                {invoice.ot_data.operativo ||
                                                    "-"}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                            Número OT
                                        </label>
                                        <p className="text-lg font-bold text-blue-600 mt-1">
                                            {invoice.ot_data.numero_ot}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                            Cliente
                                        </label>
                                        <p className="font-medium text-gray-900 mt-1">
                                            {invoice.ot_data.cliente || "-"}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                            MBL
                                        </label>
                                        <p className="font-mono text-sm text-gray-900 mt-1">
                                            {invoice.ot_data.mbl || "-"}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                            Naviera
                                        </label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Ship className="w-4 h-4 text-gray-400" />
                                            <p className="text-gray-900">
                                                {invoice.ot_data.naviera || "-"}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                            Barco
                                        </label>
                                        <p className="text-gray-900 mt-1">
                                            {invoice.ot_data.barco || "-"}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 uppercase">
                                                Método de Asignación
                                            </label>
                                            <p className="text-sm text-gray-700 mt-1 capitalize">
                                                {invoice.assignment_method?.replace(
                                                    /_/g,
                                                    " "
                                                ) || "Manual"}
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                            onClick={() =>
                                                setIsAssignOTModalOpen(true)
                                            }
                                        >
                                            <Link2 className="w-4 h-4 mr-2" />
                                            Cambiar OT
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Sin OT asignada */}
                    {!invoice.ot_data && (
                        <Card className="border-yellow-200">
                            <CardContent className="pt-6">
                                <div className="text-center py-4">
                                    <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Sin Orden de Transporte Asignada
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Esta factura aún no está vinculada a
                                        ninguna OT
                                    </p>
                                    <Button
                                        onClick={() =>
                                            setIsAssignOTModalOpen(true)
                                        }
                                    >
                                        <Link2 className="w-4 h-4 mr-2" />
                                        Asignar OT
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Información de la Factura */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Detalles de la Factura
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-6 items-start">
                                <div>
                                    <label className="text-xs font-medium text-gray-600 uppercase">
                                        Número de Factura
                                    </label>
                                    <p className="text-lg font-bold text-gray-900 mt-1">
                                        {invoice.numero_factura || "SIN NÚMERO"}
                                    </p>
                                </div>

                                <div>
                                    {invoice.estado_provision === 'anulada_parcialmente' ? (
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 uppercase">
                                                Desglose de Montos
                                            </label>
                                            <div className="mt-2 space-y-1">
                                                <p className="text-sm text-gray-600">
                                                    Monto Original: <span className="font-semibold">${invoice.monto?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                                                </p>
                                                <p className="text-sm text-red-600">
                                                    Monto Anulado: <span className="font-semibold">-${(invoice.monto_aplicable !== null && invoice.monto_aplicable !== undefined ? (invoice.monto - invoice.monto_aplicable) : 0)?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                                                </p>
                                                <div className="border-t border-gray-300 pt-1">
                                                    <p className="text-lg font-bold text-green-600">
                                                        Monto Aplicable: ${(invoice.monto_aplicable !== null && invoice.monto_aplicable !== undefined ? invoice.monto_aplicable : invoice.monto)?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : invoice.estado_provision === 'anulada' ? (
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 uppercase">
                                                Monto Total
                                            </label>
                                            <p className="text-2xl font-bold text-red-600 mt-1 line-through">
                                                ${invoice.monto?.toLocaleString("es-MX", { minimumFractionDigits: 2 }) || "0.00"}
                                            </p>
                                            <p className="text-xs text-red-600 mt-1">
                                                Factura anulada totalmente - No se paga
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 uppercase">
                                                Monto Total
                                            </label>
                                            <p className="text-2xl font-bold text-green-600 mt-1">
                                                ${invoice.monto?.toLocaleString("es-MX", { minimumFractionDigits: 2 }) || "0.00"}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-gray-600 uppercase">
                                        Fecha de Emisión
                                    </label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <p className="text-gray-900">
                                            {formatDateLocalized(
                                                invoice.fecha_emision
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {invoice.fecha_vencimiento && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                            Fecha de Vencimiento
                                        </label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Calendar className="w-4 h-4 text-red-400" />
                                            <p className="text-gray-900">
                                                {formatDateLocalized(
                                                    invoice.fecha_vencimiento
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {invoice.fecha_provision && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                            Fecha de Provisión
                                        </label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Calendar className="w-4 h-4 text-blue-400" />
                                            <p className="text-gray-900">
                                                {formatDate(
                                                    invoice.fecha_provision
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-medium text-gray-600 uppercase">
                                        Tipo de Costo
                                    </label>
                                    <div className="mt-2">
                                        <Badge variant="default">
                                            {invoice.tipo_costo_display ||
                                                invoice.tipo_costo}
                                        </Badge>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-gray-600 uppercase">
                                        Tipo de Proveedor
                                    </label>
                                    <div className="mt-2">
                                        <Badge variant="secondary">
                                            {(invoice.tipo_proveedor_display ||
                                                invoice.tipo_proveedor ||
                                                "N/A"
                                            ).toUpperCase()}
                                        </Badge>
                                    </div>
                                </div>

                                {invoice.moneda && invoice.moneda !== "MXN" && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                            Moneda
                                        </label>
                                        <p className="text-gray-900 mt-1 font-medium">
                                            {invoice.moneda}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Gestión de Disputas y Actividad */}
                    {(invoice.disputas?.length > 0 || invoice.notas_credito?.length > 0) && (
                        <Card className={invoice.disputas?.length > 0 ? "border-l-4 border-l-red-500" : ""}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Disputas y Notas de Crédito</CardTitle>
                                    {invoice.disputas?.length > 0 && (
                                        <Badge variant="destructive" className="text-xs">
                                            {invoice.disputas.length}
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {invoice.disputas?.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 mb-3">Disputas Activas</h4>
                                        <div className="space-y-3">
                                            {invoice.disputas.map((dispute) => (
                                                <Link 
                                                    key={dispute.id} 
                                                    to={`/disputes/${dispute.id}`}
                                                    state={{ from: `/invoices/${id}` }}
                                                    className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-sm font-semibold text-gray-900">{dispute.tipo_disputa_display}</span>
                                                                <Badge variant={estadoProvisionColors[dispute.estado]}>
                                                                    {dispute.estado_display?.toUpperCase()}
                                                                </Badge>
                                                            </div>
                                                            {dispute.numero_caso && (
                                                                <p className="text-xs text-gray-600">
                                                                    Caso: <span className="font-mono">{dispute.numero_caso}</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-lg font-bold text-gray-900">
                                                                ${parseFloat(dispute.monto_disputa).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                            </p>
                                                            <p className="text-xs text-gray-500">{formatDate(dispute.created_at)}</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-gray-600 line-clamp-2">{dispute.detalle}</p>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {invoice.notas_credito?.length > 0 && (
                                    <div className={invoice.disputas?.length > 0 ? "pt-6 border-t border-gray-200" : ""}>
                                        <h4 className="text-sm font-medium text-gray-700 mb-3">Notas de Crédito</h4>
                                        <div className="space-y-3">
                                            {invoice.notas_credito.map((cn) => (
                                                <div key={cn.id} className="p-4 border border-gray-200 rounded-lg">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900">{cn.numero_nota}</p>
                                                            <p className="text-xs text-gray-600 mt-1">{cn.motivo}</p>
                                                        </div>
                                                        <Badge variant={cn.estado === 'aplicada' ? 'success' : 'default'}>
                                                            {cn.estado_display?.toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                                                        <span className="text-xs text-gray-500">{formatDate(cn.fecha_emision)}</span>
                                                        <span className="text-sm font-semibold text-gray-900">${cn.monto}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Información del Proveedor */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building className="w-5 h-5" />
                                Proveedor
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-600 uppercase">
                                        Nombre
                                    </label>
                                    <p className="text-lg font-bold text-gray-900 mt-1">
                                        {invoice.proveedor_data?.nombre ||
                                            invoice.proveedor_nombre ||
                                            "Sin especificar"}
                                    </p>
                                    {invoice.proveedor_data && (
                                        <Badge
                                            variant="success"
                                            className="mt-2"
                                        >
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Registrado en catálogo
                                        </Badge>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {invoice.proveedor_data?.tipo && (
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 uppercase">
                                                Categoría
                                            </label>
                                            <p className="text-gray-900 mt-1 capitalize">
                                                {invoice.proveedor_data
                                                    .tipo_display ||
                                                    invoice.proveedor_data.tipo}
                                            </p>
                                        </div>
                                    )}

                                    {invoice.proveedor_data?.payment_terms && (
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 uppercase">
                                                Condiciones de Crédito
                                            </label>
                                            <p className="text-gray-900 mt-1">
                                                {invoice.proveedor_data
                                                    .payment_terms}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notas */}
                    {invoice.notas && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Notas y Observaciones</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {invoice.notas}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Previsualización del Archivo */}
                    {invoice.file_url && invoice.uploaded_file_data && (
                        <FilePreview
                            invoiceId={invoice.id}
                            fileUrl={invoice.file_url}
                            fileName={invoice.uploaded_file_data.filename}
                            contentType={
                                invoice.uploaded_file_data.content_type
                            }
                            cachedFile={fileCache}
                            onFileLoaded={handleFileLoaded}
                        />
                    )}
                </div>

                {/* COLUMNA DERECHA - Estados y Metadata */}
                <div className="space-y-6">
                    {/* Estados */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Estados</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-gray-600 mb-2">
                                    Estado de Provisión
                                </p>
                                <Badge
                                    variant={
                                        estadoProvisionColors[
                                            invoice.estado_provision
                                        ]
                                    }
                                >
                                    {invoice.estado_provision_display?.toUpperCase() ||
                                        invoice.estado_provision?.toUpperCase()}
                                </Badge>
                                {invoice.fecha_provision && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        Provisionada:{" "}
                                        {formatDate(invoice.fecha_provision)}
                                    </p>
                                )}
                            </div>

                            <div className="pt-3 border-t border-gray-200">
                                <p className="text-sm font-medium text-gray-600 mb-2">
                                    Estado de Facturación
                                </p>
                                <Badge
                                    variant={
                                        estadoFacturacionColors[
                                            invoice.estado_facturacion
                                        ]
                                    }
                                >
                                    {invoice.estado_facturacion_display?.toUpperCase() ||
                                        invoice.estado_facturacion?.toUpperCase()}
                                </Badge>
                                {invoice.fecha_facturacion && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        Facturada:{" "}
                                        {formatDate(invoice.fecha_facturacion)}
                                    </p>
                                )}
                            </div>

                            <div className="pt-3 border-t border-gray-200">
                                <p className="text-sm font-medium text-gray-600 mb-2">
                                    Confianza de Matching
                                </p>
                                <Badge
                                    variant={
                                        confidenceLevelColors[
                                            invoice.confidence_level
                                        ]
                                    }
                                >
                                    {invoice.confidence_level?.toUpperCase()}
                                </Badge>
                                <p className="text-xs text-gray-500 mt-2">
                                    Precisión:{" "}
                                    {invoice.confianza_match ? (invoice.confianza_match * 100).toFixed(1) : '0'}
                                    %
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Archivo Adjunto */}
                    {invoice.uploaded_file_data && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Archivo Original
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-600 uppercase">
                                        Nombre del Archivo
                                    </label>
                                    <p className="text-sm text-gray-900 mt-1 break-words font-mono">
                                        {invoice.uploaded_file_data.filename}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                            Tamaño
                                        </label>
                                        <p className="text-sm text-gray-900 mt-1">
                                            {invoice.uploaded_file_data.size_mb}{" "}
                                            MB
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                            Tipo
                                        </label>
                                        <p className="text-sm text-gray-900 mt-1 font-medium">
                                            {invoice.uploaded_file_data.content_type ===
                                            "application/pdf"
                                                ? "PDF"
                                                : invoice.uploaded_file_data.content_type
                                                      ?.split("/")[1]
                                                      ?.toUpperCase() || "Archivo"}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-gray-200 space-y-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={handleOpenFile}
                                        disabled={fileActions.opening}
                                    >
                                        {fileActions.opening ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Eye className="w-4 h-4 mr-2" />
                                        )}
                                        {fileActions.opening
                                            ? "Abriendo..."
                                            : "Ver en navegador"}
                                    </Button>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="w-full"
                                        onClick={handleDownloadFile}
                                        disabled={fileActions.downloading}
                                    >
                                        {fileActions.downloading ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Download className="w-4 h-4 mr-2" />
                                        )}
                                        {fileActions.downloading
                                            ? "Descargando..."
                                            : "Descargar archivo"}
                                    </Button>
                                    {fileActions.error && (
                                        <p className="text-xs text-red-600 text-center">
                                            {fileActions.error}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Metadata de Procesamiento - Simplificada */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Metadata</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div>
                                <label className="text-xs font-semibold text-gray-600 uppercase">
                                    Método de Carga
                                </label>
                                <Badge variant="outline" className="mt-2">
                                    {invoice.processing_source === "upload_auto"
                                        ? "Automático"
                                        : "Manual"}
                                </Badge>
                            </div>

                            <div className="pt-3 border-t border-gray-200">
                                <label className="text-xs font-semibold text-gray-600 uppercase">
                                    Creada
                                </label>
                                <p className="text-gray-900 mt-1">
                                    {formatDateTime(invoice.created_at)}
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-600 uppercase">
                                    Actualizada
                                </label>
                                <p className="text-gray-900 mt-1">
                                    {formatDateTime(invoice.updated_at)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modal para asignar OT */}
            <InvoiceAssignOTModal
                isOpen={isAssignOTModalOpen}
                onClose={() => setIsAssignOTModalOpen(false)}
                invoice={invoice}
                onAssign={async (otId) => {
                    await assignOTMutation.mutateAsync(otId);
                    await queryClient.invalidateQueries(["invoice", id]);
                    await queryClient.refetchQueries(["invoice", id]);
                }}
            />

            {/* Modal para crear disputa */}
            <DisputeFormModal
                isOpen={isDisputeModalOpen}
                onClose={() => setIsDisputeModalOpen(false)}
                invoice={invoice}
                dispute={null}
            />

            {/* Modal para agregar fecha de provisión */}
            <AddProvisionDateModal
                isOpen={isAddProvisionDateModalOpen}
                onClose={() => setIsAddProvisionDateModalOpen(false)}
                invoice={invoice}
            />
        </div>
    );
}

