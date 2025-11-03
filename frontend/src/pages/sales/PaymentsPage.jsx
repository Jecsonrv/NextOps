import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
    usePayments,
    useValidatePayment,
    useRejectPayment,
    useDeletePayment,
} from "../../hooks/usePayments";
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "../../components/ui/Dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/Select";
import {
    Search,
    Filter,
    DollarSign,
    CheckCircle2,
    XCircle,
    Clock,
    FileText,
    Trash2,
} from "lucide-react";

const ESTADO_CHOICES = [
    { value: "pendiente_validacion", label: "Pendiente", variant: "warning" },
    { value: "validado", label: "Validado", variant: "success" },
    { value: "rechazado", label: "Rechazado", variant: "destructive" },
];

const METODO_PAGO_CHOICES = [
    { value: "transferencia", label: "Transferencia" },
    { value: "cheque", label: "Cheque" },
    { value: "efectivo", label: "Efectivo" },
    { value: "tarjeta", label: "Tarjeta" },
    { value: "otro", label: "Otro" },
];

export default function PaymentsPage() {
    const [filters, setFilters] = useState({
        search: "",
        estado: "",
        metodo_pago: "",
        fecha_desde: "",
        fecha_hasta: "",
    });

    const [rejectModal, setRejectModal] = useState({
        isOpen: false,
        paymentId: null,
        motivo: "",
    });

    const { data: payments, isLoading, error } = usePayments(filters);
    const validateMutation = useValidatePayment();
    const rejectMutation = useRejectPayment();
    const deleteMutation = useDeletePayment();

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("es-EC", {
            style: "currency",
            currency: "USD",
        }).format(amount || 0);
    };

    const getStatusBadge = (status) => {
        const statusConfig = ESTADO_CHOICES.find((c) => c.value === status);
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

    const handleClearFilters = () => {
        setFilters({
            search: "",
            estado: "",
            metodo_pago: "",
            fecha_desde: "",
            fecha_hasta: "",
        });
        toast.success("Filtros limpiados");
    };

    const hasActiveFilters = Object.values(filters).some(
        (value) => value !== ""
    );

    const handleValidate = async (id) => {
        try {
            await validateMutation.mutateAsync(id);
            toast.success("Pago validado exitosamente");
        } catch (error) {
            toast.error("Error al validar el pago");
        }
    };

    const handleReject = (id) => {
        setRejectModal({
            isOpen: true,
            paymentId: id,
            motivo: "",
        });
    };

    const handleConfirmReject = async () => {
        if (!rejectModal.motivo.trim()) {
            toast.error("Debe ingresar un motivo de rechazo");
            return;
        }

        try {
            await rejectMutation.mutateAsync({
                id: rejectModal.paymentId,
                motivo: rejectModal.motivo,
            });
            toast.success("Pago rechazado correctamente");
            setRejectModal({ isOpen: false, paymentId: null, motivo: "" });
        } catch (error) {
            toast.error("Error al rechazar el pago");
        }
    };

    const handleDelete = async (id) => {
        if (
            !window.confirm(
                "¿Está seguro de eliminar este pago? Esta acción no se puede deshacer."
            )
        ) {
            return;
        }

        try {
            await deleteMutation.mutateAsync(id);
            toast.success("Pago eliminado correctamente");
        } catch (error) {
            toast.error("Error al eliminar el pago");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Pagos</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Gestión y validación de pagos de facturas de venta
                    </p>
                </div>
                <Link to="/sales/payments/new">
                    <Button>
                        <DollarSign className="mr-2 h-4 w-4" />
                        Registrar Pago
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Filtros
                        </CardTitle>
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearFilters}
                                className="text-sm"
                            >
                                <XCircle className="h-4 w-4 mr-1" />
                                Limpiar filtros
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Buscar
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="N° referencia, factura..."
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
                                Estado
                            </label>
                            <Select
                                value={filters.estado || "__all__"}
                                onValueChange={(value) =>
                                    handleFilterChange("estado", value)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">
                                        Todos
                                    </SelectItem>
                                    {ESTADO_CHOICES.map((choice) => (
                                        <SelectItem
                                            key={choice.value}
                                            value={choice.value}
                                        >
                                            {choice.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Método de Pago
                            </label>
                            <Select
                                value={filters.metodo_pago || "__all__"}
                                onValueChange={(value) =>
                                    handleFilterChange("metodo_pago", value)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">
                                        Todos
                                    </SelectItem>
                                    {METODO_PAGO_CHOICES.map((choice) => (
                                        <SelectItem
                                            key={choice.value}
                                            value={choice.value}
                                        >
                                            {choice.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Desde
                            </label>
                            <Input
                                type="date"
                                value={filters.fecha_desde}
                                onChange={(e) =>
                                    handleFilterChange(
                                        "fecha_desde",
                                        e.target.value
                                    )
                                }
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Hasta
                            </label>
                            <Input
                                type="date"
                                value={filters.fecha_hasta}
                                onChange={(e) =>
                                    handleFilterChange(
                                        "fecha_hasta",
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Resumen de Totales */}
            {payments?.results && payments.results.length > 0 && (
                <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                                Total Pagos
                            </CardTitle>
                            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                                {
                                    payments.results.filter(
                                        (p) => p.estado !== "rechazado"
                                    ).length
                                }
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Registrados
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                                Monto Total
                            </CardTitle>
                            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="text-2xl sm:text-3xl font-bold text-green-600">
                                {formatCurrency(
                                    payments.results
                                        .filter((p) => p.estado !== "rechazado")
                                        .reduce(
                                            (acc, p) =>
                                                acc + parseFloat(p.monto || 0),
                                            0
                                        )
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                En pagos
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                                Validados
                            </CardTitle>
                            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="text-2xl sm:text-3xl font-bold text-green-600">
                                {
                                    payments.results.filter(
                                        (p) => p.estado === "validado"
                                    ).length
                                }
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Confirmados
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                                Pendientes
                            </CardTitle>
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0" />
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="text-2xl sm:text-3xl font-bold text-amber-600">
                                {
                                    payments.results.filter(
                                        (p) =>
                                            p.estado === "pendiente_validacion"
                                    ).length
                                }
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Por validar
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {isLoading ? (
                <Card>
                    <CardContent className="text-center py-8">
                        <p className="text-gray-600">Cargando pagos...</p>
                    </CardContent>
                </Card>
            ) : error ? (
                <Card>
                    <CardContent className="text-center py-8">
                        <p className="text-red-600">
                            Error al cargar pagos: {error.message}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Fecha Pago
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Factura Venta
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Cliente
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Monto
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Método
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Referencia
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Comprobante
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Estado
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {payments?.results?.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan="8"
                                                className="px-6 py-8 text-center text-gray-500"
                                            >
                                                No se encontraron pagos
                                            </td>
                                        </tr>
                                    ) : (
                                        payments?.results?.map((payment) => (
                                            <tr
                                                key={payment.id}
                                                className="hover:bg-gray-50"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {formatDate(
                                                        payment.fecha_pago
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Link
                                                        to={`/sales/invoices/${payment.sales_invoice}`}
                                                        className="text-sm text-blue-600 hover:text-blue-800"
                                                    >
                                                        {payment.factura_venta_numero ||
                                                            payment.sales_invoice}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {payment.cliente_nombre ||
                                                        "-"}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {formatCurrency(
                                                            payment.monto
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-500 capitalize">
                                                        {payment.metodo_pago}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {payment.referencia || "-"}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    {payment.archivo_comprobante ? (
                                                        <a
                                                            href={
                                                                payment.archivo_comprobante
                                                            }
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                            Ver
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-400">
                                                            Sin comprobante
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(
                                                        payment.estado
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <div className="flex gap-2">
                                                        {payment.estado ===
                                                            "pendiente_validacion" && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        handleValidate(
                                                                            payment.id
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        validateMutation.isPending
                                                                    }
                                                                    title="Validar pago"
                                                                >
                                                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        handleReject(
                                                                            payment.id
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        rejectMutation.isPending
                                                                    }
                                                                    title="Rechazar pago"
                                                                >
                                                                    <XCircle className="h-4 w-4 text-red-600" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        handleDelete(
                                                                            payment.id
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        deleteMutation.isPending
                                                                    }
                                                                    title="Eliminar pago"
                                                                >
                                                                    <Trash2 className="h-4 w-4 text-gray-600" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Modal de rechazo profesional */}
            <Dialog
                open={rejectModal.isOpen}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setRejectModal({
                            isOpen: false,
                            paymentId: null,
                            motivo: "",
                        });
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Rechazar Pago</DialogTitle>
                        <DialogDescription>
                            Por favor, indique el motivo del rechazo. Esta
                            acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label
                                htmlFor="motivo-rechazo"
                                className="text-sm font-medium text-gray-700"
                            >
                                Motivo del rechazo{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="motivo-rechazo"
                                value={rejectModal.motivo}
                                onChange={(e) =>
                                    setRejectModal((prev) => ({
                                        ...prev,
                                        motivo: e.target.value,
                                    }))
                                }
                                placeholder="Ej: Monto incorrecto, factura duplicada, error en la cuenta..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[100px] resize-y"
                                autoFocus
                            />
                            {rejectModal.motivo.trim() === "" && (
                                <p className="text-xs text-gray-500">
                                    El motivo es obligatorio
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() =>
                                setRejectModal({
                                    isOpen: false,
                                    paymentId: null,
                                    motivo: "",
                                })
                            }
                            disabled={rejectMutation.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmReject}
                            disabled={
                                rejectMutation.isPending ||
                                !rejectModal.motivo.trim()
                            }
                        >
                            {rejectMutation.isPending
                                ? "Rechazando..."
                                : "Confirmar Rechazo"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
