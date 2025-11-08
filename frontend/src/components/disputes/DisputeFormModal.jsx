import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { X, Save, Loader2, AlertTriangle } from "lucide-react";
import apiClient from "../../lib/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { InvoiceSelector } from "./InvoiceSelector";

const TIPO_DISPUTA_CHOICES = [
    { value: "servicio_no_prestado", label: "Servicio No Prestado" },
    { value: "monto_incorrecto", label: "Monto Incorrecto / Error de Facturación" },
    { value: "almacenaje_no_aplica", label: "Almacenaje No Aplica" },
    { value: "demoras_no_aplican", label: "Demoras No Aplican" },
    { value: "dias_libres_incorrectos", label: "Días Libres No Aplicados Correctamente" },
    { value: "otro", label: "Otro" },
];

export function DisputeFormModal({ isOpen, onClose, dispute, invoice }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        invoice_id: "",
        tipo_disputa: "servicio_no_prestado",
        detalle: "",
        monto_disputa: "",
        numero_caso: "",
        operativo: "",
        fecha_disputa: new Date().toISOString().split('T')[0], // Fecha actual por defecto
    });
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [errors, setErrors] = useState({});

    const mutation = useMutation({
        mutationFn: (data) => {
            const payload = {
                ...data,
                ot_id: selectedInvoice?.ot || null,
            };
            if (dispute) {
                return apiClient.patch(`/invoices/disputes/${dispute.id}/`, payload);
            }
            return apiClient.post("/invoices/disputes/", payload);
        },
        onSuccess: () => {
            toast.success(dispute ? "Disputa actualizada correctamente" : "Disputa creada correctamente");
            queryClient.invalidateQueries(["disputes"]);
            queryClient.invalidateQueries(["dispute-stats"]);
            
            // ✅ CRÍTICO: Invalidar la factura asociada para que se actualice el estado
            if (invoice) {
                queryClient.invalidateQueries(["invoice", invoice.id]);
            }
            // También invalidar por el ID del formData (cuando se crea desde modal)
            if (formData.invoice_id) {
                queryClient.invalidateQueries(["invoice", formData.invoice_id]);
            }
            // Invalidar lista de facturas para que se actualice el estado en la tabla
            queryClient.invalidateQueries(["invoices"]);
            // Invalidar también las OTs por si hay sincronización
            queryClient.invalidateQueries(["ots"]);
            
            onClose();
        },
        onError: (error) => {
            const errorData = error.response?.data || {};
            setErrors(errorData);

            // Mostrar mensaje de error específico
            if (errorData.non_field_errors) {
                toast.error(errorData.non_field_errors[0]);
            } else if (errorData.detail) {
                toast.error(errorData.detail);
            } else {
                toast.error("Error al guardar la disputa. Verifica los campos.");
            }
        },
    });

    useEffect(() => {
        if (isOpen) {
            if (dispute) {
                // Modo edición
                setFormData({
                    invoice_id: dispute.invoice || "",
                    tipo_disputa: dispute.tipo_disputa || "servicio_no_prestado",
                    detalle: dispute.detalle || "",
                    monto_disputa: dispute.monto_disputa || "",
                    numero_caso: dispute.numero_caso || "",
                    operativo: dispute.operativo || "",
                    fecha_disputa: dispute.fecha_disputa || new Date().toISOString().split('T')[0],
                });
                setSelectedInvoice(dispute.invoice_data || null);
            } else if (invoice) {
                // Crear desde factura
                setFormData({
                    invoice_id: invoice.id,
                    tipo_disputa: "servicio_no_prestado",
                    detalle: "",
                    monto_disputa: invoice.monto || "",
                    numero_caso: "",
                    operativo: invoice.ot_data?.operativo || "",
                    fecha_disputa: new Date().toISOString().split('T')[0],
                });
                setSelectedInvoice(invoice);
            } else {
                // Crear nueva disputa sin factura preseleccionada
                setFormData({
                    invoice_id: "",
                    tipo_disputa: "servicio_no_prestado",
                    detalle: "",
                    monto_disputa: "",
                    numero_caso: "",
                    operativo: "",
                    fecha_disputa: new Date().toISOString().split('T')[0],
                });
                setSelectedInvoice(null);
            }
            setErrors({});
        }
    }, [isOpen, dispute, invoice]);

    const handleInvoiceSelect = (inv) => {
        setSelectedInvoice(inv);
        setFormData((prev) => ({
            ...prev,
            invoice_id: inv.id,
            monto_disputa: prev.monto_disputa || inv.monto || "",
        }));
        if (errors.invoice_id) {
            setErrors((prev) => ({ ...prev, invoice_id: null }));
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.invoice_id) {
            newErrors.invoice_id = ["Debe seleccionar una factura"];
        }
        if (!formData.tipo_disputa) {
            newErrors.tipo_disputa = ["Debe seleccionar un tipo de disputa"];
        }
        if (!formData.detalle?.trim()) {
            newErrors.detalle = ["El detalle es obligatorio"];
        }
        if (!formData.monto_disputa || parseFloat(formData.monto_disputa) <= 0) {
            newErrors.monto_disputa = ["El monto debe ser mayor a 0"];
        }
        if (!formData.numero_caso?.trim()) {
            newErrors.numero_caso = ["El número de caso es obligatorio"];
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validateForm()) {
            toast.error("Por favor completa todos los campos obligatorios");
            return;
        }
        mutation.mutate(formData);
    };

    // Determinar si el botón de guardar debe estar deshabilitado
    const isSaveDisabled = () => {
        // En modo edición, siempre permitir guardar
        if (dispute) return false;

        // Si la factura está anulada (total o parcialmente), deshabilitar
        if (selectedInvoice && (selectedInvoice.estado_provision === 'anulada' || selectedInvoice.estado_provision === 'anulada_parcialmente')) {
            return true;
        }

        // Si tiene disputa activa, deshabilitar
        if (selectedInvoice && selectedInvoice.has_disputes && selectedInvoice.dispute_id) {
            return true;
        }

        return false;
    };

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-3xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader className="border-b sticky top-0 bg-white z-10">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-bold text-gray-900">
                            {dispute ? "Editar Disputa" : "Nueva Disputa"}
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-6 space-y-5">
                    {errors.non_field_errors && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                            <div className="flex items-start">
                                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
                                <p className="text-red-800 text-sm">{errors.non_field_errors.join(", ")}</p>
                            </div>
                        </div>
                    )}

                    {errors.invoice_id && Array.isArray(errors.invoice_id) && errors.invoice_id.length > 0 && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                            <div className="flex items-start">
                                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
                                <p className="text-red-800 text-sm">{errors.invoice_id[0]}</p>
                            </div>
                        </div>
                    )}

                    {/* Advertencia si la factura ya está anulada */}
                    {selectedInvoice && (selectedInvoice.estado_provision === 'anulada' || selectedInvoice.estado_provision === 'anulada_parcialmente') && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                            <div className="flex items-start">
                                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 mr-3" />
                                <div>
                                    <p className="text-yellow-800 text-sm font-semibold">Factura Anulada</p>
                                    <p className="text-yellow-700 text-sm mt-1">
                                        Esta factura ya ha sido {selectedInvoice.estado_provision === 'anulada' ? 'anulada totalmente' : 'anulada parcialmente'}{" "}
                                          por una disputa anterior. No es posible crear nuevas disputas.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Advertencia si tiene disputas activas */}
                    {selectedInvoice && selectedInvoice.has_disputes && selectedInvoice.dispute_id && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                            <div className="flex items-start">
                                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 mr-3" />
                                <div>
                                    <p className="text-yellow-800 text-sm font-semibold">Disputa Activa</p>
                                    <p className="text-yellow-700 text-sm mt-1">
                                        Esta factura ya tiene una disputa activa. Debes resolver la disputa existente antes de crear una nueva.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Selector de factura (solo si no es edición y no viene con factura preseleccionada) */}
                    {!dispute && !invoice && (
                        <InvoiceSelector
                            selectedInvoice={selectedInvoice}
                            onSelect={handleInvoiceSelect}
                        />
                    )}

                    {/* Mostrar factura en modo edición o con factura preseleccionada */}
                    {(dispute || invoice) && selectedInvoice && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Factura Asociada
                            </label>
                            <Card className="border-blue-200 bg-blue-50">
                                <CardContent className="p-4">
                                    <div className="space-y-2">
                                        <p className="font-semibold text-gray-900">
                                            {selectedInvoice.numero_factura}
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                            <p>
                                                <span className="font-medium">Proveedor:</span>{" "}
                                                {selectedInvoice.proveedor_nombre}
                                            </p>
                                            {selectedInvoice.ot_number && (
                                                <p>
                                                    <span className="font-medium">OT:</span>{" "}
                                                    {selectedInvoice.ot_number}
                                                </p>
                                            )}
                                            <p>
                                                <span className="font-medium">Monto:</span> $
                                                {parseFloat(selectedInvoice.monto).toLocaleString("es-MX", {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {errors.invoice_id && (
                        <p className="text-sm text-red-600 -mt-3">{errors.invoice_id[0]}</p>
                    )}

                    {/* Tipo de disputa */}
                    <div>
                        <label htmlFor="tipo_disputa" className="block text-sm font-medium text-gray-700 mb-2">
                            Tipo de Disputa <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="tipo_disputa"
                            name="tipo_disputa"
                            value={formData.tipo_disputa}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 border ${
                                errors.tipo_disputa ? "border-red-500" : "border-gray-300"
                            } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        >
                            {TIPO_DISPUTA_CHOICES.map((choice) => (
                                <option key={choice.value} value={choice.value}>
                                    {choice.label}
                                </option>
                            ))}
                        </select>
                        {errors.tipo_disputa && (
                            <p className="mt-1 text-sm text-red-600">{errors.tipo_disputa[0]}</p>
                        )}
                    </div>

                    {/* Número de caso */}
                    <div>
                        <label htmlFor="numero_caso" className="block text-sm font-medium text-gray-700 mb-2">
                            Número de Caso <span className="text-red-500">*</span>
                        </label>
                        <Input
                            type="text"
                            id="numero_caso"
                            name="numero_caso"
                            value={formData.numero_caso}
                            onChange={handleChange}
                            placeholder="Ej: CASO-2024-001, REF-MAERSK-123"
                            className={errors.numero_caso ? "border-red-500" : ""}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Número de referencia con el proveedor, naviera u otra entidad externa
                        </p>
                        {errors.numero_caso && (
                            <p className="mt-1 text-sm text-red-600">{errors.numero_caso[0]}</p>
                        )}
                    </div>

                    {/* Fecha de Disputa */}
                    <div>
                        <label htmlFor="fecha_disputa" className="block text-sm font-medium text-gray-700 mb-2">
                            Fecha de la Disputa <span className="text-red-500">*</span>
                        </label>
                        <Input
                            type="date"
                            id="fecha_disputa"
                            name="fecha_disputa"
                            value={formData.fecha_disputa}
                            onChange={handleChange}
                            max={new Date().toISOString().split('T')[0]}
                            className={errors.fecha_disputa ? "border-red-500" : ""}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Fecha en que se reportó o aperturó la disputa con el proveedor
                        </p>
                        {errors.fecha_disputa && (
                            <p className="mt-1 text-sm text-red-600">{errors.fecha_disputa[0]}</p>
                        )}
                    </div>

                    {/* Operativo */}
                    <div>
                        <label htmlFor="operativo" className="block text-sm font-medium text-gray-700 mb-2">
                            Operativo Responsable
                            <span className="text-gray-500 font-normal ml-1">(opcional)</span>
                        </label>
                        <Input
                            type="text"
                            id="operativo"
                            name="operativo"
                            value={formData.operativo}
                            onChange={handleChange}
                            placeholder="Nombre del operativo"
                            className={errors.operativo ? "border-red-500" : ""}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Operativo asignado para dar seguimiento a la disputa
                        </p>
                        {errors.operativo && (
                            <p className="mt-1 text-sm text-red-600">{errors.operativo[0]}</p>
                        )}
                    </div>

                    {/* Monto en disputa */}
                    <div>
                        <label htmlFor="monto_disputa" className="block text-sm font-medium text-gray-700 mb-2">
                            Monto en Disputa (USD) <span className="text-red-500">*</span>
                        </label>
                        <Input
                            type="number"
                            id="monto_disputa"
                            name="monto_disputa"
                            value={formData.monto_disputa}
                            onChange={handleChange}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            className={errors.monto_disputa ? "border-red-500" : ""}
                        />
                        {errors.monto_disputa && (
                            <p className="mt-1 text-sm text-red-600">{errors.monto_disputa[0]}</p>
                        )}
                    </div>

                    {/* Detalle */}
                    <div>
                        <label htmlFor="detalle" className="block text-sm font-medium text-gray-700 mb-2">
                            Detalle de la Disputa <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="detalle"
                            name="detalle"
                            rows={4}
                            value={formData.detalle}
                            onChange={handleChange}
                            placeholder="Describe el motivo de la disputa con el mayor detalle posible..."
                            className={`w-full px-3 py-2 border ${
                                errors.detalle ? "border-red-500" : "border-gray-300"
                            } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                        {errors.detalle && (
                            <p className="mt-1 text-sm text-red-600">{errors.detalle[0]}</p>
                        )}
                    </div>

                </CardContent>

                <div className="border-t px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 sticky bottom-0">
                    <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={mutation.isPending || isSaveDisabled()}>
                        {mutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                {dispute ? "Actualizar" : "Crear"} Disputa
                            </>
                        )}
                    </Button>
                </div>
            </Card>
        </div>
    );

    return createPortal(modalContent, document.body);
}

DisputeFormModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    dispute: PropTypes.object,
    invoice: PropTypes.object,
};
