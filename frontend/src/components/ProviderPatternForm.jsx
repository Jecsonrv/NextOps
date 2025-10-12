/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { X, PlayCircle, CheckCircle, AlertCircle, Code } from "lucide-react";
import { Button } from "./ui/Button";
import axios from "axios";

const API_URL = "http://localhost:8000/api";

function ProviderPatternForm({ open, onClose, pattern }) {
    const [providers, setProviders] = useState([]);
    const [targetFields, setTargetFields] = useState([]);
    const [formData, setFormData] = useState({
        provider: "",
        target_field: "",
        name: "",
        description: "",
        pattern: "",
        is_active: true,
        priority: 5,
        case_sensitive: false,
        test_cases: [],
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

    const loadProviders = async () => {
        try {
            const response = await axios.get(
                `${API_URL}/catalogs/providers/?is_active=true`,
                getAuthHeaders()
            );
            setProviders(response.data.results || []);
        } catch (error) {
            // Si hay error de autenticación, redirigir al login
            if (error.response?.status === 401) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                window.location.href = "/login";
            }
        }
    };

    const loadTargetFields = async () => {
        try {
            const response = await axios.get(
                `${API_URL}/patterns/target-fields/?is_active=true`,
                getAuthHeaders()
            );
            setTargetFields(response.data.results || []);
        } catch (error) {
            // Si hay error de autenticación, redirigir al login
            if (error.response?.status === 401) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                window.location.href = "/login";
            }
        }
    };

    useEffect(() => {
        if (open) {
            loadProviders();
            loadTargetFields();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (pattern) {
            setFormData({
                provider: pattern.provider || "",
                target_field: pattern.target_field || "",
                name: pattern.name || "",
                description: pattern.description || "",
                pattern: pattern.pattern || "",
                is_active:
                    pattern.is_active !== undefined ? pattern.is_active : true,
                priority: pattern.priority || 5,
                case_sensitive: pattern.case_sensitive || false,
                test_cases: pattern.test_cases || [],
            });
        } else {
            setFormData({
                provider: "",
                target_field: "",
                name: "",
                description: "",
                pattern: "",
                is_active: true,
                priority: 5,
                case_sensitive: false,
                test_cases: [],
            });
        }
        setErrors({});
        setTestResult(null);
        setTestText("");
    }, [pattern, open]);

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.provider) newErrors.provider = "Selecciona un proveedor";
        if (!formData.target_field)
            newErrors.target_field = "Selecciona un campo objetivo";
        if (!formData.name.trim()) newErrors.name = "El nombre es requerido";
        if (!formData.pattern.trim())
            newErrors.pattern = "El patrón es requerido";

        // Validate regex
        try {
            new RegExp(formData.pattern);
        } catch (e) {
            newErrors.pattern = `Regex inválido: ${e.message}`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            setLoading(true);
            const url = pattern
                ? `${API_URL}/patterns/provider-patterns/${pattern.id}/`
                : `${API_URL}/patterns/provider-patterns/`;

            const method = pattern ? "put" : "post";

            const response = await axios[method](
                url,
                formData,
                getAuthHeaders()
            );

            onClose(true); // true = saved successfully
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message;
            setErrors({ submit: errorMsg });
        } finally {
            setLoading(false);
        }
    };

    const handleTestPattern = async () => {
        if (!formData.pattern.trim() || !testText.trim()) return;

        try {
            setLoading(true);
            const response = await axios.post(
                `${API_URL}/patterns/provider-patterns/test_pattern/`,
                {
                    pattern: formData.pattern,
                    text: testText,
                    case_sensitive: formData.case_sensitive,
                },
                getAuthHeaders()
            );
            setTestResult(response.data);
        } catch (error) {
            setTestResult({
                success: false,
                error: error.response?.data?.error || error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    // Función para formatear nombres de grupos (grupo_1 -> Grupo 1)
    const formatGroupName = (name) => {
        // Si es grupo_N, convertir a "Grupo N"
        const match = name.match(/^grupo_(\d+)$/i);
        if (match) {
            return `Grupo ${match[1]}`;
        }
        // Para otros nombres, solo capitalizar primera letra
        return name.charAt(0).toUpperCase() + name.slice(1);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
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

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Provider */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Proveedor *
                            </label>
                            <select
                                value={formData.provider}
                                onChange={(e) =>
                                    handleChange("provider", e.target.value)
                                }
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    errors.provider
                                        ? "border-red-500"
                                        : "border-gray-300"
                                }`}
                            >
                                <option value="">Seleccionar proveedor</option>
                                {providers.map((provider) => (
                                    <option
                                        key={provider.id}
                                        value={provider.id}
                                    >
                                        {provider.nombre}
                                    </option>
                                ))}
                            </select>
                            {errors.provider && (
                                <p className="text-sm text-red-600 mt-1">
                                    {errors.provider}
                                </p>
                            )}
                        </div>

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nombre *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) =>
                                    handleChange("name", e.target.value)
                                }
                                placeholder="Ej: Nombre Completo"
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    errors.name
                                        ? "border-red-500"
                                        : "border-gray-300"
                                }`}
                            />
                            {errors.name && (
                                <p className="text-sm text-red-600 mt-1">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        {/* Campo Objetivo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Campo Objetivo *
                            </label>
                            <select
                                value={formData.target_field}
                                onChange={(e) =>
                                    handleChange("target_field", e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            >
                                <option value="">Selecciona un campo</option>
                                {targetFields.map((field) => (
                                    <option key={field.id} value={field.id}>
                                        {field.name} ({field.code})
                                    </option>
                                ))}
                            </select>
                            {errors.target_field && (
                                <p className="text-sm text-red-600 mt-1">
                                    {errors.target_field}
                                </p>
                            )}
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Prioridad (1-10)
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={formData.priority}
                                onChange={(e) =>
                                    handleChange(
                                        "priority",
                                        parseInt(e.target.value)
                                    )
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Descripción
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) =>
                                handleChange("description", e.target.value)
                            }
                            placeholder="Descripción del patrón..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Pattern (Regex) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Patrón (Regex) *
                        </label>
                        <textarea
                            value={formData.pattern}
                            onChange={(e) =>
                                handleChange("pattern", e.target.value)
                            }
                            placeholder="Ej: INVERSIONES\s+GUANACAS\s+S\.A\."
                            rows={3}
                            className={`w-full px-3 py-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                errors.pattern
                                    ? "border-red-500"
                                    : "border-gray-300"
                            }`}
                        />
                        {errors.pattern && (
                            <p className="text-sm text-red-600 mt-1">
                                {errors.pattern}
                            </p>
                        )}
                    </div>

                    {/* Options */}
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) =>
                                    handleChange("is_active", e.target.checked)
                                }
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                Activo
                            </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
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
                        </label>
                    </div>

                    {/* Test Pattern */}
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Probar Patrón
                        </h3>
                        <div className="space-y-3">
                            <textarea
                                value={testText}
                                onChange={(e) => setTestText(e.target.value)}
                                placeholder="Pega aquí el texto para probar el patrón..."
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                            />
                            <Button
                                onClick={handleTestPattern}
                                disabled={
                                    !formData.pattern.trim() ||
                                    !testText.trim() ||
                                    loading
                                }
                                variant="outline"
                            >
                                <PlayCircle
                                    className={`w-4 h-4 mr-2 ${
                                        loading ? "animate-spin" : ""
                                    }`}
                                />
                                {loading ? "Probando..." : "Probar Patrón"}
                            </Button>

                            {testResult && (
                                <div
                                    className={`rounded-lg p-4 border ${
                                        testResult.error
                                            ? "bg-red-50 border-red-200"
                                            : testResult.match_count > 0
                                            ? "bg-green-50 border-green-200"
                                            : "bg-yellow-50 border-yellow-200"
                                    }`}
                                >
                                    {testResult.error ? (
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-red-900 mb-1">
                                                    Error al probar patrón
                                                </p>
                                                <p className="text-sm text-red-700">
                                                    {testResult.error}
                                                </p>
                                            </div>
                                        </div>
                                    ) : testResult.match_count > 0 ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                                <span className="text-sm font-medium text-green-900">
                                                    🎉 {testResult.match_count}{" "}
                                                    coincidencia(s)
                                                </span>
                                                {testResult.match_time_ms && (
                                                    <span className="text-xs text-green-700 ml-auto">
                                                        {
                                                            testResult.match_time_ms
                                                        }
                                                        ms
                                                    </span>
                                                )}
                                            </div>
                                            {testResult.matches &&
                                                testResult.matches.length >
                                                    0 && (
                                                    <div className="space-y-2">
                                                        {testResult.matches.map(
                                                            (match, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="bg-white rounded-lg p-3 border border-green-300"
                                                                >
                                                                    <div className="flex items-baseline gap-2 mb-2">
                                                                        <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                                                                            #
                                                                            {idx +
                                                                                1}
                                                                        </span>
                                                                        <span className="text-xs text-gray-500">
                                                                            {match.position
                                                                                ? `pos: ${match.position}`
                                                                                : ""}
                                                                        </span>
                                                                    </div>
                                                                    <div className="font-mono text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded break-all">
                                                                        {typeof match ===
                                                                        "string"
                                                                            ? match
                                                                            : match.text ||
                                                                              match[0]}
                                                                    </div>
                                                                    {match.groups &&
                                                                        Object.keys(
                                                                            match.groups
                                                                        )
                                                                            .length >
                                                                            0 && (
                                                                            <div className="mt-2 pt-2 border-t border-gray-200">
                                                                                <p className="text-xs font-medium text-gray-600 mb-1">
                                                                                    Grupos:
                                                                                </p>
                                                                                <div className="space-y-1">
                                                                                    {Object.entries(
                                                                                        match.groups
                                                                                    ).map(
                                                                                        ([
                                                                                            key,
                                                                                            value,
                                                                                        ]) => (
                                                                                            <div
                                                                                                key={
                                                                                                    key
                                                                                                }
                                                                                                className="flex items-center gap-2 text-xs"
                                                                                            >
                                                                                                <span className="text-blue-600 font-mono">
                                                                                                    {formatGroupName(
                                                                                                        key
                                                                                                    )}

                                                                                                    :
                                                                                                </span>
                                                                                                <span className="text-gray-800 font-mono bg-blue-50 px-2 py-0.5 rounded">
                                                                                                    &quot;
                                                                                                    {
                                                                                                        value
                                                                                                    }
                                                                                                    &quot;
                                                                                                </span>
                                                                                            </div>
                                                                                        )
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-yellow-900 mb-1">
                                                    No se encontraron
                                                    coincidencias
                                                </p>
                                                <p className="text-sm text-yellow-700">
                                                    El patrón no coincide con el
                                                    texto. Verifica la sintaxis
                                                    del regex.
                                                </p>
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
                    <Button variant="outline" onClick={() => onClose(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading
                            ? "Guardando..."
                            : pattern
                            ? "Actualizar"
                            : "Crear"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default ProviderPatternForm;
