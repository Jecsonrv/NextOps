/**
 * Formulario para crear/editar patrones regex
 * Incluye validación de regex y gestión de test cases
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    Save,
    Loader2,
    Code,
    Plus,
    Trash2,
    Play,
} from "lucide-react";
import {
    useRegexPattern,
    usePatternCategories,
    useCreatePattern,
    useUpdatePattern,
} from "../hooks/useCatalogs";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";

export function PatternFormPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = Boolean(id);

    // Queries
    const { data: pattern, isLoading: loadingPattern } = useRegexPattern(id, {
        enabled: isEditing,
    });
    const { data: categories } = usePatternCategories();

    const createMutation = useCreatePattern();
    const updateMutation = useUpdatePattern();

    // Form state
    const [formData, setFormData] = useState({
        nombre: "",
        descripcion: "",
        patron: "",
        flags: "i",
        categoria: "otro",
        prioridad: 0,
        grupo_captura: "",
        test_cases: [],
        is_active: true,
    });

    const [errors, setErrors] = useState({});
    const [newTestCase, setNewTestCase] = useState({
        input: "",
        expected_output: "",
    });

    // Load pattern data when editing
    useEffect(() => {
        if (pattern) {
            setFormData({
                nombre: pattern.nombre || "",
                descripcion: pattern.descripcion || "",
                patron: pattern.patron || "",
                flags: pattern.flags || "i",
                categoria: pattern.categoria || "otro",
                prioridad: pattern.prioridad || 0,
                grupo_captura: pattern.grupo_captura || "",
                test_cases: pattern.test_cases || [],
                is_active: pattern.is_active !== false,
            });
        }
    }, [pattern]);

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
    };

    const validateRegex = (patron, flags) => {
        try {
            new RegExp(patron, flags);
            return true;
        } catch {
            return false;
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.nombre.trim()) {
            newErrors.nombre = "El nombre es obligatorio";
        }

        if (!formData.patron.trim()) {
            newErrors.patron = "El patrón es obligatorio";
        } else if (!validateRegex(formData.patron, formData.flags)) {
            newErrors.patron = "El patrón regex no es válido";
        }

        if (!formData.categoria) {
            newErrors.categoria = "La categoría es obligatoria";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAddTestCase = () => {
        if (!newTestCase.input.trim() || !newTestCase.expected_output.trim()) {
            alert("Completa ambos campos del caso de prueba");
            return;
        }

        setFormData({
            ...formData,
            test_cases: [...formData.test_cases, { ...newTestCase }],
        });

        setNewTestCase({ input: "", expected_output: "" });
    };

    const handleRemoveTestCase = (index) => {
        setFormData({
            ...formData,
            test_cases: formData.test_cases.filter((_, i) => i !== index),
        });
    };

    const handleTestPattern = async () => {
        if (!newTestCase.input.trim()) {
            alert("Ingresa texto de prueba");
            return;
        }

        if (!formData.patron.trim()) {
            alert("Primero define el patrón regex");
            return;
        }

        try {
            // Test the pattern locally without saving
            const regex = new RegExp(formData.patron, formData.flags);
            const match = regex.exec(newTestCase.input);

            if (match) {
                const result =
                    formData.grupo_captura && match[formData.grupo_captura]
                        ? match[formData.grupo_captura]
                        : match[0];

                alert(
                    `✅ Patrón encontró: "${result}"\n\nPuedes agregar esto como caso de prueba.`
                );

                // Auto-fill expected output
                setNewTestCase({
                    ...newTestCase,
                    expected_output: result,
                });
            } else {
                alert(
                    "❌ El patrón no encontró coincidencias en el texto de prueba"
                );
            }
        } catch (error) {
            alert(`Error al probar el patrón: ${error.message}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            if (isEditing) {
                await updateMutation.mutateAsync({
                    id,
                    data: formData,
                });
                alert("Patrón actualizado exitosamente");
            } else {
                await createMutation.mutateAsync(formData);
                alert("Patrón creado exitosamente");
            }
            navigate("/catalogs/patterns");
        } catch (error) {
            console.error("Error guardando patrón:", error);

            if (error.response?.data) {
                const apiErrors = {};
                Object.keys(error.response.data).forEach((key) => {
                    const messages = error.response.data[key];
                    apiErrors[key] = Array.isArray(messages)
                        ? messages[0]
                        : messages;
                });
                setErrors(apiErrors);
            } else {
                alert("Error al guardar el patrón");
            }
        }
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;

    if (isEditing && loadingPattern) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                    <p className="mt-2 text-gray-600">Cargando patrón...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/catalogs/patterns")}
                >
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {isEditing ? "Editar Patrón" : "Nuevo Patrón"}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {isEditing
                            ? "Modifica el patrón de extracción"
                            : "Define un nuevo patrón regex para extraer datos"}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Información Básica */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Code className="w-5 h-5" />
                            Información Básica
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre del Patrón *
                            </label>
                            <Input
                                type="text"
                                value={formData.nombre}
                                onChange={(e) =>
                                    handleChange("nombre", e.target.value)
                                }
                                placeholder="Ej: Extracción número de factura Maersk"
                                className={
                                    errors.nombre ? "border-red-500" : ""
                                }
                            />
                            {errors.nombre && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.nombre}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descripción
                            </label>
                            <textarea
                                value={formData.descripcion}
                                onChange={(e) =>
                                    handleChange("descripcion", e.target.value)
                                }
                                placeholder="Describe qué datos extrae este patrón y de qué documentos"
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Categoría *
                                </label>
                                <select
                                    value={formData.categoria}
                                    onChange={(e) =>
                                        handleChange(
                                            "categoria",
                                            e.target.value
                                        )
                                    }
                                    className={`w-full px-3 py-2 border rounded-md ${
                                        errors.categoria
                                            ? "border-red-500"
                                            : "border-gray-300"
                                    }`}
                                >
                                    {categories?.map((c) => (
                                        <option key={c.value} value={c.value}>
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Prioridad (0-100)
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.prioridad}
                                    onChange={(e) =>
                                        handleChange(
                                            "prioridad",
                                            parseInt(e.target.value) || 0
                                        )
                                    }
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Mayor prioridad = se aplica primero
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) =>
                                        handleChange(
                                            "is_active",
                                            e.target.checked
                                        )
                                    }
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Patrón Activo
                                </span>
                            </label>
                        </div>
                    </CardContent>
                </Card>

                {/* Expresión Regular */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Expresión Regular</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Patrón Regex *
                            </label>
                            <textarea
                                value={formData.patron}
                                onChange={(e) =>
                                    handleChange("patron", e.target.value)
                                }
                                placeholder="(?:Invoice|Factura)[\s:]+([A-Z0-9-]+)"
                                rows={4}
                                className={`w-full px-3 py-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.patron
                                        ? "border-red-500"
                                        : "border-gray-300"
                                }`}
                            />
                            {errors.patron && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.patron}
                                </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                Usa grupos de captura () para extraer valores
                                específicos
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Flags
                                </label>
                                <Input
                                    type="text"
                                    value={formData.flags}
                                    onChange={(e) =>
                                        handleChange("flags", e.target.value)
                                    }
                                    placeholder="i"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    i=insensible, m=multiline, g=global
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Grupo de Captura
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.grupo_captura}
                                    onChange={(e) =>
                                        handleChange(
                                            "grupo_captura",
                                            e.target.value
                                        )
                                    }
                                    placeholder="1"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Qué grupo capturar (0 = todo, 1 = primer
                                    grupo, etc.)
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Casos de Prueba */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Casos de Prueba</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Agregar nuevo caso de prueba */}
                        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">
                                Agregar Caso de Prueba
                            </h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Texto de Entrada
                                    </label>
                                    <textarea
                                        value={newTestCase.input}
                                        onChange={(e) =>
                                            setNewTestCase({
                                                ...newTestCase,
                                                input: e.target.value,
                                            })
                                        }
                                        placeholder="Texto de ejemplo donde aplicar el patrón"
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Resultado Esperado
                                    </label>
                                    <Input
                                        type="text"
                                        value={newTestCase.expected_output}
                                        onChange={(e) =>
                                            setNewTestCase({
                                                ...newTestCase,
                                                expected_output: e.target.value,
                                            })
                                        }
                                        placeholder="Valor que debería extraerse"
                                        className="font-mono text-sm"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={handleTestPattern}
                                        disabled={!newTestCase.input.trim()}
                                        className="flex-1"
                                    >
                                        <Play className="w-4 h-4 mr-2" />
                                        Probar Patrón
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleAddTestCase}
                                        disabled={
                                            !newTestCase.input.trim() ||
                                            !newTestCase.expected_output.trim()
                                        }
                                        className="flex-1"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Agregar Caso
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Lista de casos de prueba */}
                        {formData.test_cases.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-900">
                                    Casos Guardados (
                                    {formData.test_cases.length})
                                </h4>
                                {formData.test_cases.map((testCase, index) => (
                                    <div
                                        key={index}
                                        className="border border-gray-200 rounded-lg p-3 bg-white"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 space-y-2">
                                                <div>
                                                    <p className="text-xs font-medium text-gray-700">
                                                        Entrada:
                                                    </p>
                                                    <code className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded block mt-1 font-mono">
                                                        {testCase.input}
                                                    </code>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-gray-700">
                                                        Esperado:
                                                    </p>
                                                    <code className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded block mt-1 font-mono">
                                                        {
                                                            testCase.expected_output
                                                        }
                                                    </code>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="destructive"
                                                onClick={() =>
                                                    handleRemoveTestCase(index)
                                                }
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Botones de Acción */}
                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/catalogs/patterns")}
                        disabled={isSaving}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                {isEditing ? "Actualizar" : "Crear"} Patrón
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
