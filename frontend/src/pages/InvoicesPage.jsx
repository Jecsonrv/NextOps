import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import apiClient from "../lib/api";
import { useProviders } from "../hooks/useInvoices";
import { useCostTypes } from "../hooks/useCostTypes";
import { useBulkDeleteInvoices } from "../hooks/useInvoices";
import { exportInvoicesToExcel } from "../lib/exportUtils";
import { formatDate } from "../lib/dateUtils";
import { InvoiceAssignOTModal } from "../components/invoices/InvoiceAssignOTModal";
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
    Truck,
    DollarSign,
} from "lucide-react";
import { Trash2 } from "lucide-react";
import { DisputeFormModal } from "../components/disputes/DisputeFormModal";
import { CreateCreditNoteModal } from "../components/invoices/CreateCreditNoteModal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

export function InvoicesPage() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedInvoiceForOT, setSelectedInvoiceForOT] = useState(null);
    const [showDisputeModal, setShowDisputeModal] = useState(false);
    const [selectedInvoiceForDispute, setSelectedInvoiceForDispute] = useState(null);
    const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);
    const [selectedInvoices, setSelectedInvoices] = useState([]); // Para selección múltiple
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [isDeletingBulk, setIsDeletingBulk] = useState(false);
    const [filters, setFilters] = useState({
        estado_provision: "",
        estado_facturacion: "",
        tipo_costo: "",
        proveedor: "",
        fecha_desde: "",
        fecha_hasta: "",
    });

    const { data: providers } = useProviders();
    const { data: costTypes, isLoading: costTypesLoading } = useCostTypes();
    const queryClient = useQueryClient();

    const bulkDeleteMutation = useBulkDeleteInvoices();

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
            toast.error("Error al asignar OT");
        },
    });

    // Fetch invoices data
    const { data, isLoading, error } = useQuery({
        queryKey: ["invoices", page, search, filters],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: "20",
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

            const response = await apiClient.get(`/invoices/?${params}`);
            return response.data;
        },
    });

    // Fetch stats
    const { data: stats } = useQuery({
        queryKey: ["invoices-stats"],
        queryFn: async () => {
            const response = await apiClient.get("/invoices/stats/");
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
    const handleExportToExcel = () => {
        if (data?.results) {
            exportInvoicesToExcel(data.results, "Facturas_Export");
        } else {
            toast.error("No hay datos para exportar");
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

            toast.success(`${selectedInvoices.length} facturas exportadas en PDF`);
        } catch (error) {
            toast.error("Error al exportar PDFs. Por favor intenta nuevamente.");
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

            toast.success(`ZIP estructurado con ${selectedInvoices.length} facturas`);
        } catch (error) {
            toast.error("Error al exportar ZIP. Por favor intenta nuevamente.");
        }
    };

    const handleConfirmBulkDelete = async () => {
        setIsDeletingBulk(true);
        const toastId = toast.loading("Eliminando facturas seleccionadas...");
        try {
            await bulkDeleteMutation.mutateAsync(selectedInvoices);
            toast.success(`${selectedInvoices.length} facturas eliminadas exitosamente`, { id: toastId });
            setSelectedInvoices([]);
            setShowBulkDeleteConfirm(false);
        } catch (error) {
            console.error("Error eliminando facturas en masa:", error);
            toast.error("Error al eliminar las facturas seleccionadas", { id: toastId });
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

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Stats Cards */}
            {stats && (
                <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                                Total Facturas
                            </CardTitle>
                            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                                {stats.total}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                                Todas las facturas
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                                Pend. Provisión
                            </CardTitle>
                            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                                {stats.pendientes_provision || 0}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                                Por provisionar
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                                Provisionadas
                            </CardTitle>
                            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                                {stats.provisionadas || 0}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                                Listas para facturar
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                                Disputas
                            </CardTitle>
                            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                                {stats.pendientes_revision || 0}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                                Facturas con disputa activa
                            </p>
                        </CardContent>
                    </Card>
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
                                <span className="hidden sm:inline">Filtros</span>
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
                                        {selectedInvoices.length} seleccionada{selectedInvoices.length !== 1 ? 's' : ''}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedInvoices([])}
                                    >
                                        <X className="w-4 h-4 sm:mr-1" />
                                        <span className="hidden sm:inline">Limpiar</span>
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
                                        <span className="hidden sm:inline">PDF</span>
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
                                        onClick={() => setShowBulkDeleteConfirm(true)}
                                        disabled={bulkDeleteMutation.isPending}
                                        className="flex-1 sm:flex-none"
                                    >
                                        <Trash2 className="w-4 h-4 sm:mr-2" />
                                        <span className="hidden sm:inline">Eliminar</span>
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
                                    <label htmlFor="estado_provision" className="block text-sm font-medium text-gray-700 mb-1">
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
                                        disabled={costTypesLoading}
                                    >
                                        <option value="">Todos</option>
                                        {costTypes?.results?.map((costType) => (
                                            <option
                                                key={costType.code}
                                                value={costType.code}
                                            >
                                                {costType.name}
                                            </option>
                                        ))}
                                    </select>
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
                                    >
                                        <option value="">Todos</option>
                                        {providers?.results?.map(
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
                <CardHeader>
                    <CardTitle>Facturas</CardTitle>
                </CardHeader>
                <CardContent>
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
                                    (window.location.href = "/invoices/new")
                                }
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Subir primera factura
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto -mx-4 sm:mx-0">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50">
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        selectedInvoices.length ===
                                                            data?.results?.length &&
                                                        data?.results?.length > 0
                                                    }
                                                    onChange={handleSelectAll}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </th>
                                            <th className="hidden xl:table-cell px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Operativo
                                            </th>
                                            <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                OT
                                            </th>
                                            <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Cliente
                                            </th>
                                            <th className="hidden xl:table-cell px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                MBL
                                            </th>
                                            <th className="hidden xl:table-cell px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Naviera
                                            </th>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Proveedor
                                            </th>
                                            <th className="hidden xl:table-cell px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Barco
                                            </th>
                                            <th className="hidden 2xl:table-cell px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Tipo Prov.
                                            </th>
                                            <th className="hidden 2xl:table-cell px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Tipo Costo
                                            </th>
                                            <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Estado
                                            </th>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Factura
                                            </th>
                                            <th className="hidden xl:table-cell px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                F. Emisión
                                            </th>
                                            <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                F. Provisión
                                            </th>
                                            <th className="hidden xl:table-cell px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                F. Facturación
                                            </th>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Monto
                                            </th>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {data?.results?.map((invoice) => (
                                            <tr
                                                key={invoice.id}
                                                className="hover:bg-blue-50 transition-colors"
                                            >
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedInvoices.includes(
                                                            invoice.id
                                                        )}
                                                        onChange={() =>
                                                            handleSelectOne(invoice.id)
                                                        }
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="hidden xl:table-cell px-4 py-3 text-sm text-gray-900">
                                                    {invoice.ot_data?.operativo || "-"}
                                                </td>
                                                <td className="hidden lg:table-cell px-4 py-3">
                                                    {invoice.ot_data ? (
                                                        <Link
                                                            to={`/ots/${invoice.ot_data.id}`}
                                                            className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
                                                        >
                                                            <Link2 className="w-3.5 h-3.5" />
                                                            {invoice.ot_data.numero_ot}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm italic">
                                                            Sin asignar
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-900">
                                                    {invoice.ot_data?.cliente || "-"}
                                                </td>
                                                <td className="hidden xl:table-cell px-4 py-3 text-sm text-gray-600">
                                                    {invoice.ot_data?.mbl || "-"}
                                                </td>
                                                <td className="hidden xl:table-cell px-4 py-3 text-sm text-gray-900">
                                                    {invoice.ot_data?.naviera || "-"}
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                                                    <div className="truncate max-w-[120px] sm:max-w-none">
                                                        {invoice.proveedor_data?.nombre || "-"}
                                                    </div>
                                                </td>
                                                <td className="hidden xl:table-cell px-4 py-3 text-sm text-gray-900">
                                                    {invoice.ot_data?.barco || "-"}
                                                </td>
                                                <td className="hidden 2xl:table-cell px-4 py-3">
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                                                        <Ship className="w-3.5 h-3.5" />
                                                        <span className="hidden xl:inline">{invoice.proveedor_data?.tipo_display || "-"}</span>
                                                    </div>
                                                </td>
                                                <td className="hidden 2xl:table-cell px-4 py-3">
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <DollarSign className="w-3.5 h-3.5" />
                                                        {invoice.tipo_costo_display || "-"}
                                                    </div>
                                                </td>
                                                <td className="hidden lg:table-cell px-4 py-3">
                                                    <div className="flex flex-col gap-1">
                                                        <InvoiceStatusBadge invoice={invoice} />
                                                        <div className="flex gap-1">
                                                            <CostTypeBadge invoice={invoice} />
                                                            <ExcludedFromStatsBadge invoice={invoice} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3">
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                                        <Link
                                                            to={`/invoices/${invoice.id}`}
                                                            className="font-medium text-xs sm:text-sm text-blue-600 hover:text-blue-800 truncate max-w-[100px] sm:max-w-none"
                                                        >
                                                            {invoice.numero_factura || "SIN-NUM"}
                                                        </Link>
                                                        <div className="flex items-center gap-1">
                                                            {invoice.requiere_revision && (
                                                                <AlertCircle
                                                                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-500 flex-shrink-0"
                                                                    title="Requiere Revisión"
                                                                />
                                                            )}
                                                            {invoice.has_disputes && invoice.dispute_id && (
                                                                <Link
                                                                    to={`/invoices/disputes/${invoice.dispute_id}`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    title="Ver Disputa"
                                                                >
                                                                    <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-500 hover:text-yellow-700 flex-shrink-0" />
                                                                </Link>
                                                            )}
                                                            {invoice.has_credit_notes && (
                                                                <FileMinus
                                                                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-500 flex-shrink-0"
                                                                    title="Tiene Notas de Crédito"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="hidden xl:table-cell px-4 py-3 text-sm text-gray-600">
                                                    {formatDate(invoice.fecha_emision)}
                                                </td>
                                                <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-600">
                                                    {formatDate(invoice.fecha_provision)}
                                                </td>
                                                <td className="hidden xl:table-cell px-4 py-3 text-sm text-gray-600">
                                                    {formatDate(invoice.fecha_facturacion)}
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900">
                                                    <div className="truncate">
                                                        ${(invoice.monto_aplicable ?? invoice.monto)?.toLocaleString(
                                                            "es-MX",
                                                            {
                                                                minimumFractionDigits: 0,
                                                                maximumFractionDigits: 0,
                                                            }
                                                        ) || "0"}
                                                    </div>
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                                                    <div className="flex justify-end gap-0.5 sm:gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                (window.location.href = `/invoices/${invoice.id}`)
                                                            }
                                                            title="Ver detalles"
                                                            className="h-8 w-8"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                setSelectedInvoiceForOT(
                                                                    invoice
                                                                )
                                                            }
                                                            title={
                                                                invoice.ot_data
                                                                    ? "Cambiar OT"
                                                                    : "Asignar OT"
                                                            }
                                                            className="h-8 w-8 hidden sm:inline-flex"
                                                        >
                                                            <Link2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                setSelectedInvoiceForDispute(invoice);
                                                                setShowDisputeModal(true);
                                                            }}
                                                            title="Crear Disputa"
                                                            className="h-8 w-8 hidden md:inline-flex"
                                                        >
                                                            <AlertTriangle className="w-4 h-4" />
                                                        </Button>
                                                        {invoice.file_url && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    window.open(
                                                                        `${
                                                                            import.meta
                                                                                .env
                                                                                .VITE_BASE_URL
                                                                        }${
                                                                            invoice.file_url
                                                                        }`,
                                                                        "_blank"
                                                                    )
                                                                }
                                                                title="Descargar archivo"
                                                                className="h-8 w-8 hidden lg:inline-flex"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {data?.count > 20 && (
                                <div className="mt-6 flex items-center justify-between">
                                    <p className="text-sm text-gray-600">
                                        Mostrando {(page - 1) * 20 + 1} -{" "}
                                        {Math.min(page * 20, data.count)} de{" "}
                                        {data.count} facturas
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setPage((p) =>
                                                    Math.max(1, p - 1)
                                                )
                                            }
                                            disabled={!data.previous}
                                        >
                                            Anterior
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setPage((p) => p + 1)
                                            }
                                            disabled={!data.next}
                                        >
                                            Siguiente
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
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
        </div>
    );
}
