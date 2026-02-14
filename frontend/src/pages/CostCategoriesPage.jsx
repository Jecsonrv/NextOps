/**
 * Página de gestión de Categorías de Tipos de Costo
 * Permite crear, editar, eliminar y visualizar categorías de costo
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Plus, Edit, Trash2, Power } from "lucide-react";
import toast from "react-hot-toast";
import {
    useCostCategories,
    useDeleteCostCategory,
    useToggleCostCategoryActive,
} from "../hooks/useCatalogs";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { StatCard } from "../components/common/StatCard";
import { Input } from "../components/ui/Input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/Select";

export function CostCategoriesPage() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterActive, setFilterActive] = useState("all");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const { data: categoriesData, isLoading } = useCostCategories({
        search: searchTerm,
        is_active:
            filterActive === "all" ? undefined : filterActive === "active",
        page,
        page_size: pageSize,
    });

    const deleteMutation = useDeleteCostCategory();
    const toggleActiveMutation = useToggleCostCategoryActive();

    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const categories = categoriesData?.results || [];
    const totalCount = categoriesData?.count || 0;

    const activeCount = categories.filter((c) => c.is_active).length;
    const inactiveCount = categories.filter((c) => !c.is_active).length;

    const handleDelete = async (id) => {
        if (deleteConfirm === id) {
            const toastId = toast.loading("Eliminando categoría...");
            try {
                await deleteMutation.mutateAsync(id);
                toast.success("Categoría eliminada exitosamente", {
                    id: toastId,
                });
                setDeleteConfirm(null);
            } catch (error) {
                console.error("Error eliminando categoría:", error);
                const errorMsg =
                    error.response?.data?.error ||
                    "Error al eliminar la categoría";
                toast.error(errorMsg, { id: toastId });
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
            toast.error("Error al cambiar el estado de la categoría", {
                id: toastId,
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Actions */}
            <div className="flex items-center justify-end">
                <Button
                    onClick={() => navigate("/catalogs/cost-categories/create")}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Categoría
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                <StatCard
                    label="Total Categorías"
                    value={totalCount}
                    icon={Tag}
                />
                <StatCard
                    label="Activas"
                    value={activeCount}
                    icon={Tag}
                />
                <StatCard
                    label="Inactivas"
                    value={inactiveCount}
                    icon={Tag}
                />
            </div>

            {/* Filtros */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Buscar por código o nombre..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={
                                    filterActive === "all"
                                        ? "default"
                                        : "outline"
                                }
                                onClick={() => setFilterActive("all")}
                            >
                                Todas
                            </Button>
                            <Button
                                variant={
                                    filterActive === "active"
                                        ? "default"
                                        : "outline"
                                }
                                onClick={() => setFilterActive("active")}
                            >
                                Activas
                            </Button>
                            <Button
                                variant={
                                    filterActive === "inactive"
                                        ? "default"
                                        : "outline"
                                }
                                onClick={() => setFilterActive("inactive")}
                            >
                                Inactivas
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabla de Categorías */}
            <Card>
                <CardHeader>
                    <CardTitle>Listado de Categorías</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="mt-2 text-muted-foreground">
                                Cargando categorías...
                            </p>
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="text-center py-12">
                            <Tag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                                No hay categorías disponibles
                            </p>
                            <Button
                                onClick={() =>
                                    navigate("/catalogs/cost-categories/create")
                                }
                                className="mt-4"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Crear Primera Categoría
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-3 px-4 font-semibold text-foreground">
                                            Código
                                        </th>
                                        <th className="text-left py-3 px-4 font-semibold text-foreground">
                                            Nombre
                                        </th>
                                        <th className="text-left py-3 px-4 font-semibold text-foreground">
                                            Color
                                        </th>
                                        <th className="text-left py-3 px-4 font-semibold text-foreground">
                                            Descripción
                                        </th>
                                        <th className="text-left py-3 px-4 font-semibold text-foreground">
                                            Orden
                                        </th>
                                        <th className="text-left py-3 px-4 font-semibold text-foreground">
                                            Estado
                                        </th>
                                        <th className="text-right py-3 px-4 font-semibold text-foreground">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map((category) => (
                                        <tr
                                            key={category.id}
                                            className="border-b border-border hover:bg-muted transition-colors"
                                        >
                                            <td className="py-3 px-4">
                                                <span className="font-mono text-sm">
                                                    {category.code}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-medium">
                                                {category.name}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-6 h-6 rounded border border-border"
                                                        style={{
                                                            backgroundColor:
                                                                category.color,
                                                        }}
                                                        title={category.color}
                                                    />
                                                    <span className="font-mono text-xs text-muted-foreground">
                                                        {category.color}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs truncate">
                                                {category.description || "-"}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {category.display_order}
                                            </td>
                                            <td className="py-3 px-4">
                                                {category.is_active ? (
                                                    <Badge variant="green">
                                                        Activa
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="gray">
                                                        Inactiva
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            navigate(
                                                                `/catalogs/cost-categories/${category.id}/edit`,
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
                                                                category.id,
                                                            )
                                                        }
                                                        disabled={
                                                            toggleActiveMutation.isPending
                                                        }
                                                        title={
                                                            category.is_active
                                                                ? "Desactivar"
                                                                : "Activar"
                                                        }
                                                    >
                                                        <Power
                                                            className={`w-4 h-4 ${
                                                                category.is_active
                                                                    ? "text-emerald-600"
                                                                    : "text-muted-foreground"
                                                            }`}
                                                        />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            handleDelete(
                                                                category.id,
                                                            )
                                                        }
                                                        disabled={
                                                            deleteMutation.isPending
                                                        }
                                                        title={
                                                            deleteConfirm ===
                                                            category.id
                                                                ? "¿Confirmar eliminación?"
                                                                : "Eliminar"
                                                        }
                                                        className={
                                                            deleteConfirm ===
                                                            category.id
                                                                ? "border-red-500 bg-destructive/10"
                                                                : ""
                                                        }
                                                    >
                                                        <Trash2
                                                            className={`w-4 h-4 ${
                                                                deleteConfirm ===
                                                                category.id
                                                                    ? "text-destructive"
                                                                    : "text-muted-foreground"
                                                            }`}
                                                        />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex items-center justify-between py-4">
                    <div className="text-sm text-muted-foreground">
                        Mostrando {categories.length} de {totalCount}{" "}
                        categorías.
                    </div>
                    <div className="flex items-center gap-4">
                        <Select
                            value={pageSize.toString()}
                            onValueChange={(value) =>
                                setPageSize(parseInt(value, 10))
                            }
                        >
                            <SelectTrigger className="w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="20">20 / página</SelectItem>
                                <SelectItem value="50">50 / página</SelectItem>
                                <SelectItem value="100">
                                    100 / página
                                </SelectItem>
                            </SelectContent>
                        </Select>
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
                                disabled={page * pageSize >= totalCount}
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
