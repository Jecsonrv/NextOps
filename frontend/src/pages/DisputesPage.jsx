/**
 * DisputesPage - Gestión de Disputas de Facturas
 * Permite crear, visualizar y gestionar disputas relacionadas con facturas
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
    useDisputes,
    useDisputeStats,
    useDeleteDispute,
    useDisputeFilterValues,
} from "../hooks/useDisputes";
import { DisputeFormModal } from "../components/disputes/DisputeFormModal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
    AlertCircle,
    Search,
    Plus,
    CheckCircle,
    XCircle,
    Clock,
    ChevronDown,
    ChevronUp,
    Edit,
    Trash2,
    DollarSign,
    Eye,
    X,
} from "lucide-react";

const estadoBadgeVariant = {
    abierta: "destructive",
    en_revision: "warning",
    resuelta: "success",
    cerrada: "secondary",
};

const tipoDisputaBadgeVariant = {
    servicio_no_prestado: "destructive",
    almacenaje_no_aplica: "warning",
    dias_libres_incorrectos: "warning",
    cargo_no_aplica: "warning",
    demoras_no_aplican: "warning",
    otro: "secondary",
};

export function DisputesPage() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [search, setSearch] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDispute, setSelectedDispute] = useState(null);
    const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, dispute: null });

    const [filters, setFilters] = useState({
        estado: "",
        tipo_disputa: "",
        resultado: "",
    });

    // Queries
    const { data, isLoading, error: disputesError } = useDisputes({
        page,
        page_size: pageSize,
        search,
        ...filters,
    });
    const { data: stats } = useDisputeStats();
    const { data: filterValues } = useDisputeFilterValues();

    // Mutations
    const deleteMutation = useDeleteDispute();

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const handleClearFilters = () => {
        setFilters({
            estado: "",
            tipo_disputa: "",
            resultado: "",
        });
        setSearch("");
        setPage(1);
    };

    const handleDeleteClick = (dispute) => {
        setDeleteDialog({ isOpen: true, dispute });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteDialog.dispute) return;

        try {
            await deleteMutation.mutateAsync(deleteDialog.dispute.id);
            toast.success("Disputa eliminada correctamente");
            setDeleteDialog({ isOpen: false, dispute: null });
        } catch (error) {
            toast.error("Error al eliminar la disputa");
        }
    };

    const handleRowClick = (disputeId) => {
        navigate(`/disputes/${disputeId}`, { state: { from: '/disputes' } });
    };

    if (disputesError) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Error al cargar disputas
                </h2>
                <p className="text-gray-600">{disputesError.message}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            {stats && (
                <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                                Total Disputas
                            </CardTitle>
                            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                                {stats.total}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                En el sistema
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                                Abiertas
                            </CardTitle>
                            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="text-2xl sm:text-3xl font-bold text-red-600">
                                {stats.abiertas}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Requieren atención
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                                Resueltas
                            </CardTitle>
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="text-2xl sm:text-3xl font-bold text-green-600">
                                {stats.resueltas}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Completadas
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                                Monto Total
                            </CardTitle>
                            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                                ${stats.total_monto_disputado?.toLocaleString(
                                    "es-MX",
                                    {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 0,
                                    }
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                En disputa
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Barra de búsqueda y acciones */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar por número de caso, factura, OT..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    className="pl-10 h-10"
                                />
                                {search && (
                                    <button
                                        onClick={() => {
                                            setSearch("");
                                            setPage(1);
                                        }}
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
                                className={showFilters ? "bg-blue-50 border-blue-300" : ""}
                            >
                                {showFilters ? (
                                    <ChevronUp className="w-4 h-4 mr-2" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 mr-2" />
                                )}
                                Filtros
                                {(filters.estado || filters.tipo_disputa || filters.resultado) && (
                                    <Badge variant="default" className="ml-2 px-1.5 py-0.5 text-xs">
                                        {[
                                            filters.estado ? 1 : 0,
                                            filters.tipo_disputa ? 1 : 0,
                                            filters.resultado ? 1 : 0,
                                        ].reduce((a, b) => a + b, 0)}
                                    </Badge>
                                )}
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => {
                                    setSelectedDispute(null);
                                    setIsModalOpen(true);
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Nueva Disputa
                            </Button>
                        </div>
                    </div>

                    {/* Panel de Filtros */}
                    {showFilters && (
                        <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Estado
                                </label>
                                <select
                                    value={filters.estado}
                                    onChange={(e) => handleFilterChange("estado", e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Todos los estados</option>
                                    {filterValues?.estados?.map((estado) => (
                                        <option key={estado} value={estado}>
                                            {estado === 'abierta' ? 'Abierta' :
                                             estado === 'en_revision' ? 'En Revisión' :
                                             estado === 'resuelta' ? 'Resuelta' :
                                             estado === 'cerrada' ? 'Cerrada' : estado}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Tipo de Disputa
                                </label>
                                <select
                                    value={filters.tipo_disputa}
                                    onChange={(e) => handleFilterChange("tipo_disputa", e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Todos los tipos</option>
                                    {filterValues?.tipos_disputa?.map((tipo) => (
                                        <option key={tipo} value={tipo}>
                                            {tipo === 'servicio_no_prestado' ? 'Servicio No Prestado' :
                                             tipo === 'almacenaje_no_aplica' ? 'Almacenaje No Aplica' :
                                             tipo === 'dias_libres_incorrectos' ? 'No Se Están Aplicando Correctamente Los Días Libres' :
                                             tipo === 'cargo_no_aplica' ? 'Cargo No Aplica' :
                                             tipo === 'demoras_no_aplican' ? 'Demoras No Aplican' :
                                             tipo === 'otro' ? 'Otro' : tipo}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Resultado
                                </label>
                                <select
                                    value={filters.resultado || ""}
                                    onChange={(e) => handleFilterChange("resultado", e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Todos los resultados</option>
                                    {filterValues?.resultados?.map((resultado) => (
                                        <option key={resultado} value={resultado}>
                                            {resultado === 'pendiente' ? 'Pendiente' :
                                             resultado === 'aprobada_total' ? 'Aprobada Total' :
                                             resultado === 'aprobada_parcial' ? 'Aprobada Parcial' :
                                             resultado === 'rechazada' ? 'Rechazada' :
                                             resultado === 'anulada' ? 'Anulada' : resultado}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Indicadores de Filtros Activos */}
            {(search || filters.estado || filters.tipo_disputa || filters.resultado) && (
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-medium text-gray-700">
                        Filtros activos:
                    </span>
                    {search && (
                        <Badge variant="secondary" className="gap-1">
                            Búsqueda: {search}
                            <button
                                onClick={() => {
                                    setSearch("");
                                    setPage(1);
                                }}
                                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </Badge>
                    )}
                    {filters.estado && (
                        <Badge variant="secondary">Estado: {filters.estado}</Badge>
                    )}
                    {filters.tipo_disputa && (
                        <Badge variant="secondary">Tipo: {filters.tipo_disputa}</Badge>
                    )}
                    {filters.resultado && (
                        <Badge variant="secondary">Resultado: {filters.resultado}</Badge>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearFilters}
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 font-medium"
                    >
                        <X className="w-4 h-4 mr-1.5" />
                        Limpiar todos los filtros
                    </Button>
                </div>
            )}

            {/* Disputes Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Disputas</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="text-gray-600 mt-4">
                                Cargando disputas...
                            </p>
                        </div>
                    ) : data?.results?.length === 0 ? (
                        <div className="text-center py-12">
                            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No hay disputas
                            </h3>
                            <p className="text-gray-600 mb-4">
                                No se encontraron disputas con los filtros
                                aplicados
                            </p>
                            <Button onClick={() => {
                                setSelectedDispute(null);
                                setIsModalOpen(true);
                            }}>
                                <Plus className="w-4 h-4 mr-2" />
                                Crear Primera Disputa
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Disputa
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Factura / OT
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Operativo / Proveedor
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Monto
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Estado
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {data?.results?.map((dispute) => (
                                            <tr
                                                key={dispute.id}
                                                className="hover:bg-gray-50 transition-colors"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            to={`/disputes/${dispute.id}`}
                                                            className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                                                        >
                                                            {dispute.numero_caso}
                                                        </Link>
                                                        <Badge
                                                            variant={tipoDisputaBadgeVariant[dispute.tipo_disputa]}
                                                            className="text-xs"
                                                        >
                                                            {dispute.tipo_disputa_display}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {new Date(dispute.created_at).toLocaleDateString("es-MX")}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="space-y-1">
                                                        {dispute.invoice_data ? (
                                                            <Link
                                                                to={`/invoices/${dispute.invoice_data.id}`}
                                                                className="text-blue-600 hover:text-blue-800 font-medium text-sm block"
                                                            >
                                                                {dispute.invoice_data.numero_factura}
                                                            </Link>
                                                        ) : (
                                                            <span className="text-gray-400 text-sm">-</span>
                                                        )}
                                                        {dispute.ot_data && (
                                                            <Link
                                                                to={`/ots/${dispute.ot_data.id}`}
                                                                className="text-gray-600 hover:text-gray-800 text-xs block"
                                                            >
                                                                OT: {dispute.ot_data.numero_ot}
                                                            </Link>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {dispute.operativo || dispute.ot_data?.operativo || "-"}
                                                    {dispute.invoice_data?.proveedor_nombre && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {dispute.invoice_data.proveedor_nombre}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="text-sm font-semibold text-red-600">
                                                        ${dispute.monto_disputa?.toLocaleString("es-MX", {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}
                                                    </div>
                                                    {dispute.invoice_data?.monto && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            de ${dispute.invoice_data.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1">
                                                        <Badge
                                                            variant={estadoBadgeVariant[dispute.estado]}
                                                            className="text-xs w-fit"
                                                        >
                                                            {dispute.estado_display}
                                                        </Badge>
                                                        {dispute.resultado && dispute.resultado !== 'pendiente' && (
                                                            <Badge
                                                                variant={
                                                                    dispute.resultado === 'aprobada_total' ? 'success' :
                                                                    dispute.resultado === 'aprobada_parcial' ? 'default' :
                                                                    dispute.resultado === 'rechazada' ? 'destructive' :
                                                                    'secondary'
                                                                }
                                                                className="text-xs w-fit"
                                                            >
                                                                {dispute.resultado_display}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => navigate(`/disputes/${dispute.id}`)}
                                                            title="Ver detalle"
                                                            className="h-8 w-8"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                setSelectedDispute(dispute);
                                                                setIsModalOpen(true);
                                                            }}
                                                            title="Editar"
                                                            className="h-8 w-8 hidden sm:inline-flex"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteClick(dispute)}
                                                            title="Eliminar"
                                                            className="h-8 w-8 hidden md:inline-flex"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {data?.count > pageSize && (
                                <div className="mt-6 flex items-center justify-between">
                                    <p className="text-sm text-gray-600">
                                        Mostrando {(page - 1) * pageSize + 1} -{" "}
                                        {Math.min(page * pageSize, data.count)} de{" "}
                                        {data.count} disputas
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={pageSize}
                                            onChange={(e) => {
                                                setPageSize(parseInt(e.target.value, 10));
                                                setPage(1);
                                            }}
                                            className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                                        >
                                            <option value="20">20 / página</option>
                                            <option value="50">50 / página</option>
                                            <option value="100">100 / página</option>
                                        </select>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setPage((p) => Math.max(1, p - 1))
                                            }
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
                    )}
                </CardContent>
            </Card>

            {/* Modal para crear/editar disputas */}
            <DisputeFormModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedDispute(null);
                }}
                dispute={selectedDispute}
                invoice={null}
            />

            {/* Dialog de confirmación para eliminar */}
            <ConfirmDialog
                isOpen={deleteDialog.isOpen}
                onClose={() => setDeleteDialog({ isOpen: false, dispute: null })}
                onConfirm={handleDeleteConfirm}
                variant="danger"
                title="Eliminar Disputa"
                message={
                    deleteDialog.dispute
                        ? `¿Estás seguro de que deseas eliminar la disputa "${deleteDialog.dispute.numero_caso}"? Esta acción no se puede deshacer.`
                        : ""
                }
                confirmText="Eliminar"
                cancelText="Cancelar"
            />
        </div>
    );
}
