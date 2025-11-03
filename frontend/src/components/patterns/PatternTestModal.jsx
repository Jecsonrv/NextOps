/* eslint-disable react/prop-types */
/**
 * Modal para probar patrones de factura con texto real
 * Permite testing interactivo y visualización de resultados
 */

import { useState } from "react";
import { X, Play, CheckCircle, XCircle, Copy, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import apiClient from "../../lib/api";

function PatternTestModal({ isOpen, onClose, pattern }) {
    const [testText, setTestText] = useState("");
    const [testResult, setTestResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("access_token");
        return {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };
    };

    const handleTest = async () => {
        if (!testText.trim()) {
            alert("Por favor ingresa texto para probar");
            return;
        }

        try {
            setLoading(true);
            const response = await apiClient.post(
                `/catalogs/invoice-pattern-catalog/${pattern.id}/probar/`,
                { texto_prueba: testText },
                getAuthHeaders()
            );
            setTestResult(response.data);
        } catch (error) {
            console.error("Error testing pattern:", error);
            setTestResult({
                success: false,
                error: error.response?.data?.error || error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert("Copiado al portapapeles");
    };

    if (!isOpen || !pattern) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            Probar Patrón: {pattern.nombre}
                        </h2>
                        {pattern.descripcion && (
                            <p className="text-sm text-gray-600 mt-1">
                                {pattern.descripcion}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Información del Patrón */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalles del Patrón</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Expresión Regular
                                </label>
                                <div className="relative">
                                    <code className="block bg-gray-100 px-3 py-2 rounded font-mono text-sm break-all">
                                        {pattern.patron_regex}
                                    </code>
                                    <button
                                        onClick={() =>
                                            copyToClipboard(
                                                pattern.patron_regex
                                            )
                                        }
                                        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                                        title="Copiar"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tipo
                                    </label>
                                    <p className="text-sm text-gray-900 capitalize">
                                        {pattern.tipo_patron}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Factura
                                    </label>
                                    <p className="text-sm text-gray-900 capitalize">
                                        {pattern.tipo_factura}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Campo
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {pattern.campo_objetivo}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Prioridad
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {pattern.prioridad}
                                    </p>
                                </div>
                            </div>

                            {pattern.case_sensitive && (
                                <div className="text-sm text-blue-600 flex items-center gap-1">
                                    ℹ️ Este patrón es sensible a mayúsculas
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Test Area */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Probar con Texto</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Ingresa o pega el texto del PDF
                                </label>
                                <textarea
                                    value={testText}
                                    onChange={(e) =>
                                        setTestText(e.target.value)
                                    }
                                    placeholder="Pega aquí el texto extraído del PDF para probar si el patrón lo detecta...&#10;&#10;Ejemplo:&#10;Invoice #MAEU123456&#10;Date: 2024-01-15&#10;Total: USD 1,234.56"
                                    rows={10}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                />
                            </div>
                            <Button
                                onClick={handleTest}
                                disabled={loading || !testText}
                                className="w-full"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Probando...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Probar Patrón
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Test Results */}
                    {testResult && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    {testResult.success &&
                                    testResult.coincide ? (
                                        <>
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                            <span className="text-green-700">
                                                ✓ Coincidencia encontrada
                                            </span>
                                        </>
                                    ) : testResult.success ? (
                                        <>
                                            <XCircle className="w-5 h-5 text-yellow-500" />
                                            <span className="text-yellow-700">
                                                Sin coincidencias
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="w-5 h-5 text-red-500" />
                                            <span className="text-red-700">
                                                Error
                                            </span>
                                        </>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {testResult.success && testResult.coincide ? (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Valor Extraído
                                            </label>
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                <code className="text-lg font-bold text-green-900 break-all">
                                                    {testResult.valor_extraido}
                                                </code>
                                            </div>
                                        </div>

                                        {testResult.coincidencia_completa &&
                                            testResult.coincidencia_completa !==
                                                testResult.valor_extraido && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Coincidencia Completa
                                                    </label>
                                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                                        <code className="text-sm text-gray-700 break-all">
                                                            {
                                                                testResult.coincidencia_completa
                                                            }
                                                        </code>
                                                    </div>
                                                </div>
                                            )}

                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <p className="text-sm text-blue-900">
                                                ✓ Este patrón extrajo
                                                exitosamente el campo{" "}
                                                <strong>
                                                    {testResult.campo_objetivo}
                                                </strong>
                                            </p>
                                        </div>
                                    </>
                                ) : testResult.success ? (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <p className="text-sm text-yellow-900">
                                            El patrón no encontró coincidencias
                                            en el texto proporcionado. Verifica
                                            que:
                                        </p>
                                        <ul className="list-disc list-inside text-sm text-yellow-800 mt-2 space-y-1">
                                            <li>
                                                El texto contiene el formato
                                                esperado
                                            </li>
                                            <li>
                                                La expresión regular es correcta
                                            </li>
                                            <li>
                                                {pattern.case_sensitive
                                                    ? "Las mayúsculas/minúsculas coinciden"
                                                    : "El formato del texto es el esperado"}
                                            </li>
                                        </ul>
                                    </div>
                                ) : (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <p className="text-sm font-medium text-red-900 mb-1">
                                            Error al probar el patrón
                                        </p>
                                        <p className="text-sm text-red-700">
                                            {testResult.error}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default PatternTestModal;
