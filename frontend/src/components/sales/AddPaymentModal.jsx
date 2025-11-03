import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import PropTypes from "prop-types";
import { getTodayString } from "../../utils/dateHelpers";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "../ui/Dialog.jsx";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/Select";
import apiClient from "../../lib/api";
import { useQueryClient, useMutation } from "@tanstack/react-query";

export function AddPaymentModal({
    isOpen,
    onClose,
    salesInvoiceId,
    onSuccess,
}) {
    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm({
        defaultValues: {
            fecha_pago: getTodayString(), // Default to today's date
            monto: "",
            metodo_pago: "transferencia",
            referencia: "",
            banco: "",
            archivo_comprobante: null,
            notas: "",
        },
    });
    const queryClient = useQueryClient();
    const [file, setFile] = useState(null);

    const METODO_PAGO_CHOICES = [
        { value: "transferencia", label: "Transferencia Bancaria" },
        { value: "cheque", label: "Cheque" },
        { value: "efectivo", label: "Efectivo" },
        { value: "tarjeta", label: "Tarjeta de Crédito/Débito" },
        { value: "compensacion", label: "Compensación" },
        { value: "nota_credito", label: "Nota de Crédito" },
        { value: "otro", label: "Otro" },
    ];

    const addPaymentMutation = useMutation({
        mutationFn: async (paymentData) => {
            const formData = new FormData();
            formData.append("sales_invoice", salesInvoiceId);
            for (const key in paymentData) {
                if (key === "archivo_comprobante" && file) {
                    formData.append(key, file);
                } else if (
                    paymentData[key] !== undefined &&
                    paymentData[key] !== null
                ) {
                    formData.append(key, paymentData[key]);
                }
            }
            const response = await apiClient.post(
                "/sales/payments/",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            return response.data;
        },
        onSuccess: () => {
            toast.success(
                "Pago registrado exitosamente. Pendiente de validación."
            );
            queryClient.invalidateQueries(["salesInvoice", salesInvoiceId]);
            queryClient.invalidateQueries(["salesInvoices"]);
            onSuccess();
            onClose();
            reset(); // Reset form after successful submission
            setFile(null);
        },
        onError: (err) => {
            console.error("Error al registrar pago:", err);
            toast.error("Error al registrar pago.", {
                description:
                    err.response?.data?.detail ||
                    err.response?.data?.monto?.[0] ||
                    "Hubo un problema al procesar tu solicitud.",
            });
            if (err.response?.data) {
                for (const key in err.response.data) {
                    if (Array.isArray(err.response.data[key])) {
                        toast.error(
                            `${key}: ${err.response.data[key].join(", ")}`
                        );
                    } else if (typeof err.response.data[key] === "string") {
                        toast.error(`${key}: ${err.response.data[key]}`);
                    }
                }
            }
        },
    });

    const onSubmit = (data) => {
        addPaymentMutation.mutate(data);
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Registrar Nuevo Pago</DialogTitle>
                    <DialogDescription>
                        Ingresa los detalles del pago recibido para esta factura
                        de venta.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="fecha_pago">Fecha de Pago</Label>
                            <Controller
                                name="fecha_pago"
                                control={control}
                                rules={{
                                    required: "La fecha de pago es requerida",
                                }}
                                render={({ field }) => (
                                    <Input
                                        id="fecha_pago"
                                        type="date"
                                        {...field}
                                    />
                                )}
                            />
                            {errors.fecha_pago && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.fecha_pago.message}
                                </p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="monto">Monto</Label>
                            <Controller
                                name="monto"
                                control={control}
                                rules={{
                                    required: "El monto es requerido",
                                    pattern: {
                                        value: /^[0-9]*\.?[0-9]*$/,
                                        message: "Monto inválido",
                                    },
                                    min: {
                                        value: 0.01,
                                        message: "El monto debe ser mayor a 0",
                                    },
                                }}
                                render={({ field }) => (
                                    <Input
                                        id="monto"
                                        type="number"
                                        step="0.01"
                                        {...field}
                                    />
                                )}
                            />
                            {errors.monto && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.monto.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="metodo_pago">Método de Pago</Label>
                        <Controller
                            name="metodo_pago"
                            control={control}
                            rules={{
                                required: "El método de pago es requerido",
                            }}
                            render={({ field }) => (
                                <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un método de pago" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {METODO_PAGO_CHOICES.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.metodo_pago && (
                            <p className="text-red-500 text-sm mt-1">
                                {errors.metodo_pago.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="referencia">
                            Referencia / No. Transacción
                        </Label>
                        <Controller
                            name="referencia"
                            control={control}
                            rules={{ required: "La referencia es requerida" }}
                            render={({ field }) => (
                                <Input id="referencia" {...field} />
                            )}
                        />
                        {errors.referencia && (
                            <p className="text-red-500 text-sm mt-1">
                                {errors.referencia.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="banco">
                            Banco de Origen (Opcional)
                        </Label>
                        <Controller
                            name="banco"
                            control={control}
                            render={({ field }) => (
                                <Input id="banco" {...field} />
                            )}
                        />
                    </div>

                    <div>
                        <Label htmlFor="archivo_comprobante">
                            Comprobante de Pago (Opcional)
                        </Label>
                        <Input
                            id="archivo_comprobante"
                            type="file"
                            onChange={handleFileChange}
                        />
                    </div>

                    <div>
                        <Label htmlFor="notas">Notas (Opcional)</Label>
                        <Controller
                            name="notas"
                            control={control}
                            render={({ field }) => (
                                <Textarea id="notas" rows="3" {...field} />
                            )}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={addPaymentMutation.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={addPaymentMutation.isPending}
                        >
                            {addPaymentMutation.isPending
                                ? "Registrando..."
                                : "Registrar Pago"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

AddPaymentModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    salesInvoiceId: PropTypes.number.isRequired,
    onSuccess: PropTypes.func.isRequired,
};
