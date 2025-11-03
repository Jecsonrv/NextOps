import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import {
    useSalesInvoices,
    useSalesInvoiceStats,
} from "../../hooks/useSalesInvoices";
import { useSalesCreditNotes } from "../../hooks/useSalesCreditNotes";
import { formatDate } from "../../lib/dateUtils";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/Select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "../../components/ui/Tabs";
import {
    Search,
    Filter,
    Upload,
    Eye,
    FileText,
    Plus,
    Download,
} from "lucide-react";
import { CreateSalesCreditNoteModal } from "../../components/sales/CreateSalesCreditNoteModal";

const ESTADO_FACTURACION_CHOICES = [
    { value: "facturada", label: "Facturada", variant: "info" },
    {
        value: "pendiente_cobro",
        label: "Pendiente de Cobro",
        variant: "warning",
    },
    { value: "pagada", label: "Pagada", variant: "success" },
    {
        value: "anulada_parcial",
        label: "Anulada Parcialmente",
        variant: "warning",
    },
    { value: "anulada", label: "Anulada", variant: "destructive" },
];

const ESTADO_PAGO_CHOICES = [
    { value: "pendiente", label: "Pendiente", variant: "warning" },
    { value: "pagado_parcial", label: "Pagado Parcial", variant: "info" },
    { value: "pagado_total", label: "Pagado Total", variant: "success" },
];

export default function SalesInvoicesPage() {
    const [activeTab, setActiveTab] = useState("all");
    const [filters, setFilters] = useState({
        search: "",
        estado_facturacion: "",
    });
    const [isCreateCreditNoteModalOpen, setIsCreateCreditNoteModalOpen] =
        useState(false);
    const [creditNoteFilters, setCreditNoteFilters] = useState({
        search: "",
    });

    // Obtener stats para los contadores de las pestañas
    const { data: stats } = useSalesInvoiceStats();

    // Obtener credit notes cuando la pestaña está activa
    const {
        data: creditNotes,
        isLoading: isLoadingCreditNotes,
        error: creditNotesError,
    } = useSalesCreditNotes(
        activeTab === "credit_notes" ? creditNoteFilters : {}
    );

    // Construir filtros según la pestaña activa usando useMemo
    const currentFilters = useMemo(() => {
        const baseFilters = { ...filters };

        switch (activeTab) {
            case "facturadas":
                return { ...baseFilters, estado_facturacion: "facturada" };
            case "pendientes_cobro":
                return {
                    ...baseFilters,
                    estado_facturacion: "pendiente_cobro",
                };
            case "pagadas":
                return { ...baseFilters, estado_facturacion: "pagada" };
            case "anuladas":
                return {
                    ...baseFilters,
                    estado_facturacion: "anulada,anulada_parcial",
                };
            default:
                return baseFilters;
        }
    }, [activeTab, filters]);

    const {
        data: invoices,
        isLoading,
        error,
    } = useSalesInvoices(currentFilters);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("es-EC", {
            style: "currency",
            currency: "USD",
        }).format(amount || 0);
    };

    const getStatusBadge = (status, choices) => {
        const statusConfig = choices.find((c) => c.value === status);
        return statusConfig ? (
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        ) : null;
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value === "__all__" ? "" : value,
        }));
    };

    const InvoiceTable = () => (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            N° Factura
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cliente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            OT
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Monto / A Cobrar
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Pagado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado Fact.
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado Pago
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha Emisión
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {!invoices || invoices.length === 0 ? (
                        <tr>
                            <td
                                colSpan="9"
                                className="px-6 py-8 text-center text-gray-500"
                            >
                                No se encontraron facturas de venta
                            </td>
                        </tr>
                    ) : (
                        invoices.map((invoice) => (
                            <tr key={invoice.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <FileText className="h-4 w-4 text-gray-400 mr-2" />
                                        <span className="text-sm font-medium text-gray-900">
                                            {invoice.numero_factura}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">
                                        {invoice.cliente_nombre ||
                                            invoice.cliente}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {invoice.ot ? (
                                        <Link
                                            to={`/ots/${invoice.ot}`}
                                            className="text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            {invoice.ot_numero || invoice.ot}
                                        </Link>
                                    ) : (
                                        <span className="text-sm text-gray-400">
                                            N/A
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                        {/* Mostrar valor a cobrar si es gran contribuyente nacional, sino monto total */}
                                        {invoice.cliente_data
                                            ?.tipo_contribuyente ===
                                            "gran_contribuyente" &&
                                        invoice.tipo_operacion === "nacional" &&
                                        invoice.monto_neto_cobrar ? (
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-blue-700">
                                                    {formatCurrency(
                                                        invoice.monto_neto_cobrar
                                                    )}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    (Total:{" "}
                                                    {formatCurrency(
                                                        invoice.monto_total
                                                    )}
                                                    )
                                                </span>
                                            </div>
                                        ) : (
                                            formatCurrency(invoice.monto_total)
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">
                                        {formatCurrency(invoice.monto_pagado)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getStatusBadge(
                                        invoice.estado_facturacion,
                                        ESTADO_FACTURACION_CHOICES
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getStatusBadge(
                                        invoice.estado_pago,
                                        ESTADO_PAGO_CHOICES
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatDate(invoice.fecha_emision)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <Link
                                        to={`/sales/invoices/${invoice.id}`}
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        <Button variant="ghost" size="sm">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {activeTab === "credit_notes"
                            ? "Notas de Crédito"
                            : "Facturas de Venta"}
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        {activeTab === "credit_notes"
                            ? "Gestión de notas de crédito para ajustes y anulaciones"
                            : "Gestión de facturas de venta y seguimiento de cobros"}
                    </p>
                </div>
                {activeTab === "credit_notes" ? (
                    <Button
                        onClick={() => setIsCreateCreditNoteModalOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Nota de Crédito
                    </Button>
                ) : (
                    <Link to="/sales/invoices/new">
                        <Button>
                            <Upload className="mr-2 h-4 w-4" />
                            Cargar Factura
                        </Button>
                    </Link>
                )}
            </div>

            {/* Filtros */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filtros
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Buscar
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="N° factura, cliente, OT..."
                                    value={filters.search}
                                    onChange={(e) =>
                                        handleFilterChange(
                                            "search",
                                            e.target.value
                                        )
                                    }
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Estado Facturación
                            </label>
                            <Select
                                value={filters.estado_facturacion || "__all__"}
                                onValueChange={(value) =>
                                    handleFilterChange(
                                        "estado_facturacion",
                                        value
                                    )
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">
                                        Todos
                                    </SelectItem>
                                    {ESTADO_FACTURACION_CHOICES.map(
                                        (choice) => (
                                            <SelectItem
                                                key={choice.value}
                                                value={choice.value}
                                            >
                                                {choice.label}
                                            </SelectItem>
                                        )
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sistema de Pestañas */}
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
                                className="flex items-center gap-2"
                            >
                                Todas
                                {stats && (
                                    <Badge variant="secondary" className="ml-1">
                                        {stats.total}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger
                                value="facturadas"
                                className="flex items-center gap-2"
                            >
                                Facturadas
                                {stats && (
                                    <Badge variant="info" className="ml-1">
                                        {stats.facturadas}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger
                                value="pendientes_cobro"
                                className="flex items-center gap-2"
                            >
                                Pendientes Cobro
                                {stats && (
                                    <Badge variant="warning" className="ml-1">
                                        {stats.pendientes_cobro}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger
                                value="pagadas"
                                className="flex items-center gap-2"
                            >
                                Pagadas
                                {stats && (
                                    <Badge variant="success" className="ml-1">
                                        {stats.pagadas}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger
                                value="anuladas"
                                className="flex items-center gap-2"
                            >
                                Anuladas
                                {stats && (
                                    <Badge
                                        variant="destructive"
                                        className="ml-1"
                                    >
                                        {stats.anuladas}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger
                                value="credit_notes"
                                className="flex items-center gap-2"
                            >
                                Notas de Crédito
                                {creditNotes && Array.isArray(creditNotes) && (
                                    <Badge variant="warning" className="ml-1">
                                        {creditNotes.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="all">
                            {isLoading ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-600">
                                        Cargando facturas...
                                    </p>
                                </div>
                            ) : error ? (
                                <div className="text-center py-8">
                                    <p className="text-red-600">
                                        Error al cargar facturas:{" "}
                                        {error.message}
                                    </p>
                                </div>
                            ) : (
                                <InvoiceTable />
                            )}
                        </TabsContent>

                        <TabsContent value="facturadas">
                            {isLoading ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-600">
                                        Cargando facturas facturadas...
                                    </p>
                                </div>
                            ) : error ? (
                                <div className="text-center py-8">
                                    <p className="text-red-600">
                                        Error al cargar facturas:{" "}
                                        {error.message}
                                    </p>
                                </div>
                            ) : (
                                <InvoiceTable />
                            )}
                        </TabsContent>

                        <TabsContent value="pendientes_cobro">
                            {isLoading ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-600">
                                        Cargando facturas pendientes...
                                    </p>
                                </div>
                            ) : error ? (
                                <div className="text-center py-8">
                                    <p className="text-red-600">
                                        Error al cargar facturas:{" "}
                                        {error.message}
                                    </p>
                                </div>
                            ) : (
                                <InvoiceTable />
                            )}
                        </TabsContent>

                        <TabsContent value="pagadas">
                            {isLoading ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-600">
                                        Cargando facturas pagadas...
                                    </p>
                                </div>
                            ) : error ? (
                                <div className="text-center py-8">
                                    <p className="text-red-600">
                                        Error al cargar facturas:{" "}
                                        {error.message}
                                    </p>
                                </div>
                            ) : (
                                <InvoiceTable />
                            )}
                        </TabsContent>

                        <TabsContent value="anuladas">
                            {isLoading ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-600">
                                        Cargando facturas anuladas...
                                    </p>
                                </div>
                            ) : error ? (
                                <div className="text-center py-8">
                                    <p className="text-red-600">
                                        Error al cargar facturas:{" "}
                                        {error.message}
                                    </p>
                                </div>
                            ) : (
                                <InvoiceTable />
                            )}
                        </TabsContent>

                        <TabsContent value="credit_notes">
                            {isLoadingCreditNotes ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-600">
                                        Cargando notas de crédito...
                                    </p>
                                </div>
                            ) : creditNotesError ? (
                                <div className="text-center py-8">
                                    <p className="text-red-600">
                                        Error al cargar notas de crédito:{" "}
                                        {creditNotesError.message}
                                    </p>
                                </div>
                            ) : !creditNotes || creditNotes.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600 font-medium mb-2">
                                        No hay notas de crédito
                                    </p>
                                    <p className="text-sm text-gray-500 mb-4">
                                        Crea tu primera nota de crédito para
                                        anular o ajustar facturas
                                    </p>
                                    <Button
                                        onClick={() =>
                                            setIsCreateCreditNoteModalOpen(true)
                                        }
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Crear Nota de Crédito
                                    </Button>
                                </div>
                            ) : (
                                <CreditNotesTable creditNotes={creditNotes} />
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Modal para crear nota de crédito */}
            <CreateSalesCreditNoteModal
                isOpen={isCreateCreditNoteModalOpen}
                onClose={() => setIsCreateCreditNoteModalOpen(false)}
                onSuccess={() => {
                    // Refresh data will happen automatically via query invalidation
                }}
            />
        </div>
    );
}

// Componente para mostrar tabla de Credit Notes
function CreditNotesTable({ creditNotes }) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Número NC
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Factura Asociada
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha Emisión
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Monto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Motivo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {creditNotes.map((cn) => (
                        <tr key={cn.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                    {cn.numero_nota_credito}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <Link
                                    to={`/sales/invoices/${cn.sales_invoice}`}
                                    className="text-sm text-blue-600 hover:text-blue-900 hover:underline"
                                >
                                    {cn.sales_invoice_numero ||
                                        `ID: ${cn.sales_invoice}`}
                                </Link>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                    {formatDate(cn.fecha_emision)}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-red-600">
                                    -${parseFloat(cn.monto).toFixed(2)}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 max-w-xs truncate">
                                    {cn.motivo}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center gap-2 justify-end">
                                    {cn.archivo_pdf_url && (
                                        <a
                                            href={cn.archivo_pdf_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-900"
                                            title="Descargar PDF de Nota de Crédito"
                                        >
                                            <Download className="h-4 w-4" />
                                        </a>
                                    )}
                                    <Link
                                        to={`/sales/invoices/${cn.sales_invoice}`}
                                        className="text-gray-600 hover:text-gray-900"
                                        title="Ver Factura Asociada"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Link>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

CreditNotesTable.propTypes = {
    creditNotes: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.number.isRequired,
            numero_nota_credito: PropTypes.string.isRequired,
            sales_invoice: PropTypes.number.isRequired,
            sales_invoice_numero: PropTypes.string,
            fecha_emision: PropTypes.string.isRequired,
            monto: PropTypes.string.isRequired,
            motivo: PropTypes.string.isRequired,
            archivo_pdf_url: PropTypes.string,
        })
    ).isRequired,
};
