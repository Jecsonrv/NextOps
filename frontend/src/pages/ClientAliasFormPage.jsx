/**
 * Formulario para crear/editar alias de clientes
 * Incluye validación y sugerencias de similares
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Users, AlertTriangle } from "lucide-react";
import {
    useClientAlias,
    useFindSimilarAliases,
    useCreateAlias,
    useUpdateAlias,
} from "../hooks/useCatalogs";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

export function ClientAliasFormPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = Boolean(id);

    // Queries
    const { data: alias, isLoading: loadingAlias } = useClientAlias(id, {
        enabled: isEditing,
    });

    const createMutation = useCreateAlias();
    const updateMutation = useUpdateAlias();
    const findSimilarMutation = useFindSimilarAliases();

    // Form state
    const [formData, setFormData] = useState({
        alias_name: "",
        official_client_name: "",
        is_verified: false,
    });

    const [errors, setErrors] = useState({});
    const [similarAliases, setSimilarAliases] = useState([]);
    const [checkingSimilar, setCheckingSimilar] = useState(false);

    // Load alias data when editing
    useEffect(() => {
        if (alias) {
            setFormData({
                alias_name: alias.alias_name || "",
                official_client_name: alias.official_client_name || "",
                is_verified: alias.is_verified || false,
            });
        }
    }, [alias]);

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }

        // Check for similar aliases when alias_name changes
        if (field === "alias_name" && value.length > 2) {
            checkSimilarAliases(value);
        }
    };

    const checkSimilarAliases = async (aliasName) => {
        setCheckingSimilar(true);
        try {
            const similar = await findSimilarMutation.mutateAsync(aliasName);
            setSimilarAliases(similar || []);
        } catch (error) {
            console.error("Error checking similar aliases:", error);
        } finally {
            setCheckingSimilar(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.alias_name.trim()) {
            newErrors.alias_name = "El alias es obligatorio";
        }

        if (!formData.official_client_name.trim()) {
            newErrors.official_client_name =
                "El cliente oficial es obligatorio";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        // Warn if similar aliases exist
        if (similarAliases.length > 0 && !isEditing) {
            const confirm = window.confirm(
                `Se encontraron ${
                    similarAliases.length
                } alias similares:\n\n${similarAliases
                    .slice(0, 3)
                    .map((s) => `- ${s.similar_alias} (${s.similarity_score}%)`)
                    .join("\n")}\n\n¿Deseas continuar de todas formas?`
            );
            if (!confirm) return;
        }

        try {
            if (isEditing) {
                await updateMutation.mutateAsync({
                    id,
                    data: formData,
                });
                alert("Alias actualizado exitosamente");
            } else {
                await createMutation.mutateAsync(formData);
                alert("Alias creado exitosamente");
            }
            navigate("/catalogs/aliases");
        } catch (error) {
            console.error("Error guardando alias:", error);

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
                alert("Error al guardar el alias");
            }
        }
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;

    if (isEditing && loadingAlias) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                    <p className="mt-2 text-gray-600">Cargando alias...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/catalogs/aliases")}
                >
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {isEditing ? "Editar Alias" : "Nuevo Alias"}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {isEditing
                            ? "Modifica el alias de cliente"
                            : "Registra un nuevo alias para normalizar nombres de clientes"}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Información del Alias */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Información del Alias
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Alias del Cliente *
                            </label>
                            <Input
                                type="text"
                                value={formData.alias_name}
                                onChange={(e) =>
                                    handleChange("alias_name", e.target.value)
                                }
                                placeholder="Ej: COCA-COLA, Cocacola S.A., The Coca Cola Company"
                                className={
                                    errors.alias_name ? "border-red-500" : ""
                                }
                            />
                            {errors.alias_name && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.alias_name}
                                </p>
                            )}
                            {checkingSimilar && (
                                <p className="text-gray-500 text-sm mt-1">
                                    Buscando alias similares...
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cliente Oficial *
                            </label>
                            <Input
                                type="text"
                                value={formData.official_client_name}
                                onChange={(e) =>
                                    handleChange(
                                        "official_client_name",
                                        e.target.value
                                    )
                                }
                                placeholder="Ej: The Coca-Cola Company"
                                className={
                                    errors.official_client_name
                                        ? "border-red-500"
                                        : ""
                                }
                            />
                            {errors.official_client_name && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.official_client_name}
                                </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                Nombre normalizado que se usará en el sistema
                            </p>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_verified}
                                    onChange={(e) =>
                                        handleChange(
                                            "is_verified",
                                            e.target.checked
                                        )
                                    }
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Alias Verificado Manualmente
                                </span>
                            </label>
                            <p className="text-xs text-gray-500 mt-1 ml-6">
                                Marca como verificado si has confirmado que este
                                alias es correcto
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Similar Aliases Warning */}
                {similarAliases.length > 0 && !isEditing && (
                    <Card className="mb-6 border-yellow-500">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-yellow-700">
                                <AlertTriangle className="w-5 h-5" />
                                Alias Similares Encontrados
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-700 mb-3">
                                Se encontraron {similarAliases.length} alias que
                                podrían ser duplicados. Revisa antes de crear:
                            </p>
                            <div className="space-y-2">
                                {similarAliases
                                    .slice(0, 5)
                                    .map((similar, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {similar.similar_alias}
                                                </p>
                                                <p className="text-xs text-gray-600">
                                                    Cliente:{" "}
                                                    {similar.official_name ||
                                                        "N/A"}
                                                </p>
                                            </div>
                                            <Badge variant="warning">
                                                {similar.similarity_score}%
                                                similar
                                            </Badge>
                                        </div>
                                    ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Botones de Acción */}
                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/catalogs/aliases")}
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
                                {isEditing ? "Actualizar" : "Crear"} Alias
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
