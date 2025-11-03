import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { X, Upload, AlertCircle } from "lucide-react";
import { getTodayString } from "../../utils/dateHelpers";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/Select";
import { useCreateSalesCreditNote } from "../../hooks/useSalesCreditNotes";
import { useSalesInvoices } from "../../hooks/useSalesInvoices";

export function CreateSalesCreditNoteModal({
    isOpen,
    onClose,
    onSuccess = null,
    preSelectedInvoiceId = null,
}) {
    const [formData, setFormData] = useState({
        sales_invoice: "",
        numero_nota_credito: "",
        fecha_emision: getTodayString(),
        monto: "",
        motivo: "",
        notas: "",
        archivo_pdf: null,
    });

    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [errors, setErrors] = useState({});

    // Obtener facturas de venta activas (no anuladas completamente)
    const { data: invoicesData } = useSalesInvoices({
        estado_facturacion: "facturada,pendiente_cobro,pagada,anulada_parcial",
    });

    const createMutation = useCreateSalesCreditNote();

    // Pre-seleccionar factura si se proporciona
    useEffect(() => {
        if (
            isOpen &&
            preSelectedInvoiceId &&
            invoicesData &&
            Array.isArray(invoicesData)
        ) {
            const invoice = invoicesData.find(
                (inv) => inv.id === parseInt(preSelectedInvoiceId)
            );
            if (invoice) {
                setFormData((prev) => ({
                    ...prev,
                    sales_invoice: preSelectedInvoiceId,
                }));
                setSelectedInvoice(invoice);
            }
        }
    }, [isOpen, preSelectedInvoiceId, invoicesData]);

    useEffect(() => {
        if (!isOpen) {
            // Reset form when modal closes
            setFormData({
                sales_invoice: preSelectedInvoiceId || "",
                numero_nota_credito: "",
                fecha_emision: getTodayString(),
                monto: "",
                motivo: "",
                notas: "",
                archivo_pdf: null,
            });
            setSelectedInvoice(null);
            setErrors({});
        }
    }, [isOpen, preSelectedInvoiceId]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        // Clear error when user types
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const handleInvoiceChange = (value) => {
        setFormData((prev) => ({ ...prev, sales_invoice: value }));
        const invoice = Array.isArray(invoicesData)
            ? invoicesData.find((inv) => inv.id === parseInt(value))
            : null;
        setSelectedInvoice(invoice);
        if (errors.sales_invoice) {
            setErrors((prev) => ({ ...prev, sales_invoice: null }));
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (file.type !== "application/pdf") {
                setErrors((prev) => ({
                    ...prev,
                    archivo_pdf: "Solo se permiten archivos PDF",
                }));
                return;
            }
            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                setErrors((prev) => ({
                    ...prev,
                    archivo_pdf: "El archivo es muy grande (máximo 10MB)",
                }));
                return;
            }
            setFormData((prev) => ({ ...prev, archivo_pdf: file }));
            setErrors((prev) => ({ ...prev, archivo_pdf: null }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.sales_invoice) {
            newErrors.sales_invoice = "Debe seleccionar una factura";
        }
        if (!formData.numero_nota_credito) {
            newErrors.numero_nota_credito = "El número de NC es requerido";
        }
        if (!formData.fecha_emision) {
            newErrors.fecha_emision = "La fecha es requerida";
        }
        if (!formData.monto) {
            newErrors.monto = "El monto es requerido";
        } else {
            const monto = parseFloat(formData.monto);
            if (isNaN(monto) || monto <= 0) {
                newErrors.monto = "El monto debe ser mayor a 0";
            } else if (selectedInvoice && monto > selectedInvoice.monto_total) {
                newErrors.monto = `El monto no puede exceder el monto de la factura ($${selectedInvoice.monto_total})`;
            }
        }
        if (!formData.motivo) {
            newErrors.motivo = "El motivo es requerido";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        const submitData = new FormData();
        submitData.append("sales_invoice", formData.sales_invoice);
        submitData.append("numero_nota_credito", formData.numero_nota_credito);
        submitData.append("fecha_emision", formData.fecha_emision);
        submitData.append("monto", formData.monto);
        submitData.append("motivo", formData.motivo);
        if (formData.notas) {
            submitData.append("notas", formData.notas);
        }
        if (formData.archivo_pdf) {
            submitData.append("archivo_pdf", formData.archivo_pdf);
        }

        try {
            await createMutation.mutateAsync(submitData);
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Error creating credit note:", error);
            // Handle API errors
            if (error.response?.data) {
                const apiErrors = {};
                Object.entries(error.response.data).forEach(([key, value]) => {
                    apiErrors[key] = Array.isArray(value) ? value[0] : value;
                });
                setErrors(apiErrors);
            }
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Nueva Nota de Crédito
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Factura de Venta */}
                    <div>
                        <Label htmlFor="sales_invoice">
                            Factura de Venta *
                        </Label>
                        <Select
                            value={formData.sales_invoice}
                            onValueChange={handleInvoiceChange}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione una factura" />
                            </SelectTrigger>
                            <SelectContent>
                                {invoicesData &&
                                    Array.isArray(invoicesData) &&
                                    invoicesData.map((invoice) => (
                                        <SelectItem
                                            key={invoice.id}
                                            value={invoice.id.toString()}
                                        >
                                            {invoice.numero_factura} -{" "}
                                            {invoice.cliente_nombre} - $
                                            {parseFloat(
                                                invoice.monto_total
                                            ).toFixed(2)}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        {errors.sales_invoice && (
                            <p className="text-sm text-red-600 mt-1">
                                {errors.sales_invoice}
                            </p>
                        )}
                        {selectedInvoice && (
                            <div className="mt-2 p-3 bg-blue-50 rounded-md text-sm">
                                <p className="font-medium text-blue-900">
                                    Monto original: $
                                    {parseFloat(
                                        selectedInvoice.monto_total
                                    ).toFixed(2)}
                                </p>
                                <p className="text-blue-700">
                                    Estado: {selectedInvoice.estado_facturacion}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Grid: Número y Fecha */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="numero_nota_credito">
                                Número de NC *
                            </Label>
                            <Input
                                id="numero_nota_credito"
                                name="numero_nota_credito"
                                value={formData.numero_nota_credito}
                                onChange={handleInputChange}
                                placeholder="NC-001"
                            />
                            {errors.numero_nota_credito && (
                                <p className="text-sm text-red-600 mt-1">
                                    {errors.numero_nota_credito}
                                </p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="fecha_emision">
                                Fecha de Emisión *
                            </Label>
                            <Input
                                id="fecha_emision"
                                name="fecha_emision"
                                type="date"
                                value={formData.fecha_emision}
                                onChange={handleInputChange}
                            />
                            {errors.fecha_emision && (
                                <p className="text-sm text-red-600 mt-1">
                                    {errors.fecha_emision}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Monto */}
                    <div>
                        <Label htmlFor="monto">Monto *</Label>
                        <Input
                            id="monto"
                            name="monto"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={formData.monto}
                            onChange={handleInputChange}
                            placeholder="0.00"
                        />
                        {errors.monto && (
                            <p className="text-sm text-red-600 mt-1">
                                {errors.monto}
                            </p>
                        )}
                    </div>

                    {/* Motivo */}
                    <div>
                        <Label htmlFor="motivo">Motivo *</Label>
                        <textarea
                            id="motivo"
                            name="motivo"
                            value={formData.motivo}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Describa el motivo de la nota de crédito..."
                        />
                        {errors.motivo && (
                            <p className="text-sm text-red-600 mt-1">
                                {errors.motivo}
                            </p>
                        )}
                    </div>

                    {/* Notas adicionales */}
                    <div>
                        <Label htmlFor="notas">Notas Adicionales</Label>
                        <textarea
                            id="notas"
                            name="notas"
                            value={formData.notas}
                            onChange={handleInputChange}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Información adicional (opcional)..."
                        />
                    </div>

                    {/* Archivo PDF */}
                    <div>
                        <Label htmlFor="archivo_pdf">Archivo PDF</Label>
                        <div className="mt-1 flex items-center gap-2">
                            <label
                                htmlFor="archivo_pdf"
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
                            >
                                <Upload className="h-4 w-4" />
                                <span className="text-sm">
                                    {formData.archivo_pdf
                                        ? formData.archivo_pdf.name
                                        : "Seleccionar PDF"}
                                </span>
                            </label>
                            <input
                                id="archivo_pdf"
                                name="archivo_pdf"
                                type="file"
                                accept="application/pdf"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                        {errors.archivo_pdf && (
                            <p className="text-sm text-red-600 mt-1">
                                {errors.archivo_pdf}
                            </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Opcional. Máximo 10MB, solo PDF.
                        </p>
                    </div>

                    {/* Validation error from backend */}
                    {errors.detail && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600">
                                {errors.detail}
                            </p>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={createMutation.isPending}
                        >
                            {createMutation.isPending
                                ? "Creando..."
                                : "Crear Nota de Crédito"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

CreateSalesCreditNoteModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func,
    preSelectedInvoiceId: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
    ]),
};
