/**
 * Página de gestión de Campos Objetivo
 * Permite crear y administrar campos que se pueden extraer de facturas
 */

import { useState } from "react";
import {
    Plus,
    Search,
    Filter,
    Edit,
    Trash2,
    CheckCircle,
    Target,
    Code,
    FileText,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/api";

const API_URL = "/patterns/target-fields/";

const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export default function TargetFieldsPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        data_type: "",
        is_active: "",
    });
    const [formOpen, setFormOpen] = useState(false);
    const [editingField, setEditingField] = useState(null);

    // Query para obtener campos
    const {
        data: fieldsData,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["target-fields", filters, searchTerm],
        queryFn: async () => {
            let url = API_URL;
            const params = [];

            if (filters.data_type)
                params.push(`data_type=${filters.data_type}`);
            if (filters.is_active)
                params.push(`is_active=${filters.is_active}`);
            if (searchTerm) params.push(`search=${searchTerm}`);

            if (params.length > 0) {
                url += `?${params.join("&")}`;
            }

            const response = await apiClient.get(url, getAuthHeaders());
            return response.data.results || [];
        },
    });

    // Mutation para eliminar
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`${API_URL}${id}/`, getAuthHeaders());
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["target-fields"]);
        },
    });

    const fields = fieldsData || [];
    const activeFields = fields.filter((f) => f.is_active);

    const handleDelete = async (field) => {
        if (window.confirm(`¿Eliminar el campo "${field.name}"?`)) {
            deleteMutation.mutate(field.id);
        }
    };

    const handleEdit = (field) => {
        setEditingField(field);
        setFormOpen(true);
    };

    const handleCreate = () => {
        setEditingField(null);
        setFormOpen(true);
    };

    const clearFilters = () => {
        setFilters({
            data_type: "",
            is_active: "",
        });
        setSearchTerm("");
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">
                    Campos Objetivo
                </h1>
                <p className="text-gray-600 mt-1">
                    Gestiona los campos que se pueden extraer de facturas
                </p>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, código o descripción..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2"
                >
                    <Filter className="w-4 h-4" />
                    Filtros
                </Button>
                <Button
                    onClick={handleCreate}
                    className="flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Campo
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total</p>
                                <p className="text-2xl font-bold">
                                    {fields.length}
                                </p>
                            </div>
                            <Target className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Activos</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {activeFields.length}
                                </p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">
                                    Inactivos
                                </p>
                                <p className="text-2xl font-bold text-gray-600">
                                    {fields.length - activeFields.length}
                                </p>
                            </div>
                            <FileText className="w-8 h-8 text-gray-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tipo de Dato
                                </label>
                                <select
                                    value={filters.data_type}
                                    onChange={(e) =>
                                        setFilters({
                                            ...filters,
                                            data_type: e.target.value,
                                        })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Todos</option>
                                    <option value="text">Texto</option>
                                    <option value="number">Número</option>
                                    <option value="decimal">Decimal</option>
                                    <option value="date">Fecha</option>
                                    <option value="boolean">Booleano</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Estado
                                </label>
                                <select
                                    value={filters.is_active}
                                    onChange={(e) =>
                                        setFilters({
                                            ...filters,
                                            is_active: e.target.value,
                                        })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Todos</option>
                                    <option value="true">Activos</option>
                                    <option value="false">Inactivos</option>
                                </select>
                            </div>

                            <div className="flex items-end">
                                <Button
                                    variant="outline"
                                    onClick={clearFilters}
                                    className="w-full"
                                >
                                    Limpiar Filtros
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    <div className="col-span-full text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-2 text-gray-600">Cargando campos...</p>
                    </div>
                ) : fields.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <Target className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                            No hay campos objetivo
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Comienza creando un nuevo campo
                        </p>
                        <div className="mt-6">
                            <Button onClick={handleCreate}>
                                <Plus className="w-4 h-4 mr-2" />
                                Nuevo Campo
                            </Button>
                        </div>
                    </div>
                ) : (
                    fields.map((field) => (
                        <Card
                            key={field.id}
                            className="hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-blue-300"
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <CardTitle className="text-base font-semibold text-gray-900 truncate">
                                                {field.name}
                                            </CardTitle>
                                            {field.is_active ? (
                                                <span
                                                    className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full"
                                                    title="Activo"
                                                ></span>
                                            ) : (
                                                <span
                                                    className="flex-shrink-0 w-2 h-2 bg-gray-300 rounded-full"
                                                    title="Inactivo"
                                                ></span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Code className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                            <span className="text-xs text-gray-500 font-mono truncate">
                                                {field.code}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <Badge className="bg-blue-50 text-blue-700 border-0 text-xs">
                                            {field.data_type_display}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                                    {field.description || "Sin descripción"}
                                </p>

                                {field.example_value && (
                                    <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
                                        <span className="text-gray-500">
                                            Ejemplo:{" "}
                                        </span>
                                        <span className="font-mono text-gray-900">
                                            {field.example_value}
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <span className="font-medium">
                                            Prioridad:
                                        </span>
                                        <span className="font-semibold text-gray-700">
                                            {field.priority}
                                        </span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleEdit(field)}
                                            className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                                            title="Editar"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(field)}
                                            className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Form Modal (implementar después) */}
            {formOpen && (
                <TargetFieldForm
                    field={editingField}
                    onClose={() => {
                        setFormOpen(false);
                        setEditingField(null);
                    }}
                    onSuccess={() => {
                        queryClient.invalidateQueries(["target-fields"]);
                        setFormOpen(false);
                        setEditingField(null);
                    }}
                />
            )}
        </div>
    );
}

// Componente de formulario simplificado
function TargetFieldForm({ field, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        code: field?.code || "",
        name: field?.name || "",
        description: field?.description || "",
        data_type: field?.data_type || "text",
        priority: field?.priority || 0,
        is_active: field?.is_active !== undefined ? field.is_active : true,
        example_value: field?.example_value || "",
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        try {
            if (field) {
                await apiClient.put(
                    `${API_URL}${field.id}/`,
                    formData,
                    getAuthHeaders()
                );
            } else {
                await apiClient.post(API_URL, formData, getAuthHeaders());
            }
            onSuccess();
        } catch (error) {
            if (error.response?.data) {
                setErrors(error.response.data);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Target className="w-6 h-6 text-blue-600" />
                            <h2 className="text-xl font-semibold">
                                {field ? "Editar Campo" : "Nuevo Campo"}
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <Plus className="w-6 h-6 rotate-45" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Código *
                                </label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            code: e.target.value,
                                        })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                    placeholder="invoice_number"
                                    required
                                />
                                {errors.code && (
                                    <p className="text-red-600 text-sm mt-1">
                                        {errors.code}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            name: e.target.value,
                                        })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Número de Factura"
                                    required
                                />
                                {errors.name && (
                                    <p className="text-red-600 text-sm mt-1">
                                        {errors.name}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descripción
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        description: e.target.value,
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows="3"
                                placeholder="Descripción del campo..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo de Dato
                                </label>
                                <select
                                    value={formData.data_type}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            data_type: e.target.value,
                                        })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="text">Texto</option>
                                    <option value="number">Número</option>
                                    <option value="decimal">Decimal</option>
                                    <option value="date">Fecha</option>
                                    <option value="boolean">Booleano</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Prioridad
                                </label>
                                <input
                                    type="number"
                                    value={formData.priority}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            priority: parseInt(e.target.value),
                                        })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    min="0"
                                    max="100"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ejemplo
                            </label>
                            <input
                                type="text"
                                value={formData.example_value}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        example_value: e.target.value,
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="INV-2024-00123"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        is_active: e.target.checked,
                                    })
                                }
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label
                                htmlFor="is_active"
                                className="text-sm text-gray-700"
                            >
                                Campo activo
                            </label>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading
                                ? "Guardando..."
                                : field
                                ? "Actualizar"
                                : "Crear"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
