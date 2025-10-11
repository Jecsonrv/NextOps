/**
 * Formulario para crear/editar tipos de costo
 * Soporta validación completa y manejo de errores
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2, DollarSign } from "lucide-react";
import toast from "react-hot-toast";
import {
    useCostType,
    useActiveCostCategories,
    useCreateCostType,
    useUpdateCostType,
} from "../hooks/useCatalogs";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";

export function CostTypeFormPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = Boolean(id);

    // Queries
    const { data: costType, isLoading: loadingCostType } = useCostType(id);
    const { data: categories, isLoading: loadingCategories } =
        useActiveCostCategories();

    const createMutation = useCreateCostType();
    const updateMutation = useUpdateCostType();

    // Form state
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        description: "",
        category: "",
        is_active: true,
        display_order: 0,
    });

    const [errors, setErrors] = useState({});

    // Load cost type data when editing
    useEffect(() => {
        if (costType) {
            setFormData({
                code: costType.code || "",
                name: costType.name || "",
                description: costType.description || "",
                category: costType.category || "",
                is_active: costType.is_active !== false,
                display_order: costType.display_order || 0,
            });
        }
    }, [costType]);

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        // Clear error for this field
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.code.trim()) {
            newErrors.code = "El código es obligatorio";
        } else if (!/^[A-Z0-9_]+$/.test(formData.code.toUpperCase())) {
            newErrors.code =
                "El código solo puede contener letras mayúsculas, números y guiones bajos";
        }

        if (!formData.name.trim()) {
            newErrors.name = "El nombre es obligatorio";
        }

        if (!formData.category) {
            newErrors.category = "La categoría es obligatoria";
        }

        if (formData.display_order < 0) {
            newErrors.display_order =
                "El orden debe ser un número positivo o cero";
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
            isEditing
                ? "Actualizando tipo de costo..."
                : "Creando tipo de costo..."
        );

        try {
            if (isEditing) {
                await updateMutation.mutateAsync({
                    id,
                    data: formData,
                });
                toast.success("Tipo de costo actualizado exitosamente", {
                    id: toastId,
                });
            } else {
                await createMutation.mutateAsync(formData);
                toast.success("Tipo de costo creado exitosamente", {
                    id: toastId,
                });
            }
            navigate("/catalogs/cost-types");
        } catch (error) {
            console.error("Error guardando tipo de costo:", error);

            // Handle API validation errors
            if (error.response?.data) {
                const apiErrors = {};
                Object.keys(error.response.data).forEach((key) => {
                    const messages = error.response.data[key];
                    apiErrors[key] = Array.isArray(messages)
                        ? messages[0]
                        : messages;
                });
                setErrors(apiErrors);
                toast.error(
                    "Hay errores en el formulario. Revisa los campos marcados",
                    { id: toastId }
                );
            } else {
                toast.error("Error al guardar el tipo de costo", {
                    id: toastId,
                });
            }
        }
    };

    if (loadingCostType) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/catalogs/cost-types")}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <DollarSign className="w-8 h-8 text-green-600" />
                            {isEditing
                                ? "Editar Tipo de Costo"
                                : "Nuevo Tipo de Costo"}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {isEditing
                                ? "Actualiza la información del tipo de costo"
                                : "Completa el formulario para crear un nuevo tipo de costo"}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Información Básica */}
                <Card>
                    <CardHeader>
                        <CardTitle>Información Básica</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Código */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Código *
                            </label>
                            <Input
                                value={formData.code}
                                onChange={(e) =>
                                    handleChange(
                                        "code",
                                        e.target.value.toUpperCase()
                                    )
                                }
                                placeholder="Ej: FLETE, TRANSPORTE"
                                disabled={isEditing}
                                error={errors.code}
                                className="uppercase"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Código único en mayúsculas, solo letras, números
                                y guiones bajos
                                {isEditing &&
                                    " (no se puede editar una vez creado)"}
                            </p>
                        </div>

                        {/* Nombre */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre *
                            </label>
                            <Input
                                value={formData.name}
                                onChange={(e) =>
                                    handleChange("name", e.target.value)
                                }
                                placeholder="Ej: Flete, Transporte"
                                error={errors.name}
                            />
                        </div>

                        {/* Descripción */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descripción
                            </label>
                            <textarea
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                    errors.description
                                        ? "border-red-500"
                                        : "border-gray-300"
                                }`}
                                rows={3}
                                value={formData.description}
                                onChange={(e) =>
                                    handleChange("description", e.target.value)
                                }
                                placeholder="Descripción detallada del tipo de costo"
                            />
                            {errors.description && (
                                <p className="text-sm text-red-600 mt-1">
                                    {errors.description}
                                </p>
                            )}
                        </div>

                        {/* Categoría */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Categoría *
                            </label>
                            <select
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                    errors.category
                                        ? "border-red-500"
                                        : "border-gray-300"
                                }`}
                                value={formData.category}
                                onChange={(e) =>
                                    handleChange(
                                        "category",
                                        parseInt(e.target.value) || ""
                                    )
                                }
                            >
                                <option value="">Seleccionar categoría</option>
                                {categories?.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                            {errors.category && (
                                <p className="text-sm text-red-600 mt-1">
                                    {errors.category}
                                </p>
                            )}
                            {formData.category && categories && (
                                <div className="mt-2 flex items-center gap-2">
                                    <div
                                        className="w-4 h-4 rounded border border-gray-300"
                                        style={{
                                            backgroundColor: categories.find(
                                                (c) =>
                                                    c.id === formData.category
                                            )?.color,
                                        }}
                                    />
                                    <span className="text-xs text-gray-600">
                                        {
                                            categories.find(
                                                (c) =>
                                                    c.id === formData.category
                                            )?.name
                                        }
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Orden de visualización */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Orden de Visualización
                            </label>
                            <Input
                                type="number"
                                min="0"
                                value={formData.display_order}
                                onChange={(e) =>
                                    handleChange(
                                        "display_order",
                                        parseInt(e.target.value) || 0
                                    )
                                }
                                error={errors.display_order}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Número que determina el orden de aparición
                                (menor número aparece primero)
                            </p>
                        </div>

                        {/* Estado */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) =>
                                    handleChange("is_active", e.target.checked)
                                }
                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <label
                                htmlFor="is_active"
                                className="text-sm font-medium text-gray-700"
                            >
                                Tipo de costo activo
                            </label>
                        </div>
                    </CardContent>
                </Card>

                {/* Botones de acción */}
                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/catalogs/cost-types")}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={
                            createMutation.isPending || updateMutation.isPending
                        }
                    >
                        {createMutation.isPending ||
                        updateMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                {isEditing ? "Actualizar" : "Crear"}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
