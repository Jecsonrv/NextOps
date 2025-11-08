/**
 * DisputesPage - Gestión de Disputas de Facturas
 * Permite crear, visualizar y gestionar disputas relacionadas con facturas
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
    useDisputes,
    useDisputeStats,
    useDeleteDispute,
    useDisputeFilterValues,
} from "../hooks/useDisputes";
import { DisputeFormModal } from "../components/disputes/DisputeFormModal";
import { DisputesTableResponsive } from "../components/disputes/DisputesTableResponsive";
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
    ChevronDown,
    ChevronUp,
    DollarSign,
    X,
    Loader2,
} from "lucide-react";

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

    const handleEdit = (dispute) => {
        setSelectedDispute(dispute);
        setIsModalOpen(true);
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
                                             tipo === 'monto_incorrecto' ? 'Monto Incorrecto / Error de Facturación' :
                                             tipo === 'almacenaje_no_aplica' ? 'Almacenaje No Aplica' :
                                             tipo === 'demoras_no_aplican' ? 'Demoras No Aplican' :
                                             tipo === 'dias_libres_incorrectos' ? 'Días Libres No Aplicados Correctamente' :
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
                    <div className="flex items-center justify-between">
                        <CardTitle>Disputas</CardTitle>
                        {data?.count > 0 && (
                            <p className="text-sm text-gray-600">
                                {data.count} {data.count === 1 ? "disputa" : "disputas"}
                            </p>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                            <p className="text-gray-600">
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
                                No se encontraron disputas con los filtros aplicados
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
                            <DisputesTableResponsive
                                disputes={data.results}
                                onEdit={handleEdit}
                                onDelete={handleDeleteClick}
                                deletingId={deleteMutation.isPending ? deleteDialog.dispute?.id : null}
                            />

                            {/* Pagination */}
                            {data?.count > pageSize && (
                                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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
