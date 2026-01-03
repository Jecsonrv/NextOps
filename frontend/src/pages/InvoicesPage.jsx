import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import apiClient from "../lib/api";
import {
    useInvoiceFilterValues,
    useBulkDeleteInvoices,
    useInvoiceDetail,
} from "../hooks/useInvoices";
import { exportInvoicesToExcel } from "../lib/exportUtils";
import { formatDate } from "../lib/dateUtils";
import { InvoiceAssignOTModal } from "../components/invoices/InvoiceAssignOTModal";
import { InvoiceQuickView } from "../components/invoices/InvoiceQuickView";
import { usePermissions } from "../components/common/PermissionGate";
import InvoiceStatusBadge, {
    CostTypeBadge,
    ExcludedFromStatsBadge,
} from "../components/invoices/InvoiceStatusBadge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "../components/ui/Tabs";
import {
    FileText,
    Search,
    Download,
    Upload,
    Eye,
    Link2,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    X,
    Package,
    Archive,
    AlertTriangle,
    FileMinus,
    Ship,
    DollarSign,
    Loader2,
    ClipboardCheck,
    Filter,
} from "lucide-react";
import { Trash2 } from "lucide-react";
import { DisputeFormModal } from "../components/disputes/DisputeFormModal";
import { CreateCreditNoteModal } from "../components/invoices/CreateCreditNoteModal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

export function InvoicesPage() {
    const { canImport } = usePermissions();
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [showFilters, setShowFilters] = useState(false);
    const [activeTab, setActiveTab] = useState("all");
    const [selectedInvoiceForOT, setSelectedInvoiceForOT] = useState(null);
    const [showDisputeModal, setShowDisputeModal] = useState(false);
    const [selectedInvoiceForDispute, setSelectedInvoiceForDispute] =
        useState(null);
    const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);
    const [selectedInvoices, setSelectedInvoices] = useState([]); // Para selección múltiple
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [isDeletingBulk, setIsDeletingBulk] = useState(false);
    const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
    // QuickView state
    const [quickViewInvoice, setQuickViewInvoice] = useState(null);
    const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
    // Provisionar rápido
    const [provisioningId, setProvisioningId] = useState(null);
    const [filters, setFilters] = useState({
        estado_provision: "",
        estado_facturacion: "",
        tipo_costo: "",
        proveedor: "",
        fecha_desde: "",
        fecha_hasta: "",
    });

    // Función para obtener filtros según pestaña activa
    const getFiltersForTab = () => {
        const baseFilters = { ...filters };

        switch (activeTab) {
            case "pendientes":
                return { ...baseFilters, estado_provision: "pendiente" };
            case "provisionadas":
                // Provisionadas pero NO pagadas totalmente
                return {
                    ...baseFilters,
                    estado_provision: "provisionada",
                    excluir_pagadas: "true", // Nuevo parámetro para excluir las pagadas
                };
            case "pagadas":
                return { ...baseFilters, estado_pago: "pagado_total" };
            case "disputadas":
                return { ...baseFilters, estado_provision: "disputada" };
            case "anuladas":
                return {
                    ...baseFilters,
                    estado_provision: "anulada,anulada_parcialmente",
                };
            default:
                return baseFilters;
        }
    };

    // Obtener valores de filtros dinámicos (solo proveedores y tipos de costo con facturas)
    const { data: filterValues, isLoading: filterValuesLoading } =
        useInvoiceFilterValues();
    const queryClient = useQueryClient();

    const bulkDeleteMutation = useBulkDeleteInvoices();

    // Fetch detalle para QuickView
    const { data: quickViewDetail } = useInvoiceDetail(
        quickViewInvoice?.id,
        { enabled: !!quickViewInvoice?.id && isQuickViewOpen }
    );

    // Mutation para provisionar rápido
    const quickProvisionMutation = useMutation({
        mutationFn: async (invoiceId) => {
            const today = new Date().toISOString().split("T")[0];
            const response = await apiClient.patch(`/invoices/${invoiceId}/`, {
                estado_provision: "provisionada",
                fecha_provision: today,
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["invoices"]);
            queryClient.invalidateQueries(["invoices-stats"]);
            toast.success("Factura provisionada exitosamente");
            setProvisioningId(null);
        },
        onError: () => {
            toast.error("Error al provisionar la factura");
            setProvisioningId(null);
        },
    });

    const handleQuickProvision = async (invoice) => {
        if (invoice.estado_provision !== "pendiente") return;
        setProvisioningId(invoice.id);
        await quickProvisionMutation.mutateAsync(invoice.id);
    };

    // Mutation para asignar OT
    const assignOTMutation = useMutation({
        mutationFn: async ({ invoiceId, otId }) => {
            const response = await apiClient.patch(
                `/invoices/${invoiceId}/`,
                { ot_id: otId },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["invoices"]);
            queryClient.invalidateQueries(["invoices-stats"]);
        },
        onError: (error) => {
            console.error("Error al asignar OT:", error);
            toast.error("Error al asignar OT");
        },
    });

    // Fetch invoices data
    const { data, isLoading, error } = useQuery({
        queryKey: ["invoices", page, pageSize, search, filters, activeTab],
        queryFn: async () => {
            const tabFilters = getFiltersForTab();

            const params = new URLSearchParams({
                page: page.toString(),
                page_size: pageSize.toString(),
                ...(search && { search }),
                ...(tabFilters.estado_provision && {
                    estado_provision: tabFilters.estado_provision,
                }),
                ...(tabFilters.estado_facturacion && {
                    estado_facturacion: tabFilters.estado_facturacion,
                }),
                ...(tabFilters.estado_pago && {
                    estado_pago: tabFilters.estado_pago,
                }),
                ...(tabFilters.excluir_pagadas && {
                    excluir_pagadas: tabFilters.excluir_pagadas,
                }),
                ...(tabFilters.tipo_costo && {
                    tipo_costo: tabFilters.tipo_costo,
                }),
                ...(tabFilters.proveedor && {
                    proveedor: tabFilters.proveedor,
                }),
                ...(tabFilters.fecha_desde && {
                    fecha_emision_desde: tabFilters.fecha_desde,
                }),
                ...(tabFilters.fecha_hasta && {
                    fecha_emision_hasta: tabFilters.fecha_hasta,
                }),
            });

            const response = await apiClient.get(`/invoices/?${params}`);
            return response.data;
        },
    });

    // Fetch stats con los mismos filtros que la lista
    const { data: stats } = useQuery({
        queryKey: ["invoices-stats", search, filters],
        queryFn: async () => {
            // Construir parámetros con los mismos filtros que la lista
            const params = new URLSearchParams({
                ...(search && { search }),
                ...(filters.estado_provision && {
                    estado_provision: filters.estado_provision,
                }),
                ...(filters.estado_facturacion && {
                    estado_facturacion: filters.estado_facturacion,
                }),
                ...(filters.tipo_costo && { tipo_costo: filters.tipo_costo }),
                ...(filters.proveedor && { proveedor: filters.proveedor }),
                ...(filters.fecha_desde && {
                    fecha_emision_desde: filters.fecha_desde,
                }),
                ...(filters.fecha_hasta && {
                    fecha_emision_hasta: filters.fecha_hasta,
                }),
            });

            const response = await apiClient.get(`/invoices/stats/?${params}`);
            return response.data;
        },
    });

    // Helper para construir parámetros de filtro
    const buildFilterParams = () => {
        const params = new URLSearchParams({
            ...(search && { search }),
            ...(filters.estado_provision && {
                estado_provision: filters.estado_provision,
            }),
            ...(filters.estado_facturacion && {
                estado_facturacion: filters.estado_facturacion,
            }),
            ...(filters.tipo_costo && { tipo_costo: filters.tipo_costo }),
            ...(filters.proveedor && { proveedor: filters.proveedor }),
            ...(filters.fecha_desde && {
                fecha_desde: filters.fecha_desde,
            }),
            ...(filters.fecha_hasta && {
                fecha_hasta: filters.fecha_hasta,
            }),
        });
        return params.toString();
    };

    // Función para exportar a Excel (usando backend)
    const handleExportToExcel = async () => {
        try {
            toast.loading("Exportando datos...", { id: "export-toast" });

            // Construir parámetros con los filtros actuales
            const baseParams = buildFilterParams();

            // Obtener todos los datos haciendo múltiples peticiones si es necesario
            let allInvoices = [];
            let currentPage = 1;
            let hasMoreData = true;
            const pageSize = 200; // Usar el máximo permitido por el backend

            while (hasMoreData) {
                const exportParams = baseParams
                    ? `${baseParams}&page=${currentPage}&page_size=${pageSize}`
                    : `page=${currentPage}&page_size=${pageSize}`;

                toast.loading(
                    `Obteniendo datos... (${allInvoices.length} registros)`,
                    { id: "export-toast" }
                );

                const response = await apiClient.get(
                    `/invoices/?${exportParams}`
                );
                const pageData = response.data.results || [];

                allInvoices = [...allInvoices, ...pageData];

                // Verificar si hay más páginas
                hasMoreData = response.data.next !== null;
                currentPage++;

                // Seguridad: evitar bucle infinito
                if (currentPage > 1000) {
                    console.warn("Se alcanzó el límite de 1000 páginas");
                    break;
                }
            }

            if (!allInvoices || allInvoices.length === 0) {
                toast.error("No hay datos para exportar", {
                    id: "export-toast",
                });
                return;
            }

            // Exportar todos los datos
            toast.loading("Generando archivo Excel...", { id: "export-toast" });
            exportInvoicesToExcel(allInvoices, "Facturas_Export");

            toast.success(
                `Se exportaron ${allInvoices.length} factura${
                    allInvoices.length !== 1 ? "s" : ""
                } exitosamente`,
                { id: "export-toast", duration: 4000 }
            );
        } catch (error) {
            console.error("Error al exportar:", error);
            toast.error("Error al exportar los datos", { id: "export-toast" });
        }
    };

    // Función para exportar PDFs seleccionados
    const handleBulkPDF = async () => {
        if (selectedInvoices.length === 0) {
            toast.error("Selecciona al menos una factura");
            return;
        }

        try {
            const response = await apiClient.post(
                "/invoices/bulk-pdf/",
                {
                    invoice_ids: selectedInvoices,
                },
                {
                    responseType: "blob",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            // Descargar ZIP
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;

            const contentDisposition = response.headers["content-disposition"];
            let filename = "Facturas_PDF.zip";
            if (contentDisposition) {
                const filenameMatch =
                    contentDisposition.match(/filename="([^"]+)"/i);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            }

            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success(
                `${selectedInvoices.length} facturas exportadas en PDF`
            );
        } catch (error) {
            console.error("Error al exportar PDFs:", error);
            toast.error(
                "Error al exportar PDFs. Por favor intenta nuevamente."
            );
        }
    };

    // Función para exportar ZIP estructurado
    const handleBulkZIP = async () => {
        if (selectedInvoices.length === 0) {
            toast.error("Selecciona al menos una factura");
            return;
        }

        try {
            const response = await apiClient.post(
                "/invoices/bulk-zip/",
                {
                    invoice_ids: selectedInvoices,
                },
                {
                    responseType: "blob",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            // Descargar ZIP
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;

            const contentDisposition = response.headers["content-disposition"];
            let filename = "Facturas_Estructuradas.zip";
            if (contentDisposition) {
                const filenameMatch =
                    contentDisposition.match(/filename="([^"]+)"/i);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            }

            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success(
                `ZIP estructurado con ${selectedInvoices.length} facturas`
            );
        } catch (error) {
            console.error("Error al exportar ZIP:", error);
            toast.error("Error al exportar ZIP. Por favor intenta nuevamente.");
        }
    };

    const handleInvoiceDownload = async (invoice) => {
        if (!invoice?.id) {
            toast.error("No se pudo identificar la factura a descargar");
            return;
        }

        setDownloadingInvoiceId(invoice.id);
        try {
            const response = await apiClient.get(
                `/invoices/${invoice.id}/file/?download=true`,
                {
                    responseType: "blob",
                }
            );

            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);

            const contentDisposition = response.headers["content-disposition"];
            let filename = invoice.numero_factura
                ? `${invoice.numero_factura}.pdf`
                : `factura-${invoice.id}.pdf`;

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
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (downloadError) {
            console.error("Error al descargar la factura:", downloadError);
            toast.error("No se pudo descargar la factura. Intenta nuevamente.");
        } finally {
            setDownloadingInvoiceId(null);
        }
    };

    const handleConfirmBulkDelete = async () => {
        setIsDeletingBulk(true);
        const toastId = toast.loading("Eliminando facturas seleccionadas...");
        try {
            await bulkDeleteMutation.mutateAsync(selectedInvoices);
            toast.success(
                `${selectedInvoices.length} facturas eliminadas exitosamente`,
                { id: toastId }
            );
            setSelectedInvoices([]);
            setShowBulkDeleteConfirm(false);
        } catch (error) {
            console.error("Error eliminando facturas en masa:", error);
            toast.error("Error al eliminar las facturas seleccionadas", {
                id: toastId,
            });
        } finally {
            setIsDeletingBulk(false);
        }
    };

    // Funciones para selección múltiple
    const handleSelectAll = () => {
        if (selectedInvoices.length === data?.results?.length) {
            setSelectedInvoices([]);
        } else {
            setSelectedInvoices(data?.results?.map((inv) => inv.id) || []);
        }
    };

    const handleSelectOne = (id) => {
        if (selectedInvoices.includes(id)) {
            setSelectedInvoices(selectedInvoices.filter((i) => i !== id));
        } else {
            setSelectedInvoices([...selectedInvoices, id]);
        }
    };

    if (error) {
        return (
            <div className="p-4 text-center">
                <p className="text-red-600">
                    Error al cargar las facturas: {error.message}
                </p>
            </div>
        );
    }

    // Componente reutilizable para renderizar la tabla - DISEÑO COMPACTO ERP
    const InvoiceTableContent = () => (
        <>
            <div className="overflow-x-auto">
                <table className="erp-table w-full">
                    <thead>
                        <tr>
                            <th className="w-8 px-2 py-2 text-center">
                                <input
                                    type="checkbox"
                                    checked={
                                        selectedInvoices.length ===
                                            data?.results?.length &&
                                        data?.results?.length > 0
                                    }
                                    onChange={handleSelectAll}
                                    className="rounded border-slate-300 text-slate-700 focus:ring-slate-500"
                                />
                            </th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                                Estado
                            </th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                                Factura
                            </th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                                Proveedor
                            </th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                                OT / Cliente
                            </th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                                Fecha
                            </th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 uppercase">
                                Monto
                            </th>
                            <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 uppercase w-32">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data?.results?.map((invoice) => {
                            const estadoClass = {
                                pendiente: "pending",
                                provisionada: "success",
                                disputada: "error",
                                anulada: "info",
                                anulada_parcialmente: "info",
                            };
                            return (
                                <tr
                                    key={invoice.id}
                                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                                        selectedInvoices.includes(invoice.id) ? "bg-slate-100" : ""
                                    }`}
                                    onClick={() => {
                                        setQuickViewInvoice(invoice);
                                        setIsQuickViewOpen(true);
                                    }}
                                >
                                    <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedInvoices.includes(invoice.id)}
                                            onChange={() => handleSelectOne(invoice.id)}
                                            className="rounded border-slate-300 text-slate-700 focus:ring-slate-500"
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`status-dot ${estadoClass[invoice.estado_provision] || "info"}`}></span>
                                            <span className="text-xs text-slate-600">
                                                {invoice.estado_provision_display || invoice.estado_provision}
                                            </span>
                                            {invoice.estado_pago === "pagado_total" && (
                                                <Badge variant="paid" size="xs">$</Badge>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2">
                                        <div className="flex items-center gap-1">
                                            <span className="font-medium text-slate-900 text-sm">
                                                {invoice.numero_factura || "SIN-NUM"}
                                            </span>
                                            {invoice.requiere_revision && (
                                                <AlertCircle className="w-3 h-3 text-amber-500" title="Requiere Revisión" />
                                            )}
                                            {invoice.has_disputes && (
                                                <AlertTriangle className="w-3 h-3 text-orange-500" title="Tiene Disputa" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2">
                                        <span className="text-sm text-slate-700 truncate max-w-[150px] block">
                                            {invoice.proveedor_data?.nombre || "-"}
                                        </span>
                                    </td>
                                    <td className="px-2 py-2">
                                        <div className="text-sm">
                                            {invoice.ot_data ? (
                                                <>
                                                    <span className="font-medium text-slate-800">{invoice.ot_data.numero_ot}</span>
                                                    <span className="text-slate-500 text-xs block truncate max-w-[120px]">
                                                        {invoice.ot_data.cliente || ""}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-slate-400 text-xs italic">Sin OT</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 text-sm text-slate-600 whitespace-nowrap">
                                        {formatDate(invoice.fecha_emision)}
                                    </td>
                                    <td className="px-2 py-2 text-right">
                                        <span className="text-sm font-semibold text-slate-900">
                                            ${(invoice.monto_aplicable ?? invoice.monto)?.toLocaleString("es-MX", {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 0,
                                            }) || "0"}
                                        </span>
                                    </td>
                                    <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-1">
                                            {/* Acción rápida: Provisionar */}
                                            {invoice.estado_provision === "pendiente" && (
                                                <Button
                                                    variant="ghost"
                                                    size="xs"
                                                    onClick={() => handleQuickProvision(invoice)}
                                                    disabled={provisioningId === invoice.id}
                                                    title="Provisionar hoy"
                                                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                >
                                                    {provisioningId === invoice.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <ClipboardCheck className="w-3.5 h-3.5" />
                                                    )}
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                onClick={() => {
                                                    setQuickViewInvoice(invoice);
                                                    setIsQuickViewOpen(true);
                                                }}
                                                title="Vista rápida"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                onClick={() => setSelectedInvoiceForOT(invoice)}
                                                title={invoice.ot_data ? "Cambiar OT" : "Asignar OT"}
                                            >
                                                <Link2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {data?.count > pageSize && (
                <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <p className="text-sm text-gray-600">
                        Mostrando {(page - 1) * pageSize + 1} -{" "}
                        {Math.min(page * pageSize, data.count)} de {data.count}{" "}
                        facturas
                    </p>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600 hidden sm:inline">
                                Mostrar:
                            </label>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(parseInt(e.target.value, 10));
                                    setPage(1);
                                }}
                                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            >
                                <option value="20">20</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                            <span className="text-sm text-gray-600 hidden sm:inline">
                                por página
                            </span>
                        </div>
                        <div className="h-5 w-px bg-gray-300 mx-1"></div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={!data.previous}
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => p + 1)}
                            disabled={!data.next}
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            )}
        </>
    );

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Stats Cards - Diseño compacto ERP */}
            {stats && (
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                    <div className="bg-white border border-slate-200 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-500 uppercase tracking-wide">Total</span>
                            <FileText className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="text-xl font-bold text-slate-900">{stats.total}</div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-500 uppercase tracking-wide">Pendientes</span>
                            <span className="status-dot pending"></span>
                        </div>
                        <div className="text-xl font-bold text-amber-600">{stats.pendientes_provision || 0}</div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-500 uppercase tracking-wide">Provisionadas</span>
                            <span className="status-dot success"></span>
                        </div>
                        <div className="text-xl font-bold text-emerald-600">{stats.provisionadas || 0}</div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-500 uppercase tracking-wide">Pagadas</span>
                            <DollarSign className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="text-xl font-bold text-slate-700">{stats.pagadas || 0}</div>
                    </div>
                </div>
            )}

            {/* Filters and Actions */}
            <Card>
                <CardContent className="pt-4 sm:pt-6">
                    <div className="flex flex-col gap-3 sm:gap-4">
                        {/* Search */}
                        <div className="w-full">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar factura, proveedor, OT..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-wrap">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex-1 sm:flex-none"
                            >
                                {showFilters ? (
                                    <ChevronUp className="w-4 h-4 sm:mr-2" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 sm:mr-2" />
                                )}
                                <span className="hidden sm:inline">
                                    Filtros
                                </span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportToExcel}
                                className="flex-1 sm:flex-none"
                            >
                                <Download className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Excel</span>
                            </Button>
                            {/* Solo Admin y Jefe Ops pueden subir facturas */}
                            {canImport && (
                                <Button
                                    size="sm"
                                    onClick={() =>
                                        (window.location.href = "/invoices/new")
                                    }
                                    className="flex-1 sm:flex-none"
                                >
                                    <Upload className="w-4 h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Subir</span>
                                </Button>
                            )}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsCreditNoteModalOpen(true)}
                                className="hidden md:inline-flex"
                            >
                                <FileMinus className="w-4 h-4 mr-2" />
                                Nota de Crédito
                            </Button>
                        </div>
                    </div>

                    {/* Barra de Acciones Masivas */}
                    {selectedInvoices.length > 0 && (
                        <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-sm sm:text-base font-medium text-blue-900 truncate">
                                        {selectedInvoices.length} seleccionada
                                        {selectedInvoices.length !== 1
                                            ? "s"
                                            : ""}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedInvoices([])}
                                    >
                                        <X className="w-4 h-4 sm:mr-1" />
                                        <span className="hidden sm:inline">
                                            Limpiar
                                        </span>
                                    </Button>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleBulkPDF}
                                        className="flex-1 sm:flex-none"
                                    >
                                        <Package className="w-4 h-4 sm:mr-2" />
                                        <span className="hidden sm:inline">
                                            PDF
                                        </span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleBulkZIP}
                                        className="hidden md:inline-flex"
                                    >
                                        <Archive className="w-4 h-4 mr-2" />
                                        ZIP
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() =>
                                            setShowBulkDeleteConfirm(true)
                                        }
                                        disabled={bulkDeleteMutation.isPending}
                                        className="flex-1 sm:flex-none"
                                    >
                                        <Trash2 className="w-4 h-4 sm:mr-2" />
                                        <span className="hidden sm:inline">
                                            Eliminar
                                        </span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Panel de Filtros Avanzados */}
                    {showFilters && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label
                                        htmlFor="estado_provision"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Estado de Provisión
                                    </label>
                                    <select
                                        id="estado_provision"
                                        value={filters.estado_provision}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                estado_provision:
                                                    e.target.value,
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Todos</option>
                                        <option value="pendiente">
                                            Pendiente
                                        </option>
                                        <option value="provisionada">
                                            Provisionada
                                        </option>
                                        <option value="revision">
                                            En Revisión
                                        </option>
                                        <option value="disputada">
                                            Disputada
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Estado de Facturación
                                    </label>
                                    <select
                                        value={filters.estado_facturacion}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                estado_facturacion:
                                                    e.target.value,
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Todos</option>
                                        <option value="pendiente">
                                            Pendiente
                                        </option>
                                        <option value="facturada">
                                            Facturada
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tipo de Costo
                                    </label>
                                    <select
                                        value={filters.tipo_costo}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                tipo_costo: e.target.value,
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={filterValuesLoading}
                                    >
                                        <option value="">Todos</option>
                                        {filterValues?.tipos_costo?.map(
                                            (tipo) => (
                                                <option
                                                    key={tipo.code}
                                                    value={tipo.code}
                                                >
                                                    {tipo.name}
                                                </option>
                                            )
                                        )}
                                    </select>
                                    {!filterValuesLoading &&
                                        (!filterValues?.tipos_costo ||
                                            filterValues.tipos_costo.length ===
                                                0) && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                No hay tipos de costo con
                                                facturas
                                            </p>
                                        )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Proveedor
                                    </label>
                                    <select
                                        value={filters.proveedor}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                proveedor: e.target.value,
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={filterValuesLoading}
                                    >
                                        <option value="">Todos</option>
                                        {filterValues?.proveedores?.map(
                                            (proveedor) => (
                                                <option
                                                    key={proveedor.id}
                                                    value={proveedor.id}
                                                >
                                                    {proveedor.nombre}
                                                </option>
                                            )
                                        )}
                                    </select>
                                    {!filterValuesLoading &&
                                        (!filterValues?.proveedores ||
                                            filterValues.proveedores.length ===
                                                0) && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                No hay proveedores con facturas
                                            </p>
                                        )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha Desde
                                    </label>
                                    <Input
                                        type="date"
                                        value={filters.fecha_desde}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                fecha_desde: e.target.value,
                                            })
                                        }
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha Hasta
                                    </label>
                                    <Input
                                        type="date"
                                        value={filters.fecha_hasta}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                fecha_hasta: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            {/* Botón para limpiar filtros */}
                            <div className="mt-4 flex justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setFilters({
                                            estado_provision: "",
                                            estado_facturacion: "",
                                            tipo_costo: "",
                                            proveedor: "",
                                            fecha_desde: "",
                                            fecha_hasta: "",
                                        })
                                    }
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Limpiar Filtros
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Invoices Table */}
            <Card>
                <CardContent className="p-6">
                    <Tabs
                        value={activeTab}
                        onValueChange={setActiveTab}
                        className="w-full"
                    >
                        <TabsList className="grid w-full grid-cols-6 mb-6">
                            <TabsTrigger
                                value="all"
                                className="flex items-center justify-between gap-2 px-3"
                            >
                                <span className="text-sm font-medium">
                                    Todas
                                </span>
                                <Badge
                                    variant="secondary"
                                    className="text-xs px-2 py-0.5"
                                >
                                    {stats?.total || 0}
                                </Badge>
                            </TabsTrigger>

                            <TabsTrigger
                                value="pendientes"
                                className="flex items-center justify-between gap-2 px-3"
                            >
                                <span className="text-sm font-medium">
                                    Pendientes
                                </span>
                                <Badge
                                    variant="warning"
                                    className="text-xs px-2 py-0.5"
                                >
                                    {stats?.pendientes_provision || 0}
                                </Badge>
                            </TabsTrigger>

                            <TabsTrigger
                                value="provisionadas"
                                className="flex items-center justify-between gap-2 px-3"
                            >
                                <span className="text-sm font-medium">
                                    Provisionadas
                                </span>
                                <Badge
                                    variant="success"
                                    className="text-xs px-2 py-0.5"
                                >
                                    {stats?.provisionadas || 0}
                                </Badge>
                            </TabsTrigger>

                            <TabsTrigger
                                value="pagadas"
                                className="flex items-center justify-between gap-2 px-3"
                            >
                                <span className="text-sm font-medium">
                                    Pagadas
                                </span>
                                <Badge
                                    variant="default"
                                    className="text-xs px-2 py-0.5 bg-emerald-500 hover:bg-emerald-600"
                                >
                                    {stats?.pagadas || 0}
                                </Badge>
                            </TabsTrigger>

                            <TabsTrigger
                                value="disputadas"
                                className="flex items-center justify-between gap-2 px-3"
                            >
                                <span className="text-sm font-medium flex items-center gap-1">
                                    Disputadas
                                    {stats?.disputadas > 0 && (
                                        <AlertTriangle className="h-3 w-3 text-red-500" />
                                    )}
                                </span>
                                <Badge
                                    variant="destructive"
                                    className="text-xs px-2 py-0.5"
                                >
                                    {stats?.disputadas || 0}
                                </Badge>
                            </TabsTrigger>

                            <TabsTrigger
                                value="anuladas"
                                className="flex items-center justify-between gap-2 px-3"
                            >
                                <span className="text-sm font-medium">
                                    Anuladas
                                </span>
                                <Badge
                                    variant="outline"
                                    className="text-xs px-2 py-0.5"
                                >
                                    {stats?.anuladas || 0}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="all">
                            {isLoading ? (
                                <div className="text-center py-12">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <p className="mt-2 text-sm text-gray-600">
                                        Cargando facturas...
                                    </p>
                                </div>
                            ) : data?.results?.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">
                                        No se encontraron facturas
                                    </p>
                                    <Button
                                        className="mt-4"
                                        size="sm"
                                        onClick={() =>
                                            (window.location.href =
                                                "/invoices/new")
                                        }
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Subir primera factura
                                    </Button>
                                </div>
                            ) : (
                                <InvoiceTableContent />
                            )}
                        </TabsContent>

                        <TabsContent value="pendientes">
                            {isLoading ? (
                                <div className="text-center py-12">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <p className="mt-2 text-sm text-gray-600">
                                        Cargando facturas pendientes...
                                    </p>
                                </div>
                            ) : data?.results?.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">
                                        No se encontraron facturas pendientes
                                    </p>
                                </div>
                            ) : (
                                <InvoiceTableContent />
                            )}
                        </TabsContent>

                        <TabsContent value="provisionadas">
                            {isLoading ? (
                                <div className="text-center py-12">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <p className="mt-2 text-sm text-gray-600">
                                        Cargando facturas provisionadas...
                                    </p>
                                </div>
                            ) : data?.results?.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">
                                        No se encontraron facturas provisionadas
                                    </p>
                                </div>
                            ) : (
                                <InvoiceTableContent />
                            )}
                        </TabsContent>

                        <TabsContent value="pagadas">
                            {isLoading ? (
                                <div className="text-center py-12">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <p className="mt-2 text-sm text-gray-600">
                                        Cargando facturas pagadas...
                                    </p>
                                </div>
                            ) : data?.results?.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">
                                        No se encontraron facturas pagadas
                                    </p>
                                </div>
                            ) : (
                                <InvoiceTableContent />
                            )}
                        </TabsContent>

                        <TabsContent value="disputadas">
                            {isLoading ? (
                                <div className="text-center py-12">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <p className="mt-2 text-sm text-gray-600">
                                        Cargando facturas disputadas...
                                    </p>
                                </div>
                            ) : data?.results?.length === 0 ||
                              stats?.disputadas === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-green-600 font-medium">
                                        No hay facturas disputadas
                                    </p>
                                </div>
                            ) : (
                                <InvoiceTableContent />
                            )}
                        </TabsContent>

                        <TabsContent value="anuladas">
                            {isLoading ? (
                                <div className="text-center py-12">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <p className="mt-2 text-sm text-gray-600">
                                        Cargando facturas anuladas...
                                    </p>
                                </div>
                            ) : data?.results?.length === 0 ||
                              stats?.anuladas === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-600">
                                        No hay facturas anuladas
                                    </p>
                                </div>
                            ) : (
                                <InvoiceTableContent />
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Modal para asignar OT */}
            {selectedInvoiceForOT && (
                <InvoiceAssignOTModal
                    isOpen={!!selectedInvoiceForOT}
                    onClose={() => setSelectedInvoiceForOT(null)}
                    invoice={selectedInvoiceForOT}
                    onAssign={async (otId) => {
                        await assignOTMutation.mutateAsync({
                            invoiceId: selectedInvoiceForOT.id,
                            otId,
                        });
                        setSelectedInvoiceForOT(null);
                    }}
                />
            )}

            {showDisputeModal && (
                <DisputeFormModal
                    isOpen={showDisputeModal}
                    onClose={() => setShowDisputeModal(false)}
                    invoice={selectedInvoiceForDispute}
                />
            )}

            {isCreditNoteModalOpen && (
                <CreateCreditNoteModal
                    isOpen={isCreditNoteModalOpen}
                    onClose={() => setIsCreditNoteModalOpen(false)}
                    onSuccess={() => {
                        setIsCreditNoteModalOpen(false);
                        queryClient.invalidateQueries(["invoices"]);
                        queryClient.invalidateQueries(["invoices-stats"]);
                    }}
                />
            )}

            {/* Confirmación de eliminación masiva */}
            <ConfirmDialog
                isOpen={showBulkDeleteConfirm}
                onClose={() => setShowBulkDeleteConfirm(false)}
                onConfirm={handleConfirmBulkDelete}
                title="Confirmar Eliminación Masiva"
                message={`¿Estás seguro de que deseas eliminar ${selectedInvoices.length} facturas seleccionadas? Esta acción no se puede deshacer.`}
                confirmText="Sí, eliminar"
                cancelText="Cancelar"
                isConfirming={isDeletingBulk}
            />

            {/* QuickView - Panel lateral de detalle rápido */}
            <InvoiceQuickView
                invoice={quickViewDetail || quickViewInvoice}
                isOpen={isQuickViewOpen}
                onClose={() => {
                    setIsQuickViewOpen(false);
                    setQuickViewInvoice(null);
                }}
                onUpdate={() => {
                    queryClient.invalidateQueries(["invoices"]);
                    queryClient.invalidateQueries(["invoices-stats"]);
                }}
            />
        </div>
    );
}
