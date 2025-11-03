/* eslint-disable react/prop-types */
/**
 * Formulario profesional para Patrones de Factura
 * Basado en ProviderPatternForm pero adaptado para:
 * - COSTO: Selección de proveedor
 * - VENTA: Selección de tipo de documento (DTE, CCF, etc.)
 * - 22 campos objetivo organizados por categoría
 * - Testing de regex integrado
 */

import { useState, useEffect } from "react";
import {
    X,
    PlayCircle,
    CheckCircle,
    AlertCircle,
    Code,
    Loader2,
} from "lucide-react";
import { Button } from "../ui/Button";
import apiClient from "../../lib/api";

const CATALOG_URL = "/catalogs/invoice-pattern-catalog/";
const PROVIDERS_URL = "/catalogs/providers/";
const TARGET_FIELDS_URL = "/patterns/target-fields/";

const DOCUMENT_TYPES = [
    { value: "DTE", label: "DTE - Documento Tributario Electrónico" },
    { value: "CCF", label: "CCF - Comprobante de Crédito Fiscal" },
    { value: "Factura", label: "Factura - Factura Simplificada" },
    { value: "NDE", label: "NDE - Nota de Débito Electrónica" },
    { value: "NCE", label: "NCE - Nota de Crédito Electrónica" },
];

function InvoicePatternForm({
    open,
    onClose,
    pattern,
    initialTipoPatron = "costo",
}) {
    const [providers, setProviders] = useState([]);
    const [targetFields, setTargetFields] = useState([]);

    const [formData, setFormData] = useState({
        tipo_patron: initialTipoPatron,
        tipo_factura:
            initialTipoPatron === "venta" ? "nacional" : "internacional", // COSTO siempre internacional
        proveedor: "",
        tipo_documento: "",
        campo_objetivo: "",
        nombre: "",
        patron_regex: "",
        descripcion: "",
        activo: true,
        prioridad: 5,
        case_sensitive: false,
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [testText, setTestText] = useState("");

    const getAuthHeaders = () => {
        const token = localStorage.getItem("access_token");
        return {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };
    };

    // Cargar proveedores y campos objetivo
    const loadProviders = async () => {
        try {
            console.log("Loading providers from:", PROVIDERS_URL);
            const response = await apiClient.get(
                PROVIDERS_URL,
                getAuthHeaders()
            );
            console.log("Providers response:", response.data);
            const allProviders = response.data.results || response.data || [];
            console.log("All providers:", allProviders);
            const activeProviders = allProviders.filter((p) => p.is_active);
            console.log("Active providers:", activeProviders);
            setProviders(activeProviders);
        } catch (error) {
            console.error("Error loading providers:", error);
        }
    };

    const loadTargetFields = async () => {
        try {
            console.log("Loading target fields from:", TARGET_FIELDS_URL);
            const response = await apiClient.get(
                TARGET_FIELDS_URL,
                getAuthHeaders()
            );
            console.log("Target fields response:", response.data);
            const allFields = response.data.results || response.data || [];
            console.log("All fields:", allFields);
            const activeFields = allFields.filter((f) => f.is_active);
            console.log("Active fields:", activeFields);
            setTargetFields(activeFields);
        } catch (error) {
            console.error("Error loading target fields:", error);
        }
    };

    useEffect(() => {
        if (open) {
            loadProviders();
            loadTargetFields();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Cargar datos del patrón si es edición
    useEffect(() => {
        if (pattern && open) {
            setFormData({
                tipo_patron: pattern.tipo_patron || "costo",
                tipo_factura: pattern.tipo_factura || "nacional",
                proveedor: pattern.proveedor || "",
                tipo_documento: pattern.tipo_documento || "",
                campo_objetivo: pattern.campo_objetivo || "",
                nombre: pattern.nombre || "",
                patron_regex: pattern.patron_regex || "",
                descripcion: pattern.descripcion || "",
                activo: pattern.activo !== undefined ? pattern.activo : true,
                prioridad: pattern.prioridad || 5,
                case_sensitive: pattern.case_sensitive || false,
            });
        } else if (!pattern && open) {
            // Reset form for new pattern
            setFormData({
                tipo_patron: initialTipoPatron,
                tipo_factura:
                    initialTipoPatron === "venta"
                        ? "nacional"
                        : "internacional", // COSTO siempre internacional
                proveedor: "",
                tipo_documento: "",
                campo_objetivo: "",
                nombre: "",
                patron_regex: "",
                descripcion: "",
                activo: true,
                prioridad: 5,
                case_sensitive: false,
            });
        }
        setErrors({});
        setTestResult(null);
        setTestText("");
    }, [pattern, open, initialTipoPatron]);

    const handleChange = (field, value) => {
        let updates = { [field]: value };

        // Si cambia tipo_patron, ajustar tipo_factura automáticamente
        if (field === "tipo_patron") {
            updates.tipo_factura =
                value === "venta" ? "nacional" : "internacional";
        }

        setFormData((prev) => ({ ...prev, ...updates }));

        // Limpiar errores
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: null }));
        }

        // Auto-generar nombre si está vacío
        if (
            (field === "campo_objetivo" ||
                field === "proveedor" ||
                field === "tipo_documento") &&
            !formData.nombre
        ) {
            generateAutoName({ ...formData, ...updates });
        }
    };

    const generateAutoName = (data) => {
        const targetField = targetFields.find(
            (f) => f.code === data.campo_objetivo
        );
        const targetFieldName = targetField?.name || data.campo_objetivo;

        let providerOrDoc = "";
        if (data.tipo_patron === "costo") {
            const provider = providers.find(
                (p) => p.id === parseInt(data.proveedor)
            );
            providerOrDoc = provider?.nombre || "";
        } else {
            providerOrDoc = data.tipo_documento || "";
        }

        if (targetFieldName && providerOrDoc) {
            setFormData((prev) => ({
                ...prev,
                nombre: `${providerOrDoc} - ${targetFieldName}`,
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.tipo_patron) {
            newErrors.tipo_patron = "Selecciona el tipo de patrón";
        }

        // tipo_factura solo es requerido para VENTA
        if (formData.tipo_patron === "venta" && !formData.tipo_factura) {
            newErrors.tipo_factura = "Selecciona el tipo de factura";
        }

        if (formData.tipo_patron === "costo" && !formData.proveedor) {
            newErrors.proveedor = "Selecciona un proveedor";
        }

        if (formData.tipo_patron === "venta" && !formData.tipo_documento) {
            newErrors.tipo_documento = "Selecciona un tipo de documento";
        }

        if (!formData.campo_objetivo) {
            newErrors.campo_objetivo = "Selecciona el campo objetivo";
        }

        if (!formData.nombre.trim()) {
            newErrors.nombre = "El nombre es requerido";
        }

        if (!formData.patron_regex.trim()) {
            newErrors.patron_regex = "El patrón regex es requerido";
        } else {
            // Validar regex
            try {
                new RegExp(formData.patron_regex);
            } catch (e) {
                newErrors.patron_regex = `Regex inválido: ${e.message}`;
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            setLoading(true);

            const payload = {
                tipo_patron: formData.tipo_patron,
                tipo_factura: formData.tipo_factura,
                proveedor:
                    formData.tipo_patron === "costo"
                        ? formData.proveedor
                        : null,
                tipo_documento:
                    formData.tipo_patron === "venta"
                        ? formData.tipo_documento
                        : "",
                campo_objetivo: formData.campo_objetivo,
                nombre: formData.nombre,
                patron_regex: formData.patron_regex,
                descripcion: formData.descripcion,
                activo: formData.activo,
                prioridad: formData.prioridad,
                case_sensitive: formData.case_sensitive,
            };

            if (pattern) {
                await apiClient.put(
                    `${CATALOG_URL}${pattern.id}/`,
                    payload,
                    getAuthHeaders()
                );
            } else {
                await apiClient.post(CATALOG_URL, payload, getAuthHeaders());
            }

            onClose(true); // true = saved successfully
        } catch (error) {
            console.error("Error saving pattern:", error);
            const errorMsg = error.response?.data?.error || error.message;
            setErrors({ submit: errorMsg });
        } finally {
            setLoading(false);
        }
    };

    const handleTestPattern = async () => {
        if (!formData.patron_regex.trim() || !testText.trim()) {
            setTestResult({
                success: false,
                error: "Ingresa un patrón y texto para probar",
            });
            return;
        }

        try {
            setLoading(true);

            // Test usando regex directamente en frontend
            const flags = formData.case_sensitive ? "" : "i";
            const regex = new RegExp(formData.patron_regex, flags);
            const match = regex.exec(testText);

            if (match) {
                const extractedValue = match[1] || match[0];
                setTestResult({
                    success: true,
                    match: true,
                    extracted_value: extractedValue,
                    full_match: match[0],
                    groups: match.groups || {},
                    all_matches: match.length > 1 ? match.slice(1) : [],
                });
            } else {
                setTestResult({
                    success: true,
                    match: false,
                    message: "No se encontraron coincidencias",
                });
            }
        } catch (error) {
            setTestResult({
                success: false,
                error: `Error en regex: ${error.message}`,
            });
        } finally {
            setLoading(false);
        }
    };

    // Filtrar campos objetivo según tipo de patrón
    const getFieldsByCategory = () => {
        console.log(
            "Getting fields by category, total targetFields:",
            targetFields.length
        );

        const commonFields = targetFields.filter((f) =>
            [
                "numero_factura",
                "numero_control",
                "fecha_emision",
                "monto_total",
            ].includes(f.code)
        );

        const costoFields = targetFields.filter((f) =>
            [
                "mbl",
                "hbl",
                "numero_contenedor",
                "nombre_proveedor",
                "nit_proveedor",
            ].includes(f.code)
        );

        const ventaFields = targetFields.filter((f) =>
            [
                "nombre_cliente",
                "nit_cliente",
                "subtotal_gravado",
                "subtotal_exento",
                "subtotal",
                "iva_total",
                "retencion_iva",
                "retencion_renta",
                "otros_montos",
            ].includes(f.code)
        );

        const additionalFields = targetFields.filter((f) =>
            [
                "condiciones_pago",
                "fecha_vencimiento",
                "orden_compra",
                "moneda",
            ].includes(f.code)
        );

        console.log("Field categories:", {
            common: commonFields.length,
            costo: costoFields.length,
            venta: ventaFields.length,
            additional: additionalFields.length,
        });

        return {
            common: commonFields,
            costo: costoFields,
            venta: ventaFields,
            additional: additionalFields,
        };
    };

    const fieldCategories = getFieldsByCategory();
    const showIVAFields =
        formData.tipo_patron === "venta" &&
        formData.tipo_factura === "nacional";

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <Code className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {pattern ? "Editar Patrón" : "Nuevo Patrón"}
                        </h2>
                    </div>
                    <button
                        onClick={() => onClose(false)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Error Alert */}
                    {errors.submit && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-red-800">
                                        Error al guardar
                                    </p>
                                    <p className="text-sm text-red-700 mt-1">
                                        {errors.submit}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tipo de Patrón */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tipo de Patrón *
                            </label>
                            <select
                                value={formData.tipo_patron}
                                onChange={(e) =>
                                    handleChange("tipo_patron", e.target.value)
                                }
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    errors.tipo_patron
                                        ? "border-red-500"
                                        : "border-gray-300"
                                }`}
                            >
                                <option value="costo">
                                    Costo (Proveedores)
                                </option>
                                <option value="venta">Venta (Clientes)</option>
                            </select>
                            {errors.tipo_patron && (
                                <p className="text-sm text-red-600 mt-1">
                                    {errors.tipo_patron}
                                </p>
                            )}
                        </div>

                        {/* Solo mostrar tipo_factura para VENTA */}
                        {formData.tipo_patron === "venta" && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tipo de Factura *
                                </label>
                                <select
                                    value={formData.tipo_factura}
                                    onChange={(e) =>
                                        handleChange(
                                            "tipo_factura",
                                            e.target.value
                                        )
                                    }
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                        errors.tipo_factura
                                            ? "border-red-500"
                                            : "border-gray-300"
                                    }`}
                                >
                                    <option value="nacional">
                                        Nacional (DTE, CCF)
                                    </option>
                                    <option value="internacional">
                                        Internacional
                                    </option>
                                </select>
                                {errors.tipo_factura && (
                                    <p className="text-sm text-red-600 mt-1">
                                        {errors.tipo_factura}
                                    </p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                    Nacional incluye campos de IVA y retenciones
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Proveedor (COSTO) o Tipo Documento (VENTA) */}
                    {formData.tipo_patron === "costo" ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Proveedor *
                            </label>
                            <select
                                value={formData.proveedor}
                                onChange={(e) =>
                                    handleChange("proveedor", e.target.value)
                                }
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    errors.proveedor
                                        ? "border-red-500"
                                        : "border-gray-300"
                                }`}
                            >
                                <option value="">
                                    Selecciona un proveedor
                                </option>
                                {providers.map((provider) => (
                                    <option
                                        key={provider.id}
                                        value={provider.id}
                                    >
                                        {provider.nombre}
                                    </option>
                                ))}
                            </select>
                            {errors.proveedor && (
                                <p className="text-sm text-red-600 mt-1">
                                    {errors.proveedor}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tipo de Documento *
                            </label>
                            <select
                                value={formData.tipo_documento}
                                onChange={(e) =>
                                    handleChange(
                                        "tipo_documento",
                                        e.target.value
                                    )
                                }
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    errors.tipo_documento
                                        ? "border-red-500"
                                        : "border-gray-300"
                                }`}
                            >
                                <option value="">
                                    Selecciona un tipo de documento
                                </option>
                                {DOCUMENT_TYPES.map((doc) => (
                                    <option key={doc.value} value={doc.value}>
                                        {doc.label}
                                    </option>
                                ))}
                            </select>
                            {errors.tipo_documento && (
                                <p className="text-sm text-red-600 mt-1">
                                    {errors.tipo_documento}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Campo Objetivo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Campo Objetivo *
                        </label>
                        <select
                            value={formData.campo_objetivo}
                            onChange={(e) =>
                                handleChange("campo_objetivo", e.target.value)
                            }
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                errors.campo_objetivo
                                    ? "border-red-500"
                                    : "border-gray-300"
                            }`}
                        >
                            <option value="">
                                Selecciona el campo específico que se extraerá
                            </option>

                            {/* Campos Comunes */}
                            <optgroup label="📋 Campos Comunes">
                                {fieldCategories.common.map((field) => (
                                    <option key={field.code} value={field.code}>
                                        {field.name}
                                    </option>
                                ))}
                            </optgroup>

                            {/* Campos de Proveedor (solo COSTO) */}
                            {formData.tipo_patron === "costo" &&
                                fieldCategories.costo.length > 0 && (
                                    <optgroup label="📦 Campos de Proveedor">
                                        {fieldCategories.costo.map((field) => (
                                            <option
                                                key={field.code}
                                                value={field.code}
                                            >
                                                {field.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}

                            {/* Campos de Cliente (solo VENTA) */}
                            {formData.tipo_patron === "venta" &&
                                fieldCategories.venta.length > 0 && (
                                    <optgroup label="💰 Campos de Cliente y Montos">
                                        {fieldCategories.venta
                                            .filter(
                                                (field) =>
                                                    showIVAFields ||
                                                    ![
                                                        "subtotal_gravado",
                                                        "subtotal_exento",
                                                        "iva_total",
                                                        "retencion_iva",
                                                        "retencion_renta",
                                                    ].includes(field.code)
                                            )
                                            .map((field) => (
                                                <option
                                                    key={field.code}
                                                    value={field.code}
                                                >
                                                    {field.name}
                                                </option>
                                            ))}
                                    </optgroup>
                                )}

                            {/* Campos Adicionales */}
                            {fieldCategories.additional.length > 0 && (
                                <optgroup label="📌 Campos Adicionales">
                                    {fieldCategories.additional.map((field) => (
                                        <option
                                            key={field.code}
                                            value={field.code}
                                        >
                                            {field.name}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                        {errors.campo_objetivo && (
                            <p className="text-sm text-red-600 mt-1">
                                {errors.campo_objetivo}
                            </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Selecciona el campo específico que este patrón
                            extraerá del PDF
                        </p>
                    </div>

                    {/* Nombre */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre del Patrón *
                        </label>
                        <input
                            type="text"
                            value={formData.nombre}
                            onChange={(e) =>
                                handleChange("nombre", e.target.value)
                            }
                            placeholder="Ej: MAERSK - Número de Factura"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                errors.nombre
                                    ? "border-red-500"
                                    : "border-gray-300"
                            }`}
                        />
                        {errors.nombre && (
                            <p className="text-sm text-red-600 mt-1">
                                {errors.nombre}
                            </p>
                        )}
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Descripción (opcional)
                        </label>
                        <textarea
                            value={formData.descripcion}
                            onChange={(e) =>
                                handleChange("descripcion", e.target.value)
                            }
                            placeholder="Describe cómo funciona este patrón..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Patrón Regex */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Patrón (Regex) *
                        </label>
                        <textarea
                            value={formData.patron_regex}
                            onChange={(e) =>
                                handleChange("patron_regex", e.target.value)
                            }
                            placeholder="Invoice\s*#?\s*([A-Z0-9\-]+)"
                            rows={3}
                            className={`w-full px-3 py-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                errors.patron_regex
                                    ? "border-red-500"
                                    : "border-gray-300"
                            }`}
                        />
                        {errors.patron_regex && (
                            <p className="text-sm text-red-600 mt-1">
                                {errors.patron_regex}
                            </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Usa grupos de captura () para extraer el valor
                            específico
                        </p>
                    </div>

                    {/* Options */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Prioridad
                            </label>
                            <input
                                type="number"
                                value={formData.prioridad}
                                onChange={(e) =>
                                    handleChange(
                                        "prioridad",
                                        parseInt(e.target.value) || 5
                                    )
                                }
                                min="1"
                                max="10"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                1-10 (mayor = más prioridad)
                            </p>
                        </div>

                        <div className="flex items-center gap-2 pt-8">
                            <input
                                type="checkbox"
                                checked={formData.activo}
                                onChange={(e) =>
                                    handleChange("activo", e.target.checked)
                                }
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                Activo
                            </span>
                        </div>

                        <div className="flex items-center gap-2 pt-8">
                            <input
                                type="checkbox"
                                checked={formData.case_sensitive}
                                onChange={(e) =>
                                    handleChange(
                                        "case_sensitive",
                                        e.target.checked
                                    )
                                }
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                Sensible a mayúsculas
                            </span>
                        </div>
                    </div>

                    {/* Test Pattern Section */}
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Probar Patrón
                        </h3>
                        <div className="space-y-3">
                            <textarea
                                value={testText}
                                onChange={(e) => setTestText(e.target.value)}
                                placeholder="Pega aquí el texto para probar el patrón...&#10;&#10;Ejemplo:&#10;Invoice #123456&#10;Date: 2024-01-15&#10;Total: $1,234.56"
                                rows={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                            />
                            <Button
                                variant="outline"
                                onClick={handleTestPattern}
                                disabled={
                                    loading ||
                                    !formData.patron_regex ||
                                    !testText
                                }
                                className="w-full"
                            >
                                <PlayCircle className="w-4 h-4 mr-2" />
                                Probar Patrón
                            </Button>

                            {/* Test Results */}
                            {testResult && (
                                <div className="mt-4">
                                    {testResult.success && testResult.match ? (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <div className="flex items-start gap-2 mb-3">
                                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-green-900 mb-2">
                                                        ✓ Coincidencia
                                                        encontrada
                                                    </p>
                                                    <div className="space-y-2">
                                                        <div>
                                                            <p className="text-xs font-medium text-green-800 mb-1">
                                                                Valor Extraído:
                                                            </p>
                                                            <code className="block bg-white px-3 py-2 rounded border border-green-200 font-mono text-sm text-green-900">
                                                                {
                                                                    testResult.extracted_value
                                                                }
                                                            </code>
                                                        </div>
                                                        {testResult.full_match !==
                                                            testResult.extracted_value && (
                                                            <div>
                                                                <p className="text-xs font-medium text-green-800 mb-1">
                                                                    Coincidencia
                                                                    completa:
                                                                </p>
                                                                <code className="block bg-white px-3 py-2 rounded border border-green-200 font-mono text-xs text-gray-700">
                                                                    {
                                                                        testResult.full_match
                                                                    }
                                                                </code>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : testResult.success &&
                                      !testResult.match ? (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                            <div className="flex items-start gap-2">
                                                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium text-yellow-900 mb-1">
                                                        No se encontraron
                                                        coincidencias
                                                    </p>
                                                    <p className="text-sm text-yellow-700">
                                                        El patrón no coincide
                                                        con el texto. Verifica
                                                        la sintaxis del regex.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                            <div className="flex items-start gap-2">
                                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium text-red-900 mb-1">
                                                        Error
                                                    </p>
                                                    <p className="text-sm text-red-700">
                                                        {testResult.error}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onClose(false)}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>{pattern ? "Actualizar" : "Crear"}</>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default InvoicePatternForm;
