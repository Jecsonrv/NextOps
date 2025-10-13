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
    const [cnFileActions, setCnFileActions] = useState({ downloading: false, opening: false, error: null });

    useEffect(() => {
        setFileCache(null);
        setFileActions({ downloading: false, opening: false, error: null });
        console.log("invoice.notas_credito", invoice?.notas_credito);
    }, [id, invoice]);

    const handleDownloadCreditNoteFile = async (creditNote) => {
        console.log("handleDownloadCreditNoteFile", creditNote);
        if (!creditNote?.file_url) return;

        setCnFileActions({ downloading: true, opening: false, error: null });
        try {
            const response = await apiClient.get(`/invoices/credit-notes/${creditNote.id}/file/?download=true`, {
                responseType: 'blob',
            });
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const contentDisposition = response.headers['content-disposition'];
            let filename = `nota-credito-${creditNote.numero_nota}.pdf`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="([^"]+)"/i);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            }
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            setCnFileActions({ downloading: false, opening: false, error: 'No se pudo descargar el archivo.' });
        } finally {
            setCnFileActions(prev => ({ ...prev, downloading: false }));
        }
    };

    const handleOpenCreditNoteFile = async (creditNote) => {
        console.log("handleOpenCreditNoteFile", creditNote);
        if (!creditNote?.file_url) return;

        setCnFileActions({ downloading: false, opening: true, error: null });
        try {
            const response = await apiClient.get(`/invoices/credit-notes/${creditNote.id}/file/`, {
                responseType: 'blob',
            });
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank', 'noopener,noreferrer');
            setTimeout(() => window.URL.revokeObjectURL(url), 60000);
        } catch (error) {
            setCnFileActions({ downloading: false, opening: false, error: 'No se pudo abrir el archivo.' });
        } finally {
            setCnFileActions(prev => ({ ...prev, opening: false }));
        }
    };


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
                                "Sin proveedor"}
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
                                    {/* Calcular disputas resueltas y sus montos */}
                                    {(() => {
                                        const disputasResueltas = invoice.disputas?.filter(d => 
                                            d.estado === 'resuelta' && 
                                            (d.resultado === 'aprobada_total' || d.resultado === 'aprobada_parcial')
                                        ) || [];
                                        
                                        const totalAnulado = disputasResueltas.reduce((sum, d) => {
                                            if (d.resultado === 'aprobada_total') {
                                                return sum + parseFloat(d.monto_disputa);
                                            } else if (d.resultado === 'aprobada_parcial' && d.monto_recuperado) {
                                                return sum + parseFloat(d.monto_recuperado);
                                            }
                                            return sum;
                                        }, 0);
                                        
                                        const montoAplicable = invoice.monto_aplicable !== null && invoice.monto_aplicable !== undefined 
                                            ? invoice.monto_aplicable 
                                            : invoice.monto;
                                        
                                        // Mostrar desglose si hay disputas resueltas con anulaciones
                                        if (disputasResueltas.length > 0 && totalAnulado > 0) {
                                            // Determinar si es anulación total
                                            const esAnulacionTotal = Math.abs(totalAnulado - invoice.monto) < 0.01;
                                            
                                            if (esAnulacionTotal) {
                                                // Anulación total
                                                return (
                                                    <div>
                                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                                            Factura Anulada Totalmente
                                                        </label>
                                                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm text-gray-700">Monto Original:</span>
                                                                <span className="font-semibold text-gray-900 line-through">${invoice.monto?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                            {disputasResueltas.map(disputa => (
                                                                <div key={disputa.id} className="flex justify-between items-center text-sm">
                                                                    <span className="text-gray-600">Anulado por disputa:</span>
                                                                    <span className="font-medium text-red-600">
                                                                        -${(disputa.resultado === 'aprobada_total' 
                                                                            ? parseFloat(disputa.monto_disputa) 
                                                                            : parseFloat(disputa.monto_recuperado || 0)
                                                                        ).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            <div className="pt-2 border-t-2 border-red-300">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="font-bold text-red-700">Monto a Pagar:</span>
                                                                    <span className="text-xl font-bold text-red-600">$0.00</span>
                                                                </div>
                                                                <p className="text-xs text-red-600 mt-1">No requiere pago</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            } else {
                                                // Anulación parcial
                                                return (
                                                    <div>
                                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                                            Ajuste por Disputas
                                                        </label>
                                                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm text-gray-700">Monto Original:</span>
                                                                <span className="font-semibold text-gray-900">${invoice.monto?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                            {disputasResueltas.map(disputa => (
                                                                <div key={disputa.id} className="flex justify-between items-center text-sm">
                                                                    <span className="text-gray-600">
                                                                        {disputa.resultado === 'aprobada_total' ? 'Anulado (Total):' : 'Recuperado (Parcial):'}
                                                                    </span>
                                                                    <span className="font-medium text-red-600">
                                                                        -${(disputa.resultado === 'aprobada_total' 
                                                                            ? parseFloat(disputa.monto_disputa) 
                                                                            : parseFloat(disputa.monto_recuperado || 0)
                                                                        ).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            <div className="pt-2 border-t-2 border-blue-300">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="font-semibold text-gray-800">Monto a Pagar:</span>
                                                                    <span className="text-xl font-bold text-green-600">
                                                                        ${montoAplicable?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        }
                                        
                                        // Sin disputas resueltas, mostrar monto normal
                                        return (
                                            <div>
                                                <label className="text-xs font-medium text-gray-600 uppercase">
                                                    Monto Total
                                                </label>
                                                <p className="text-2xl font-bold text-green-600 mt-1">
                                                    ${invoice.monto?.toLocaleString("es-MX", { minimumFractionDigits: 2 }) || "0.00"}
                                                </p>
                                            </div>
                                        );
                                    })()}
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

                    {/* Gestión de Disputas */}
                    {invoice.disputas?.length > 0 && (
                        <Card className="border-orange-200">
                            <CardHeader className="bg-orange-50 border-b border-orange-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-orange-600" />
                                        <CardTitle className="text-gray-900">Disputas</CardTitle>
                                    </div>
                                    <Badge variant="destructive" className="text-xs">
                                        {invoice.disputas.length}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-2">
                                    {invoice.disputas.map((dispute) => (
                                        <Link
                                            key={dispute.id}
                                            to={`/disputes/${dispute.id}`}
                                            state={{ from: `/invoices/${id}` }}
                                            className="block p-4 border border-gray-200 rounded-lg hover:border-orange-200 hover:bg-orange-50/50 transition-colors"
                                        >
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-semibold text-gray-900 truncate">{dispute.tipo_disputa_display}</span>
                                                        <Badge variant={estadoProvisionColors[dispute.estado]} className="text-xs shrink-0">
                                                            {dispute.estado_display?.toUpperCase()}
                                                        </Badge>
                                                        {dispute.resultado && dispute.resultado !== 'pendiente' && (
                                                            <Badge variant={
                                                                dispute.resultado === 'aprobada_total' ? 'success' :
                                                                dispute.resultado === 'aprobada_parcial' ? 'warning' :
                                                                dispute.resultado === 'rechazada' ? 'destructive' :
                                                                'secondary'
                                                            } className="text-xs shrink-0">
                                                                {dispute.resultado_display}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {dispute.numero_caso && (
                                                        <p className="text-xs text-gray-500">
                                                            Caso: <span className="font-mono">{dispute.numero_caso}</span>
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                                                        {dispute.detalle}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-base font-bold text-orange-600">
                                                        ${parseFloat(dispute.monto_disputa).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                    </p>
                                                    {dispute.monto_recuperado > 0 && (
                                                        <p className="text-xs text-green-600 font-medium mt-0.5">
                                                            Recuperado: ${parseFloat(dispute.monto_recuperado).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Notas de Crédito */}
                    {invoice.notas_credito?.length > 0 && (
                        <Card className="border-blue-200">
                            <CardHeader className="bg-blue-50 border-b border-blue-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileMinus className="w-5 h-5 text-blue-600" />
                                        <CardTitle className="text-gray-900">Notas de Crédito</CardTitle>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                        {invoice.notas_credito.length}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-2">
                                    {invoice.notas_credito.map((nc) => (
                                        <div key={nc.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-200 hover:bg-blue-50/50 transition-colors">
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                                                            NC {nc.numero_nota}
                                                        </h3>
                                                        <span className="text-xs text-gray-500 shrink-0">
                                                            {formatDateLocalized(nc.fecha_emision)}
                                                        </span>
                                                    </div>
                                                    {nc.motivo && (
                                                        <p className="text-xs text-gray-600 line-clamp-1">
                                                            {nc.motivo}
                                                        </p>
                                                    )}
                                                </div>
                                                {nc.monto && (
                                                    <div className="text-right shrink-0">
                                                        <p className="text-base font-bold text-blue-600">
                                                            -${parseFloat(nc.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Botones de acción compactos */}
                                            <div className="flex gap-2">
                                                {nc.file_url && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleOpenCreditNoteFile(nc)}
                                                            disabled={cnFileActions.opening}
                                                            className="text-xs"
                                                        >
                                                            {cnFileActions.opening ? (
                                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                            ) : (
                                                                <Eye className="w-3 h-3 mr-1" />
                                                            )}
                                                            Ver
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDownloadCreditNoteFile(nc)}
                                                            disabled={cnFileActions.downloading}
                                                            className="text-xs"
                                                        >
                                                            {cnFileActions.downloading ? (
                                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                            ) : (
                                                                <Download className="w-3 h-3 mr-1" />
                                                            )}
                                                            Descargar
                                                        </Button>
                                                    </>
                                                )}
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => navigate(`/invoices/credit-notes/${nc.id}`)}
                                                    className="text-xs bg-blue-600 hover:bg-blue-700"
                                                >
                                                    <FileText className="w-3 h-3 mr-1" />
                                                    Detalle
                                                </Button>
                                            </div>

                                            {cnFileActions.error && (
                                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                                    {cnFileActions.error}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
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
                                            {invoice.uploaded_file_data.size_mb} MB
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                            Tipo
                                        </label>
                                        <p className="text-sm text-gray-900 mt-1 font-mono">
                                            {invoice.uploaded_file_data.content_type || 'application/pdf'}
                                        </p>
                                    </div>
                                </div>

                                {invoice.uploaded_file_data.uploaded_at && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                            Fecha de Carga
                                        </label>
                                        <p className="text-sm text-gray-900 mt-1">
                                            {formatDateTime(invoice.uploaded_file_data.uploaded_at)}
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleOpenFile}
                                        disabled={fileActions.opening}
                                        className="flex-1"
                                    >
                                        {fileActions.opening ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Eye className="w-4 h-4 mr-2" />
                                        )}
                                        {fileActions.opening ? 'Abriendo...' : 'Ver'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadFile}
                                        disabled={fileActions.downloading}
                                        className="flex-1"
                                    >
                                        {fileActions.downloading ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Download className="w-4 h-4 mr-2" />
                                        )}
                                        {fileActions.downloading ? 'Descargando...' : 'Descargar'}
                                    </Button>
                                </div>

                                {fileActions.error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                        <p className="text-xs text-red-700">{fileActions.error}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Metadata */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Información del Sistema</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div>
                                <label className="text-xs font-medium text-gray-600 uppercase block mb-1">
                                    Fecha de Creación
                                </label>
                                <p className="text-gray-900">
                                    {formatDateTime(invoice.created_at)}
                                </p>
                            </div>
                            {invoice.updated_at && (
                                <div>
                                    <label className="text-xs font-medium text-gray-600 uppercase block mb-1">
                                        Última Actualización
                                    </label>
                                    <p className="text-gray-900">
                                        {formatDateTime(invoice.updated_at)}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modales */}
            <InvoiceAssignOTModal
                isOpen={isAssignOTModalOpen}
                onClose={() => setIsAssignOTModalOpen(false)}
                invoice={invoice}
                onAssign={(otId) => {
                    assignOTMutation.mutate(otId);
                    setIsAssignOTModalOpen(false);
                }}
            />

            <DisputeFormModal
                isOpen={isDisputeModalOpen}
                onClose={() => setIsDisputeModalOpen(false)}
                invoiceId={invoice.id}
                invoiceData={{
                    numero_factura: invoice.numero_factura,
                    monto: invoice.monto,
                    proveedor_nombre: invoice.proveedor_data?.nombre || invoice.proveedor_nombre,
                }}
            />

            <AddProvisionDateModal
                isOpen={isAddProvisionDateModalOpen}
                onClose={() => setIsAddProvisionDateModalOpen(false)}
                invoice={invoice}
            />
        </div>
    );
}