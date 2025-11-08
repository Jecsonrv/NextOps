/**
 * Página de detalle de una nota de crédito - REDISEÑADA
 * Muestra información estructurada similar a InvoiceDetailPage
 */

import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import apiClient from "../lib/api";
import { formatDateLocalized, formatDateTime } from "../lib/dateUtils";
import { FilePreview } from "../components/ui/FilePreview";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import {
    ArrowLeft,
    FileText,
    Download,
    Eye,
    AlertCircle,
    Calendar,
    Building,
    Package,
    Loader2,
    Ship,
    User,
    FileMinus,
    CheckCircle,
    Clock,
    XCircle,
    Trash2,
} from "lucide-react";

const estadoColors = {
    aplicada: "success",
    pendiente: "warning",
    rechazada: "destructive",
};

export function CreditNoteDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();

    // Determinar página de origen para navegación contextual
    const originPage = location.state?.from || "/invoices/credit-notes";

    const {
        data: creditNote,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["credit-note", id],
        queryFn: async () => {
            const response = await apiClient.get(
                `/invoices/credit-notes/${id}/`
            );
            return response.data;
        },
    });

    const [fileCache, setFileCache] = useState(null);
    const [fileActions, setFileActions] = useState({
        downloading: false,
        opening: false,
        error: null,
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Mutation para eliminar nota de crédito
    const deleteMutation = useMutation({
        mutationFn: async () => {
            await apiClient.delete(`/invoices/credit-notes/${id}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["credit-notes"]);
            queryClient.invalidateQueries(["credit-notes-stats"]);
            queryClient.invalidateQueries(["invoices"]);
            toast.success("Nota de crédito eliminada exitosamente");
            navigate("/invoices/credit-notes");
        },
        onError: (error) => {
            const errorMsg =
                error.response?.data?.detail ||
                error.response?.data?.error ||
                "Error al eliminar la nota de crédito";
            toast.error(errorMsg);
        },
    });

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = () => {
        deleteMutation.mutate();
        setShowDeleteConfirm(false);
    };

    useEffect(() => {
        setFileCache(null);
        setFileActions({ downloading: false, opening: false, error: null });
    }, [id]);

    const fetchCreditNoteBlob = async () => {
        const response = await apiClient.get(
            `/invoices/credit-notes/${id}/file/`,
            {
                responseType: "blob",
            }
        );
        return response.data;
    };

    const getCreditNoteBlob = async () => {
        if (fileCache?.blob) {
            return fileCache.blob;
        }

        const blob = await fetchCreditNoteBlob();
        setFileCache((prev) =>
            prev?.blob
                ? prev
                : {
                      blob,
                      filename: creditNote?.uploaded_file_data?.filename,
                      contentType: creditNote?.uploaded_file_data?.content_type,
                  }
        );
        return blob;
    };

    const handleDownloadFile = async () => {
        if (!creditNote?.uploaded_file_data) return;

        setFileActions((prev) => ({
            ...prev,
            downloading: true,
            error: null,
        }));

        try {
            const response = await apiClient.get(
                `/invoices/credit-notes/${id}/file/?download=true`,
                {
                    responseType: "blob",
                }
            );

            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);

            // Extraer nombre del archivo del header Content-Disposition
            const contentDisposition = response.headers["content-disposition"];
            let filename = `NC_${creditNote.numero_nota || id}.pdf`;
            if (contentDisposition) {
                const filenameMatch =
                    contentDisposition.match(/filename="([^"]+)"/i);
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

            toast.success("Descarga iniciada");
        } catch (downloadError) {
            console.error("Error al descargar:", downloadError);
            setFileActions((prev) => ({
                ...prev,
                error: "No pudimos descargar el archivo. Intenta nuevamente más tarde.",
            }));
            toast.error("Error al descargar el archivo");
        } finally {
            setFileActions((prev) => ({ ...prev, downloading: false }));
        }
    };

    const handleOpenFile = async () => {
        if (!creditNote?.uploaded_file_data) return;

        setFileActions((prev) => ({
            ...prev,
            opening: true,
            error: null,
        }));

        try {
            const blob = await getCreditNoteBlob();
            const url = window.URL.createObjectURL(blob);
            window.open(url, "_blank", "noopener,noreferrer");
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 60_000);
        } catch (openError) {
            console.error("Error al abrir:", openError);
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
                    <p className="text-gray-600">Cargando nota de crédito...</p>
                </div>
            </div>
        );
    }

    if (error || !creditNote) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Error al cargar nota de crédito
                </h2>
                <p className="text-gray-600 mb-6">
                    {error?.message || "No se encontró la nota de crédito"}
                </p>
                <Button onClick={() => navigate("/invoices/credit-notes")}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver a notas de crédito
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
                            <FileMinus className="w-10 h-10 text-red-600" />
                            <h1 className="text-4xl font-bold text-gray-900">
                                {creditNote.numero_nota || `NC #${id}`}
                            </h1>
                        </div>
                        <p className="text-gray-600 mt-1 text-sm">
                            {creditNote.proveedor_nombre || "Sin proveedor"} •
                            Creada {formatDateTime(creditNote.created_at)}
                        </p>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-2">
                    {creditNote.uploaded_file_data && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleOpenFile}
                                disabled={fileActions.opening}
                            >
                                {fileActions.opening ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Eye className="w-4 h-4 mr-2" />
                                )}
                                {fileActions.opening ? "Abriendo..." : "Ver"}
                            </Button>
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
                        </>
                    )}
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* COLUMNA IZQUIERDA - Información Principal */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Información de la Factura Relacionada */}
                    {creditNote.invoice_data && (
                        <Card className="border-blue-200">
                            <CardHeader className="bg-blue-50 border-b border-blue-200">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-blue-900">
                                        <FileText className="w-5 h-5" />
                                        Factura Relacionada
                                    </CardTitle>
                                    <Link
                                        to={`/invoices/${creditNote.invoice_data.id}`}
                                        state={{
                                            from: `/invoices/credit-notes/${id}`,
                                        }}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 hover:border-blue-400 transition-colors"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Ver Detalle
                                    </Link>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                            Número de Factura
                                        </label>
                                        <p className="text-lg font-bold text-blue-600 mt-1">
                                            {
                                                creditNote.invoice_data
                                                    .numero_factura
                                            }
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                            Estado
                                        </label>
                                        <p className="text-sm text-gray-700 mt-1 capitalize">
                                            {creditNote.invoice_data
                                                .estado_provision_display ||
                                                creditNote.invoice_data
                                                    .estado_provision}
                                        </p>
                                    </div>
                                </div>

                                {/* Cálculo de montos */}
                                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-700">
                                            Monto Original de Factura:
                                        </span>
                                        <span className="font-semibold text-gray-900">
                                            $
                                            {parseFloat(
                                                creditNote.invoice_data.monto ||
                                                    0
                                            ).toLocaleString("es-MX", {
                                                minimumFractionDigits: 2,
                                            })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-700">
                                            Nota de Crédito:
                                        </span>
                                        <span className="font-medium text-red-600">
                                            -$
                                            {Math.abs(
                                                parseFloat(
                                                    creditNote.monto || 0
                                                )
                                            ).toLocaleString("es-MX", {
                                                minimumFractionDigits: 2,
                                            })}
                                        </span>
                                    </div>
                                    <div className="pt-3 border-t-2 border-gray-300">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-gray-800">
                                                Monto Restante de Factura:
                                            </span>
                                            <span className="text-xl font-bold text-green-600">
                                                $
                                                {(
                                                    parseFloat(
                                                        creditNote.invoice_data
                                                            .monto || 0
                                                    ) -
                                                    Math.abs(
                                                        parseFloat(
                                                            creditNote.monto ||
                                                                0
                                                        )
                                                    )
                                                ).toLocaleString("es-MX", {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 text-right">
                                            Monto aplicable tras NC
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Información de la OT */}
                    {creditNote.ot_data && (
                        <Card className="border-indigo-200">
                            <CardHeader className="bg-indigo-50 border-b border-indigo-200">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-indigo-900">
                                        <Package className="w-5 h-5" />
                                        Orden de Transporte
                                    </CardTitle>
                                    <Link
                                        to={`/ots/${creditNote.ot_data.id}`}
                                        state={{
                                            from: `/invoices/credit-notes/${id}`,
                                        }}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-white border border-indigo-300 rounded-md hover:bg-indigo-50 hover:border-indigo-400 transition-colors"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Ver Detalle
                                    </Link>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-2 gap-4">
                                    {creditNote.ot_data.operativo && (
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 uppercase">
                                                Operativo
                                            </label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <User className="w-4 h-4 text-gray-400" />
                                                <p className="font-medium text-gray-900">
                                                    {
                                                        creditNote.ot_data
                                                            .operativo
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                            Número OT
                                        </label>
                                        <p className="text-lg font-bold text-indigo-600 mt-1">
                                            {creditNote.ot_data.numero_ot}
                                        </p>
                                    </div>
                                    {creditNote.ot_data.cliente_nombre && (
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 uppercase">
                                                Cliente
                                            </label>
                                            <p className="font-medium text-gray-900 mt-1">
                                                {
                                                    creditNote.ot_data
                                                        .cliente_nombre
                                                }
                                            </p>
                                        </div>
                                    )}
                                    {creditNote.ot_data.master_bl && (
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 uppercase">
                                                MBL
                                            </label>
                                            <p className="font-mono text-sm text-gray-900 mt-1">
                                                {creditNote.ot_data.master_bl}
                                            </p>
                                        </div>
                                    )}
                                    {creditNote.ot_data.naviera && (
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 uppercase">
                                                Naviera
                                            </label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Ship className="w-4 h-4 text-gray-400" />
                                                <p className="text-gray-900">
                                                    {creditNote.ot_data.naviera}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {creditNote.ot_data.barco && (
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 uppercase">
                                                Barco
                                            </label>
                                            <p className="text-gray-900 mt-1">
                                                {creditNote.ot_data.barco}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Información de la Nota de Crédito */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileMinus className="w-5 h-5 text-red-600" />
                                Detalles de la Nota de Crédito
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-medium text-gray-600 uppercase">
                                        Número de Nota
                                    </label>
                                    <p className="text-lg font-bold text-gray-900 mt-1">
                                        {creditNote.numero_nota || "SIN NÚMERO"}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-gray-600 uppercase">
                                        Monto
                                    </label>
                                    <p className="text-2xl font-bold text-red-600 mt-1">
                                        -$
                                        {Math.abs(
                                            parseFloat(creditNote.monto || 0)
                                        ).toLocaleString("es-MX", {
                                            minimumFractionDigits: 2,
                                        })}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-gray-600 uppercase">
                                        Fecha de Emisión
                                    </label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <p className="text-gray-900">
                                            {formatDateLocalized(
                                                creditNote.fecha_emision
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {creditNote.motivo && (
                                    <div className="col-span-2">
                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                            Motivo
                                        </label>
                                        <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">
                                            {creditNote.motivo}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

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
                                        {creditNote.proveedor?.nombre ||
                                            creditNote.proveedor_nombre ||
                                            "Sin especificar"}
                                    </p>
                                    {creditNote.proveedor && (
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
                                    {creditNote.proveedor?.tipo && (
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 uppercase">
                                                Categoría
                                            </label>
                                            <p className="text-gray-900 mt-1 capitalize">
                                                {creditNote.proveedor
                                                    .tipo_display ||
                                                    creditNote.proveedor.tipo}
                                            </p>
                                        </div>
                                    )}

                                    {creditNote.proveedor?.payment_terms && (
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 uppercase">
                                                Condiciones de Crédito
                                            </label>
                                            <p className="text-gray-900 mt-1">
                                                {
                                                    creditNote.proveedor
                                                        .payment_terms
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Previsualización del Archivo */}
                    {creditNote.file_url && creditNote.uploaded_file_data && (
                        <FilePreview
                            invoiceId={creditNote.id}
                            fileUrl={creditNote.file_url}
                            fileName={creditNote.uploaded_file_data.filename}
                            contentType={
                                creditNote.uploaded_file_data.content_type
                            }
                            cachedFile={fileCache}
                            onFileLoaded={handleFileLoaded}
                            fileEndpoint={`/invoices/credit-notes/${creditNote.id}/file/`}
                        />
                    )}
                </div>

                {/* COLUMNA DERECHA - Estados y Metadata */}
                <div className="space-y-6">
                    {/* Estado */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Estado</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-gray-600 mb-2">
                                    Estado de la Nota
                                </p>
                                <Badge
                                    variant={
                                        estadoColors[creditNote.estado] ||
                                        "secondary"
                                    }
                                >
                                    {creditNote.estado === "aplicada" && (
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                    )}
                                    {creditNote.estado === "pendiente" && (
                                        <Clock className="w-3 h-3 mr-1" />
                                    )}
                                    {creditNote.estado === "rechazada" && (
                                        <XCircle className="w-3 h-3 mr-1" />
                                    )}
                                    {creditNote.estado?.toUpperCase() ||
                                        "DESCONOCIDO"}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Archivo Adjunto */}
                    {creditNote.uploaded_file_data && (
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
                                        {creditNote.uploaded_file_data
                                            .filename || "NC.pdf"}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {creditNote.uploaded_file_data.size_mb && (
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 uppercase">
                                                Tamaño
                                            </label>
                                            <p className="text-sm text-gray-900 mt-1">
                                                {
                                                    creditNote
                                                        .uploaded_file_data
                                                        .size_mb
                                                }{" "}
                                                MB
                                            </p>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                            Tipo
                                        </label>
                                        <p className="text-sm text-gray-900 mt-1 font-medium">
                                            {creditNote.uploaded_file_data
                                                .content_type ===
                                            "application/pdf"
                                                ? "PDF"
                                                : creditNote.uploaded_file_data.content_type
                                                      ?.split("/")[1]
                                                      ?.toUpperCase() ||
                                                  "Archivo"}
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

                </div>
            </div>

            {/* Diálogo de Confirmación */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Nota de Crédito"
                message={
                    <div>
                        <p className="mb-2">
                            ¿Estás seguro de que deseas eliminar esta nota de
                            crédito?
                        </p>
                        <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                            <p>
                                <strong>Número:</strong>{" "}
                                {creditNote?.numero_nota}
                            </p>
                            <p>
                                <strong>Monto:</strong> -$
                                {Math.abs(
                                    parseFloat(creditNote?.monto || 0)
                                ).toFixed(2)}
                            </p>
                            <p>
                                <strong>Proveedor:</strong>{" "}
                                {creditNote?.proveedor_nombre}
                            </p>
                            {creditNote?.invoice_data && (
                                <p>
                                    <strong>Factura:</strong>{" "}
                                    {creditNote.invoice_data.numero_factura}
                                </p>
                            )}
                        </div>
                        <p className="mt-3 text-red-600 font-medium">
                            Esta acción no se puede deshacer. Si la nota está
                            aplicada, se revertirá el monto en la factura.
                        </p>
                    </div>
                }
                confirmText="Eliminar"
                confirmVariant="danger"
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
}
