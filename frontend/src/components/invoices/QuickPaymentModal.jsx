/**
 * Modal de Pago Rápido - UX Profesional
 * Inspirado en Stampli, BILL, Monday.com
 *
 * Características:
 * - Formulario simple y directo
 * - Validaciones en tiempo real
 * - Sugerencias inteligentes
 * - Confirmación visual
 */

import PropTypes from 'prop-types';
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import apiClient from "../../lib/api";
import { getTodayString } from "../../utils/dateHelpers";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

import {
    CreditCard,
    CheckCircle,
    AlertCircle,
    DollarSign,
    Calendar,
    FileText,
    Loader2,
    Upload,
    Check,
} from "lucide-react";

export function QuickPaymentModal({ invoice, isOpen, onClose }) {
    const queryClient = useQueryClient();
    const [paymentData, setPaymentData] = useState({
        fecha_pago: getTodayString(),
        monto_a_pagar: invoice?.monto_pendiente || 0,
        referencia: "",
        notas: "",
        archivo_comprobante: null,
    });

    const [errors, setErrors] = useState({});

    // Resetear formulario cuando el modal se abre
    useEffect(() => {
        if (isOpen && invoice) {
            setPaymentData({
                fecha_pago: getTodayString(),
                monto_a_pagar: invoice.monto_pendiente || 0,
                referencia: "",
                notas: "",
                archivo_comprobante: null,
            });
            setErrors({});
        }
    }, [isOpen, invoice]);

    const paymentMutation = useMutation({
        mutationFn: async (data) => {
            // Crear FormData para soportar archivos
            const formData = new FormData();
            formData.append(
                "proveedor",
                invoice.proveedor_data?.id || invoice.proveedor
            );
            formData.append("fecha_pago", data.fecha_pago);
            formData.append("monto_total", parseFloat(data.monto_a_pagar));
            formData.append(
                "referencia",
                data.referencia || `Pago ${invoice.numero_factura}`
            );
            formData.append("notas", data.notas);

            // Agregar archivo si existe
            if (data.archivo_comprobante) {
                formData.append(
                    "archivo_comprobante",
                    data.archivo_comprobante
                );
            }

            // Agregar facturas a pagar como JSON string
            formData.append(
                "invoices_to_pay",
                JSON.stringify([
                    {
                        id: invoice.id,
                        monto_a_pagar: parseFloat(data.monto_a_pagar),
                    },
                ])
            );

            return await apiClient.post("/supplier-payments/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
        },
        onSuccess: () => {
            // Invalidar queries para actualizar datos
            queryClient.invalidateQueries(["invoice", invoice.id]);
            queryClient.invalidateQueries(["invoices"]);
            queryClient.invalidateQueries(["supplier-payment-stats"]);
            queryClient.invalidateQueries(["supplier-payments-history"]);
            queryClient.invalidateQueries(["facturas-pendientes"]);

            toast.success("✅ Pago registrado exitosamente", {
                duration: 3000,
                icon: "💰",
            });

            onClose();
        },
        onError: (error) => {
            const errorMsg =
                error.response?.data?.detail ||
                error.response?.data?.error ||
                "Error al registrar el pago";

            toast.error(errorMsg, {
                duration: 4000,
            });
        },
    });

    const handleChange = (field, value) => {
        setPaymentData((prev) => ({ ...prev, [field]: value }));

        // Limpiar error del campo
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!paymentData.fecha_pago) {
            newErrors.fecha_pago = "La fecha de pago es requerida";
        }

        const monto = parseFloat(paymentData.monto_a_pagar);
        if (!monto || monto <= 0) {
            newErrors.monto_a_pagar = "El monto debe ser mayor a 0";
        } else if (monto > invoice.monto_pendiente) {
            newErrors.monto_a_pagar = `El monto no puede exceder el saldo pendiente ($${invoice.monto_pendiente})`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validate()) {
            toast.error("Por favor corrige los errores en el formulario");
            return;
        }

        paymentMutation.mutate(paymentData);
    };

    const isParcial =
        parseFloat(paymentData.monto_a_pagar) < invoice?.monto_pendiente;

    if (!invoice) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        Registrar Pago
                    </DialogTitle>
                    <DialogDescription>
                        Registra el pago de la factura{" "}
                        <strong>{invoice.numero_factura}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-6">
                    {/* Advertencia si ya está pagada */}
                    {parseFloat(invoice.monto_pendiente || 0) === 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-green-900">
                                    Factura Completamente Pagada
                                </p>
                                <p className="text-sm text-green-700 mt-1">
                                    Esta factura ya ha sido pagada en su
                                    totalidad. No hay saldo pendiente.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Resumen de Factura */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 mb-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-gray-600 text-xs mb-1 uppercase tracking-wide">
                                    Proveedor
                                </p>
                                <p
                                    className="font-semibold text-gray-900 text-sm truncate"
                                    title={invoice.proveedor_nombre}
                                >
                                    {invoice.proveedor_nombre}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-600 text-xs mb-1 uppercase tracking-wide">
                                    Factura
                                </p>
                                <p
                                    className="font-semibold text-gray-900 text-sm truncate"
                                    title={invoice.numero_factura}
                                >
                                    {invoice.numero_factura}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-600 text-xs mb-1 uppercase tracking-wide">
                                    Total
                                </p>
                                <p className="font-bold text-gray-900 text-base">
                                    $
                                    {parseFloat(
                                        invoice.monto_aplicable || 0
                                    ).toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-600 text-xs mb-1 uppercase tracking-wide">
                                    Pendiente
                                </p>
                                <p
                                    className={`font-bold text-base ${
                                        parseFloat(
                                            invoice.monto_pendiente || 0
                                        ) > 0
                                            ? "text-orange-600"
                                            : "text-green-600"
                                    }`}
                                >
                                    $
                                    {parseFloat(
                                        invoice.monto_pendiente || 0
                                    ).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Formulario */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Monto a Pagar */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                                <DollarSign className="w-4 h-4" />
                                Monto a Pagar{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                value={paymentData.monto_a_pagar}
                                onChange={(e) =>
                                    handleChange(
                                        "monto_a_pagar",
                                        e.target.value
                                    )
                                }
                                className={`text-lg font-medium h-11 ${
                                    errors.monto_a_pagar
                                        ? "border-red-500 focus:ring-red-500"
                                        : ""
                                }`}
                                placeholder="0.00"
                                autoFocus
                            />
                            {errors.monto_a_pagar && (
                                <p className="text-red-600 text-xs mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                    {errors.monto_a_pagar}
                                </p>
                            )}

                            {/* Quick Actions */}
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setPaymentData((prev) => ({
                                            ...prev,
                                            monto_a_pagar: parseFloat(
                                                invoice.monto_pendiente
                                            ),
                                        }));
                                    }}
                                    className="text-sm font-medium h-9 hover:bg-green-50 hover:border-green-500 hover:text-green-700"
                                >
                                    Pago Total
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setPaymentData((prev) => ({
                                            ...prev,
                                            monto_a_pagar: parseFloat(
                                                (
                                                    invoice.monto_pendiente / 2
                                                ).toFixed(2)
                                            ),
                                        }));
                                    }}
                                    className="text-sm font-medium h-9 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700"
                                >
                                    50%
                                </Button>
                            </div>

                            {isParcial && (
                                <div className="mt-2 p-2.5 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-800 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium">
                                            Pago Parcial
                                        </p>
                                        <p className="mt-0.5">
                                            Quedará pendiente:{" "}
                                            <strong>
                                                $
                                                {(
                                                    invoice.monto_pendiente -
                                                    parseFloat(
                                                        paymentData.monto_a_pagar ||
                                                            0
                                                    )
                                                ).toFixed(2)}
                                            </strong>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Fecha de Pago */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                Fecha de Pago{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="date"
                                value={paymentData.fecha_pago}
                                onChange={(e) =>
                                    handleChange("fecha_pago", e.target.value)
                                }
                                className={`h-10 ${
                                    errors.fecha_pago
                                        ? "border-red-500 focus:ring-red-500"
                                        : ""
                                }`}
                            />
                            {errors.fecha_pago && (
                                <p className="text-red-600 text-xs mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                    {errors.fecha_pago}
                                </p>
                            )}
                        </div>

                        {/* Referencia */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                                <FileText className="w-4 h-4" />
                                Referencia{" "}
                                <span className="text-gray-400 text-xs font-normal">
                                    (opcional)
                                </span>
                            </label>
                            <Input
                                type="text"
                                value={paymentData.referencia}
                                onChange={(e) =>
                                    handleChange("referencia", e.target.value)
                                }
                                placeholder="Ej: TRF-2025-001, Cheque #123"
                                className="h-10"
                            />
                        </div>

                        {/* Notas */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Notas{" "}
                                <span className="text-gray-400 text-xs font-normal">
                                    (opcional)
                                </span>
                            </label>
                            <textarea
                                value={paymentData.notas}
                                onChange={(e) =>
                                    handleChange("notas", e.target.value)
                                }
                                placeholder="Observaciones adicionales..."
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            />
                        </div>

                        {/* Comprobante */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                                <Upload className="w-4 h-4" />
                                Comprobante de Pago{" "}
                                <span className="text-gray-400 text-xs font-normal">
                                    (opcional)
                                </span>
                            </label>
                            <label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-all">
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        handleChange(
                                            "archivo_comprobante",
                                            file
                                        );
                                    }}
                                />
                                <div className="text-center">
                                    {paymentData.archivo_comprobante ? (
                                        <>
                                            <Check className="mx-auto h-6 w-6 text-green-600" />
                                            <span className="mt-1 block text-xs font-medium text-gray-900 truncate max-w-xs px-4">
                                                {
                                                    paymentData
                                                        .archivo_comprobante
                                                        .name
                                                }
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="mx-auto h-6 w-6 text-gray-400" />
                                            <span className="mt-1 block text-xs text-gray-600">
                                                Subir comprobante (PDF, JPG,
                                                PNG)
                                            </span>
                                        </>
                                    )}
                                </div>
                            </label>
                        </div>

                        {/* Botones */}
                        <div className="flex gap-3 pt-4 border-t border-gray-200 mt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={paymentMutation.isPending}
                                className="flex-1 h-10 text-sm font-medium"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={paymentMutation.isPending}
                                className="flex-1 h-10 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {paymentMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Confirmar Pago
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}

QuickPaymentModal.propTypes = {
    invoice: PropTypes.shape({
        id: PropTypes.number,
        monto_pendiente: PropTypes.number,
        proveedor_data: PropTypes.shape({
            id: PropTypes.number,
        }),
        proveedor: PropTypes.number,
        numero_factura: PropTypes.string,
        proveedor_nombre: PropTypes.string,
        monto_aplicable: PropTypes.number,
    }),
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
};
