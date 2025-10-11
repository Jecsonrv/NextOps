import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import apiClient from "../lib/api";
import { useProviders } from "../hooks/useInvoices";
import { formatDate } from "../lib/dateUtils";
import { InvoiceAssignOTModal } from "../components/invoices/InvoiceAssignOTModal";
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
} from "lucide-react";

export function InvoicesPage() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedInvoiceForOT, setSelectedInvoiceForOT] = useState(null);
    const [filters, setFilters] = useState({
        estado_provision: "",
        estado_facturacion: "",
        tipo_costo: "",
        proveedor: "",
        fecha_desde: "",
        fecha_hasta: "",
    });

    const { data: providers } = useProviders();
    const queryClient = useQueryClient();

    // Mutation para asignar OT
    const assignOTMutation = useMutation({
        mutationFn: async ({ invoiceId, otId }) => {
            console.log("🔄 Asignando OT:", otId, "a factura:", invoiceId);
            const response = await apiClient.patch(`/invoices/${invoiceId}/`, {
                ot_id: otId,
            });
            return response.data;
        },
        onSuccess: () => {
            console.log("✅ OT asignada exitosamente");
            queryClient.invalidateQueries(["invoices"]);
            queryClient.invalidateQueries(["invoices-stats"]);
        },
        onError: (error) => {
            console.error("❌ Error al asignar OT:", error);
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

    // Función para exportar a Excel
    const handleExportToExcel = async () => {
        try {
            // Obtener TODAS las facturas con los filtros aplicados (sin paginación)
            const params = new URLSearchParams({
                page_size: "1000", // Límite alto para obtener todas
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
            const invoices = response.data.results || [];

            if (invoices.length === 0) {
                alert("No hay facturas para exportar");
                return;
            }

            // Preparar datos para Excel
            const excelData = invoices.map((inv) => ({
                ID: inv.id,
                "Número Factura": inv.numero_factura || "",
                OT: inv.ot?.numero_ot || "",
                Cliente: inv.ot?.cliente_nombre || "",
                MBL: inv.ot?.mbl || "",
                Contenedor: inv.ot?.contenedor || "",
                Naviera: inv.ot?.naviera || "",
                Barco: inv.ot?.barco || "",
                Proveedor:
                    inv.proveedor_data?.nombre || inv.proveedor_nombre || "",
                "NIT Proveedor": inv.proveedor_nit || "",
                "Tipo Proveedor": inv.tipo_proveedor || "",
                "Tipo Costo": inv.tipo_costo || "",
                "Monto (USD)": inv.monto || "",
                "Fecha Emisión": inv.fecha_emision || "",
                "Fecha Vencimiento": inv.fecha_vencimiento || "",
                "Fecha Provisión": inv.fecha_provision || "",
                "Fecha Facturación": inv.fecha_facturacion || "",
                "Estado Provisión": inv.estado_provision || "",
                "Estado Facturación": inv.estado_facturacion || "",
                "Método Asignación": inv.metodo_asignacion || "",
                "Confianza Match": inv.confianza_match
                    ? parseFloat(inv.confianza_match).toFixed(3)
                    : "",
                "Requiere Revisión": inv.requiere_revision ? "Sí" : "No",
                Notas: inv.notas || "",
                Creado: new Date(inv.created_at).toLocaleString("es-MX"),
            }));

            // Crear libro de Excel
            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Facturas");

            // Ajustar ancho de columnas
            const colWidths = [
                { wch: 8 }, // ID
                { wch: 20 }, // Número Factura
                { wch: 15 }, // OT
                { wch: 25 }, // Cliente
                { wch: 18 }, // MBL
                { wch: 15 }, // Contenedor
                { wch: 20 }, // Naviera
                { wch: 20 }, // Barco
                { wch: 25 }, // Proveedor
                { wch: 15 }, // NIT
                { wch: 18 }, // Tipo Proveedor
                { wch: 15 }, // Tipo Costo
                { wch: 12 }, // Monto
                { wch: 15 }, // Fecha Emisión
                { wch: 18 }, // Fecha Vencimiento
                { wch: 18 }, // Fecha Provisión
                { wch: 20 }, // Fecha Facturación
                { wch: 18 }, // Estado Provisión
                { wch: 20 }, // Estado Facturación
                { wch: 20 }, // Método
                { wch: 15 }, // Confianza
                { wch: 15 }, // Revisión
                { wch: 40 }, // Notas
                { wch: 20 }, // Creado
            ];
            ws["!cols"] = colWidths;

            // Generar archivo
            const fileName = `facturas_${
                new Date().toISOString().split("T")[0]
            }.xlsx`;
            XLSX.writeFile(wb, fileName);
        } catch (error) {
            console.error("Error al exportar:", error);
            alert("Error al exportar a Excel: " + error.message);
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
        <div className="space-y-6">
            {/* Stats Cards */}
            {stats && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Total Facturas
                            </CardTitle>
                            <FileText className="w-4 h-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.total}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                                Todas las facturas
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Pendientes Provisión
                            </CardTitle>
                            <FileText className="w-4 h-4 text-yellow-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.pendientes_provision || 0}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                                Por provisionar
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Provisionadas
                            </CardTitle>
                            <FileText className="w-4 h-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.provisionadas || 0}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                                Listas para facturar
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Requieren Revisión
                            </CardTitle>
                            <AlertCircle className="w-4 h-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.pendientes_revision || 0}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                                Con problemas
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters and Actions */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar por número de factura, proveedor, OT..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                {showFilters ? (
                                    <ChevronUp className="w-4 h-4 mr-2" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 mr-2" />
                                )}
                                Filtros
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportToExcel}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Exportar Excel
                            </Button>
                            <Button
                                size="sm"
                                onClick={() =>
                                    (window.location.href = "/invoices/new")
                                }
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Subir Factura
                            </Button>
                        </div>
                    </div>

                    {/* Panel de Filtros Avanzados */}
                    {showFilters && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Estado de Provisión
                                    </label>
                                    <select
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
                                    >
                                        <option value="">Todos</option>
                                        <option value="FLETE">Flete</option>
                                        <option value="TRANSPORTE">
                                            Transporte
                                        </option>
                                        <option value="ADUANA">Aduana</option>
                                        <option value="ALMACENAJE">
                                            Almacenaje
                                        </option>
                                        <option value="DEMORA">Demora</option>
                                        <option value="OTRO">Otro</option>
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
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50">
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Operativo
                                            </th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                OT
                                            </th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Cliente
                                            </th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                MBL
                                            </th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Naviera
                                            </th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Proveedor
                                            </th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Barco
                                            </th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Tipo Prov.
                                            </th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Tipo Costo
                                            </th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                # Factura
                                            </th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                F. Emisión
                                            </th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                F. Provisión
                                            </th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                F. Facturación
                                            </th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                Monto
                                            </th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
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
                                                <td className="px-3 py-3 text-gray-900">
                                                    {invoice.ot_data
                                                        ?.operativo || "-"}
                                                </td>
                                                <td className="px-3 py-3">
                                                    {invoice.ot_data ? (
                                                        <Link
                                                            to={`/ots/${invoice.ot_data.id}`}
                                                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                                        >
                                                            <Link2 className="w-3 h-3" />
                                                            {
                                                                invoice.ot_data
                                                                    .numero_ot
                                                            }
                                                        </Link>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">
                                                            Sin asignar
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-gray-900">
                                                    {invoice.ot_data?.cliente ||
                                                        "-"}
                                                </td>
                                                <td className="px-3 py-3 text-gray-700 font-mono text-xs">
                                                    {invoice.ot_data?.mbl ||
                                                        "-"}
                                                </td>
                                                <td className="px-3 py-3 text-gray-900">
                                                    {invoice.ot_data?.naviera ||
                                                        "-"}
                                                </td>
                                                <td className="px-3 py-3 text-gray-900 font-medium">
                                                    {invoice.proveedor_data
                                                        ?.nombre || "-"}
                                                </td>
                                                <td className="px-3 py-3 text-gray-700">
                                                    {invoice.ot_data?.barco ||
                                                        "-"}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                                        {invoice.proveedor_data
                                                            ?.tipo_display ||
                                                            "-"}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                                        {invoice.tipo_costo_display ||
                                                            "-"}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <Link
                                                        to={`/invoices/${invoice.id}`}
                                                        className="font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                                    >
                                                        {invoice.numero_factura ||
                                                            "SIN-NUM"}
                                                        {invoice.requiere_revision && (
                                                            <AlertCircle className="w-4 h-4 text-red-500" />
                                                        )}
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-3 text-gray-600">
                                                    {formatDate(
                                                        invoice.fecha_emision
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-gray-600">
                                                    {formatDate(
                                                        invoice.fecha_provision
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-gray-600">
                                                    {formatDate(
                                                        invoice.fecha_facturacion
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-right text-gray-900 font-bold">
                                                    $
                                                    {invoice.monto?.toLocaleString(
                                                        "es-MX",
                                                        {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        }
                                                    ) || "0.00"}
                                                </td>
                                                <td className="px-3 py-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                (window.location.href = `/invoices/${invoice.id}`)
                                                            }
                                                            title="Ver detalles"
                                                        >
                                                            <Eye className="w-4 h-4" />
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
                                                        >
                                                            <Link2 className="w-4 h-4" />
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
        </div>
    );
}
