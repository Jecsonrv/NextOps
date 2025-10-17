/**
 * Modal para crear una nota de crédito asociada a una factura existente
 */

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, X, CheckCircle, AlertCircle, Loader2, Upload, FileText, FileMinus } from "lucide-react";
import apiClient from "../../lib/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { toast } from "react-hot-toast";

export function CreateCreditNoteModal({
    isOpen = false,
    onClose = () => {},
    onSuccess = () => {},
}) {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Campos del formulario
    const [formData, setFormData] = useState({
        numero_nota: "",
        monto: "",
        fecha_emision: new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split("T")[0],
        motivo: "",
        pdf_file: null,
    });

    const [formErrors, setFormErrors] = useState({});

    // Función de búsqueda de facturas
    const handleSearch = async (term) => {
        const searchValue = term || searchTerm;
        if (!searchValue.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        setError(null);
        try {
            const response = await apiClient.get("/invoices/", {
                params: {
                    search: searchValue,
                    page_size: 100,
                },
            });
            const results = response.data.results || response.data || [];
            setSearchResults(results);
        } catch (error) {
            const errorMsg =
                error.response?.data?.detail ||
                error.response?.data?.message ||
                error.message ||
                "Error desconocido al buscar facturas";
            setError(errorMsg);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            // Reset todo al cerrar
            setSearchTerm("");
            setSearchResults([]);
            setSelectedInvoice(null);
            setError(null);
            setSuccessMessage(null);
            setFormData({
                numero_nota: "",
                monto: "",
                fecha_emision: new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split("T")[0],
                motivo: "",
                pdf_file: null,
            });
            setFormErrors({});
        }
    }, [isOpen]);

    // Búsqueda en tiempo real con debounce
    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (searchTerm.trim()) {
                handleSearch(searchTerm);
            } else {
                setSearchResults([]);
                setError(null);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        // Limpiar error del campo al editar
        if (formErrors[name]) {
            setFormErrors((prev) => ({
                ...prev,
                [name]: null,
            }));
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validar que sea PDF
            if (file.type !== "application/pdf") {
                setFormErrors((prev) => ({
                    ...prev,
                    pdf_file: "Solo se permiten archivos PDF",
                }));
                return;
            }
            // Validar tamaño (máx 10MB)
            if (file.size > 10 * 1024 * 1024) {
                setFormErrors((prev) => ({
                    ...prev,
                    pdf_file: "El archivo no debe superar 10MB",
                }));
                return;
            }
            setFormData((prev) => ({
                ...prev,
                pdf_file: file,
            }));
            setFormErrors((prev) => ({
                ...prev,
                pdf_file: null,
            }));
        }
    };

    const validateForm = () => {
        const errors = {};
        const invoiceAmount = selectedInvoice?.monto_aplicable ?? selectedInvoice?.monto;

        if (!selectedInvoice) {
            errors.invoice = "Debe seleccionar una factura";
        }

        if (!formData.numero_nota.trim()) {
            errors.numero_nota = "El número de nota es obligatorio";
        }

        if (!formData.monto || parseFloat(formData.monto) <= 0) {
            errors.monto = "El monto debe ser mayor a 0";
        } else if (selectedInvoice && parseFloat(formData.monto) > parseFloat(invoiceAmount)) {
            errors.monto = `El monto no puede exceder el monto aplicable de la factura ($${parseFloat(invoiceAmount).toLocaleString("es-MX")})`;
        }

        if (!formData.fecha_emision) {
            errors.fecha_emision = "La fecha de emisión es obligatoria";
        }

        if (!formData.pdf_file) {
            errors.pdf_file = "El archivo PDF es obligatorio";
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Crear FormData para enviar archivo
            const submitData = new FormData();
            submitData.append("invoice_relacionada_id", selectedInvoice.id);
            submitData.append("numero_nota", formData.numero_nota);
            submitData.append("monto", Math.abs(parseFloat(formData.monto)) * -1); // Asegurar que sea negativo
            submitData.append("fecha_emision", formData.fecha_emision);
            if (formData.motivo.trim()) {
                submitData.append("motivo", formData.motivo);
            }
            if (formData.pdf_file) {
                submitData.append("pdf_file", formData.pdf_file);
            }

            await apiClient.post("/invoices/credit-notes/", submitData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            // Mostrar mensaje de éxito
            setSuccessMessage(
                `Nota de crédito ${formData.numero_nota} creada correctamente`
            );
            toast.success("Nota de crédito creada exitosamente");

            // Llamar callback de éxito
            onSuccess();

            // Cerrar después de 1.5 segundos
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error) {
            const errorData = error.response?.data;
            let processedError = "Error al crear nota de crédito.";

            if (errorData && errorData.message) {
                // Usar el mensaje amigable del backend directamente
                processedError = errorData.message;

                // Si hay errores de campo específicos, mapearlos
                if (errorData.errors) {
                    const newFormErrors = {};
                    errorData.errors.forEach(err => {
                        newFormErrors[err.field] = err.message;
                    });
                    setFormErrors(newFormErrors);
                }

            } else if (typeof errorData === 'string') {
                processedError = errorData;
            } else if (errorData) {
                // Fallback para otros formatos de error de DRF
                const fieldErrors = Object.entries(errorData);
                if (fieldErrors.length > 0) {
                    const [field, messages] = fieldErrors[0];
                    processedError = Array.isArray(messages) ? messages[0] : String(messages);
                    
                    const newFormErrors = {};
                    for (const [key, value] of Object.entries(errorData)) {
                        if (Array.isArray(value)) {
                            newFormErrors[key] = value.join(" ");
                        }
                    }
                    setFormErrors(newFormErrors);
                }
            } else {
                processedError = error.message;
            }

            setError(processedError);
            toast.error(processedError);
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white shadow-2xl">
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileMinus className="w-6 h-6 text-red-600" />
                            <CardTitle>Crear Nota de Crédito</CardTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                        Asocie una nota de crédito a una factura existente
                    </p>
                </CardHeader>

                <CardContent className="flex-1 overflow-auto p-6 space-y-6">
                    {/* Búsqueda de factura */}
                    {!selectedInvoice ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Buscar Factura *
                                </label>
                                <div className="flex gap-2 items-center">
                                    <div className="flex-1 relative">
                                        <Input
                                            placeholder="Buscar por número de factura, proveedor..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                        {isSearching && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        onClick={handleSearch}
                                        disabled={isSearching || !searchTerm.trim()}
                                        variant="outline"
                                    >
                                        <Search className="w-4 h-4" />
                                    </Button>
                                </div>
                                {formErrors.invoice && (
                                    <p className="text-xs text-red-600 mt-1">{formErrors.invoice}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                    {isSearching
                                        ? "Buscando..."
                                        : searchTerm
                                        ? `${searchResults.length} resultado${
                                              searchResults.length !== 1 ? "s" : ""
                                          } encontrado${searchResults.length !== 1 ? "s" : ""}`
                                        : "Escribe para buscar facturas"}
                                </p>
                            </div>

                            {/* Resultados de búsqueda */}
                            {searchResults.length > 0 ? (
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                    {searchResults.map((invoice) => (
                                        <Card
                                            key={invoice.id}
                                            className="cursor-pointer hover:bg-gray-50 transition-colors"
                                            onClick={() => setSelectedInvoice(invoice)}
                                        >
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="font-semibold text-lg">
                                                                {invoice.numero_factura}
                                                            </span>
                                                            <Badge variant="secondary">
                                                                ${parseFloat(invoice.monto || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                                            </Badge>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                                            <div>
                                                                <span className="text-gray-600">Proveedor:</span>
                                                                <p className="font-medium">{invoice.proveedor_nombre || "N/A"}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-600">Fecha:</span>
                                                                <p className="font-medium">{invoice.fecha_emision || "N/A"}</p>
                                                            </div>
                                                            {invoice.ot_data && (
                                                                <div>
                                                                    <span className="text-gray-600">OT:</span>
                                                                    <p className="font-medium">{invoice.ot_data.numero_ot}</p>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <span className="text-gray-600">Estado:</span>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {invoice.estado_provision_display || invoice.estado_provision}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : searchTerm && !isSearching ? (
                                <div className="text-center py-12">
                                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-600">
                                        No se encontraron facturas con &ldquo;{searchTerm}&rdquo;
                                    </p>
                                </div>
                            ) : !searchTerm ? (
                                <div className="text-center py-12">
                                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-600">
                                        Ingresa un término de búsqueda para encontrar facturas
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <>
                            {/* Factura seleccionada */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Factura Seleccionada
                                    </label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedInvoice(null)}
                                        disabled={isSubmitting}
                                    >
                                        Cambiar
                                    </Button>
                                </div>
                                <Card className="bg-blue-50 border-blue-200">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="font-semibold text-lg text-blue-900">
                                                {selectedInvoice.numero_factura}
                                            </span>
                                            <Badge variant="secondary">
                                                ${parseFloat(selectedInvoice.monto || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                            </Badge>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-gray-600">Proveedor:</span>
                                                <p className="font-medium text-gray-900">{selectedInvoice.proveedor_nombre || "N/A"}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Fecha:</span>
                                                <p className="font-medium text-gray-900">{selectedInvoice.fecha_emision || "N/A"}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Formulario de nota de crédito */}
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="font-semibold text-gray-900">Información de la Nota de Crédito</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Número de Nota *
                                        </label>
                                        <Input
                                            name="numero_nota"
                                            value={formData.numero_nota}
                                            onChange={handleInputChange}
                                            placeholder="NC-2024-001"
                                            disabled={isSubmitting}
                                        />
                                        {formErrors.numero_nota && (
                                            <p className="text-xs text-red-600 mt-1">{formErrors.numero_nota}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Monto * (USD)
                                        </label>
                                        <Input
                                            name="monto"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.monto}
                                            onChange={handleInputChange}
                                            placeholder="0.00"
                                            disabled={isSubmitting}
                                        />
                                        {formErrors.monto && (
                                            <p className="text-xs text-red-600 mt-1">{formErrors.monto}</p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1">
                                            Se aplicará como valor negativo. Máximo: ${selectedInvoice ? parseFloat(selectedInvoice.monto_aplicable ?? selectedInvoice.monto).toLocaleString("es-MX") : '0.00'}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Fecha de Emisión *
                                        </label>
                                        <Input
                                            name="fecha_emision"
                                            type="date"
                                            value={formData.fecha_emision}
                                            onChange={handleInputChange}
                                            disabled={isSubmitting}
                                        />
                                        {formErrors.fecha_emision && (
                                            <p className="text-xs text-red-600 mt-1">{formErrors.fecha_emision}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Archivo PDF *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept=".pdf,application/pdf"
                                                onChange={handleFileChange}
                                                disabled={isSubmitting}
                                                className="hidden"
                                                id="pdf-upload"
                                            />
                                            <label
                                                htmlFor="pdf-upload"
                                                className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                                            >
                                                <Upload className="w-4 h-4" />
                                                {formData.pdf_file ? formData.pdf_file.name : "Seleccionar archivo"}
                                            </label>
                                        </div>
                                        {formErrors.pdf_file && (
                                            <p className="text-xs text-red-600 mt-1">{formErrors.pdf_file}</p>
                                        )}
                                        {formData.pdf_file && (
                                            <p className="text-xs text-green-600 mt-1">
                                                ✓ {(formData.pdf_file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Motivo (opcional)
                                    </label>
                                    <textarea
                                        name="motivo"
                                        value={formData.motivo}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Describe el motivo de la nota de crédito..."
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Mensaje de éxito */}
                    {successMessage && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-green-900">¡Éxito!</p>
                                <p className="text-sm text-green-700 mt-1">{successMessage}</p>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && !successMessage && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-red-900">Error</p>
                                <p className="text-sm text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    )}
                </CardContent>

                {/* Footer con acciones */}
                <div className="border-t p-6 flex items-center justify-between bg-gray-50">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!selectedInvoice || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creando...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Crear Nota de Crédito
                            </>
                        )}
                    </Button>
                </div>
            </Card>
        </div>
    );

    return createPortal(modalContent, document.body);
}
