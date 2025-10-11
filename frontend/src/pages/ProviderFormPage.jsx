/**
 * Formulario para crear/editar proveedores
 * Soporta validación completa y manejo de errores
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Building2 } from "lucide-react";
import {
    useProvider,
    useProviderTypes,
    useProviderCategories,
    useCreateProvider,
    useUpdateProvider,
} from "../hooks/useCatalogs";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";

export function ProviderFormPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = Boolean(id);

    // Queries
    const { data: provider, isLoading: loadingProvider } = useProvider(id, {
        enabled: isEditing,
    });
    const { data: types } = useProviderTypes();
    const { data: categories } = useProviderCategories();

    const createMutation = useCreateProvider();
    const updateMutation = useUpdateProvider();

    // Form state
    const [formData, setFormData] = useState({
        nombre: "",
        nit: "",
        tipo: "naviera",
        categoria: "internacional",
        contacto: "",
        telefono: "",
        email: "",
        direccion: "",
        notas: "",
        is_active: true,
        tiene_credito: false,
        dias_credito: 0,
        payment_terms: "",
        notas_credito: "",
    });

    const [errors, setErrors] = useState({});

    // Load provider data when editing
    useEffect(() => {
        if (provider) {
            setFormData({
                nombre: provider.nombre || "",
                nit: provider.nit || "",
                tipo: provider.tipo || "naviera",
                categoria: provider.categoria || "internacional",
                contacto: provider.contacto || "",
                telefono: provider.telefono || "",
                email: provider.email || "",
                direccion: provider.direccion || "",
                notas: provider.notas || "",
                is_active: provider.is_active !== false,
                tiene_credito: provider.tiene_credito || false,
                dias_credito: provider.dias_credito || 0,
                payment_terms: provider.payment_terms || "",
                notas_credito: provider.notas_credito || "",
            });
        }
    }, [provider]);

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        // Clear error for this field
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.nombre.trim()) {
            newErrors.nombre = "El nombre es obligatorio";
        }

        if (!formData.tipo) {
            newErrors.tipo = "El tipo es obligatorio";
        }

        if (!formData.categoria) {
            newErrors.categoria = "La categoría es obligatoria";
        }

        if (
            formData.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
        ) {
            newErrors.email = "Email inválido";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
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
                alert("Proveedor actualizado exitosamente");
            } else {
                await createMutation.mutateAsync(formData);
                alert("Proveedor creado exitosamente");
            }
            navigate("/catalogs/providers");
        } catch (error) {
            console.error("Error guardando proveedor:", error);

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
            } else {
                alert("Error al guardar el proveedor");
            }
        }
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;

    if (isEditing && loadingProvider) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                    <p className="mt-2 text-gray-600">Cargando proveedor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/catalogs/providers")}
                >
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {isEditing ? "Editar Proveedor" : "Nuevo Proveedor"}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {isEditing
                            ? "Modifica los datos del proveedor"
                            : "Completa la información del nuevo proveedor"}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Información Básica */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            Información Básica
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre del Proveedor *
                                </label>
                                <Input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={(e) =>
                                        handleChange("nombre", e.target.value)
                                    }
                                    placeholder="Ej: Maersk Line"
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
                                    NIT
                                </label>
                                <Input
                                    type="text"
                                    value={formData.nit}
                                    onChange={(e) =>
                                        handleChange("nit", e.target.value)
                                    }
                                    placeholder="123456789-0"
                                    className={
                                        errors.nit ? "border-red-500" : ""
                                    }
                                />
                                {errors.nit && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.nit}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo *
                                </label>
                                <select
                                    value={formData.tipo}
                                    onChange={(e) =>
                                        handleChange("tipo", e.target.value)
                                    }
                                    className={`w-full px-3 py-2 border rounded-md ${
                                        errors.tipo
                                            ? "border-red-500"
                                            : "border-gray-300"
                                    }`}
                                >
                                    {types?.map((t) => (
                                        <option key={t.value} value={t.value}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.tipo && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.tipo}
                                    </p>
                                )}
                            </div>

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
                                {errors.categoria && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.categoria}
                                    </p>
                                )}
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
                                        Proveedor Activo
                                    </span>
                                </label>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Información de Contacto */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Información de Contacto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Persona de Contacto
                                </label>
                                <Input
                                    type="text"
                                    value={formData.contacto}
                                    onChange={(e) =>
                                        handleChange("contacto", e.target.value)
                                    }
                                    placeholder="Nombre del contacto"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Teléfono
                                </label>
                                <Input
                                    type="text"
                                    value={formData.telefono}
                                    onChange={(e) =>
                                        handleChange("telefono", e.target.value)
                                    }
                                    placeholder="+57 300 123 4567"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) =>
                                        handleChange("email", e.target.value)
                                    }
                                    placeholder="contacto@proveedor.com"
                                    className={
                                        errors.email ? "border-red-500" : ""
                                    }
                                />
                                {errors.email && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Dirección
                                </label>
                                <Input
                                    type="text"
                                    value={formData.direccion}
                                    onChange={(e) =>
                                        handleChange(
                                            "direccion",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Dirección física del proveedor"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Términos de Crédito */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Términos de Crédito</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3 mb-4">
                            <input
                                type="checkbox"
                                id="tiene_credito"
                                checked={formData.tiene_credito}
                                onChange={(e) =>
                                    handleChange(
                                        "tiene_credito",
                                        e.target.checked
                                    )
                                }
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label
                                htmlFor="tiene_credito"
                                className="text-sm font-medium text-gray-700 cursor-pointer"
                            >
                                Este proveedor maneja crédito
                            </label>
                        </div>

                        {formData.tiene_credito && (
                            <div className="space-y-4 pl-7 border-l-2 border-blue-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Días de Crédito
                                        </label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={formData.dias_credito}
                                            onChange={(e) =>
                                                handleChange(
                                                    "dias_credito",
                                                    parseInt(e.target.value) ||
                                                        0
                                                )
                                            }
                                            placeholder="30"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Número de días para pago a crédito
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Condiciones de Pago
                                    </label>
                                    <textarea
                                        value={formData.payment_terms}
                                        onChange={(e) =>
                                            handleChange(
                                                "payment_terms",
                                                e.target.value
                                            )
                                        }
                                        placeholder="Ej: 30% adelanto, 70% contra entrega. Penalidad por mora: 2% mensual..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Notas de Crédito
                                    </label>
                                    <textarea
                                        value={formData.notas_credito}
                                        onChange={(e) =>
                                            handleChange(
                                                "notas_credito",
                                                e.target.value
                                            )
                                        }
                                        placeholder="Información adicional sobre términos de crédito..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Notas Adicionales */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Notas Adicionales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <textarea
                            value={formData.notas}
                            onChange={(e) =>
                                handleChange("notas", e.target.value)
                            }
                            placeholder="Información adicional sobre el proveedor..."
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </CardContent>
                </Card>

                {/* Botones de Acción */}
                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/catalogs/providers")}
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
                                {isEditing ? "Actualizar" : "Crear"} Proveedor
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
