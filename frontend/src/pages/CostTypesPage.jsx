/**
 * Página de gestión de Tipos de Costo
 * Permite crear, editar, eliminar y visualizar tipos de costo
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, Plus, Edit, Trash2, Power } from "lucide-react";
import toast from "react-hot-toast";
import {
    useCostTypes,
    useDeleteCostType,
    useToggleCostTypeActive,
} from "../hooks/useCatalogs";
import {
        Card, CardContent, CardFooter, CardHeader, CardTitle,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

export function CostTypesPage() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const { data: costTypes, isLoading } = useCostTypes({ page, page_size: pageSize });
    const deleteMutation = useDeleteCostType();
    const toggleActiveMutation = useToggleCostTypeActive();

    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const handleDelete = async (id) => {
        if (deleteConfirm === id) {
            const toastId = toast.loading("Eliminando tipo de costo...");
            try {
                await deleteMutation.mutateAsync(id);
                toast.success("Tipo de costo eliminado exitosamente", {
                    id: toastId,
                });
                setDeleteConfirm(null);
            } catch (error) {
                console.error("Error eliminando tipo de costo:", error);
                toast.error("Error al eliminar el tipo de costo", {
                    id: toastId,
                });
            }
        } else {
            setDeleteConfirm(id);
            setTimeout(() => setDeleteConfirm(null), 3000);
        }
    };

    const handleToggleActive = async (id) => {
        const toastId = toast.loading("Actualizando estado...");
        try {
            await toggleActiveMutation.mutateAsync(id);
            toast.success("Estado actualizado exitosamente", { id: toastId });
        } catch (error) {
            console.error("Error cambiando estado:", error);
            toast.error("Error al cambiar el estado del tipo de costo", {
                id: toastId,
            });
        }
    };

    const getCategoryBadge = (categoryDetails) => {
        if (!categoryDetails) {
            return <Badge variant="gray">Sin categoría</Badge>;
        }

        // Usar el color de la categoría para el badge
        return (
            <div className="flex items-center gap-2">
                <div
                    className="w-3 h-3 rounded-full border border-gray-300"
                    style={{ backgroundColor: categoryDetails.color }}
                />
                <Badge variant="gray">{categoryDetails.name}</Badge>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Tipos de Costo
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Catálogo de tipos de costo para facturas y órdenes de
                        trabajo
                    </p>
                </div>
                <Button onClick={() => navigate("/catalogs/cost-types/create")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Tipo de Costo
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">
                                    Total Tipos
                                </p>
                                <p className="text-2xl font-bold">
                                    {costTypes?.count || 0}
                                </p>
                            </div>
                            <DollarSign className="w-8 h-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Activos</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {costTypes?.results?.filter(
                                        (t) => t.is_active
                                    ).length || 0}
                                </p>
                            </div>
                            <DollarSign className="w-8 h-8 text-green-500" />
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
                                    {costTypes?.results?.filter(
                                        (t) => !t.is_active
                                    ).length || 0}
                                </p>
                            </div>
                            <DollarSign className="w-8 h-8 text-gray-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabla de Tipos de Costo */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        Tipos de Costo Disponibles ({costTypes?.count || 0})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="mt-2 text-gray-600">
                                Cargando tipos de costo...
                            </p>
                        </div>
                    ) : costTypes?.results && costTypes.results.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Código
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Nombre
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Categoría
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Descripción
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Estado
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {costTypes.results.map((type) => (
                                        <tr
                                            key={type.id}
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                                    {type.code}
                                                </code>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {type.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getCategoryBadge(type.category_details)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-600 max-w-md truncate">
                                                    {type.description || "-"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {type.is_active ? (
                                                    <Badge variant="green">
                                                        Activo
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="gray">
                                                        Inactivo
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            navigate(
                                                                `/catalogs/cost-types/${type.id}/edit`
                                                            )
                                                        }
                                                        title="Editar"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            handleToggleActive(
                                                                type.id
                                                            )
                                                        }
                                                        disabled={
                                                            toggleActiveMutation.isPending
                                                        }
                                                        title={
                                                            type.is_active
                                                                ? "Desactivar"
                                                                : "Activar"
                                                        }
                                                    >
                                                        <Power
                                                            className={`w-4 h-4 ${
                                                                type.is_active
                                                                    ? "text-green-600"
                                                                    : "text-gray-400"
                                                            }`}
                                                        />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            handleDelete(
                                                                type.id
                                                            )
                                                        }
                                                        disabled={
                                                            deleteMutation.isPending
                                                        }
                                                        className={
                                                            deleteConfirm ===
                                                            type.id
                                                                ? "border-red-500 text-red-600"
                                                                : ""
                                                        }
                                                        title={
                                                            deleteConfirm ===
                                                            type.id
                                                                ? "Confirmar eliminación"
                                                                : "Eliminar"
                                                        }
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                                No hay tipos de costo definidos
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Comienza creando un nuevo tipo de costo
                            </p>
                            <div className="mt-6">
                                <Button
                                    onClick={() =>
                                        navigate("/catalogs/cost-types/create")
                                    }
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Nuevo Tipo de Costo
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex items-center justify-between py-4">
                    <div className="text-sm text-muted-foreground">
                        Mostrando {costTypes?.results?.length || 0} de {costTypes?.count || 0} tipos de costo.
                    </div>
                    <div className="flex items-center gap-4">
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                            className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="20">20 / página</option>
                            <option value="50">50 / página</option>
                            <option value="100">100 / página</option>
                        </select>
                        <div className="space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(page - 1)}
                                disabled={page === 1}
                            >
                                Anterior
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(page + 1)}
                                disabled={page * pageSize >= (costTypes?.count || 0)}
                            >
                                Siguiente
                            </Button>
                        </div>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
