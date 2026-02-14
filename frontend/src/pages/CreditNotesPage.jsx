import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../lib/api";
import { formatDate } from "../lib/dateUtils";
import { StatCard } from "../components/common/StatCard";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/Select";
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
    FileMinus,
} from "lucide-react";
import { useProviders } from "../hooks/useInvoices";
import { CreateCreditNoteModal } from "../components/invoices/CreateCreditNoteModal";
import { TableSkeleton } from "../components/ui/Skeleton";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

export function CreditNotesPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchInput, setSearchInput] = useState("");
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
    const debouncedSearch = useDebouncedValue(searchInput, 300);

    const { data: providersData } = useProviders({ page_size: 1000 });

    // Obtener notas de crédito
    const { data, isLoading, error } = useQuery({
        queryKey: ["credit-notes", page, pageSize, debouncedSearch, filters],
        queryFn: async () => {
            const params = new URLSearchParams(
                Object.entries({
                    page: page.toString(),
                    page_size: pageSize.toString(),
                    search: debouncedSearch,
                    ...filters,
                }).filter(([_, value]) => value),
            );
            const response = await apiClient.get(
                `/invoices/credit-notes/?${params}`,
            );
            return response.data;
        },
        keepPreviousData: true,
    });

    // Obtener estadísticas
    const { data: statsData } = useQuery({
        queryKey: ["credit-notes-stats", filters],
        queryFn: async () => {
            const params = new URLSearchParams(
                Object.entries(filters).filter(([_, value]) => value),
            );
            const response = await apiClient.get(
                `/invoices/credit-notes/stats/?${params}`,
            );
            return response.data;
        },
    });

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const handleClearFilters = () => {
        setFilters({
            estado: "",
            proveedor_id: "",
            fecha_desde: "",
            fecha_hasta: "",
        });
        setSearchInput("");
        setPage(1);
    };

    const handleViewDetail = (creditNoteId) => {
        navigate(`/invoices/credit-notes/${creditNoteId}`);
    };

    const handleDownloadPDF = async (creditNote) => {
        if (creditNote.uploaded_file) {
            try {
                const response = await apiClient.get(
                    `/files/${creditNote.uploaded_file}/download/`,
                    {
                        responseType: "blob",
                    },
                );
                const url = window.URL.createObjectURL(
                    new Blob([response.data]),
                );
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute(
                    "download",
                    `NC_${creditNote.numero_nota}.pdf`,
                );
                document.body.appendChild(link);
                link.click();
                link.remove();
            } catch (error) {
                console.error("Error al descargar:", error);
            }
        }
    };

    if (error) {
        return (
            <div className="p-4 text-center">
                <p className="text-destructive">
                    Error al cargar las notas de crédito: {error.message}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Notas"
                    value={statsData?.total_notas || 0}
                    icon={FileText}
                />
                <StatCard
                    label="Monto Total"
                    value={`-$${(statsData?.monto_total || 0).toLocaleString("es-MX", { minimumFractionDigits: 0 })}`}
                    icon={TrendingDown}
                />
                <StatCard
                    label="Aplicadas"
                    value={statsData?.aplicadas || 0}
                    icon={CheckCircle}
                />
                <StatCard
                    label="Pendientes"
                    value={statsData?.pendientes || 0}
                    icon={Clock}
                />
            </div>

            {/* Barra de búsqueda y acciones */}
            <Card>
                <CardContent className="pt-4 sm:pt-6">
                    <div className="flex flex-col gap-3 sm:gap-4">
                        {/* Search */}
                        <div className="w-full">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por número de nota, proveedor, factura, OT..."
                                    value={searchInput}
                                    onChange={(e) => {
                                        setSearchInput(e.target.value);
                                        setPage(1);
                                    }}
                                    className="pl-10 h-10"
                                />
                                {searchInput && (
                                    <button
                                        onClick={() => {
                                            setSearchInput("");
                                            setPage(1);
                                        }}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
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
                                className={`flex-1 sm:flex-none ${showFilters ? "bg-primary/10 border-blue-300" : ""}`}
                            >
                                <Filter className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">
                                    Filtros
                                </span>
                                {showFilters ? (
                                    <ChevronUp className="w-4 h-4 ml-2 hidden sm:inline" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 ml-2 hidden sm:inline" />
                                )}
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => setIsModalOpen(true)}
                                className="flex-1 sm:flex-none"
                            >
                                <FileMinus className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">
                                    Crear NC
                                </span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 sm:flex-none"
                            >
                                <Download className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">
                                    Exportar
                                </span>
                            </Button>
                        </div>
                    </div>
                </CardContent>
                {showFilters && (
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Estado
                                </label>
                                <select
                                    value={filters.estado}
                                    onChange={(e) =>
                                        handleFilterChange(
                                            "estado",
                                            e.target.value,
                                        )
                                    }
                                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Todos</option>
                                    <option value="pendiente">Pendiente</option>
                                    <option value="aplicada">Aplicada</option>
                                    <option value="rechazada">Rechazada</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Proveedor
                                </label>
                                <select
                                    value={filters.proveedor_id}
                                    onChange={(e) =>
                                        handleFilterChange(
                                            "proveedor_id",
                                            e.target.value,
                                        )
                                    }
                                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Todos</option>
                                    {providersData?.results?.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Fecha Desde
                                </label>
                                <Input
                                    type="date"
                                    value={filters.fecha_desde}
                                    onChange={(e) =>
                                        handleFilterChange(
                                            "fecha_desde",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Fecha Hasta
                                </label>
                                <Input
                                    type="date"
                                    value={filters.fecha_hasta}
                                    onChange={(e) =>
                                        handleFilterChange(
                                            "fecha_hasta",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClearFilters}
                            >
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
                        <TableSkeleton rows={8} cols={7} />
                    ) : data?.results?.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground font-medium">
                                No se encontraron notas de crédito
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Intenta ajustar los filtros o realiza una nueva
                                búsqueda
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-separate border-spacing-0">
                                    <thead>
                                        <tr className="bg-muted">
                                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border bg-muted whitespace-nowrap">
                                                Número NC
                                            </th>
                                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border bg-muted whitespace-nowrap">
                                                Proveedor
                                            </th>
                                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border bg-muted whitespace-nowrap">
                                                Factura / OT
                                            </th>
                                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border bg-muted whitespace-nowrap">
                                                Fecha
                                            </th>
                                            <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border bg-muted whitespace-nowrap">
                                                Monto
                                            </th>
                                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border bg-muted whitespace-nowrap">
                                                Estado
                                            </th>
                                            <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border bg-muted whitespace-nowrap">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-card">
                                        {data?.results?.map((cn) => (
                                            <tr
                                                key={cn.id}
                                                className="hover:bg-primary/10 transition-colors cursor-pointer"
                                                onClick={() =>
                                                    handleViewDetail(cn.id)
                                                }
                                            >
                                                <td className="px-3 sm:px-4 py-3 border-b border-border bg-card hover:bg-primary/10">
                                                    <Link
                                                        to={`/invoices/credit-notes/${cn.id}`}
                                                        className="font-semibold text-sm text-primary hover:text-blue-800"
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                    >
                                                        {cn.numero_nota}
                                                    </Link>
                                                </td>
                                                <td className="px-3 sm:px-4 py-3 border-b border-border bg-card hover:bg-primary/10">
                                                    <div className="text-sm">
                                                        <p className="font-medium text-foreground">
                                                            {
                                                                cn.proveedor_nombre
                                                            }
                                                        </p>
                                                        {cn.motivo && (
                                                            <p
                                                                className="text-xs text-muted-foreground truncate max-w-xs mt-1"
                                                                title={
                                                                    cn.motivo
                                                                }
                                                            >
                                                                {cn.motivo}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-4 py-3 border-b border-border bg-card hover:bg-primary/10">
                                                    <div className="text-sm space-y-1">
                                                        {cn.invoice_data
                                                            ?.numero_factura ? (
                                                            <Link
                                                                to={`/invoices/${cn.invoice_data.id}`}
                                                                className="text-primary hover:text-blue-800 font-medium block"
                                                                onClick={(e) =>
                                                                    e.stopPropagation()
                                                                }
                                                            >
                                                                {
                                                                    cn
                                                                        .invoice_data
                                                                        .numero_factura
                                                                }
                                                            </Link>
                                                        ) : (
                                                            <span className="text-muted-foreground">
                                                                -
                                                            </span>
                                                        )}
                                                        {cn.ot_data
                                                            ?.numero_ot && (
                                                            <Link
                                                                to={`/ots/${cn.ot_data.id}`}
                                                                className="text-muted-foreground hover:text-foreground text-xs block"
                                                                onClick={(e) =>
                                                                    e.stopPropagation()
                                                                }
                                                            >
                                                                OT:{" "}
                                                                {
                                                                    cn.ot_data
                                                                        .numero_ot
                                                                }
                                                            </Link>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-4 py-3 border-b border-border bg-card hover:bg-primary/10 text-sm text-muted-foreground">
                                                    {formatDate(
                                                        cn.fecha_emision,
                                                    )}
                                                </td>
                                                <td className="px-3 sm:px-4 py-3 border-b border-border bg-card hover:bg-primary/10 text-right">
                                                    <span className="font-semibold text-destructive text-sm">
                                                        -$
                                                        {Math.abs(
                                                            parseFloat(
                                                                cn.monto || 0,
                                                            ),
                                                        ).toLocaleString(
                                                            "es-MX",
                                                            {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2,
                                                            },
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-3 sm:px-4 py-3 border-b border-border bg-card hover:bg-primary/10">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${
                                                            cn.estado ===
                                                            "aplicada"
                                                                ? "bg-emerald-50 text-green-800"
                                                                : cn.estado ===
                                                                    "pendiente"
                                                                  ? "bg-yellow-100 text-yellow-800"
                                                                  : "bg-red-100 text-red-800"
                                                        }`}
                                                    >
                                                        {cn.estado ===
                                                            "aplicada" && (
                                                            <CheckCircle className="w-3 h-3" />
                                                        )}
                                                        {cn.estado ===
                                                            "pendiente" && (
                                                            <Clock className="w-3 h-3" />
                                                        )}
                                                        {cn.estado_display ||
                                                            cn.estado}
                                                    </span>
                                                </td>
                                                <td className="px-3 sm:px-4 py-3 border-b border-border bg-card hover:bg-primary/10">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleViewDetail(
                                                                    cn.id,
                                                                );
                                                            }}
                                                            title="Ver detalles"
                                                            className="h-8 w-8"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        {cn.uploaded_file && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    handleDownloadPDF(
                                                                        cn,
                                                                    );
                                                                }}
                                                                title="Descargar PDF"
                                                                className="h-8 w-8"
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
                                    <p className="text-sm text-muted-foreground">
                                        Mostrando{" "}
                                        <span className="font-semibold">
                                            {(page - 1) * pageSize + 1}
                                        </span>{" "}
                                        -{" "}
                                        <span className="font-semibold">
                                            {Math.min(
                                                page * pageSize,
                                                data.count,
                                            )}
                                        </span>{" "}
                                        de{" "}
                                        <span className="font-semibold">
                                            {data.count}
                                        </span>{" "}
                                        notas
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <Select
                                            value={pageSize.toString()}
                                            onValueChange={(value) => {
                                                setPageSize(
                                                    parseInt(value, 10),
                                                );
                                                setPage(1);
                                            }}
                                        >
                                            <SelectTrigger className="w-[120px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="20">
                                                    20 / página
                                                </SelectItem>
                                                <SelectItem value="50">
                                                    50 / página
                                                </SelectItem>
                                                <SelectItem value="100">
                                                    100 / página
                                                </SelectItem>
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
