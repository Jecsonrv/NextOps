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
        original_name: "",
        short_name: "",
        is_verified: false,
        // Campos tributarios - El Salvador
        tipo_contribuyente: "contribuyente_normal",
        nit: "",
        nrc: "",
        aplica_retencion_iva: false,
        aplica_retencion_renta: false,
        porcentaje_retencion_renta: "",
        acepta_credito_fiscal: true,
        // Información de contacto
        direccion_fiscal: "",
        telefono: "",
        email_facturacion: "",
        actividad_economica: "",
        notes: "",
    });

    const [errors, setErrors] = useState({});
    const [similarAliases, setSimilarAliases] = useState([]);
    const [checkingSimilar, setCheckingSimilar] = useState(false);

    // Load alias data when editing
    useEffect(() => {
        if (alias) {
            setFormData({
                original_name: alias.original_name || "",
                short_name: alias.short_name || "",
                is_verified: alias.is_verified || false,
                // Campos tributarios
                tipo_contribuyente: alias.tipo_contribuyente || "contribuyente_normal",
                nit: alias.nit || "",
                nrc: alias.nrc || "",
                aplica_retencion_iva: alias.aplica_retencion_iva || false,
                aplica_retencion_renta: alias.aplica_retencion_renta || false,
                porcentaje_retencion_renta: alias.porcentaje_retencion_renta || "",
                acepta_credito_fiscal: alias.acepta_credito_fiscal !== undefined
                    ? alias.acepta_credito_fiscal
                    : true,
                // Información de contacto
                direccion_fiscal: alias.direccion_fiscal || "",
                telefono: alias.telefono || "",
                email_facturacion: alias.email_facturacion || "",
                actividad_economica: alias.actividad_economica || "",
                notes: alias.notes || "",
            });
        }
    }, [alias]);

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }

        // Check for similar aliases when original_name changes
        if (field === "original_name" && value.length > 2) {
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

        if (!formData.original_name.trim()) {
            newErrors.original_name = "El nombre del cliente es obligatorio";
        }

        // Validar NIT si se proporciona (formato El Salvador: 9999-999999-999-9)
        if (formData.nit && formData.nit.trim()) {
            const nitPattern = /^\d{4}-\d{6}-\d{3}-\d$/;
            if (!nitPattern.test(formData.nit.trim())) {
                newErrors.nit = "Formato de NIT inválido (debe ser: 9999-999999-999-9)";
            }
        }

        // Validar email si se proporciona
        if (formData.email_facturacion && formData.email_facturacion.trim()) {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(formData.email_facturacion.trim())) {
                newErrors.email_facturacion = "Email inválido";
            }
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

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Información Básica */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Información Básica
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre del Cliente *
                            </label>
                            <Input
                                type="text"
                                value={formData.original_name}
                                onChange={(e) =>
                                    handleChange("original_name", e.target.value)
                                }
                                placeholder="Ej: COCA-COLA, Cocacola S.A., The Coca Cola Company"
                                className={
                                    errors.original_name ? "border-red-500" : ""
                                }
                            />
                            {errors.original_name && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.original_name}
                                </p>
                            )}
                            {checkingSimilar && (
                                <p className="text-gray-500 text-sm mt-1">
                                    Buscando clientes similares...
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre Corto (Alias)
                            </label>
                            <Input
                                type="text"
                                value={formData.short_name}
                                onChange={(e) =>
                                    handleChange("short_name", e.target.value.toUpperCase())
                                }
                                placeholder="Ej: COCA-COLA (se genera automáticamente si no lo especificas)"
                                className={
                                    errors.short_name ? "border-red-500" : ""
                                }
                            />
                            {errors.short_name && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.short_name}
                                </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                Versión corta para mostrar en reportes. Se generará automáticamente si no lo especificas.
                            </p>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_verified}
                                    onChange={(e) =>
                                        handleChange("is_verified", e.target.checked)
                                    }
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Cliente Verificado Manualmente
                                </span>
                            </label>
                            <p className="text-xs text-gray-500 mt-1 ml-6">
                                Marca como verificado si has confirmado que la información es correcta
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Información Tributaria - El Salvador */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-700">
                            <span className="text-lg">🇸🇻</span>
                            Información Tributaria - El Salvador
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo de Contribuyente *
                                </label>
                                <select
                                    value={formData.tipo_contribuyente}
                                    onChange={(e) =>
                                        handleChange("tipo_contribuyente", e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="gran_contribuyente">Gran Contribuyente</option>
                                    <option value="contribuyente_normal">Contribuyente Normal</option>
                                    <option value="pequeño_contribuyente">Pequeño Contribuyente</option>
                                    <option value="regimen_simple">Régimen Simplificado</option>
                                    <option value="no_contribuyente">No Contribuyente / Extranjero</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Determina si aplican retenciones de IVA y Renta
                                </p>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 cursor-pointer pt-8">
                                    <input
                                        type="checkbox"
                                        checked={formData.acepta_credito_fiscal}
                                        onChange={(e) =>
                                            handleChange("acepta_credito_fiscal", e.target.checked)
                                        }
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        Acepta Crédito Fiscal (CCF)
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    NIT (Número de Identificación Tributaria)
                                </label>
                                <Input
                                    type="text"
                                    value={formData.nit}
                                    onChange={(e) =>
                                        handleChange("nit", e.target.value)
                                    }
                                    placeholder="9999-999999-999-9"
                                    className={errors.nit ? "border-red-500" : ""}
                                />
                                {errors.nit && (
                                    <p className="text-red-500 text-sm mt-1">{errors.nit}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    NRC (Número de Registro de Contribuyente)
                                </label>
                                <Input
                                    type="text"
                                    value={formData.nrc}
                                    onChange={(e) =>
                                        handleChange("nrc", e.target.value)
                                    }
                                    placeholder="99999-9"
                                    className={errors.nrc ? "border-red-500" : ""}
                                />
                                {errors.nrc && (
                                    <p className="text-red-500 text-sm mt-1">{errors.nrc}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Actividad Económica
                            </label>
                            <Input
                                type="text"
                                value={formData.actividad_economica}
                                onChange={(e) =>
                                    handleChange("actividad_economica", e.target.value)
                                }
                                placeholder="Ej: Comercio al por mayor de bebidas"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Retenciones - El Salvador */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-700">
                            <span className="text-lg">⚠️</span>
                            Retención de Renta 1% - ISR (Art. 162 Código Tributario)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <p className="text-sm text-blue-900 font-medium mb-2">
                                ¿Qué es la retención de Renta (ISR) 1%?
                            </p>
                            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                                <li>Regulada por el <strong>Art. 162 del Código Tributario</strong></li>
                                <li>Solo aplica si el cliente es <strong>agente de retención</strong> designado por Hacienda</li>
                                <li>Grandes contribuyentes e instituciones públicas generalmente son agentes de retención</li>
                                <li>Se calcula: <strong>1% sobre el monto total sin IVA</strong> (subtotal gravado)</li>
                                <li>Es un adelanto del <strong>Impuesto sobre la Renta (ISR)</strong> que nosotros (proveedor) debemos pagar</li>
                            </ul>
                        </div>

                        <div className="border-l-4 border-orange-500 bg-orange-50 p-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.aplica_retencion_iva}
                                    onChange={(e) =>
                                        handleChange("aplica_retencion_iva", e.target.checked)
                                    }
                                    className="w-5 h-5 text-orange-600 rounded mt-0.5"
                                />
                                <div className="flex-1">
                                    <span className="text-base font-semibold text-gray-900 block mb-1">
                                        ✅ Este cliente ES agente de retención (retiene Renta/ISR 1%)
                                    </span>
                                    <p className="text-sm text-gray-700">
                                        Marca esta casilla si el cliente ha sido designado por el Ministerio de Hacienda
                                        como agente de retención. Al emitir facturas a este cliente, automáticamente
                                        se calculará la retención del 1% sobre el subtotal gravado (sin IVA).
                                    </p>
                                </div>
                            </label>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-xs text-gray-600">
                                <strong>Ejemplo de cálculo:</strong><br/>
                                Subtotal gravado (sin IVA): $10,000.00<br/>
                                Retención Renta/ISR 1%: $10,000 × 1% = <strong className="text-orange-600">$100.00</strong><br/>
                                → Este monto se restará del total a cobrar
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Información de Contacto */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <span className="text-lg">📞</span>
                            Información de Contacto
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Dirección Fiscal
                            </label>
                            <textarea
                                value={formData.direccion_fiscal}
                                onChange={(e) =>
                                    handleChange("direccion_fiscal", e.target.value)
                                }
                                rows="2"
                                placeholder="Dirección completa del cliente"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    placeholder="+503 2222-2222"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email para Facturación
                                </label>
                                <Input
                                    type="email"
                                    value={formData.email_facturacion}
                                    onChange={(e) =>
                                        handleChange("email_facturacion", e.target.value)
                                    }
                                    placeholder="facturacion@cliente.com"
                                    className={errors.email_facturacion ? "border-red-500" : ""}
                                />
                                {errors.email_facturacion && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.email_facturacion}
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Notas */}
                <Card>
                    <CardHeader>
                        <CardTitle>Notas Internas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => handleChange("notes", e.target.value)}
                            rows="3"
                            placeholder="Notas adicionales sobre el cliente..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
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
