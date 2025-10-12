import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { X, Calendar, Save, Loader2 } from "lucide-react";
import apiClient from "../../lib/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";

export function AddProvisionDateModal({ isOpen, onClose, invoice }) {
    const queryClient = useQueryClient();
    const [fecha, setFecha] = useState("");
    const [errors, setErrors] = useState({});

    const mutation = useMutation({
        mutationFn: async (data) => {
            return apiClient.patch(`/invoices/${invoice.id}/`, {
                fecha_provision: data.fecha_provision,
            });
        },
        onSuccess: () => {
            toast.success("Fecha de provisión agregada correctamente");
            queryClient.invalidateQueries(["invoice", invoice?.id]);
            queryClient.invalidateQueries(["invoices"]);
            onClose();
        },
        onError: (error) => {
            const errorData = error.response?.data || {};
            setErrors(errorData);
            toast.error("Error al agregar la fecha de provisión");
        },
    });

    useEffect(() => {
        if (isOpen && invoice) {
            setFecha(invoice.fecha_provision || "");
            setErrors({});
        }
    }, [isOpen, invoice]);

    const handleSubmit = () => {
        if (!fecha) {
            setErrors({ fecha_provision: ["La fecha de provisión es obligatoria"] });
            toast.error("Por favor selecciona una fecha");
            return;
        }
        mutation.mutate({ fecha_provision: fecha });
    };

    if (!isOpen || !invoice) return null;

    const modalContent = (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-white shadow-2xl">
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-blue-100">
                                <Calendar className="w-6 h-6 text-blue-600" />
                            </div>
                            <CardTitle className="text-xl font-bold text-gray-900">
                                Agregar Fecha de Provisión
                            </CardTitle>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-6 space-y-5">
                    {/* Info de la factura */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">
                            Factura: {invoice.numero_factura}
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                            <p>
                                <span className="font-medium">Estado:</span>{" "}
                                {invoice.estado_provision === "anulada_parcialmente"
                                    ? "Anulada Parcialmente"
                                    : "Anulada"}
                            </p>
                            <p>
                                <span className="font-medium">Monto Aplicable:</span> $
                                {(invoice.monto_aplicable ?? invoice.monto)?.toLocaleString(
                                    "es-MX",
                                    { minimumFractionDigits: 2 }
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Advertencia */}
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                            <strong>Nota:</strong> Esta fecha es solo para reportes contables. Al agregarla:
                        </p>
                        <ul className="text-sm text-yellow-800 mt-2 ml-4 list-disc space-y-1">
                            <li>El estado de la factura <strong>NO cambiará</strong> (permanecerá como{" "}
                            {invoice.estado_provision === "anulada_parcialmente"
                                ? '"Anulada Parcialmente"'
                                : '"Anulada"'})</li>
                            <li><strong>NO se sincronizará</strong> con la OT asociada</li>
                            <li>Será visible en reportes contables solamente</li>
                        </ul>
                    </div>

                    {/* Campo de fecha */}
                    <div>
                        <label
                            htmlFor="fecha_provision"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            Fecha de Provisión <span className="text-red-500">*</span>
                        </label>
                        <Input
                            type="date"
                            id="fecha_provision"
                            name="fecha_provision"
                            value={fecha}
                            onChange={(e) => {
                                setFecha(e.target.value);
                                if (errors.fecha_provision) {
                                    setErrors((prev) => ({ ...prev, fecha_provision: null }));
                                }
                            }}
                            className={errors.fecha_provision ? "border-red-500" : ""}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Selecciona la fecha en que se provisionará esta factura
                        </p>
                        {errors.fecha_provision && (
                            <p className="mt-1 text-sm text-red-600">
                                {errors.fecha_provision[0]}
                            </p>
                        )}
                    </div>
                </CardContent>

                <div className="border-t px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={mutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {mutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Guardar Fecha
                            </>
                        )}
                    </Button>
                </div>
            </Card>
        </div>
    );

    return createPortal(modalContent, document.body);
}

AddProvisionDateModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    invoice: PropTypes.object,
};
