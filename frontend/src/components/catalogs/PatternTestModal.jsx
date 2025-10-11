/**
 * Modal para testing interactivo de patrones regex
 * Permite probar patrones contra texto de ejemplo en tiempo real
 */

import { useState } from "react";
import PropTypes from "prop-types";
import { X, Play, CheckCircle, XCircle, Copy } from "lucide-react";
import { useTestPattern } from "../../hooks/useCatalogs";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";

export function PatternTestModal({ pattern, onClose }) {
    const [testText, setTestText] = useState("");
    const [testResult, setTestResult] = useState(null);

    const testMutation = useTestPattern();

    const handleTest = async () => {
        if (!testText.trim()) {
            alert("Por favor ingresa texto para probar");
            return;
        }

        try {
            const result = await testMutation.mutateAsync({
                id: pattern.id,
                text: testText,
            });
            setTestResult(result);
        } catch (error) {
            console.error("Error testing pattern:", error);
            alert("Error al probar el patrón");
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert("Copiado al portapapeles");
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            Probar Patrón: {pattern.nombre}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {pattern.descripcion}
                        </p>
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
                                        {pattern.patron}
                                    </code>
                                    <button
                                        onClick={() =>
                                            copyToClipboard(pattern.patron)
                                        }
                                        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Categoría
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {pattern.categoria_display}
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

                            {pattern.flags && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Flags
                                    </label>
                                    <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                                        {pattern.flags}
                                    </code>
                                </div>
                            )}

                            {pattern.grupo_captura && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Grupo de Captura
                                    </label>
                                    <p className="text-sm text-gray-900">
                                        {pattern.grupo_captura}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Área de Testing */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Probar con Texto</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Texto de Prueba
                                </label>
                                <textarea
                                    value={testText}
                                    onChange={(e) =>
                                        setTestText(e.target.value)
                                    }
                                    placeholder="Pega aquí el texto para probar el patrón..."
                                    rows={8}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                />
                            </div>

                            <Button
                                onClick={handleTest}
                                disabled={
                                    testMutation.isPending || !testText.trim()
                                }
                                className="w-full flex items-center justify-center gap-2"
                            >
                                <Play className="w-4 h-4" />
                                {testMutation.isPending
                                    ? "Probando..."
                                    : "Ejecutar Prueba"}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Resultados */}
                    {testResult && (
                        <Card
                            className={`border-2 ${
                                testResult.success
                                    ? "border-green-500"
                                    : "border-red-500"
                            }`}
                        >
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    {testResult.success ? (
                                        <>
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                            <span className="text-green-700">
                                                ¡Patrón encontrado!
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="w-5 h-5 text-red-500" />
                                            <span className="text-red-700">
                                                No se encontraron coincidencias
                                            </span>
                                        </>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {testResult.success && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Valor Extraído
                                            </label>
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                <code className="text-lg font-bold text-green-900 break-all">
                                                    {testResult.value}
                                                </code>
                                            </div>
                                        </div>

                                        {testResult.groups &&
                                            Object.keys(testResult.groups)
                                                .length > 0 && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Grupos de Captura
                                                    </label>
                                                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                                        {Object.entries(
                                                            testResult.groups
                                                        ).map(
                                                            ([key, value]) => (
                                                                <div
                                                                    key={key}
                                                                    className="flex items-start gap-2"
                                                                >
                                                                    <span className="text-sm font-medium text-gray-600 min-w-[100px]">
                                                                        {key}:
                                                                    </span>
                                                                    <code className="text-sm text-gray-900 break-all">
                                                                        {value}
                                                                    </code>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                        {testResult.all_matches &&
                                            testResult.all_matches.length >
                                                1 && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Todas las Coincidencias
                                                        (
                                                        {
                                                            testResult
                                                                .all_matches
                                                                .length
                                                        }
                                                        )
                                                    </label>
                                                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                                                        {testResult.all_matches.map(
                                                            (match, index) => (
                                                                <div
                                                                    key={index}
                                                                    className="text-sm text-gray-900 font-mono"
                                                                >
                                                                    {index + 1}.{" "}
                                                                    {match}
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                    </>
                                )}

                                {testResult.error && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <p className="text-sm text-red-900">
                                            <span className="font-bold">
                                                Error:
                                            </span>{" "}
                                            {testResult.error}
                                        </p>
                                    </div>
                                )}

                                {!testResult.success && !testResult.error && (
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
                                                Los flags están configurados
                                                correctamente
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Test Cases del Patrón */}
                    {pattern.test_cases && pattern.test_cases.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Casos de Prueba Guardados</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {pattern.test_cases.map(
                                        (testCase, index) => (
                                            <div
                                                key={index}
                                                className="border border-gray-200 rounded-lg p-3"
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            Texto de entrada:
                                                        </p>
                                                        <code className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                                                            {testCase.input}
                                                        </code>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            setTestText(
                                                                testCase.input
                                                            )
                                                        }
                                                    >
                                                        Usar
                                                    </Button>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">
                                                        Resultado esperado:
                                                    </p>
                                                    <code className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded mt-1 inline-block">
                                                        {
                                                            testCase.expected_output
                                                        }
                                                    </code>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
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

PatternTestModal.propTypes = {
    pattern: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
            .isRequired,
        nombre: PropTypes.string.isRequired,
        descripcion: PropTypes.string,
        patron: PropTypes.string.isRequired,
        categoria_display: PropTypes.string,
        prioridad: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        flags: PropTypes.string,
        grupo_captura: PropTypes.string,
        test_cases: PropTypes.arrayOf(
            PropTypes.shape({
                input: PropTypes.string.isRequired,
                expected_output: PropTypes.string,
            })
        ),
    }).isRequired,
    onClose: PropTypes.func.isRequired,
};
