import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../lib/api";
import { formatDate } from "../lib/dateUtils";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/Select";
import {
    FileText,
    Search,
    Download,
    Upload,
    Filter,
    ChevronDown,
    ChevronUp,
    X,
    Eye,
    TrendingDown,
    DollarSign,
    CheckCircle,
    Clock,
    ExternalLink,
    FileMinus
} from "lucide-react";
import { useProviders } from "../hooks/useInvoices";
import { CreateCreditNoteModal } from "../components/invoices/CreateCreditNoteModal";

export function CreditNotesPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [showFilters, setShowFilters] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filters, setFilters] = useState({
        estado: "",
        proveedor_id: "",
        fecha_desde: "",
        fecha_hasta: "",
    });

    const { data: providersData } = useProviders({ page_size: 1000 });

    // Obtener notas de crédito
    const { data, isLoading, error } = useQuery({
        queryKey: ["credit-notes", page, pageSize, search, filters],
        queryFn: async () => {
            const params = new URLSearchParams(
                Object.entries({
                    page: page.toString(),
                    page_size: pageSize.toString(),
                    search,
                    ...filters
                }).filter(([_, value]) => value)
            );
            const response = await apiClient.get(`/invoices/credit-notes/?${params}`);
            return response.data;
        }
    });

    // Obtener estadísticas
    const { data: statsData } = useQuery({
        queryKey: ["credit-notes-stats", filters],
        queryFn: async () => {
            const params = new URLSearchParams(
                Object.entries(filters).filter(([_, value]) => value)
            );
            const response = await apiClient.get(`/invoices/credit-notes/stats/?${params}`);
            return response.data;
        }
    });

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const handleClearFilters = () => {
        setFilters({ estado: "", proveedor_id: "", fecha_desde: "", fecha_hasta: "" });
        setSearch("");
        setPage(1);
    };

    const handleViewDetail = (creditNoteId) => {
        navigate(`/invoices/credit-notes/${creditNoteId}`);
    };

    const handleDownloadPDF = async (creditNote) => {
        if (creditNote.uploaded_file) {
            try {
                const response = await apiClient.get(`/files/${creditNote.uploaded_file}/download/`, {
                    responseType: 'blob'
                });
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `NC_${creditNote.numero_nota}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.remove();
            } catch (error) {
                console.error('Error al descargar:', error);
            }
        }
    };

    if (error) {
        return (
            <div className="p-4 text-center">
                <p className="text-red-600">Error al cargar las notas de crédito: {error.message}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Estadísticas */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                            Total Notas
                        </CardTitle>
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                            {statsData?.total_notas || 0}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            En el sistema
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                            Monto Total
                        </CardTitle>
                        <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-red-600">
                            -${(statsData?.monto_total || 0).toLocaleString("es-MX", { minimumFractionDigits: 0 })}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Crédito aplicado
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                            Aplicadas
                        </CardTitle>
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-green-600">
                            {statsData?.aplicadas || 0}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            ${(statsData?.monto_aplicadas || 0).toLocaleString("es-MX", { minimumFractionDigits: 0 })}
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                            Pendientes
                        </CardTitle>
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-yellow-600">
                            {statsData?.pendientes || 0}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            ${(statsData?.monto_pendientes || 0).toLocaleString("es-MX", { minimumFractionDigits: 0 })}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Barra de búsqueda y acciones */}
            <Card>
                <CardContent className="pt-4 sm:pt-6">
                    <div className="flex flex-col gap-3 sm:gap-4">
                        {/* Search */}
                        <div className="w-full">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar por número de nota, proveedor, factura, OT..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 h-10"
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch("")}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex-1 sm:flex-none ${showFilters ? "bg-blue-50 border-blue-300" : ""}`}
                            >
                                <Filter className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Filtros</span>
                                {showFilters ? <ChevronUp className="w-4 h-4 ml-2 hidden sm:inline" /> : <ChevronDown className="w-4 h-4 ml-2 hidden sm:inline" />}
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => setIsModalOpen(true)}
                                className="flex-1 sm:flex-none"
                            >
                                <FileMinus className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Crear NC</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 sm:flex-none"
                            >
                                <Download className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Exportar</span>
                            </Button>
                        </div>
                    </div>
                </CardContent>
                {showFilters && (
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                                <select
                                    value={filters.estado}
                                    onChange={(e) => handleFilterChange("estado", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Todos</option>
                                    <option value="pendiente">Pendiente</option>
                                    <option value="aplicada">Aplicada</option>
                                    <option value="rechazada">Rechazada</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                                <select
                                    value={filters.proveedor_id}
                                    onChange={(e) => handleFilterChange("proveedor_id", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Todos</option>
                                    {providersData?.results?.map((p) => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
                                <Input
                                    type="date"
                                    value={filters.fecha_desde}
                                    onChange={(e) => handleFilterChange("fecha_desde", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
                                <Input
                                    type="date"
                                    value={filters.fecha_hasta}
                                    onChange={(e) => handleFilterChange("fecha_hasta", e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <Button variant="outline" size="sm" onClick={handleClearFilters}>
                                <X className="w-4 h-4 mr-2" />
                                Limpiar Filtros
                            </Button>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Tabla de Notas de Crédito */}
            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="mt-2 text-sm text-gray-600">Cargando notas de crédito...</p>
                        </div>
                    ) : data?.results?.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 font-medium">No se encontraron notas de crédito</p>
                            <p className="text-sm text-gray-500 mt-2">Intenta ajustar los filtros o realiza una nueva búsqueda</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50">
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Número NC
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Proveedor
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Factura / OT
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Fecha Emisión
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Monto
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Estado
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {data?.results?.map((cn) => (
                                            <tr key={cn.id} className="hover:bg-blue-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-gray-400" />
                                                        <Link
                                                            to={`/invoices/credit-notes/${cn.id}`}
                                                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                                        >
                                                            {cn.numero_nota}
                                                        </Link>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm">
                                                        <p className="font-medium text-gray-900">{cn.proveedor_nombre}</p>
                                                        {cn.motivo && (
                                                            <p className="text-xs text-gray-500 truncate max-w-xs" title={cn.motivo}>
                                                                {cn.motivo}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm space-y-1">
                                                        {cn.invoice_data?.numero_factura ? (
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-xs text-gray-500">Fact:</span>
                                                                <Link
                                                                    to={`/invoices/${cn.invoice_data.id}`}
                                                                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                                                >
                                                                    {cn.invoice_data.numero_factura}
                                                                </Link>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                        {cn.ot_data?.numero_ot && (
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-xs text-gray-500">OT:</span>
                                                                <Link
                                                                    to={`/ots/${cn.ot_data.id}`}
                                                                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                                                >
                                                                    {cn.ot_data.numero_ot}
                                                                </Link>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {formatDate(cn.fecha_emision)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="font-bold text-red-600 text-base">
                                                        -${Math.abs(parseFloat(cn.monto || 0)).toLocaleString('es-MX', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2
                                                        })}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                        cn.estado === 'aplicada'
                                                            ? 'bg-green-100 text-green-800'
                                                            : cn.estado === 'pendiente'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {cn.estado_display || cn.estado}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleViewDetail(cn.id)}
                                                            title="Ver detalles"
                                                            className="h-8 w-8"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        {cn.uploaded_file && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDownloadPDF(cn)}
                                                                title="Descargar PDF"
                                                                className="h-8 w-8 hidden sm:inline-flex"
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

                            {/* Paginación */}
                            {data?.count > pageSize && (
                                <div className="mt-6 flex items-center justify-between border-t pt-4">
                                    <p className="text-sm text-gray-600">
                                        Mostrando <span className="font-semibold">{(page - 1) * pageSize + 1}</span> - <span className="font-semibold">{Math.min(page * pageSize, data.count)}</span> de <span className="font-semibold">{data.count}</span> notas
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <Select
                                            value={pageSize.toString()}
                                            onValueChange={(value) => {
                                                setPageSize(parseInt(value, 10));
                                                setPage(1);
                                            }}
                                        >
                                            <SelectTrigger className="w-[120px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="20">20 / página</SelectItem>
                                                <SelectItem value="50">50 / página</SelectItem>
                                                <SelectItem value="100">100 / página</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(page - 1)}
                                            disabled={!data?.previous}
                                        >
                                            Anterior
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(page + 1)}
                                            disabled={!data?.next}
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

            {isModalOpen && (
                <CreateCreditNoteModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        queryClient.invalidateQueries(["credit-notes"]);
                        queryClient.invalidateQueries(["credit-notes-stats"]);
                    }}
                />
            )}
        </div>
    );
}
