/**
 * Formulario para crear/editar Categorías de Costo
 * Maneja validaciones, estados y persistencia
 */

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import {
    useCostCategory,
    useCreateCostCategory,
    useUpdateCostCategory,
} from "../hooks/useCatalogs";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export function CostCategoryFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const { data: category, isLoading: isLoadingCategory } =
        useCostCategory(id);
    const createMutation = useCreateCostCategory();
    const updateMutation = useUpdateCostCategory();

    const [formData, setFormData] = useState({
        code: "",
        name: "",
        description: "",
        color: "#3B82F6", // Azul por defecto
        is_active: true,
        display_order: 0,
    });

    const [errors, setErrors] = useState({});

    // Cargar datos en modo edición
    useEffect(() => {
        if (isEditMode && category) {
            setFormData({
                code: category.code || "",
                name: category.name || "",
                description: category.description || "",
                color: category.color || "#3B82F6",
                is_active: category.is_active ?? true,
                display_order: category.display_order ?? 0,
            });
        }
    }, [category, isEditMode]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        let processedValue = value;

        // Convertir código a lowercase automáticamente
        if (name === "code") {
            processedValue = value.replace(/\s+/g, "_");
        }

        // Convertir display_order a número
        if (name === "display_order") {
            processedValue = parseInt(value) || 0;
        }

        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : processedValue,
        }));

        // Limpiar error del campo al modificarlo
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.code.trim()) {
            newErrors.code = "El código es requerido";
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.code)) {
            newErrors.code =
                "El código solo puede contener letras (mayúsculas o minúsculas), números y guiones bajos";
        }

        if (!formData.name.trim()) {
            newErrors.name = "El nombre es requerido";
        }

        if (!formData.color) {
            newErrors.color = "El color es requerido";
        } else if (!/^#[0-9A-Fa-f]{6}$/.test(formData.color)) {
            newErrors.color =
                "El color debe estar en formato hexadecimal (#RRGGBB)";
        }

        if (formData.display_order < 0) {
            newErrors.display_order = "El orden debe ser un número no negativo";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error("Por favor, corrige los errores en el formulario");
            return;
        }

        const toastId = toast.loading(
            isEditMode ? "Actualizando categoría..." : "Creando categoría..."
        );

        try {
            if (isEditMode) {
                await updateMutation.mutateAsync({
                    id,
                    data: formData,
                });
                toast.success("Categoría actualizada exitosamente", {
                    id: toastId,
                });
            } else {
                await createMutation.mutateAsync(formData);
                toast.success("Categoría creada exitosamente", {
                    id: toastId,
                });
            }
            navigate("/catalogs/cost-categories");
        } catch (error) {
            console.error("Error guardando categoría:", error);

            // Manejar errores de validación del backend
            if (error.response?.data) {
                const backendErrors = {};
                Object.keys(error.response.data).forEach((key) => {
                    if (Array.isArray(error.response.data[key])) {
                        backendErrors[key] = error.response.data[key][0];
                    } else {
                        backendErrors[key] = error.response.data[key];
                    }
                });
                setErrors(backendErrors);
                toast.error(
                    "Hay errores en el formulario. Revisa los campos marcados",
                    {
                        id: toastId,
                    }
                );
            } else {
                toast.error("Error al guardar la categoría", { id: toastId });
            }
        }
    };

    if (isEditMode && isLoadingCategory) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    onClick={() => navigate("/catalogs/cost-categories")}
                >
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {isEditMode ? "Editar Categoría" : "Nueva Categoría"}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {isEditMode
                            ? "Modifica los datos de la categoría"
                            : "Crea una nueva categoría de tipo de costo"}
                    </p>
                </div>
            </div>

            {/* Formulario */}
            <Card>
                <CardHeader>
                    <CardTitle>Información de la Categoría</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Código */}
                            <div>
                                <label
                                    htmlFor="code"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Código *
                                </label>
                                <Input
                                    id="code"
                                    name="code"
                                    value={formData.code}
                                    onChange={handleChange}
                                    placeholder="ej: maritimo"
                                    disabled={isEditMode} // No permitir cambiar código en edición
                                    className={
                                        errors.code ? "border-red-500" : ""
                                    }
                                />
                                {errors.code && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.code}
                                    </p>
                                )}
                                <p className="text-gray-500 text-xs mt-1">
                                    Solo letras mayúsculas, números y guiones
                                    bajos
                                </p>
                            </div>

                            {/* Nombre */}
                            <div>
                                <label
                                    htmlFor="name"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Nombre *
                                </label>
                                <Input
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="ej: Marítimo"
                                    className={
                                        errors.name ? "border-red-500" : ""
                                    }
                                />
                                {errors.name && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            {/* Color */}
                            <div>
                                <label
                                    htmlFor="color"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Color *
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        id="color"
                                        name="color"
                                        value={formData.color}
                                        onChange={handleChange}
                                        className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                                    />
                                    <Input
                                        value={formData.color}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                color: e.target.value.toUpperCase(),
                                            }))
                                        }
                                        placeholder="#3B82F6"
                                        className={`flex-1 font-mono ${
                                            errors.color ? "border-red-500" : ""
                                        }`}
                                    />
                                </div>
                                {errors.color && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.color}
                                    </p>
                                )}
                                <p className="text-gray-500 text-xs mt-1">
                                    Formato hexadecimal (#RRGGBB)
                                </p>
                            </div>

                            {/* Orden de Visualización */}
                            <div>
                                <label
                                    htmlFor="display_order"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Orden de Visualización
                                </label>
                                <Input
                                    id="display_order"
                                    name="display_order"
                                    type="number"
                                    min="0"
                                    value={formData.display_order}
                                    onChange={handleChange}
                                    placeholder="0"
                                    className={
                                        errors.display_order
                                            ? "border-red-500"
                                            : ""
                                    }
                                />
                                {errors.display_order && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.display_order}
                                    </p>
                                )}
                                <p className="text-gray-500 text-xs mt-1">
                                    Menor número = mayor prioridad
                                </p>
                            </div>
                        </div>

                        {/* Descripción */}
                        <div>
                            <label
                                htmlFor="description"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Descripción
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="3"
                                placeholder="Descripción opcional de la categoría"
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.description
                                        ? "border-red-500"
                                        : "border-gray-300"
                                }`}
                            />
                            {errors.description && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.description}
                                </p>
                            )}
                        </div>

                        {/* Estado Activo */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                name="is_active"
                                checked={formData.is_active}
                                onChange={handleChange}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label
                                htmlFor="is_active"
                                className="text-sm font-medium text-gray-700"
                            >
                                Categoría activa
                            </label>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    navigate("/catalogs/cost-categories")
                                }
                            >
                                <X className="w-4 h-4 mr-2" />
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    createMutation.isPending ||
                                    updateMutation.isPending
                                }
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {createMutation.isPending ||
                                updateMutation.isPending
                                    ? "Guardando..."
                                    : isEditMode
                                    ? "Actualizar"
                                    : "Crear"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Preview del Color */}
            <Card>
                <CardHeader>
                    <CardTitle>Vista Previa</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div
                            className="w-24 h-24 rounded-lg border-2 border-gray-300 shadow-md"
                            style={{ backgroundColor: formData.color }}
                        />
                        <div>
                            <p className="text-sm text-gray-600 mb-1">
                                Esta categoría se mostrará con este color
                            </p>
                            <div className="flex items-center gap-2">
                                <div
                                    className="px-3 py-1 rounded-full text-sm font-medium text-white"
                                    style={{ backgroundColor: formData.color }}
                                >
                                    {formData.name || "Nombre de Categoría"}
                                </div>
                                <span className="font-mono text-xs text-gray-500">
                                    {formData.color}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
