import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../lib/api";
import { formatDate } from "../lib/dateUtils";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
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
    const [showFilters, setShowFilters] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filters, setFilters] = useState({
        estado: "",
        proveedor_id: "",
        fecha_desde: "",
        fecha_hasta: "",
    });

    const { data: providersData } = useProviders();

    // Obtener notas de crédito
    const { data, isLoading, error } = useQuery({
        queryKey: ["credit-notes", page, search, filters],
        queryFn: async () => {
            const params = new URLSearchParams(
                Object.entries({
                    page: page.toString(),
                    page_size: "20",
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900">Notas de Crédito</h1>
                    <p className="text-gray-600 mt-2">Gestión y seguimiento de notas de crédito de proveedores</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setIsModalOpen(true)}>
                        <FileMinus className="w-4 h-4 mr-2" />
                        Crear Nota de Crédito
                    </Button>
                    <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Exportar
                    </Button>
                </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Notas</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">
                                    {statsData?.total_notas || 0}
                                </p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-full">
                                <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Monto Total</p>
                                <p className="text-3xl font-bold text-red-600 mt-2">
                                    -${(statsData?.monto_total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="p-3 bg-red-100 rounded-full">
                                <TrendingDown className="w-6 h-6 text-red-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Aplicadas</p>
                                <p className="text-3xl font-bold text-green-600 mt-2">
                                    {statsData?.aplicadas || 0}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    ${(statsData?.monto_aplicadas || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                                <p className="text-3xl font-bold text-yellow-600 mt-2">
                                    {statsData?.pendientes || 0}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    ${(statsData?.monto_pendientes || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="p-3 bg-yellow-100 rounded-full">
                                <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Búsqueda y Filtros */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Buscar por número de nota, proveedor, factura, OT..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                            <Filter className="w-4 h-4 mr-2" />
                            Filtros
                            {showFilters ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                        </Button>
                    </div>
                </CardHeader>
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
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleViewDetail(cn.id)}
                                                            title="Ver detalles"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        {cn.uploaded_file && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDownloadPDF(cn)}
                                                                title="Descargar PDF"
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
                            {data?.count > 20 && (
                                <div className="mt-6 flex items-center justify-between border-t pt-4">
                                    <p className="text-sm text-gray-600">
                                        Mostrando <span className="font-semibold">{(page - 1) * 20 + 1}</span> - <span className="font-semibold">{Math.min(page * 20, data.count)}</span> de <span className="font-semibold">{data.count}</span> notas
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={!data.previous}
                                        >
                                            Anterior
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => p + 1)}
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
