/* eslint-disable react/prop-types */
import { useState } from "react";
import { X, PlayCircle, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import axios from "axios";

const API_URL = "http://localhost:8000/api";

function ProviderPatternTestTool({ open, onClose, pattern }) {
    const [testText, setTestText] = useState("");
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("access_token");
        return {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };
    };

    const handleTest = async () => {
        if (!testText.trim() || !pattern) return;

        try {
            setTesting(true);
            const response = await axios.post(
                `${API_URL}/patterns/provider-patterns/test_pattern/`,
                {
                    pattern: pattern.pattern,
                    text: testText,
                    case_sensitive: pattern.case_sensitive,
                },
                getAuthHeaders()
            );
            setTestResult(response.data);
        } catch (error) {
            console.error("Error testing pattern:", error);
            setTestResult({
                success: false,
                error:
                    error.response?.data?.error ||
                    error.message ||
                    "Error al probar patrón",
            });
        } finally {
            setTesting(false);
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

    const handleClose = () => {
        setTestText("");
        setTestResult(null);
        onClose();
    };

    if (!pattern || !open) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-lg">
                            <PlayCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                Probar Patrón: {pattern.name}
                            </h2>
                            <p className="text-sm text-gray-600">
                                {pattern.provider_nombre}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Pattern Info */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div>
                            <p className="text-sm font-medium text-gray-600 mb-1">
                                Patrón (Regex)
                            </p>
                            <div className="bg-white border border-gray-200 rounded-lg p-3 font-mono text-sm overflow-auto break-all">
                                {pattern.pattern}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Badge
                                className={
                                    pattern.case_sensitive
                                        ? "bg-blue-100 text-blue-800 border-blue-200"
                                        : "bg-gray-100 text-gray-800 border-gray-200"
                                }
                            >
                                {pattern.case_sensitive
                                    ? "Sensible a mayúsculas"
                                    : "No sensible a mayúsculas"}
                            </Badge>
                            <Badge variant="outline">
                                Prioridad: {pattern.priority}
                            </Badge>
                        </div>
                    </div>

                    {/* Test Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Texto de Prueba
                        </label>
                        <textarea
                            value={testText}
                            onChange={(e) => setTestText(e.target.value)}
                            placeholder="Pega aquí el texto de la factura para probar el patrón..."
                            rows={8}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                        />
                    </div>

                    {/* Test Button */}
                    <div>
                        <Button
                            onClick={handleTest}
                            disabled={!testText.trim() || testing}
                            className="w-full"
                        >
                            <PlayCircle
                                className={`w-4 h-4 mr-2 ${
                                    testing ? "animate-spin" : ""
                                }`}
                            />
                            {testing ? "Probando..." : "Probar Patrón"}
                        </Button>
                    </div>

                    {/* Test Results */}
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
                                // Error
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
                                // Success with matches
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        <span className="text-sm font-medium text-green-900">
                                            🎉 {testResult.match_count}{" "}
                                            coincidencia(s)
                                        </span>
                                        {testResult.match_time_ms && (
                                            <span className="text-xs text-green-700 ml-auto">
                                                {testResult.match_time_ms}ms
                                            </span>
                                        )}
                                    </div>
                                    {testResult.matches &&
                                        testResult.matches.length > 0 && (
                                            <div className="space-y-2">
                                                {testResult.matches.map(
                                                    (match, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="bg-white rounded-lg p-3 border border-green-300"
                                                        >
                                                            <div className="flex items-baseline gap-2 mb-2">
                                                                <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                                                                    #{idx + 1} -
                                                                    pos:{" "}
                                                                    {match.position ||
                                                                        0}
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
                                                                ).length >
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
                                // No matches
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-yellow-900 mb-1">
                                            No se encontraron coincidencias
                                        </p>
                                        <p className="text-sm text-yellow-700">
                                            El patrón no coincide con el texto
                                            proporcionado. Verifica que el
                                            patrón regex sea correcto.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-end">
                    <Button variant="outline" onClick={handleClose}>
                        Cerrar
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default ProviderPatternTestTool;
