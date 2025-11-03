import PropTypes from 'prop-types';
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import apiClient from "../../lib/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import {
    Upload,
    Check,
    Calendar,
    FileText,
    Loader2,
} from "lucide-react";
import { getTodayString } from "../../utils/dateHelpers";

export default function SupplierPaymentForm({
    proveedor,
    invoices,
    onSuccess,
    onCancel,
}) {
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        fecha_pago: getTodayString(),
        referencia: "",
        notas: "",
        archivo_comprobante: null,
    });

    const mutation = useMutation({
        mutationFn: async (data) => {
            const formDataToSend = new FormData();
            formDataToSend.append("proveedor", proveedor.proveedor_id);
            formDataToSend.append("fecha_pago", data.fecha_pago);
            formDataToSend.append("referencia", data.referencia);
            formDataToSend.append("monto_total", data.monto_total);
            formDataToSend.append("notas", data.notas);

            if (data.archivo_comprobante) {
                formDataToSend.append(
                    "archivo_comprobante",
                    data.archivo_comprobante
                );
            }

            formDataToSend.append(
                "invoices_to_pay",
                JSON.stringify(data.invoices_to_pay)
            );

            const response = await apiClient.post(
                "/supplier-payments/",
                formDataToSend,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );
            return response.data;
        },
        onSuccess: () => {
            toast.success("✅ Pago registrado exitosamente", {
                duration: 3000,
                icon: "💰",
            });
            queryClient.invalidateQueries(["supplier-payment-stats"]);
            queryClient.invalidateQueries(["facturas-pendientes"]);
            queryClient.invalidateQueries(["invoices"]);
            onSuccess?.();
        },
        onError: (error) => {
            const message =
                error.response?.data?.error || "Error al registrar el pago";
            toast.error(message, { duration: 4000 });
        },
    });

    const totalPagar = invoices.reduce(
        (acc, inv) => acc + parseFloat(inv.monto_pendiente || 0),
        0
    );

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.referencia.trim()) {
            toast.error("La referencia de pago es obligatoria");
            return;
        }

        const invoices_to_pay = invoices.map((inv) => ({
            id: inv.id,
            monto_a_pagar: parseFloat(inv.monto_pendiente).toFixed(2),
        }));

        mutation.mutate({
            ...formData,
            monto_total: totalPagar.toFixed(2),
            invoices_to_pay,
        });
    };

    return (
        <div className="px-6 pb-6">
            {/* Resumen de Proveedor */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="text-blue-700 text-xs mb-1 uppercase tracking-wide">
                            Proveedor
                        </p>
                        <p
                            className="font-semibold text-blue-900 text-sm truncate"
                            title={proveedor.proveedor_nombre}
                        >
                            {proveedor.proveedor_nombre}
                        </p>
                    </div>
                    <div>
                        <p className="text-blue-700 text-xs mb-1 uppercase tracking-wide">
                            Facturas
                        </p>
                        <p className="font-semibold text-blue-900 text-sm">
                            {invoices.length} seleccionada
                            {invoices.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <p className="text-blue-700 text-xs mb-1 uppercase tracking-wide">
                            Total a Pagar
                        </p>
                        <p className="font-bold text-blue-900 text-lg">
                            ${totalPagar.toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Facturas seleccionadas */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Facturas a Pagar
                    </label>
                    <div className="border border-gray-300 rounded-md divide-y max-h-40 overflow-y-auto bg-white">
                        {invoices.map((inv) => (
                            <div
                                key={inv.id}
                                className="p-2.5 flex justify-between items-center text-sm hover:bg-gray-50"
                            >
                                <div className="flex-1">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-700">
                                            {inv.numero_factura}
                                        </span>
                                        <div className="flex gap-3 mt-0.5">
                                            {inv.ot_number && (
                                                <span className="text-xs text-gray-500">
                                                    {inv.ot_number}
                                                </span>
                                            )}
                                            {inv.ot_data?.cliente && (
                                                <span className="text-xs text-gray-500">
                                                    • {inv.ot_data.cliente}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className="font-bold text-gray-900">
                                    $
                                    {parseFloat(inv.monto_pendiente).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Fecha de pago */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        Fecha de Pago <span className="text-red-500">*</span>
                    </label>
                    <Input
                        id="fecha_pago"
                        type="date"
                        value={formData.fecha_pago}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                fecha_pago: e.target.value,
                            })
                        }
                        required
                        max={getTodayString()}
                        className="h-10"
                    />
                </div>

                {/* Referencia */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        Referencia de Pago{" "}
                        <span className="text-red-500">*</span>
                    </label>
                    <Input
                        id="referencia"
                        type="text"
                        placeholder="Ej: TRF-2025-001, Cheque #123"
                        value={formData.referencia}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                referencia: e.target.value,
                            })
                        }
                        required
                        className="h-10"
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
                            id="comprobante"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                setFormData({
                                    ...formData,
                                    archivo_comprobante: file,
                                });
                            }}
                        />
                        <div className="text-center">
                            {formData.archivo_comprobante ? (
                                <>
                                    <Check className="mx-auto h-6 w-6 text-green-600" />
                                    <span className="mt-1 block text-xs font-medium text-gray-900 truncate max-w-xs px-4">
                                        {formData.archivo_comprobante.name}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Upload className="mx-auto h-6 w-6 text-gray-400" />
                                    <span className="mt-1 block text-xs text-gray-600">
                                        Subir comprobante (PDF, JPG, PNG)
                                    </span>
                                </>
                            )}
                        </div>
                    </label>
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
                        id="notas"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Observaciones adicionales..."
                        value={formData.notas}
                        onChange={(e) =>
                            setFormData({ ...formData, notas: e.target.value })
                        }
                    />
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-4 border-t border-gray-200 mt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={mutation.isPending}
                        className="flex-1 h-10 text-sm font-medium"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={mutation.isPending}
                        className="flex-1 h-10 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {mutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4 mr-2" />
                                Confirmar Pago
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}

SupplierPaymentForm.propTypes = {
    proveedor: PropTypes.shape({
        proveedor_id: PropTypes.number,
        proveedor_nombre: PropTypes.string,
    }).isRequired,
    invoices: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number,
        monto_pendiente: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        numero_factura: PropTypes.string,
        ot_number: PropTypes.string,
        ot_data: PropTypes.shape({
            cliente: PropTypes.string,
        }),
    })).isRequired,
    onSuccess: PropTypes.func,
    onCancel: PropTypes.func,
};
