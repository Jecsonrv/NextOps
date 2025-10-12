import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { X, CheckCircle, Loader2, Upload } from "lucide-react";
import apiClient from "../../lib/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";

const ESTADO_CHOICES = [
    { value: "resuelta", label: "Resuelta", description: "La disputa se resolvió favorablemente" },
    { value: "cerrada", label: "Cerrada", description: "La disputa se cerró sin resolución" },
];

export function ResolveDisputeModal({ isOpen, onClose, dispute }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        estado: "resuelta",
        resolucion: "",
        monto_recuperado: "",
        resultado: "pendiente",
        numero_caso: "",
        operativo: "",
        tiene_nota_credito: false,
        nota_credito_numero: "",
        nota_credito_monto: "",
    });
    const [notaCreditoFile, setNotaCreditoFile] = useState(null);
    const [errors, setErrors] = useState({});

    const mutation = useMutation({
        mutationFn: async (data) => {
            // Usar el nuevo endpoint /resolve/ que maneja todo en una transacción
            const formDataToSend = new FormData();

            formDataToSend.append('estado', data.estado);
            formDataToSend.append('resultado', data.resultado);
            formDataToSend.append('resolucion', data.resolucion || '');

            if (data.monto_recuperado) {
                formDataToSend.append('monto_recuperado', parseFloat(data.monto_recuperado));
            }

            // Campos de nota de crédito
            formDataToSend.append('tiene_nota_credito', data.tiene_nota_credito);

            if (data.tiene_nota_credito) {
                if (data.nota_credito_numero) {
                    formDataToSend.append('nota_credito_numero', data.nota_credito_numero);
                }
                if (data.nota_credito_monto) {
                    formDataToSend.append('nota_credito_monto', parseFloat(data.nota_credito_monto));
                }
                if (data.nota_credito_archivo) {
                    formDataToSend.append('nota_credito_archivo', data.nota_credito_archivo);
                }
            }

            const response = await apiClient.post(
                `/invoices/disputes/${dispute.id}/resolve/`,
                formDataToSend,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            return response.data;
        },
        onSuccess: () => {
            toast.success("Disputa resuelta correctamente");
            queryClient.invalidateQueries(["disputes"]);
            queryClient.invalidateQueries(["dispute", dispute?.id]);
            queryClient.invalidateQueries(["dispute-stats"]);
            // ✅ IMPORTANTE: Invalidar también la factura para que se actualice el estado y monto
            if (dispute?.invoice) {
                queryClient.invalidateQueries(["invoice", dispute.invoice]);
            }
            queryClient.invalidateQueries(["invoices"]);
            // ✅ Invalidar OTs por sincronización
            queryClient.invalidateQueries(["ots"]);
            if (dispute?.ot) {
                queryClient.invalidateQueries(["ot", dispute.ot]);
            }
            onClose();
        },
        onError: (error) => {
            const errorData = error.response?.data || {};
            setErrors(errorData);
            toast.error("Error al resolver la disputa");
        },
    });

    useEffect(() => {
        if (isOpen && dispute) {
            setFormData({
                estado: "resuelta",
                resolucion: "",
                monto_recuperado: "",
                resultado: dispute.resultado || "pendiente",
                numero_caso: dispute.numero_caso || "",
                operativo: dispute.operativo || "",
                tiene_nota_credito: false,
                nota_credito_numero: "",
                nota_credito_monto: "",
            });
            setNotaCreditoFile(null);
            setErrors({});
        }
    }, [isOpen, dispute]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;

        // Si el resultado cambia a pendiente, rechazada o anulada, desmarcar nota de crédito
        if (name === "resultado" && !["aprobada_total", "aprobada_parcial"].includes(value)) {
            setFormData((prev) => ({
                ...prev,
                [name]: newValue,
                tiene_nota_credito: false,
                nota_credito_numero: "",
                nota_credito_monto: "",
            }));
            setNotaCreditoFile(null);
        }
        // Si se marca el checkbox de nota de crédito, autocompletar el monto según el tipo
        else if (name === "tiene_nota_credito" && checked) {
            let montoSugerido = "";
            if (formData.resultado === "aprobada_total") {
                montoSugerido = dispute.monto_disputa?.toString() || "";
            } else if (formData.resultado === "aprobada_parcial" && formData.monto_recuperado) {
                montoSugerido = formData.monto_recuperado;
            }
            setFormData((prev) => ({
                ...prev,
                [name]: newValue,
                nota_credito_monto: montoSugerido,
            }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: newValue }));
        }

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validar que sea PDF
            if (file.type !== 'application/pdf') {
                toast.error('Solo se permiten archivos PDF');
                return;
            }
            // Validar tamaño (máximo 10MB)
            if (file.size > 10 * 1024 * 1024) {
                toast.error('El archivo no puede superar los 10MB');
                return;
            }
            setNotaCreditoFile(file);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.resolucion?.trim()) {
            newErrors.resolucion = ["La descripción de la resolución es obligatoria"];
        }

        if (formData.resultado === "aprobada_parcial") {
            const monto = parseFloat(formData.monto_recuperado);
            if (!formData.monto_recuperado || isNaN(monto) || monto <= 0) {
                newErrors.monto_recuperado = ["El monto recuperado es obligatorio para aprobación parcial"];
            } else if (monto > dispute.monto_disputa) {
                newErrors.monto_recuperado = [`El monto recuperado no puede exceder el monto en disputa ($${dispute.monto_disputa?.toLocaleString("es-MX", { minimumFractionDigits: 2 })})`];
            }
        }

        // Validar campos de nota de crédito si está marcado
        if (formData.tiene_nota_credito) {
            if (!formData.nota_credito_numero?.trim()) {
                newErrors.nota_credito_numero = ["El número de nota de crédito es obligatorio"];
            }

            const montoNC = parseFloat(formData.nota_credito_monto);
            if (!formData.nota_credito_monto || isNaN(montoNC) || montoNC <= 0) {
                newErrors.nota_credito_monto = ["El monto de la nota de crédito es obligatorio"];
            } else {
                // Validar que el monto de NC coincida según el tipo de aprobación
                if (formData.resultado === "aprobada_total") {
                    // Para aprobación total, el monto NC debe ser igual al monto disputado
                    if (Math.abs(montoNC - dispute.monto_disputa) > 0.01) {
                        newErrors.nota_credito_monto = [
                            `Para aprobación total, el monto debe ser igual al monto disputado: $${dispute.monto_disputa?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
                        ];
                    }
                } else if (formData.resultado === "aprobada_parcial") {
                    // Para aprobación parcial, el monto NC debe coincidir con el monto recuperado
                    const montoRecuperado = parseFloat(formData.monto_recuperado);
                    if (montoRecuperado && Math.abs(montoNC - montoRecuperado) > 0.01) {
                        newErrors.nota_credito_monto = [
                            `El monto debe coincidir con el monto recuperado: $${montoRecuperado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
                        ];
                    }
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) {
            toast.error("Por favor completa los campos obligatorios");
            return;
        }

        // Agregar el archivo al formData si existe
        const dataToSubmit = { ...formData };
        if (notaCreditoFile) {
            dataToSubmit.nota_credito_archivo = notaCreditoFile;
        }

        mutation.mutate(dataToSubmit);
    };

    if (!isOpen || !dispute) return null;

    const modalContent = (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl bg-white shadow-2xl">
                <CardHeader className="border-b bg-gradient-to-r from-green-50 to-blue-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-green-100">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <CardTitle className="text-xl font-bold text-gray-900">
                                Resolver Disputa
                            </CardTitle>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                    {/* Info de la disputa */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">Disputa: {dispute.codigo}</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                            <p>
                                <span className="font-medium">Tipo:</span> {dispute.tipo_disputa_display}
                            </p>
                            <p>
                                <span className="font-medium">Monto:</span> $
                                {dispute.monto_disputa?.toLocaleString("es-MX", {
                                    minimumFractionDigits: 2,
                                })}
                            </p>
                            <p className="col-span-2">
                                <span className="font-medium">Factura:</span>{" "}
                                {dispute.invoice_data?.numero_factura}
                            </p>
                        </div>
                    </div>

                    {/* Campos editables */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="numero_caso" className="block text-sm font-medium text-gray-700 mb-2">
                                Número de Caso
                            </label>
                            <Input
                                type="text"
                                id="numero_caso"
                                name="numero_caso"
                                value={formData.numero_caso}
                                onChange={handleChange}
                                placeholder="Ej: CASE-2024-001"
                            />
                        </div>
                        <div>
                            <label htmlFor="operativo" className="block text-sm font-medium text-gray-700 mb-2">
                                Operativo Responsable
                            </label>
                            <Input
                                type="text"
                                id="operativo"
                                name="operativo"
                                value={formData.operativo}
                                onChange={handleChange}
                                placeholder="Nombre del operativo"
                            />
                        </div>
                    </div>

                    {/* Resultado */}
                    <div>
                        <label htmlFor="resultado" className="block text-sm font-medium text-gray-700 mb-2">
                            Resultado de la Disputa
                        </label>
                        <select
                            id="resultado"
                            name="resultado"
                            value={formData.resultado}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            <option value="pendiente">Pendiente - Sin resolver aún</option>
                            <option value="aprobada_total">Aprobada Total - Proveedor acepta 100% del reclamo. Factura será ANULADA.</option>
                            <option value="aprobada_parcial">Aprobada Parcial - Proveedor acepta parte del reclamo. Se ajustará el monto.</option>
                            <option value="rechazada">Rechazada por Proveedor - Proveedor rechaza el reclamo. Debemos pagar.</option>
                            <option value="anulada">Anulada (Error Interno) - Disputa creada por error. No procede.</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                            Selecciona el resultado final de la gestión con el proveedor
                        </p>
                        {formData.resultado === 'aprobada_total' && (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                <p className="text-sm text-blue-800">
                                    <strong>Impacto:</strong> La factura NO se pagará y se excluirá de estadísticas.
                                </p>
                            </div>
                        )}
                        {formData.resultado === 'aprobada_parcial' && (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                <p className="text-sm text-blue-800">
                                    <strong>Impacto:</strong> La factura se pagará con el monto ajustado.
                                </p>
                            </div>
                        )}
                        {formData.resultado === 'rechazada' && (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                <p className="text-sm text-blue-800">
                                    <strong>Impacto:</strong> La factura volverá a PENDIENTE y deberá provisionarse.
                                </p>
                            </div>
                        )}
                        {formData.resultado === 'anulada' && (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                <p className="text-sm text-blue-800">
                                    <strong>Impacto:</strong> La factura volverá a PENDIENTE para revisión normal.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Estado final */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Estado Final <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-2">
                            {ESTADO_CHOICES.map((choice) => (
                                <label
                                    key={choice.value}
                                    className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                                        formData.estado === choice.value
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-300 hover:border-blue-300"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="estado"
                                        value={choice.value}
                                        checked={formData.estado === choice.value}
                                        onChange={handleChange}
                                        className="mt-1 mr-3"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">{choice.label}</div>
                                        <div className="text-sm text-gray-600">{choice.description}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Monto recuperado (solo si es aprobación parcial) */}
                    {formData.resultado === "aprobada_parcial" && (
                        <div>
                            <label htmlFor="monto_recuperado" className="block text-sm font-medium text-gray-700 mb-2">
                                Monto Recuperado (USD) <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="number"
                                id="monto_recuperado"
                                name="monto_recuperado"
                                value={formData.monto_recuperado}
                                onChange={handleChange}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                max={dispute.monto_disputa}
                                className={errors.monto_recuperado ? "border-red-500" : ""}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Monto que el proveedor acepta ajustar. Máximo: ${dispute.monto_disputa?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </p>
                            {errors.monto_recuperado && (
                                <p className="mt-1 text-sm text-red-600">{errors.monto_recuperado[0]}</p>
                            )}
                        </div>
                    )}

                    {/* Resolución */}
                    <div>
                        <label htmlFor="resolucion" className="block text-sm font-medium text-gray-700 mb-2">
                            Descripción de la Resolución <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="resolucion"
                            name="resolucion"
                            rows={4}
                            value={formData.resolucion}
                            onChange={handleChange}
                            placeholder="Describe cómo se resolvió la disputa, acuerdos alcanzados, notas de crédito emitidas, etc..."
                            className={`w-full px-3 py-2 border ${
                                errors.resolucion ? "border-red-500" : "border-gray-300"
                            } rounded-md focus:outline-none focus:ring-2 focus:ring-green-500`}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Describe cómo se resolvió la disputa, acuerdos alcanzados, etc.
                        </p>
                        {errors.resolucion && (
                            <p className="mt-1 text-sm text-red-600">{errors.resolucion[0]}</p>
                        )}
                    </div>

                    {/* Sección de Nota de Crédito - Solo para aprobadas */}
                    {(formData.resultado === "aprobada_total" || formData.resultado === "aprobada_parcial") && (
                        <div className="border-t pt-4">
                            <div className="flex items-center gap-3 mb-4">
                                <input
                                    type="checkbox"
                                    id="tiene_nota_credito"
                                    name="tiene_nota_credito"
                                    checked={formData.tiene_nota_credito}
                                    onChange={handleChange}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="tiene_nota_credito" className="text-sm font-medium text-gray-700">
                                    ¿Tiene nota de crédito?
                                </label>
                            </div>

                            {formData.tiene_nota_credito && (
                            <div className="space-y-4 pl-7 border-l-2 border-blue-200">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="nota_credito_numero" className="block text-sm font-medium text-gray-700 mb-2">
                                            Número de Nota de Crédito <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            type="text"
                                            id="nota_credito_numero"
                                            name="nota_credito_numero"
                                            value={formData.nota_credito_numero}
                                            onChange={handleChange}
                                            placeholder="Ej: NC-2024-001"
                                            className={errors.nota_credito_numero ? "border-red-500" : ""}
                                        />
                                        {errors.nota_credito_numero && (
                                            <p className="mt-1 text-sm text-red-600">{errors.nota_credito_numero[0]}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="nota_credito_monto" className="block text-sm font-medium text-gray-700 mb-2">
                                            Monto (USD) <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            type="number"
                                            id="nota_credito_monto"
                                            name="nota_credito_monto"
                                            value={formData.nota_credito_monto}
                                            onChange={handleChange}
                                            placeholder="0.00"
                                            step="0.01"
                                            min="0.01"
                                            className={errors.nota_credito_monto ? "border-red-500" : ""}
                                        />
                                        {errors.nota_credito_monto && (
                                            <p className="mt-1 text-sm text-red-600">{errors.nota_credito_monto[0]}</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="nota_credito_file" className="block text-sm font-medium text-gray-700 mb-2">
                                        Archivo PDF (Opcional)
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <label className="flex-1 flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-blue-400 transition-colors">
                                            <Upload className="w-5 h-5 text-gray-400 mr-2" />
                                            <span className="text-sm text-gray-600">
                                                {notaCreditoFile ? notaCreditoFile.name : 'Seleccionar archivo PDF'}
                                            </span>
                                            <input
                                                type="file"
                                                id="nota_credito_file"
                                                accept=".pdf"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                        </label>
                                        {notaCreditoFile && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setNotaCreditoFile(null)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Sube el PDF de la nota de crédito (máximo 10MB)
                                    </p>
                                </div>

                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                                    <p className="text-sm text-blue-800">
                                        La nota de crédito se creará automáticamente asociada a la factura{" "}
                                        <strong>{dispute.invoice_data?.numero_factura}</strong>
                                        {dispute.ot_data?.referencia && (
                                            <> y a la OT <strong>{dispute.ot_data.referencia}</strong></>
                                        )}
                                    </p>
                                </div>
                            </div>
                            )}
                        </div>
                    )}

                    {/* Advertencia */}
                    {formData.resultado !== 'pendiente' && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-sm text-yellow-800">
                                <strong>Nota:</strong> Al guardar este resultado, la factura cambiará automáticamente de estado
                                y se registrará un evento en el timeline. Esta acción no se puede deshacer fácilmente.
                            </p>
                        </div>
                    )}

                    {/* Resumen */}
                    {formData.resultado === 'aprobada_parcial' && formData.monto_recuperado > 0 && dispute.invoice_data && (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Resumen del Ajuste</h4>
                            <div className="space-y-1 text-sm text-gray-600">
                                <p>Monto original factura: <strong>${dispute.invoice_data.monto?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></p>
                                <p>Monto a recuperar: <strong className="text-green-600">${parseFloat(formData.monto_recuperado).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></p>
                                <p className="pt-2 border-t border-gray-300">Nuevo monto factura: <strong className="text-blue-600">${(dispute.invoice_data.monto - parseFloat(formData.monto_recuperado)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></p>
                            </div>
                        </div>
                    )}
                </CardContent>

                <div className="border-t px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={mutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {mutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Resolver Disputa
                            </>
                        )}
                    </Button>
                </div>
            </Card>
        </div>
    );

    return createPortal(modalContent, document.body);
}

ResolveDisputeModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    dispute: PropTypes.object,
};
