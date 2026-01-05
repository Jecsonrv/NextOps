import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { InvoiceDetailModal } from "../components/invoices/InvoiceDetailModal";
import { InvoiceEditModal } from "../components/invoices/InvoiceEditModal";
import { usePermissions } from "../components/common/PermissionGate";
import { Card, CardContent } from "../components/ui/Card";
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
    DollarSign,
    Loader2,
    ClipboardCheck,
    Filter,
    Edit,
    MoreHorizontal,
    RefreshCw,
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
    const [selectedInvoiceForDispute, setSelectedInvoiceForDispute] = useState(null);
    const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);
    const [selectedInvoices, setSelectedInvoices] = useState([]);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [isDeletingBulk, setIsDeletingBulk] = useState(false);

    // Estados para modales nuevos
    const [detailModalInvoice, setDetailModalInvoice] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [editModalInvoice, setEditModalInvoice] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

    const getFiltersForTab = () => {
        const baseFilters = { ...filters };
        switch (activeTab) {
            case "pendientes":
                return { ...baseFilters, estado_provision: "pendiente" };
            case "provisionadas":
                return { ...baseFilters, estado_provision: "provisionada", excluir_pagadas: "true" };
            case "pagadas":
                return { ...baseFilters, estado_pago: "pagado_total" };
            case "disputadas":
                return { ...baseFilters, estado_provision: "disputada" };
            case "anuladas":
                return { ...baseFilters, estado_provision: "anulada,anulada_parcialmente" };
            default:
                return baseFilters;
        }
    };

    const { data: filterValues, isLoading: filterValuesLoading } = useInvoiceFilterValues();
    const queryClient = useQueryClient();
    const bulkDeleteMutation = useBulkDeleteInvoices();

    // Fetch detalle para modal
    const { data: detailData } = useInvoiceDetail(
        detailModalInvoice?.id,
        { enabled: !!detailModalInvoice?.id && isDetailModalOpen }
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
            toast.success("Factura provisionada");
            setProvisioningId(null);
        },
        onError: () => {
            toast.error("Error al provisionar");
            setProvisioningId(null);
        },
    });

    const handleQuickProvision = async (invoice, e) => {
        e?.stopPropagation();
        if (invoice.estado_provision !== "pendiente") return;
        setProvisioningId(invoice.id);
        await quickProvisionMutation.mutateAsync(invoice.id);
    };

    // Mutation para asignar OT
    const assignOTMutation = useMutation({
        mutationFn: async ({ invoiceId, otId }) => {
            const response = await apiClient.patch(`/invoices/${invoiceId}/`, { ot_id: otId });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["invoices"]);
            queryClient.invalidateQueries(["invoices-stats"]);
        },
        onError: () => {
            toast.error("Error al asignar OT");
        },
    });

    // Fetch invoices
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["invoices", page, pageSize, search, filters, activeTab],
        queryFn: async () => {
            const tabFilters = getFiltersForTab();
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: pageSize.toString(),
                ...(search && { search }),
                ...(tabFilters.estado_provision && { estado_provision: tabFilters.estado_provision }),
                ...(tabFilters.estado_facturacion && { estado_facturacion: tabFilters.estado_facturacion }),
                ...(tabFilters.estado_pago && { estado_pago: tabFilters.estado_pago }),
                ...(tabFilters.excluir_pagadas && { excluir_pagadas: tabFilters.excluir_pagadas }),
                ...(tabFilters.tipo_costo && { tipo_costo: tabFilters.tipo_costo }),
                ...(tabFilters.proveedor && { proveedor: tabFilters.proveedor }),
                ...(tabFilters.fecha_desde && { fecha_emision_desde: tabFilters.fecha_desde }),
                ...(tabFilters.fecha_hasta && { fecha_emision_hasta: tabFilters.fecha_hasta }),
            });
            const response = await apiClient.get(`/invoices/?${params}`);
            return response.data;
        },
    });

    // Fetch stats
    const { data: stats } = useQuery({
        queryKey: ["invoices-stats", search, filters],
        queryFn: async () => {
            const params = new URLSearchParams({
                ...(search && { search }),
                ...(filters.estado_provision && { estado_provision: filters.estado_provision }),
                ...(filters.estado_facturacion && { estado_facturacion: filters.estado_facturacion }),
                ...(filters.tipo_costo && { tipo_costo: filters.tipo_costo }),
                ...(filters.proveedor && { proveedor: filters.proveedor }),
                ...(filters.fecha_desde && { fecha_emision_desde: filters.fecha_desde }),
                ...(filters.fecha_hasta && { fecha_emision_hasta: filters.fecha_hasta }),
            });
            const response = await apiClient.get(`/invoices/stats/?${params}`);
            return response.data;
        },
    });

    const buildFilterParams = () => {
        const params = new URLSearchParams({
            ...(search && { search }),
            ...(filters.estado_provision && { estado_provision: filters.estado_provision }),
            ...(filters.estado_facturacion && { estado_facturacion: filters.estado_facturacion }),
            ...(filters.tipo_costo && { tipo_costo: filters.tipo_costo }),
            ...(filters.proveedor && { proveedor: filters.proveedor }),
            ...(filters.fecha_desde && { fecha_desde: filters.fecha_desde }),
            ...(filters.fecha_hasta && { fecha_hasta: filters.fecha_hasta }),
        });
        return params.toString();
    };

    const handleExportToExcel = async () => {
        try {
            toast.loading("Exportando...", { id: "export-toast" });
            const baseParams = buildFilterParams();
            let allInvoices = [];
            let currentPage = 1;
            let hasMoreData = true;
            const exportPageSize = 200;

            while (hasMoreData) {
                const exportParams = baseParams
                    ? `${baseParams}&page=${currentPage}&page_size=${exportPageSize}`
                    : `page=${currentPage}&page_size=${exportPageSize}`;
                const response = await apiClient.get(`/invoices/?${exportParams}`);
                const pageData = response.data.results || [];
                allInvoices = [...allInvoices, ...pageData];
                hasMoreData = response.data.next !== null;
                currentPage++;
                if (currentPage > 1000) break;
            }

            if (!allInvoices.length) {
                toast.error("No hay datos", { id: "export-toast" });
                return;
            }

            exportInvoicesToExcel(allInvoices, "Facturas_Export");
            toast.success(`${allInvoices.length} facturas exportadas`, { id: "export-toast" });
        } catch (error) {
            toast.error("Error al exportar", { id: "export-toast" });
        }
    };

    const handleConfirmBulkDelete = async () => {
        setIsDeletingBulk(true);
        const toastId = toast.loading("Eliminando...");
        try {
            await bulkDeleteMutation.mutateAsync(selectedInvoices);
            toast.success(`${selectedInvoices.length} facturas eliminadas`, { id: toastId });
            setSelectedInvoices([]);
            setShowBulkDeleteConfirm(false);
        } catch (error) {
            toast.error("Error al eliminar", { id: toastId });
        } finally {
            setIsDeletingBulk(false);
        }
    };

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

    // Abrir modal de detalle
    const openDetailModal = (invoice) => {
        setDetailModalInvoice(invoice);
        setIsDetailModalOpen(true);
    };

    // Abrir modal de edición
    const openEditModal = (invoice) => {
        setEditModalInvoice(invoice);
        setIsEditModalOpen(true);
    };

    // Abrir modal de disputa
    const openDisputeModal = (invoice) => {
        setSelectedInvoiceForDispute(invoice);
        setShowDisputeModal(true);
    };

    if (error) {
        return (
            <div className="p-4 text-center">
                <p className="text-red-600">Error al cargar: {error.message}</p>
            </div>
        );
    }

    // Configuración de colores de estado (más sobrios)
    const getEstadoStyle = (estado) => {
        const styles = {
            pendiente: "text-amber-700 bg-amber-50",
            revision: "text-blue-700 bg-blue-50",
            disputada: "text-orange-700 bg-orange-50",
            provisionada: "text-emerald-700 bg-emerald-50",
            anulada: "text-slate-500 bg-slate-100",
            anulada_parcialmente: "text-slate-500 bg-slate-100",
            rechazada: "text-red-700 bg-red-50",
        };
        return styles[estado] || "text-slate-600 bg-slate-50";
    };

    // Tabla profesional ERP
    const InvoiceTable = () => (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="w-10 px-3 py-3 text-center">
                            <input
                                type="checkbox"
                                checked={selectedInvoices.length === data?.results?.length && data?.results?.length > 0}
                                onChange={handleSelectAll}
                                className="rounded border-slate-300 text-slate-700 focus:ring-slate-500"
                            />
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Operativo</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">OT</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Cliente</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Factura</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Proveedor</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Concepto</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Monto</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Emisión</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Provisión</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Facturación</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Estado</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide w-28">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data?.results?.map((invoice) => (
                        <tr
                            key={invoice.id}
                            className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedInvoices.includes(invoice.id) ? "bg-blue-50/50" : ""}`}
                            onClick={() => openDetailModal(invoice)}
                        >
                            <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={selectedInvoices.includes(invoice.id)}
                                    onChange={() => handleSelectOne(invoice.id)}
                                    className="rounded border-slate-300 text-slate-700 focus:ring-slate-500"
                                />
                            </td>
                            <td className="px-3 py-2.5">
                                <span className="text-slate-700 font-medium">
                                    {invoice.ot_data?.operativo || "-"}
                                </span>
                            </td>
                            <td className="px-3 py-2.5">
                                {invoice.ot_data ? (
                                    <span className="text-blue-600 font-medium">
                                        {invoice.ot_data.numero_ot}
                                    </span>
                                ) : (
                                    <span className="text-slate-400 text-xs">Sin OT</span>
                                )}
                            </td>
                            <td className="px-3 py-2.5">
                                <span className="text-slate-700 truncate block max-w-[120px]">
                                    {invoice.ot_data?.cliente || "-"}
                                </span>
                            </td>
                            <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-slate-900">
                                        {invoice.numero_factura || "SIN-NUM"}
                                    </span>
                                    {invoice.requiere_revision && (
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                    )}
                                    {invoice.has_disputes && (
                                        <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                                    )}
                                </div>
                            </td>
                            <td className="px-3 py-2.5">
                                <span className="text-slate-700 truncate block max-w-[140px]">
                                    {invoice.proveedor_data?.nombre || invoice.proveedor_nombre || "-"}
                                </span>
                            </td>
                            <td className="px-3 py-2.5">
                                <span className="text-slate-600 text-xs">
                                    {invoice.tipo_costo_display || invoice.tipo_costo || "-"}
                                </span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                                <span className="font-semibold text-slate-900">
                                    ${(invoice.monto_aplicable ?? invoice.monto)?.toLocaleString("es-MX", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    }) || "0.00"}
                                </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                                <span className="text-slate-600 text-xs">
                                    {formatDate(invoice.fecha_emision) || "-"}
                                </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                                <span className="text-slate-600 text-xs">
                                    {formatDate(invoice.fecha_provision) || "-"}
                                </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                                <span className="text-slate-600 text-xs">
                                    {formatDate(invoice.fecha_facturacion) || "-"}
                                </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getEstadoStyle(invoice.estado_provision)}`}>
                                    {invoice.estado_provision_display || invoice.estado_provision}
                                </span>
                            </td>
                            <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                    {invoice.estado_provision === "pendiente" && (
                                        <button
                                            onClick={(e) => handleQuickProvision(invoice, e)}
                                            disabled={provisioningId === invoice.id}
                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                            title="Provisionar"
                                        >
                                            {provisioningId === invoice.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <ClipboardCheck className="w-4 h-4" />
                                            )}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => openDetailModal(invoice)}
                                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"
                                        title="Ver detalle"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => openEditModal(invoice)}
                                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"
                                        title="Editar"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setSelectedInvoiceForOT(invoice)}
                                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"
                                        title={invoice.ot_data ? "Cambiar OT" : "Asignar OT"}
                                    >
                                        <Link2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    // Paginación
    const Pagination = () => (
        data?.count > pageSize && (
            <div className="mt-4 flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-sm text-slate-600">
                    {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, data.count)} de {data.count}
                </p>
                <div className="flex items-center gap-2">
                    <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
                        className="px-2 py-1 border border-slate-200 rounded text-sm bg-white"
                    >
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!data.previous}>
                        Anterior
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!data.next}>
                        Siguiente
                    </Button>
                </div>
            </div>
        )
    );

    // Contenido de tabla
    const TableContent = () => (
        <>
            <InvoiceTable />
            <Pagination />
        </>
    );

    return (
        <div className="space-y-4">
            {/* Stats - Diseño compacto */}
            {stats && (
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 uppercase">Total</span>
                            <FileText className="w-4 h-4 text-slate-400" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 uppercase">Pendientes</span>
                            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                        </div>
                        <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pendientes_provision || 0}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 uppercase">Provisionadas</span>
                            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                        </div>
                        <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.provisionadas || 0}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 uppercase">Pagadas</span>
                            <DollarSign className="w-4 h-4 text-slate-400" />
                        </div>
                        <p className="text-2xl font-bold text-slate-700 mt-1">{stats.pagadas || 0}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 uppercase">Disputadas</span>
                            <AlertTriangle className="w-4 h-4 text-orange-400" />
                        </div>
                        <p className="text-2xl font-bold text-orange-600 mt-1">{stats.disputadas || 0}</p>
                    </div>
                </div>
            )}

            {/* Barra de herramientas */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex flex-col lg:flex-row gap-3">
                    {/* Búsqueda */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Buscar por factura, proveedor, OT, cliente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 bg-slate-50 border-slate-200"
                        />
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                            <Filter className="w-4 h-4 mr-1" />
                            Filtros
                            {showFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => refetch()}>
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExportToExcel}>
                            <Download className="w-4 h-4 mr-1" />
                            Excel
                        </Button>
                        {canImport && (
                            <Button size="sm" onClick={() => (window.location.href = "/invoices/new")}>
                                <Upload className="w-4 h-4 mr-1" />
                                Subir
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setIsCreditNoteModalOpen(true)}>
                            <FileMinus className="w-4 h-4 mr-1" />
                            NC
                        </Button>
                    </div>
                </div>

                {/* Selección múltiple */}
                {selectedInvoices.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="font-medium text-blue-900">
                                {selectedInvoices.length} seleccionada{selectedInvoices.length !== 1 ? "s" : ""}
                            </span>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedInvoices([])}>
                                <X className="w-4 h-4 mr-1" /> Limpiar
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                                <Package className="w-4 h-4 mr-1" /> PDF
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setShowBulkDeleteConfirm(true)}>
                                <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                            </Button>
                        </div>
                    </div>
                )}

                {/* Panel de filtros */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Estado Provisión</label>
                                <select
                                    value={filters.estado_provision}
                                    onChange={(e) => setFilters({ ...filters, estado_provision: e.target.value })}
                                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
                                >
                                    <option value="">Todos</option>
                                    <option value="pendiente">Pendiente</option>
                                    <option value="provisionada">Provisionada</option>
                                    <option value="disputada">Disputada</option>
                                    <option value="anulada">Anulada</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Estado Facturación</label>
                                <select
                                    value={filters.estado_facturacion}
                                    onChange={(e) => setFilters({ ...filters, estado_facturacion: e.target.value })}
                                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
                                >
                                    <option value="">Todos</option>
                                    <option value="pendiente">Pendiente</option>
                                    <option value="facturada">Facturada</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo Costo</label>
                                <select
                                    value={filters.tipo_costo}
                                    onChange={(e) => setFilters({ ...filters, tipo_costo: e.target.value })}
                                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
                                    disabled={filterValuesLoading}
                                >
                                    <option value="">Todos</option>
                                    {filterValues?.tipos_costo?.map((tipo) => (
                                        <option key={tipo.code} value={tipo.code}>{tipo.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Proveedor</label>
                                <select
                                    value={filters.proveedor}
                                    onChange={(e) => setFilters({ ...filters, proveedor: e.target.value })}
                                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
                                    disabled={filterValuesLoading}
                                >
                                    <option value="">Todos</option>
                                    {filterValues?.proveedores?.map((p) => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Fecha Desde</label>
                                <Input
                                    type="date"
                                    value={filters.fecha_desde}
                                    onChange={(e) => setFilters({ ...filters, fecha_desde: e.target.value })}
                                    className="text-sm h-8"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Fecha Hasta</label>
                                <Input
                                    type="date"
                                    value={filters.fecha_hasta}
                                    onChange={(e) => setFilters({ ...filters, fecha_hasta: e.target.value })}
                                    className="text-sm h-8"
                                />
                            </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFilters({
                                    estado_provision: "",
                                    estado_facturacion: "",
                                    tipo_costo: "",
                                    proveedor: "",
                                    fecha_desde: "",
                                    fecha_hasta: "",
                                })}
                            >
                                <X className="w-4 h-4 mr-1" /> Limpiar filtros
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabla con Tabs */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="border-b border-slate-200 px-4">
                        <TabsList className="h-12 bg-transparent p-0 gap-0">
                            <TabsTrigger value="all" className="data-[state=active]:border-b-2 data-[state=active]:border-slate-900 rounded-none px-4">
                                Todas <Badge variant="secondary" className="ml-2 text-xs">{stats?.total || 0}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="pendientes" className="data-[state=active]:border-b-2 data-[state=active]:border-amber-500 rounded-none px-4">
                                Pendientes <Badge className="ml-2 text-xs bg-amber-100 text-amber-700">{stats?.pendientes_provision || 0}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="provisionadas" className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none px-4">
                                Provisionadas <Badge className="ml-2 text-xs bg-emerald-100 text-emerald-700">{stats?.provisionadas || 0}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="pagadas" className="data-[state=active]:border-b-2 data-[state=active]:border-slate-500 rounded-none px-4">
                                Pagadas <Badge variant="secondary" className="ml-2 text-xs">{stats?.pagadas || 0}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="disputadas" className="data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none px-4">
                                Disputadas <Badge className="ml-2 text-xs bg-orange-100 text-orange-700">{stats?.disputadas || 0}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="anuladas" className="data-[state=active]:border-b-2 data-[state=active]:border-slate-400 rounded-none px-4">
                                Anuladas <Badge variant="outline" className="ml-2 text-xs">{stats?.anuladas || 0}</Badge>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="all" className="m-0">
                        {isLoading ? (
                            <div className="text-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
                                <p className="mt-2 text-sm text-slate-500">Cargando...</p>
                            </div>
                        ) : !data?.results?.length ? (
                            <div className="text-center py-12">
                                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500">No hay facturas</p>
                            </div>
                        ) : (
                            <TableContent />
                        )}
                    </TabsContent>

                    {["pendientes", "provisionadas", "pagadas", "disputadas", "anuladas"].map((tab) => (
                        <TabsContent key={tab} value={tab} className="m-0">
                            {isLoading ? (
                                <div className="text-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
                                </div>
                            ) : !data?.results?.length ? (
                                <div className="text-center py-12">
                                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500">No hay facturas {tab}</p>
                                </div>
                            ) : (
                                <TableContent />
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            {/* Modal de Detalle */}
            <InvoiceDetailModal
                invoice={detailData || detailModalInvoice}
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setDetailModalInvoice(null);
                }}
                onEdit={(inv) => {
                    setIsDetailModalOpen(false);
                    openEditModal(inv);
                }}
                onAssignOT={(inv) => {
                    setIsDetailModalOpen(false);
                    setSelectedInvoiceForOT(inv);
                }}
                onCreateDispute={(inv) => {
                    setIsDetailModalOpen(false);
                    openDisputeModal(inv);
                }}
            />

            {/* Modal de Edición */}
            <InvoiceEditModal
                invoice={editModalInvoice}
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditModalInvoice(null);
                }}
                onSuccess={() => {
                    queryClient.invalidateQueries(["invoices"]);
                    queryClient.invalidateQueries(["invoices-stats"]);
                }}
            />

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

            {/* Modal de Disputa */}
            {showDisputeModal && (
                <DisputeFormModal
                    isOpen={showDisputeModal}
                    onClose={() => setShowDisputeModal(false)}
                    invoice={selectedInvoiceForDispute}
                />
            )}

            {/* Modal de Nota de Crédito */}
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

            {/* Confirmación de eliminación */}
            <ConfirmDialog
                isOpen={showBulkDeleteConfirm}
                onClose={() => setShowBulkDeleteConfirm(false)}
                onConfirm={handleConfirmBulkDelete}
                title="Eliminar Facturas"
                message={`¿Eliminar ${selectedInvoices.length} facturas? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                isConfirming={isDeletingBulk}
            />
        </div>
    );
}
