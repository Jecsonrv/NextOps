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
import { AssociateSalesInvoiceModal } from "../components/invoices/AssociateSalesInvoiceModal";
import { AddPaymentModal } from "../components/sales/AddPaymentModal"; // New import
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { QuickPaymentModal } from "../components/invoices/QuickPaymentModal";
import { EditPaymentModal } from "../components/supplier-payments/EditPaymentModal";
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
    Edit2,
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
    CreditCard,
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
    const [isAddProvisionDateModalOpen, setIsAddProvisionDateModalOpen] =
        useState(false);
    const [cnFileActions, setCnFileActions] = useState({
        downloading: false,
        opening: false,
        error: null,
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [
        isAssociateSalesInvoiceModalOpen,
        setIsAssociateSalesInvoiceModalOpen,
    ] = useState(false);
    const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false); // New state for payment modal
    const [selectedSalesInvoiceId, setSelectedSalesInvoiceId] = useState(null); // New state to hold sales invoice ID for payment
    const [isQuickPaymentModalOpen, setIsQuickPaymentModalOpen] =
        useState(false); // Quick payment modal for supplier payments
    const [selectedPaymentForEdit, setSelectedPaymentForEdit] = useState(null);
    const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState(null);
    const [creditNoteToDelete, setCreditNoteToDelete] = useState(null);

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
            const response = await apiClient.get(
                `/invoices/credit-notes/${creditNote.id}/file/?download=true`,
                {
                    responseType: "blob",
                }
            );
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const contentDisposition = response.headers["content-disposition"];
            let filename = `nota-credito-${creditNote.numero_nota}.pdf`;
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
        } catch (error) {
            setCnFileActions({
                downloading: false,
                opening: false,
                error: "No se pudo descargar el archivo.",
            });
        } finally {
            setCnFileActions((prev) => ({ ...prev, downloading: false }));
        }
    };

    const handleOpenCreditNoteFile = async (creditNote) => {
        console.log("handleOpenCreditNoteFile", creditNote);
        if (!creditNote?.file_url) return;

        setCnFileActions({ downloading: false, opening: true, error: null });
        try {
            const response = await apiClient.get(
                `/invoices/credit-notes/${creditNote.id}/file/`,
                {
                    responseType: "blob",
                }
            );
            const blob = new Blob([response.data], {
                type: response.headers["content-type"],
            });
            const url = window.URL.createObjectURL(blob);
            window.open(url, "_blank", "noopener,noreferrer");
            setTimeout(() => window.URL.revokeObjectURL(url), 60000);
        } catch (error) {
            setCnFileActions({
                downloading: false,
                opening: false,
                error: "No se pudo abrir el archivo.",
            });
        } finally {
            setCnFileActions((prev) => ({ ...prev, opening: false }));
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

    // Mutation para eliminar pago
    const deletePaymentMutation = useMutation({
        mutationFn: async (paymentId) => {
            return await apiClient.delete(`/supplier-payments/${paymentId}/`);
        },
        onSuccess: async () => {
            // Refetch forzado de todas las queries relacionadas
            await Promise.all([
                queryClient.refetchQueries(["invoice", id]),
                queryClient.invalidateQueries(["invoices"]),
                queryClient.invalidateQueries(["supplier-payments-history"]),
                queryClient.invalidateQueries(["supplier-payment-stats"]),
            ]);

            toast.success("Pago eliminado exitosamente");
            setPaymentToDelete(null);
        },
        onError: (error) => {
            const errorMsg =
                error.response?.data?.detail ||
                error.response?.data?.error ||
                "Error al eliminar el pago";
            toast.error(errorMsg);
        },
    });

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        const toastId = toast.loading("Eliminando factura...");
        try {
            await deleteMutation.mutateAsync();
            toast.success("Factura eliminada exitosamente", { id: toastId });
            setShowDeleteConfirm(false);
            navigate("/invoices");
        } catch (error) {
            console.error("Error eliminando factura:", error);
            toast.error("Error al eliminar la factura", { id: toastId });
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
        <div className="space-y-4 sm:space-y-6">
            {/* Header con botones de acción */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-2 sm:gap-4 min-w-0 flex-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(originPage)}
                        title="Volver"
                        className="flex-shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 truncate">
                                {invoice.numero_factura || `Factura #${id}`}
                            </h1>
                            {invoice.requiere_revision && (
                                <Badge
                                    variant="warning"
                                    className="text-xs sm:text-sm self-start"
                                >
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Requiere Revisión
                                </Badge>
                            )}
                        </div>
                        <p className="text-gray-600 mt-1 text-xs sm:text-sm truncate">
                            {invoice.proveedor_data?.nombre ||
                                invoice.proveedor_nombre ||
                                "Sin proveedor"}
                        </p>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAssignOTModalOpen(true)}
                        className="hidden md:inline-flex"
                    >
                        <Link2 className="w-4 h-4 mr-2" />
                        Asignar OT
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/invoices/${id}/edit`)}
                    >
                        <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Editar</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-orange-600 hover:bg-orange-50 hidden lg:inline-flex"
                        onClick={() => setIsDisputeModalOpen(true)}
                        disabled={invoice.disputas?.some((d) =>
                            ["abierta", "en_revision"].includes(d.estado)
                        )}
                        title={
                            invoice.disputas?.some((d) =>
                                ["abierta", "en_revision"].includes(d.estado)
                            )
                                ? "Ya existe una disputa activa para esta factura"
                                : "Crear nueva disputa"
                        }
                    >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Disputa
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:bg-green-50 hidden lg:inline-flex"
                        onClick={() =>
                            setIsAssociateSalesInvoiceModalOpen(true)
                        }
                        title="Asociar factura de venta a este costo"
                    >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Factura Venta
                    </Button>
                    {invoice.estado_provision === "provisionada" &&
                        invoice.estado_pago !== "pagado_total" && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 hover:bg-blue-50 hidden lg:inline-flex"
                                onClick={() => setIsQuickPaymentModalOpen(true)}
                                title="Registrar pago de esta factura"
                            >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Registrar Pago
                            </Button>
                        )}
                    {["anulada", "anulada_parcialmente"].includes(
                        invoice.estado_provision
                    ) && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:bg-blue-50 hidden xl:inline-flex"
                            onClick={() => setIsAddProvisionDateModalOpen(true)}
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            {invoice.fecha_provision
                                ? "Actualizar"
                                : "Agregar"}{" "}
                            Provisión
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
                                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2 animate-spin" />
                            ) : (
                                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                            )}
                            <span className="hidden sm:inline">
                                {fileActions.downloading
                                    ? "Descargando..."
                                    : "Descargar"}
                            </span>
                        </Button>
                    )}
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        className="hidden sm:inline-flex"
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
                                    {invoice.confianza_match
                                        ? (
                                              invoice.confianza_match * 100
                                          ).toFixed(1)
                                        : "0"}
                                    %). Por favor revisa los datos y asigna la
                                    OT manualmente si es necesario.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
                {/* COLUMNA IZQUIERDA - Información Principal */}
                <div className="lg:col-span-2 space-y-4 sm:space-y-6">
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-start">
                                <div>
                                    <label className="text-xs font-medium text-gray-600 uppercase">
                                        Número de Factura
                                    </label>
                                    <p className="text-base sm:text-lg font-bold text-gray-900 mt-1 break-all">
                                        {invoice.numero_factura || "SIN NÚMERO"}
                                    </p>
                                </div>

                                <div>
                                    {/* NUEVA SECCIÓN DE RESUMEN DE MONTOS */}
                                    {(() => {
                                        const parseAmount = (value) => {
                                            const parsed = Number(value);
                                            return Number.isFinite(parsed)
                                                ? parsed
                                                : 0;
                                        };

                                        if (!invoice.ot_data) {
                                            return (
                                                <div>
                                                    <label className="text-xs font-medium text-gray-600 uppercase">
                                                        Monto Total
                                                    </label>
                                                    <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1 break-all">
                                                        $
                                                        {parseAmount(
                                                            invoice.monto
                                                        ).toLocaleString(
                                                            "es-MX",
                                                            {
                                                                minimumFractionDigits: 2,
                                                            }
                                                        )}
                                                    </p>
                                                </div>
                                            );
                                        }

                                        const disputasResueltas =
                                            invoice.disputas?.filter(
                                                (d) =>
                                                    d.estado === "resuelta" &&
                                                    (d.resultado ===
                                                        "aprobada_total" ||
                                                        d.resultado ===
                                                            "aprobada_parcial")
                                            ) || [];

                                        const notasCreditoAplicadas =
                                            invoice.notas_credito?.filter(
                                                (nc) => nc.estado === "aplicada"
                                            ) || [];

                                        const totalAnuladoDisputas =
                                            disputasResueltas.reduce(
                                                (sum, d) => {
                                                    if (
                                                        d.resultado ===
                                                        "aprobada_total"
                                                    ) {
                                                        return (
                                                            sum +
                                                            parseAmount(
                                                                d.monto_disputa
                                                            )
                                                        );
                                                    } else if (
                                                        d.resultado ===
                                                            "aprobada_parcial" &&
                                                        d.monto_recuperado
                                                    ) {
                                                        return (
                                                            sum +
                                                            parseAmount(
                                                                d.monto_recuperado
                                                            )
                                                        );
                                                    }
                                                    return sum;
                                                },
                                                0
                                            );

                                        const totalNotasCredito =
                                            notasCreditoAplicadas.reduce(
                                                (sum, nc) => {
                                                    return (
                                                        sum +
                                                        Math.abs(
                                                            parseAmount(
                                                                nc.monto
                                                            )
                                                        )
                                                    );
                                                },
                                                0
                                            );

                                        const montoOriginal = parseAmount(
                                            invoice.monto_original ??
                                                invoice.monto
                                        );
                                        const montoAplicableRaw =
                                            invoice.monto_aplicable != null
                                                ? parseAmount(
                                                      invoice.monto_aplicable
                                                  )
                                                : Math.max(
                                                      0,
                                                      montoOriginal -
                                                          (totalAnuladoDisputas +
                                                              totalNotasCredito)
                                                  );
                                        const montoFinal = Math.max(
                                            0,
                                            montoAplicableRaw
                                        );
                                        const totalAjustes = Math.max(
                                            0,
                                            montoOriginal - montoFinal
                                        );
                                        const esAnulacionTotal =
                                            montoFinal < 0.01;
                                        const shouldCombineAdjustments =
                                            totalAnuladoDisputas > 0 &&
                                            totalNotasCredito > 0 &&
                                            Math.abs(
                                                totalAnuladoDisputas -
                                                    totalNotasCredito
                                            ) < 0.01;

                                        // Si no hay ajustes, mostrar el monto simple
                                        if (totalAjustes === 0) {
                                            return (
                                                <div>
                                                    <label className="text-xs font-medium text-gray-600 uppercase">
                                                        Monto Total
                                                    </label>
                                                    <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1 break-all">
                                                        $
                                                        {montoOriginal.toLocaleString(
                                                            "es-MX",
                                                            {
                                                                minimumFractionDigits: 2,
                                                            }
                                                        )}
                                                    </p>
                                                </div>
                                            );
                                        }

                                        // Si hay ajustes, mostrar el desglose
                                        return (
                                            <div className="sm:col-span-2">
                                                <label className="text-xs font-medium text-gray-600 uppercase">
                                                    Resumen de Montos
                                                </label>
                                                <div
                                                    className={`mt-2 p-2.5 sm:p-3 rounded-lg space-y-2 ${
                                                        esAnulacionTotal
                                                            ? "bg-red-50 border border-red-200"
                                                            : "bg-blue-50 border border-blue-200"
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-700">
                                                            Monto Original:
                                                        </span>
                                                        <span
                                                            className={`font-semibold text-gray-900`}
                                                        >
                                                            $
                                                            {montoOriginal.toLocaleString(
                                                                "es-MX",
                                                                {
                                                                    minimumFractionDigits: 2,
                                                                }
                                                            )}
                                                        </span>
                                                    </div>

                                                    {totalAnuladoDisputas >
                                                        0 && (
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-gray-600">
                                                                {shouldCombineAdjustments
                                                                    ? "Ajuste por Disputas (Nota de Crédito Aplicada):"
                                                                    : "Ajuste por Disputas:"}
                                                            </span>
                                                            <span className="font-medium text-red-600">
                                                                -$
                                                                {(shouldCombineAdjustments
                                                                    ? totalAjustes
                                                                    : totalAnuladoDisputas
                                                                ).toLocaleString(
                                                                    "es-MX",
                                                                    {
                                                                        minimumFractionDigits: 2,
                                                                    }
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {totalNotasCredito > 0 &&
                                                        !shouldCombineAdjustments && (
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-gray-600">
                                                                    Notas de
                                                                    Crédito:
                                                                </span>
                                                                <span className="font-medium text-red-600">
                                                                    -$
                                                                    {totalNotasCredito.toLocaleString(
                                                                        "es-MX",
                                                                        {
                                                                            minimumFractionDigits: 2,
                                                                        }
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}

                                                    <div
                                                        className={`pt-2 border-t-2 ${
                                                            esAnulacionTotal
                                                                ? "border-red-300"
                                                                : "border-blue-300"
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <span
                                                                className={`font-bold ${
                                                                    esAnulacionTotal
                                                                        ? "text-red-700"
                                                                        : "text-gray-800"
                                                                }`}
                                                            >
                                                                Monto a Pagar:
                                                            </span>
                                                            <span
                                                                className={`text-xl font-bold ${
                                                                    esAnulacionTotal
                                                                        ? "text-red-600"
                                                                        : "text-green-600"
                                                                }`}
                                                            >
                                                                $
                                                                {montoFinal.toLocaleString(
                                                                    "es-MX",
                                                                    {
                                                                        minimumFractionDigits: 2,
                                                                    }
                                                                )}
                                                            </span>
                                                        </div>
                                                        {esAnulacionTotal && (
                                                            <p className="text-xs text-red-600 mt-1 text-right">
                                                                Factura Anulada
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
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
                                            {(
                                                invoice.tipo_costo_display ||
                                                invoice.tipo_costo ||
                                                ""
                                            )
                                                .replace(/_/g, " ")
                                                .split(" ")
                                                .map(
                                                    (word) =>
                                                        word
                                                            .charAt(0)
                                                            .toUpperCase() +
                                                        word
                                                            .slice(1)
                                                            .toLowerCase()
                                                )
                                                .join(" ")}
                                        </Badge>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-gray-600 uppercase">
                                        Tipo de Proveedor
                                    </label>
                                    <div className="mt-2">
                                        <Badge variant="secondary">
                                            {(
                                                invoice.tipo_proveedor_display ||
                                                invoice.tipo_proveedor ||
                                                "N/A"
                                            ).toUpperCase()}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Estado de Pago - Sección completa */}
                                <div className="col-span-2 border-t pt-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                            Estado de Pago
                                        </label>
                                        <Badge
                                            variant={
                                                invoice.estado_pago ===
                                                "pagado_total"
                                                    ? "success"
                                                    : invoice.estado_pago ===
                                                      "pagado_parcial"
                                                    ? "warning"
                                                    : "default"
                                            }
                                        >
                                            {invoice.estado_pago ===
                                                "pagado_total" &&
                                                "✓ Pagado Total"}
                                            {invoice.estado_pago ===
                                                "pagado_parcial" &&
                                                "⏳ Pago Parcial"}
                                            {invoice.estado_pago ===
                                                "pendiente" &&
                                                "⏰ Pendiente de Pago"}
                                        </Badge>
                                    </div>

                                    {/* Información Financiera */}
                                    <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                                        <div>
                                            <p className="text-gray-600 text-xs">
                                                Pagado
                                            </p>
                                            <p className="font-bold text-green-600">
                                                $
                                                {parseFloat(
                                                    invoice.monto_pagado || 0
                                                ).toFixed(2)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600 text-xs">
                                                Pendiente
                                            </p>
                                            <p className="font-bold text-orange-600">
                                                $
                                                {parseFloat(
                                                    invoice.monto_pendiente || 0
                                                ).toFixed(2)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600 text-xs">
                                                Total
                                            </p>
                                            <p className="font-bold text-gray-900">
                                                $
                                                {parseFloat(
                                                    invoice.monto_aplicable || 0
                                                ).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Barra de Progreso */}
                                    <div className="mb-3">
                                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                                            <span>Progreso de Pago</span>
                                            <span>
                                                {Math.round(
                                                    (parseFloat(
                                                        invoice.monto_pagado ||
                                                            0
                                                    ) /
                                                        parseFloat(
                                                            invoice.monto_aplicable ||
                                                                1
                                                        )) *
                                                        100
                                                )}
                                                %
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div
                                                className={`h-2.5 rounded-full transition-all duration-300 ${
                                                    invoice.estado_pago ===
                                                    "pagado_total"
                                                        ? "bg-green-600"
                                                        : invoice.estado_pago ===
                                                          "pagado_parcial"
                                                        ? "bg-yellow-500"
                                                        : "bg-gray-300"
                                                }`}
                                                style={{
                                                    width: `${Math.min(
                                                        100,
                                                        (parseFloat(
                                                            invoice.monto_pagado ||
                                                                0
                                                        ) /
                                                            parseFloat(
                                                                invoice.monto_aplicable ||
                                                                    1
                                                            )) *
                                                            100
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Botón de Acción Rápida */}
                                    {invoice.estado_pago !== "pagado_total" &&
                                        invoice.estado_provision ===
                                            "provisionada" && (
                                            <Button
                                                onClick={() =>
                                                    setIsQuickPaymentModalOpen(
                                                        true
                                                    )
                                                }
                                                className="w-full bg-blue-600 hover:bg-blue-700"
                                                size="sm"
                                            >
                                                <CreditCard className="w-4 h-4 mr-2" />
                                                Registrar Pago
                                            </Button>
                                        )}
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

                    {/* Facturas de Venta Asociadas */}
                    {invoice.sales_invoices_data &&
                        invoice.sales_invoices_data.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <DollarSign className="h-5 w-5" />
                                        Facturas de Venta Asociadas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {invoice.sales_invoices_data.map(
                                            (salesInvoice) => (
                                                <Link
                                                    key={salesInvoice.id}
                                                    to={`/sales/invoices/${salesInvoice.id}`}
                                                    className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="space-y-3">
                                                        {/* Header: Número de factura */}
                                                        <div className="flex justify-between items-center border-b pb-2">
                                                            <span className="font-semibold text-gray-800">
                                                                {
                                                                    salesInvoice.numero_factura
                                                                }
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {
                                                                    salesInvoice
                                                                        .cliente_data
                                                                        ?.original_name
                                                                }
                                                            </span>
                                                        </div>

                                                        {/* Desglose de montos */}
                                                        <div className="space-y-1.5">
                                                            {salesInvoice.subtotal_gravado >
                                                                0 && (
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-gray-600">
                                                                        Subtotal
                                                                        Gravado:
                                                                    </span>
                                                                    <span className="font-medium">
                                                                        $
                                                                        {parseFloat(
                                                                            salesInvoice.subtotal_gravado
                                                                        ).toFixed(
                                                                            2
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {salesInvoice.subtotal_exento >
                                                                0 && (
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-gray-600">
                                                                        Subtotal
                                                                        Exento:
                                                                    </span>
                                                                    <span className="font-medium">
                                                                        $
                                                                        {parseFloat(
                                                                            salesInvoice.subtotal_exento
                                                                        ).toFixed(
                                                                            2
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {salesInvoice.iva_total >
                                                                0 && (
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-gray-600">
                                                                        IVA
                                                                        (13%):
                                                                    </span>
                                                                    <span className="font-medium">
                                                                        $
                                                                        {parseFloat(
                                                                            salesInvoice.iva_total
                                                                        ).toFixed(
                                                                            2
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* Monto Total */}
                                                            <div className="flex justify-between text-sm font-semibold border-t pt-1.5 mt-1.5">
                                                                <span className="text-gray-700">
                                                                    Monto Total:
                                                                </span>
                                                                <span className="text-gray-900">
                                                                    $
                                                                    {parseFloat(
                                                                        salesInvoice.monto_total
                                                                    ).toFixed(
                                                                        2
                                                                    )}
                                                                </span>
                                                            </div>

                                                            {/* Retenciones (si aplican) */}
                                                            {(salesInvoice.monto_retencion_iva >
                                                                0 ||
                                                                salesInvoice.monto_retencion_renta >
                                                                    0) && (
                                                                <>
                                                                    {salesInvoice.monto_retencion_iva >
                                                                        0 && (
                                                                        <div className="flex justify-between text-sm">
                                                                            <span className="text-amber-600">
                                                                                Retención
                                                                                IVA
                                                                                (1%):
                                                                            </span>
                                                                            <span className="text-amber-700 font-medium">
                                                                                -$
                                                                                {parseFloat(
                                                                                    salesInvoice.monto_retencion_iva
                                                                                ).toFixed(
                                                                                    2
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {salesInvoice.monto_retencion_renta >
                                                                        0 && (
                                                                        <div className="flex justify-between text-sm">
                                                                            <span className="text-amber-600">
                                                                                Retención
                                                                                Renta:
                                                                            </span>
                                                                            <span className="text-amber-700 font-medium">
                                                                                -$
                                                                                {parseFloat(
                                                                                    salesInvoice.monto_retencion_renta
                                                                                ).toFixed(
                                                                                    2
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Valor a Cobrar (si hay retenciones) */}
                                                        {(salesInvoice.monto_retencion_iva >
                                                            0 ||
                                                            salesInvoice.monto_retencion_renta >
                                                                0 ||
                                                            salesInvoice
                                                                .cliente_data
                                                                ?.tipo_contribuyente ===
                                                                "gran_contribuyente") && (
                                                            <div className="flex justify-between items-center bg-blue-50 p-2 rounded border-t-2 border-blue-200">
                                                                <span className="text-sm font-bold text-blue-700">
                                                                    Valor a
                                                                    Cobrar:
                                                                </span>
                                                                <span className="text-lg font-bold text-blue-700">
                                                                    $
                                                                    {parseFloat(
                                                                        salesInvoice.monto_neto_cobrar ||
                                                                            salesInvoice.monto_total
                                                                    ).toFixed(
                                                                        2
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>
                                            )
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                    {/* Gestión de Disputas */}
                    {invoice.disputas?.length > 0 && (
                        <Card className="border-orange-200">
                            <CardHeader className="bg-orange-50 border-b border-orange-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-orange-600" />
                                        <CardTitle className="text-gray-900">
                                            Disputas
                                        </CardTitle>
                                    </div>
                                    <Badge
                                        variant="destructive"
                                        className="text-xs"
                                    >
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
                                                        <span className="text-sm font-semibold text-gray-900 truncate">
                                                            {
                                                                dispute.tipo_disputa_display
                                                            }
                                                        </span>
                                                        <Badge
                                                            variant={
                                                                estadoProvisionColors[
                                                                    dispute
                                                                        .estado
                                                                ]
                                                            }
                                                            className="text-xs shrink-0"
                                                        >
                                                            {dispute.estado_display?.toUpperCase()}
                                                        </Badge>
                                                        {dispute.resultado &&
                                                            dispute.resultado !==
                                                                "pendiente" && (
                                                                <Badge
                                                                    variant={
                                                                        dispute.resultado ===
                                                                        "aprobada_total"
                                                                            ? "success"
                                                                            : dispute.resultado ===
                                                                              "aprobada_parcial"
                                                                            ? "warning"
                                                                            : dispute.resultado ===
                                                                              "rechazada"
                                                                            ? "destructive"
                                                                            : "secondary"
                                                                    }
                                                                    className="text-xs shrink-0"
                                                                >
                                                                    {
                                                                        dispute.resultado_display
                                                                    }
                                                                </Badge>
                                                            )}
                                                    </div>
                                                    {dispute.numero_caso && (
                                                        <p className="text-xs text-gray-500">
                                                            Caso:{" "}
                                                            <span className="font-mono">
                                                                {
                                                                    dispute.numero_caso
                                                                }
                                                            </span>
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                                                        {dispute.detalle}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-base font-bold text-orange-600">
                                                        $
                                                        {parseFloat(
                                                            dispute.monto_disputa
                                                        ).toLocaleString(
                                                            "es-MX",
                                                            {
                                                                minimumFractionDigits: 2,
                                                            }
                                                        )}
                                                    </p>
                                                    {dispute.monto_recuperado >
                                                        0 && (
                                                        <p className="text-xs text-green-600 font-medium mt-0.5">
                                                            Recuperado: $
                                                            {parseFloat(
                                                                dispute.monto_recuperado
                                                            ).toLocaleString(
                                                                "es-MX",
                                                                {
                                                                    minimumFractionDigits: 2,
                                                                }
                                                            )}
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
                                        <CardTitle className="text-gray-900">
                                            Notas de Crédito
                                        </CardTitle>
                                    </div>
                                    <Badge
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        {invoice.notas_credito.length}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-2">
                                    {invoice.notas_credito.map((nc) => (
                                        <div
                                            key={nc.id}
                                            className="border border-gray-200 rounded-lg p-4 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                                                            NC {nc.numero_nota}
                                                        </h3>
                                                        <span className="text-xs text-gray-500 shrink-0">
                                                            {formatDateLocalized(
                                                                nc.fecha_emision
                                                            )}
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
                                                            -$
                                                            {parseFloat(
                                                                nc.monto
                                                            ).toLocaleString(
                                                                "es-MX",
                                                                {
                                                                    minimumFractionDigits: 2,
                                                                }
                                                            )}
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
                                                            onClick={() =>
                                                                handleOpenCreditNoteFile(
                                                                    nc
                                                                )
                                                            }
                                                            disabled={
                                                                cnFileActions.opening
                                                            }
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
                                                            onClick={() =>
                                                                handleDownloadCreditNoteFile(
                                                                    nc
                                                                )
                                                            }
                                                            disabled={
                                                                cnFileActions.downloading
                                                            }
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
                                                    onClick={() =>
                                                        navigate(
                                                            `/invoices/credit-notes/${nc.id}`
                                                        )
                                                    }
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
                                                {
                                                    invoice.proveedor_data
                                                        .payment_terms
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Historial de Pagos */}
                    {invoice.supplier_payment_links &&
                        invoice.supplier_payment_links.length > 0 && (
                            <Card className="border-green-200">
                                <CardHeader className="bg-green-50 border-b border-green-100">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2 text-gray-900">
                                            <CreditCard className="w-5 h-5 text-green-600" />
                                            Historial de Pagos
                                        </CardTitle>
                                        <Badge
                                            variant="secondary"
                                            className="text-xs"
                                        >
                                            {
                                                invoice.supplier_payment_links
                                                    .length
                                            }{" "}
                                            pago(s)
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="space-y-3">
                                        {invoice.supplier_payment_links.map(
                                            (link) => (
                                                <div
                                                    key={link.id}
                                                    className="border border-gray-200 rounded-lg p-4 hover:border-green-200 hover:bg-green-50/50 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <h3 className="text-sm font-semibold text-gray-900">
                                                                    Pago #
                                                                    {
                                                                        link.supplier_payment_id
                                                                    }
                                                                </h3>
                                                                <span className="text-xs text-gray-500">
                                                                    {formatDateLocalized(
                                                                        link.created_at
                                                                    )}
                                                                </span>
                                                            </div>
                                                            {link
                                                                .supplier_payment_data
                                                                ?.referencia && (
                                                                <p className="text-xs text-gray-600">
                                                                    Ref:{" "}
                                                                    {
                                                                        link
                                                                            .supplier_payment_data
                                                                            .referencia
                                                                    }
                                                                </p>
                                                            )}
                                                            {link
                                                                .supplier_payment_data
                                                                ?.fecha_pago && (
                                                                <p className="text-xs text-gray-600 mt-1">
                                                                    Fecha:{" "}
                                                                    {new Date(
                                                                        link.supplier_payment_data.fecha_pago
                                                                    ).toLocaleDateString(
                                                                        "es-MX"
                                                                    )}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-right shrink-0">
                                                                <p className="text-lg font-bold text-green-600">
                                                                    $
                                                                    {parseFloat(
                                                                        link.monto_pagado_factura ||
                                                                            0
                                                                    ).toLocaleString(
                                                                        "es-MX",
                                                                        {
                                                                            minimumFractionDigits: 2,
                                                                        }
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    // Construir objeto completo del pago para el modal
                                                                    const payment =
                                                                        {
                                                                            id: link.supplier_payment_id,
                                                                            proveedor_nombre:
                                                                                invoice.proveedor_nombre,
                                                                            ...link.supplier_payment_data,
                                                                            invoice_links:
                                                                                [
                                                                                    {
                                                                                        id: link.id,
                                                                                        cost_invoice:
                                                                                            invoice.id,
                                                                                        monto_pagado_factura:
                                                                                            link.monto_pagado_factura,
                                                                                        invoice_data:
                                                                                            {
                                                                                                numero_factura:
                                                                                                    invoice.numero_factura,
                                                                                            },
                                                                                    },
                                                                                ],
                                                                        };
                                                                    setSelectedPaymentForEdit(
                                                                        payment
                                                                    );
                                                                    setIsEditPaymentModalOpen(
                                                                        true
                                                                    );
                                                                }}
                                                                className="text-blue-600 hover:bg-blue-50 border-blue-200"
                                                                title="Editar pago"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    const payment =
                                                                        {
                                                                            id: link.supplier_payment_id,
                                                                            proveedor_nombre:
                                                                                invoice.proveedor_nombre,
                                                                            ...link.supplier_payment_data,
                                                                            invoice_links:
                                                                                [
                                                                                    {
                                                                                        id: link.id,
                                                                                        cost_invoice:
                                                                                            invoice.id,
                                                                                        monto_pagado_factura:
                                                                                            link.monto_pagado_factura,
                                                                                        invoice_data:
                                                                                            {
                                                                                                numero_factura:
                                                                                                    invoice.numero_factura,
                                                                                            },
                                                                                    },
                                                                                ],
                                                                        };
                                                                    setPaymentToDelete(
                                                                        payment
                                                                    );
                                                                }}
                                                                className="text-red-600 hover:bg-red-50 border-red-200"
                                                                title="Eliminar pago"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        )}

                                        {/* Resumen de pagos */}
                                        <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <p className="text-gray-600">
                                                        Total Factura:
                                                    </p>
                                                    <p className="font-semibold text-gray-900">
                                                        $
                                                        {parseFloat(
                                                            invoice.monto_aplicable ||
                                                                0
                                                        ).toFixed(2)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">
                                                        Total Pagado:
                                                    </p>
                                                    <p className="font-semibold text-green-600">
                                                        $
                                                        {parseFloat(
                                                            invoice.monto_pagado ||
                                                                0
                                                        ).toFixed(2)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">
                                                        Saldo Pendiente:
                                                    </p>
                                                    <p
                                                        className={`font-semibold ${
                                                            invoice.monto_pendiente >
                                                            0
                                                                ? "text-orange-600"
                                                                : "text-gray-900"
                                                        }`}
                                                    >
                                                        $
                                                        {parseFloat(
                                                            invoice.monto_pendiente ||
                                                                0
                                                        ).toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

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
                            fileName={invoice.numero_factura}
                            providerName={invoice.proveedor_nombre}
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
                                    {invoice.confianza_match
                                        ? (
                                              invoice.confianza_match * 100
                                          ).toFixed(1)
                                        : "0"}
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
                                        <p className="text-sm text-gray-900 mt-1 font-mono">
                                            {invoice.uploaded_file_data
                                                .content_type ||
                                                "application/pdf"}
                                        </p>
                                    </div>
                                </div>

                                {invoice.uploaded_file_data.uploaded_at && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 uppercase">
                                            Fecha de Carga
                                        </label>
                                        <p className="text-sm text-gray-900 mt-1">
                                            {formatDateTime(
                                                invoice.uploaded_file_data
                                                    .uploaded_at
                                            )}
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
                                        {fileActions.opening
                                            ? "Abriendo..."
                                            : "Ver"}
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
                                        {fileActions.downloading
                                            ? "Descargando..."
                                            : "Descargar"}
                                    </Button>
                                </div>

                                {fileActions.error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                        <p className="text-xs text-red-700">
                                            {fileActions.error}
                                        </p>
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
                onAssign={async (otId) => {
                    await assignOTMutation.mutateAsync(otId);
                }}
            />

            <DisputeFormModal
                isOpen={isDisputeModalOpen}
                onClose={() => setIsDisputeModalOpen(false)}
                invoice={invoice}
            />

            <AddProvisionDateModal
                isOpen={isAddProvisionDateModalOpen}
                onClose={() => setIsAddProvisionDateModalOpen(false)}
                invoice={invoice}
            />

            <QuickPaymentModal
                invoice={invoice}
                isOpen={isQuickPaymentModalOpen}
                onClose={() => setIsQuickPaymentModalOpen(false)}
            />

            <EditPaymentModal
                payment={selectedPaymentForEdit}
                isOpen={isEditPaymentModalOpen}
                onClose={() => {
                    setIsEditPaymentModalOpen(false);
                    setSelectedPaymentForEdit(null);
                }}
            />

            <ConfirmDialog
                isOpen={!!paymentToDelete}
                onClose={() => setPaymentToDelete(null)}
                onConfirm={() => {
                    if (paymentToDelete) {
                        deletePaymentMutation.mutate(paymentToDelete.id);
                    }
                }}
                title="Eliminar Pago"
                message={
                    paymentToDelete ? (
                        <div>
                            <p className="mb-2">
                                ¿Estás seguro de que deseas eliminar este pago?
                            </p>
                            <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                                <p>
                                    <strong>Proveedor:</strong>{" "}
                                    {paymentToDelete.proveedor_nombre}
                                </p>
                                <p>
                                    <strong>Monto:</strong> $
                                    {parseFloat(
                                        paymentToDelete.monto_total
                                    ).toFixed(2)}
                                </p>
                                <p>
                                    <strong>Referencia:</strong>{" "}
                                    {paymentToDelete.referencia ||
                                        "Sin referencia"}
                                </p>
                                <p>
                                    <strong>Facturas afectadas:</strong>{" "}
                                    {paymentToDelete.invoice_links?.length || 0}
                                </p>
                            </div>
                            <p className="mt-3 text-red-600 font-medium">
                                Esta acción revertirá el estado de pago de las
                                facturas asociadas.
                            </p>
                        </div>
                    ) : (
                        ""
                    )
                }
                confirmText="Eliminar"
                confirmVariant="danger"
                isLoading={deletePaymentMutation.isPending}
            />

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
                message={`¿Estás seguro de que deseas eliminar la factura ${
                    invoice.numero_factura || "#" + id
                }? Esta acción no se puede deshacer.`}
                confirmText="Sí, eliminar"
                cancelText="Cancelar"
                isConfirming={deleteMutation.isPending}
            />

            {isAssociateSalesInvoiceModalOpen && (
                <AssociateSalesInvoiceModal
                    invoice={invoice}
                    onClose={() => setIsAssociateSalesInvoiceModalOpen(false)}
                    onSuccess={() => {
                        queryClient.invalidateQueries(["invoice", id]);
                        toast.success("Factura de venta asociada exitosamente");
                    }}
                />
            )}
        </div>
    );
}
