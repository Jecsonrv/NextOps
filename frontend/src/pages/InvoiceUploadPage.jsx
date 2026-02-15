/**
 * Página para subir facturas nuevas
 * Permite upload múltiple con drag & drop y auto-parsing opcional
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useInvoiceUpload, useProviders } from "../hooks/useInvoices";
import { FileUploadZone } from "../components/ui/FileUploadZone";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import {
    ArrowLeft,
    Upload,
    CheckCircle,
    AlertCircle,
    FileText,
    Loader2,
    Target,
    Sparkles,
} from "lucide-react";
import apiClient from "../lib/api";
import { useActiveCostTypes } from "../hooks/useCatalogs";

export function InvoiceUploadPage() {
    const navigate = useNavigate();
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [autoParse, setAutoParse] = useState(true);
    const [tipoCosto, setTipoCosto] = useState("");
    const [selectedProveedor, setSelectedProveedor] = useState("");
    const [uploadResults, setUploadResults] = useState(null);
    const [availablePatterns, setAvailablePatterns] = useState(null);
    const [loadingPatterns, setLoadingPatterns] = useState(false);

    const uploadMutation = useInvoiceUpload();
    const { data: providersData, isLoading: loadingProviders } = useProviders({
        page_size: 1000,
    });
    const { data: activeCostTypes } = useActiveCostTypes();

    const costTypeOptions =
        activeCostTypes?.map((type) => ({
            value: type.code,
            label: type.name,
        })) || [];

    useEffect(() => {
        if (!tipoCosto && costTypeOptions.length > 0) {
            setTipoCosto(costTypeOptions[0].value);
        }
    }, [tipoCosto, costTypeOptions]);

    // Cargar patrones cuando se selecciona un proveedor
    useEffect(() => {
        if (selectedProveedor) {
            loadProviderPatterns(selectedProveedor);
        } else {
            setAvailablePatterns(null);
        }
    }, [selectedProveedor]);

    const loadProviderPatterns = async (providerId) => {
        try {
            setLoadingPatterns(true);
            const token = localStorage.getItem("access_token");
            const response = await apiClient.get(
                `/catalogs/invoice-pattern-catalog/by_provider/${providerId}/`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );
            setAvailablePatterns(response.data);
        } catch (error) {
            console.error("Error cargando patrones:", error);
            setAvailablePatterns(null);
        } finally {
            setLoadingPatterns(false);
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            toast.error("Por favor selecciona al menos un archivo");
            return;
        }

        // Validar que se haya seleccionado un proveedor
        if (!selectedProveedor) {
            toast.error(
                "Por favor selecciona un proveedor antes de subir las facturas",
            );
            return;
        }

        if (!tipoCosto) {
            toast.error("Selecciona un tipo de costo antes de subir.");
            return;
        }

        try {
            const result = await uploadMutation.mutateAsync({
                files: selectedFiles,
                auto_parse: autoParse,
                tipo_costo: tipoCosto,
                proveedor_id: selectedProveedor,
            });

            setUploadResults(result);
            setSelectedFiles([]);
        } catch (error) {
            console.error("Error al subir facturas:", error);
        }
    };

    const resetForm = () => {
        setSelectedFiles([]);
        setUploadResults(null);
        setAutoParse(true);
        setTipoCosto("");
        setSelectedProveedor("");
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/invoices")}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-4xl font-bold text-foreground">
                            Subir Facturas
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Carga archivos PDF, JSON o XML de facturas
                        </p>
                    </div>
                </div>
            </div>

            {/* Resultados de Upload */}
            {uploadResults && (
                <Card
                    className={
                        uploadResults.errors > 0
                            ? "border-yellow-200 bg-yellow-50"
                            : "border-green-200 bg-emerald-50"
                    }
                >
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            {/* Summary */}
                            <div className="flex items-start gap-3">
                                {uploadResults.errors > 0 ? (
                                    <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                                ) : (
                                    <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                    <h3 className="font-semibold text-foreground mb-2">
                                        Resultados del procesamiento
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Total
                                            </p>
                                            <p className="text-2xl font-bold text-foreground">
                                                {uploadResults.total}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Procesados
                                            </p>
                                            <p className="text-2xl font-bold text-emerald-600">
                                                {uploadResults.processed}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Duplicados
                                            </p>
                                            <p className="text-2xl font-bold text-yellow-600">
                                                {uploadResults.duplicates}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Errores
                                            </p>
                                            <p className="text-2xl font-bold text-destructive">
                                                {uploadResults.errors}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Success Results */}
                            {uploadResults.results?.success?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2">
                                        ✓ Archivos procesados exitosamente (
                                        {uploadResults.results.success.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {uploadResults.results.success.map(
                                            (item, index) => (
                                                <div
                                                    key={index}
                                                    className="p-4 bg-card rounded border border-border text-sm"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 space-y-2">
                                                            <p className="font-medium text-foreground">
                                                                📄{" "}
                                                                {item.filename}
                                                            </p>

                                                            {/* Campos detectados */}
                                                            {item.numero_factura &&
                                                                !item.numero_factura.startsWith(
                                                                    "TEMP-",
                                                                ) && (
                                                                    <div className="flex items-center gap-2 text-xs">
                                                                        <span className="text-muted-foreground">
                                                                            Factura:
                                                                        </span>
                                                                        <span className="font-mono font-semibold text-primary">
                                                                            {
                                                                                item.numero_factura
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                )}

                                                            {item.monto &&
                                                                item.monto >
                                                                    0 && (
                                                                    <div className="flex items-center gap-2 text-xs">
                                                                        <span className="text-muted-foreground">
                                                                            Monto:
                                                                        </span>
                                                                        <span className="font-semibold text-emerald-600">
                                                                            $
                                                                            {item.monto.toFixed(
                                                                                2,
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                            {item.numero_contenedor && (
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    <span className="text-muted-foreground">
                                                                        Contenedor:
                                                                    </span>
                                                                    <span className="font-mono text-purple-600">
                                                                        {
                                                                            item.numero_contenedor
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {item.mbl && (
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    <span className="text-muted-foreground">
                                                                        MBL:
                                                                    </span>
                                                                    <span className="font-mono text-indigo-600">
                                                                        {
                                                                            item.mbl
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {item.ot_matched && (
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    <span className="text-muted-foreground">
                                                                        OT
                                                                        Asignada:
                                                                    </span>
                                                                    <span className="font-semibold text-green-700">
                                                                        ✓{" "}
                                                                        {
                                                                            item.ot_matched
                                                                        }
                                                                        {item.match_method && (
                                                                            <span className="text-muted-foreground font-normal ml-1">
                                                                                (por{" "}
                                                                                {
                                                                                    item.match_method
                                                                                }

                                                                                )
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {item.message && (
                                                                <p className="text-xs text-muted-foreground pt-1 border-t">
                                                                    {
                                                                        item.message
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            {item.requiere_revision && (
                                                                <Badge
                                                                    variant="warning"
                                                                    className="text-xs"
                                                                >
                                                                    Requiere
                                                                    revisión
                                                                </Badge>
                                                            )}
                                                            {item.confidence !==
                                                                undefined && (
                                                                <Badge
                                                                    variant={
                                                                        item.confidence >=
                                                                        0.7
                                                                            ? "success"
                                                                            : item.confidence >=
                                                                                0.5
                                                                              ? "warning"
                                                                              : "destructive"
                                                                    }
                                                                    className="text-xs"
                                                                >
                                                                    {(
                                                                        item.confidence *
                                                                        100
                                                                    ).toFixed(
                                                                        0,
                                                                    )}
                                                                    % confianza
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Duplicates */}
                            {uploadResults.results?.duplicates?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2">
                                        ⚠ Archivos duplicados (
                                        {
                                            uploadResults.results.duplicates
                                                .length
                                        }
                                        )
                                    </h4>
                                    <div className="space-y-2">
                                        {uploadResults.results.duplicates.map(
                                            (item, index) => (
                                                <div
                                                    key={index}
                                                    className="p-3 bg-card rounded border border-border text-sm"
                                                >
                                                    <p className="font-medium text-foreground">
                                                        {item.filename}
                                                    </p>
                                                    <p className="text-muted-foreground mt-1">
                                                        {item.reason}
                                                    </p>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Errors */}
                            {uploadResults.results?.errors?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2">
                                        ✗ Errores (
                                        {uploadResults.results.errors.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {uploadResults.results.errors.map(
                                            (item, index) => (
                                                <div
                                                    key={index}
                                                    className="p-3 bg-card rounded border border-destructive/20 text-sm"
                                                >
                                                    <p className="font-medium text-foreground">
                                                        {item.filename}
                                                    </p>
                                                    <p className="text-destructive mt-1">
                                                        {item.error}
                                                    </p>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 pt-4 border-t border-border">
                                <Button
                                    onClick={resetForm}
                                    variant="outline"
                                    size="sm"
                                >
                                    Subir más facturas
                                </Button>
                                <Button
                                    onClick={() => navigate("/invoices")}
                                    size="sm"
                                >
                                    Ver todas las facturas
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Upload Form */}
            {!uploadResults && (
                <>
                    {/* Configuración */}
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Configuración de Procesamiento
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Selector de Proveedor - OBLIGATORIO */}
                            <div>
                                <label className="block font-semibold text-foreground mb-2">
                                    Proveedor{" "}
                                    <span className="text-destructive">*</span>
                                </label>
                                <select
                                    value={selectedProveedor}
                                    onChange={(e) =>
                                        setSelectedProveedor(e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                    required
                                >
                                    <option value="">
                                        -- Seleccionar proveedor --
                                    </option>
                                    {loadingProviders ? (
                                        <option disabled>
                                            Cargando proveedores...
                                        </option>
                                    ) : (
                                        providersData?.results?.map(
                                            (provider) => (
                                                <option
                                                    key={provider.id}
                                                    value={provider.id}
                                                >
                                                    {provider.nombre}{" "}
                                                    {provider.tipo
                                                        ? `(${provider.tipo_display})`
                                                        : ""}
                                                </option>
                                            ),
                                        )
                                    )}
                                </select>
                                <p className="text-sm text-muted-foreground mt-2">
                                    <strong>Importante:</strong> Selecciona el
                                    proveedor al que pertenecen estas facturas.
                                    Esto permitirá aplicar los patrones de
                                    extracción correctos y mejorar la precisión
                                    del procesamiento.
                                </p>
                            </div>

                            {/* Patrones Disponibles */}
                            {selectedProveedor && (
                                <div className="bg-primary/10 border border-primary/25 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <Target className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-primary mb-2">
                                                Patrones de Detección
                                                Disponibles
                                            </h4>

                                            {loadingPatterns ? (
                                                <div className="flex items-center gap-2 text-sm text-primary">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>
                                                        Cargando patrones...
                                                    </span>
                                                </div>
                                            ) : availablePatterns ? (
                                                <div className="space-y-2">
                                                    <p className="text-sm text-primary">
                                                        <Sparkles className="w-4 h-4 inline mr-1" />
                                                        Se aplicarán{" "}
                                                        <strong>
                                                            {
                                                                availablePatterns.total
                                                            }
                                                        </strong>{" "}
                                                        patrones
                                                        {availablePatterns.specific_patterns >
                                                            0 && (
                                                            <>
                                                                {" "}
                                                                (
                                                                {
                                                                    availablePatterns.specific_patterns
                                                                }{" "}
                                                                específicos del
                                                                proveedor
                                                            </>
                                                        )}
                                                        {availablePatterns.generic_patterns >
                                                            0 && (
                                                            <>
                                                                ,{" "}
                                                                {
                                                                    availablePatterns.generic_patterns
                                                                }{" "}
                                                                genéricos)
                                                            </>
                                                        )}
                                                    </p>

                                                    {/* Campos que se detectarán */}
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {Object.entries(
                                                            availablePatterns.by_field ||
                                                                {},
                                                        ).map(
                                                            ([
                                                                fieldCode,
                                                                patterns,
                                                            ]) => (
                                                                <Badge
                                                                    key={
                                                                        fieldCode
                                                                    }
                                                                    variant="outline"
                                                                    className="text-xs bg-card"
                                                                >
                                                                    {patterns[0]
                                                                        ?.target_field_name ||
                                                                        fieldCode}
                                                                </Badge>
                                                            ),
                                                        )}
                                                    </div>

                                                    {availablePatterns.total ===
                                                        0 && (
                                                        <p className="text-sm text-primary">
                                                            ℹ️ No hay patrones
                                                            específicos para
                                                            este proveedor. Se
                                                            usarán solo patrones
                                                            genéricos.
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-primary">
                                                    No se pudieron cargar los
                                                    patrones.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-border pt-4">
                                <div className="flex items-center gap-2">
                                    <input
                                        id="auto-parse"
                                        type="checkbox"
                                        checked={autoParse}
                                        onChange={(e) =>
                                            setAutoParse(e.target.checked)
                                        }
                                        className="w-4 h-4 text-primary rounded"
                                    />
                                    <label
                                        htmlFor="auto-parse"
                                        className="font-medium text-foreground"
                                    >
                                        Extraer datos automáticamente
                                    </label>
                                </div>
                                <p className="text-sm text-muted-foreground ml-6 mt-1">
                                    Si está activado, el sistema intentará
                                    extraer automáticamente los datos de las
                                    facturas (número, monto, fecha, proveedor) y
                                    hacer matching con OTs existentes.
                                </p>
                            </div>

                            <div>
                                <label className="block font-medium text-foreground mb-2">
                                    Tipo de Costo
                                </label>
                                <select
                                    value={tipoCosto}
                                    onChange={(e) =>
                                        setTipoCosto(e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                >
                                    {costTypeOptions.length === 0 && (
                                        <option value="" disabled>
                                            No hay tipos de costo activos
                                        </option>
                                    )}
                                    {costTypeOptions.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Se aplicará a todas las facturas subidas en
                                    este lote
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* File Upload Zone */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Archivos de Facturas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FileUploadZone
                                onFilesSelected={setSelectedFiles}
                                maxFiles={20}
                            />
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                        <Button
                            variant="outline"
                            onClick={() => navigate("/invoices")}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleUpload}
                            disabled={
                                selectedFiles.length === 0 ||
                                uploadMutation.isPending
                            }
                        >
                            {uploadMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Subir {selectedFiles.length}{" "}
                                    {selectedFiles.length === 1
                                        ? "factura"
                                        : "facturas"}
                                </>
                            )}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
