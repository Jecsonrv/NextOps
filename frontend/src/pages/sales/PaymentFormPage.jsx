import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useCreatePayment } from "../../hooks/usePayments";
import apiClient from "../../lib/api";
import { getTodayString } from "../../utils/dateHelpers";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/Select";
import { Save, ArrowLeft, Upload, FileText } from "lucide-react";

const METODO_PAGO_CHOICES = [
    { value: "transferencia", label: "Transferencia Bancaria" },
    { value: "cheque", label: "Cheque" },
    { value: "efectivo", label: "Efectivo" },
    { value: "tarjeta", label: "Tarjeta de Crédito/Débito" },
    { value: "otro", label: "Otro" },
];

export default function PaymentFormPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselectedInvoice = searchParams.get("invoice");

    const createMutation = useCreatePayment();

    const [formData, setFormData] = useState({
        sales_invoice: preselectedInvoice || "",
        monto: "",
        fecha_pago: getTodayString(),
        metodo_pago: "transferencia",
        referencia: "",
        banco: "",
        notas: "",
    });

    const [comprobante, setComprobante] = useState(null);

    const { data: invoices, isLoading: isLoadingInvoices } = useQuery({
        queryKey: ["sales-invoices-select"],
        queryFn: async () => {
            const response = await apiClient.get("/sales/invoices/", {
                params: {
                    estado_pago__in: "pendiente,pagado_parcial",
                    estado_facturacion__in: "facturada,pendiente_cobro",
                    ordering: "-fecha_emision",
                },
            });
            return response.data;
        },
    });

    const selectedInvoice = invoices?.results?.find(
        (inv) => inv.id.toString() === formData.sales_invoice
    );

    // Auto-sugerir monto pendiente cuando se selecciona una factura
    useEffect(() => {
        if (selectedInvoice && !formData.monto) {
            setFormData((prev) => ({
                ...prev,
                monto: selectedInvoice.monto_pendiente,
            }));
        }
    }, [selectedInvoice, formData.monto]);

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (
                file.type === "application/pdf" ||
                file.type.startsWith("image/")
            ) {
                setComprobante(file);
            } else {
                toast.error("Solo se permiten archivos PDF o imágenes");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.sales_invoice) {
            toast.error("Debe seleccionar una factura de venta");
            return;
        }

        // Validar estado de la factura
        if (selectedInvoice) {
            if (selectedInvoice.estado_facturacion === "anulada") {
                toast.error(
                    "No se puede registrar un pago para una factura anulada"
                );
                return;
            }

            if (selectedInvoice.estado_pago === "pagado_total") {
                toast.error("Esta factura ya está completamente pagada");
                return;
            }

            // Validar si el monto pendiente es 0 (por notas de crédito)
            if (parseFloat(selectedInvoice.monto_pendiente) <= 0) {
                toast.error(
                    "Esta factura no tiene monto pendiente (ya está pagada o anulada con notas de crédito)"
                );
                return;
            }
        }

        if (parseFloat(formData.monto) <= 0) {
            toast.error("El monto debe ser mayor a 0");
            return;
        }

        // Validar que el monto no exceda el pendiente
        if (
            selectedInvoice &&
            parseFloat(formData.monto) >
                parseFloat(selectedInvoice.monto_pendiente)
        ) {
            toast.error(
                `El monto no puede exceder el saldo pendiente de ${formatCurrency(
                    selectedInvoice.monto_pendiente
                )}`
            );
            return;
        }

        const data = new FormData();

        // Agregar campos del formulario (excepto archivo)
        Object.keys(formData).forEach((key) => {
            if (formData[key] && key !== "archivo_comprobante") {
                data.append(key, formData[key]);
            }
        });

        // Agregar archivo solo si existe
        if (comprobante) {
            data.append("archivo_comprobante", comprobante);
        }

        try {
            await createMutation.mutateAsync(data);

            // Mensaje más descriptivo
            const montoPagado = formatCurrency(formData.monto);
            const esCompleto =
                parseFloat(formData.monto) ===
                parseFloat(selectedInvoice.monto_pendiente);

            toast.success(
                esCompleto
                    ? `Pago de ${montoPagado} registrado. Factura ${selectedInvoice.numero_factura} saldada ✓`
                    : `Pago parcial de ${montoPagado} registrado para ${selectedInvoice.numero_factura}`,
                { duration: 5000 }
            );

            navigate("/sales/payments");
        } catch (error) {
            console.error("Error al registrar pago:", error);

            // Manejo detallado de errores del backend
            if (error.response?.data) {
                const errorData = error.response.data;

                // Si hay errores específicos por campo
                if (typeof errorData === "object" && !errorData.detail) {
                    Object.keys(errorData).forEach((field) => {
                        const messages = Array.isArray(errorData[field])
                            ? errorData[field]
                            : [errorData[field]];

                        messages.forEach((msg) => {
                            toast.error(`${field}: ${msg}`);
                        });
                    });
                } else if (errorData.detail) {
                    // Error general con mensaje detail
                    toast.error(errorData.detail);
                } else if (typeof errorData === "string") {
                    toast.error(errorData);
                }
            } else {
                toast.error(error.message || "Error al registrar el pago");
            }
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("es-EC", {
            style: "currency",
            currency: "USD",
        }).format(amount || 0);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Registrar Pago
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Registrar nuevo pago de factura de venta
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => navigate("/sales/payments")}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
            </div>

            {/* Alerta cuando no hay facturas disponibles */}
            {!isLoadingInvoices && invoices?.results?.length === 0 && (
                <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                                <svg
                                    className="h-5 w-5 text-amber-400"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-amber-800">
                                    No hay facturas pendientes de pago
                                </h3>
                                <p className="mt-2 text-sm text-amber-700">
                                    Todas las facturas de venta están pagadas o
                                    no hay facturas facturadas disponibles.
                                    Puedes{" "}
                                    <a
                                        href="/sales/invoices"
                                        className="font-medium underline hover:text-amber-900"
                                    >
                                        revisar las facturas
                                    </a>{" "}
                                    o crear una nueva factura de venta.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {selectedInvoice && (
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-gray-600 font-medium">
                                    Factura
                                </p>
                                <p className="text-sm font-bold text-gray-900">
                                    {selectedInvoice.numero_factura}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600 font-medium">
                                    Cliente
                                </p>
                                <p className="text-sm font-bold text-gray-900">
                                    {selectedInvoice.cliente_nombre}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600 font-medium">
                                    Monto Total
                                </p>
                                <p className="text-sm font-bold text-gray-900">
                                    {formatCurrency(
                                        selectedInvoice.monto_total
                                    )}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600 font-medium">
                                    Saldo Pendiente
                                </p>
                                <p className="text-sm font-bold text-red-600">
                                    {formatCurrency(
                                        selectedInvoice.monto_pendiente
                                    )}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Información del Pago</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Factura de Venta *
                                </label>
                                <Select
                                    value={formData.sales_invoice}
                                    onValueChange={(value) =>
                                        handleInputChange(
                                            "sales_invoice",
                                            value
                                        )
                                    }
                                    required
                                    disabled={isLoadingInvoices}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={
                                                isLoadingInvoices
                                                    ? "Cargando facturas..."
                                                    : "Seleccionar Factura"
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {invoices?.results?.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-gray-500">
                                                No hay facturas pendientes de
                                                pago
                                            </div>
                                        ) : (
                                            invoices?.results?.map(
                                                (invoice) => (
                                                    <SelectItem
                                                        key={invoice.id}
                                                        value={invoice.id.toString()}
                                                    >
                                                        {invoice.numero_factura}{" "}
                                                        -{" "}
                                                        {invoice.cliente_nombre}{" "}
                                                        -{" "}
                                                        {formatCurrency(
                                                            invoice.monto_pendiente
                                                        )}
                                                    </SelectItem>
                                                )
                                            )
                                        )}
                                    </SelectContent>
                                </Select>

                                {/* Información sobre la factura seleccionada */}
                                {selectedInvoice &&
                                    selectedInvoice.monto_pendiente <= 0 && (
                                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                                            <p className="text-sm text-green-800">
                                                ✓ Esta factura ya está
                                                completamente pagada o anulada
                                                con notas de crédito.
                                            </p>
                                        </div>
                                    )}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Monto del Pago *
                                    </label>
                                    {selectedInvoice && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleInputChange(
                                                    "monto",
                                                    selectedInvoice.monto_pendiente
                                                )
                                            }
                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            Usar monto completo
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                        $
                                    </span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.monto}
                                        onChange={(e) =>
                                            handleInputChange(
                                                "monto",
                                                e.target.value
                                            )
                                        }
                                        placeholder="0.00"
                                        className="pl-7"
                                    />
                                </div>
                                {selectedInvoice && formData.monto && (
                                    <>
                                        {parseFloat(formData.monto) >
                                            parseFloat(
                                                selectedInvoice.monto_pendiente
                                            ) && (
                                            <p className="mt-1 text-xs text-red-600">
                                                ⚠️ El monto excede el saldo
                                                pendiente de{" "}
                                                {formatCurrency(
                                                    selectedInvoice.monto_pendiente
                                                )}
                                            </p>
                                        )}
                                        {parseFloat(formData.monto) <
                                            parseFloat(
                                                selectedInvoice.monto_pendiente
                                            ) && (
                                            <p className="mt-1 text-xs text-amber-600">
                                                ℹ️ Pago parcial: quedará
                                                pendiente{" "}
                                                {formatCurrency(
                                                    parseFloat(
                                                        selectedInvoice.monto_pendiente
                                                    ) -
                                                        parseFloat(
                                                            formData.monto
                                                        )
                                                )}
                                            </p>
                                        )}
                                        {parseFloat(formData.monto) ===
                                            parseFloat(
                                                selectedInvoice.monto_pendiente
                                            ) && (
                                            <p className="mt-1 text-xs text-green-600">
                                                ✓ Pago completo - La factura
                                                quedará saldada
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Fecha de Pago *
                                </label>
                                <Input
                                    type="date"
                                    required
                                    value={formData.fecha_pago}
                                    onChange={(e) =>
                                        handleInputChange(
                                            "fecha_pago",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Método de Pago *
                                </label>
                                <Select
                                    value={formData.metodo_pago}
                                    onValueChange={(value) =>
                                        handleInputChange("metodo_pago", value)
                                    }
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
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
                                    Número de Referencia *
                                </label>
                                <Input
                                    type="text"
                                    value={formData.referencia}
                                    onChange={(e) =>
                                        handleInputChange(
                                            "referencia",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Número de transacción, cheque, etc."
                                    required
                                />
                            </div>

                            {(formData.metodo_pago === "transferencia" ||
                                formData.metodo_pago === "cheque") && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Banco
                                    </label>
                                    <Input
                                        type="text"
                                        value={formData.banco}
                                        onChange={(e) =>
                                            handleInputChange(
                                                "banco",
                                                e.target.value
                                            )
                                        }
                                        placeholder="Nombre del banco"
                                    />
                                </div>
                            )}

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Comprobante de Pago
                                </label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-400 transition-colors">
                                    <div className="space-y-1 text-center">
                                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                                        <div className="flex text-sm text-gray-600">
                                            <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                                                <span>Cargar comprobante</span>
                                                <input
                                                    type="file"
                                                    className="sr-only"
                                                    accept=".pdf,image/*"
                                                    onChange={handleFileChange}
                                                />
                                            </label>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            PDF o imagen hasta 10MB
                                        </p>
                                        {comprobante && (
                                            <p className="text-sm text-gray-500 font-medium">
                                                Seleccionado: {comprobante.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Notas
                                </label>
                                <textarea
                                    rows="3"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.notas}
                                    onChange={(e) =>
                                        handleInputChange(
                                            "notas",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Notas adicionales sobre el pago..."
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate("/sales/payments")}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={createMutation.isPending}
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {createMutation.isPending
                                    ? "Guardando..."
                                    : "Registrar Pago"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
