import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/api";
import { ConflictResolutionModal } from "../components/ot/ConflictResolutionModal";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
    ArrowLeft,
    Upload,
    FileSpreadsheet,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader2,
    FileText,
    X,
} from "lucide-react";

/**
 * Página para importar OTs desde archivos Excel
 * Soporta múltiples archivos simultáneos y resolución de conflictos
 */
export function OTImportPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [files, setFiles] = useState([]); // Array de archivos con metadata
    const [isDragging, setIsDragging] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [conflicts, setConflicts] = useState([]);
    const [showConflictModal, setShowConflictModal] = useState(false);

    // Mutation para importar Excel
    const importMutation = useMutation({
        mutationFn: async ({ files, tipos_operacion }) => {
            const formData = new FormData();
            files.forEach((file) => {
                formData.append("files", file);
            });
            // Enviar tipos como JSON array
            formData.append("tipos_operacion", JSON.stringify(tipos_operacion));

            try {
                const response = await apiClient.post(
                    "ots/import_excel/",
                    formData,
                    {
                        headers: {
                            "Content-Type": "multipart/form-data",
                        },
                    }
                );
                return response.data;
            } catch (error) {
                // Si es un 409 (CONFLICT), significa que hay conflictos que resolver
                if (error.response && error.response.status === 409) {
                    return {
                        ...error.response.data,
                        isConflict: true,
                    };
                }
                // Para otros errores, re-lanzar
                throw error;
            }
        },
        onSuccess: (data) => {
            // Si hay conflictos (status 409), mostrar modal
            if (
                (data.has_conflicts || data.isConflict) &&
                data.conflicts &&
                data.conflicts.length > 0
            ) {
                setConflicts(data.conflicts);
                setShowConflictModal(true);
            } else {
                // No hay conflictos, mostrar resultados
                setImportResult(data);
                queryClient.invalidateQueries(["ots"]);
            }
        },
        onError: (error) => {
            console.error("Error al importar Excel:", error);
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.detail ||
                error.message ||
                "Error desconocido al importar archivo";

            setImportResult({
                success: false,
                message: errorMessage,
                errors: error.response?.data?.errors || [
                    { row: "N/A", error: errorMessage },
                ],
                total_rows: 0,
                processed: 0,
                created: 0,
                updated: 0,
                skipped: 0,
            });
        },
    });

    // Mutation para resolver conflictos
    const resolveConflictsMutation = useMutation({
        mutationFn: async ({ conflicts, files, tipos_operacion }) => {
            const formData = new FormData();

            // Agregar archivos
            files.forEach((file) => {
                formData.append("files", file);
            });

            // Agregar tipos de operación como JSON array
            formData.append("tipos_operacion", JSON.stringify(tipos_operacion));

            // Agregar resoluciones como JSON en el body
            formData.append("conflicts", JSON.stringify(conflicts));

            const response = await apiClient.post(
                "ots/resolve_conflicts/",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            return response.data;
        },
        onSuccess: (data) => {
            setShowConflictModal(false);
            setConflicts([]);
            setImportResult(data);
            queryClient.invalidateQueries(["ots"]);
        },
        onError: (error) => {
            console.error("Error al resolver conflictos:", error);
            const errorMessage =
                error.response?.data?.message ||
                error.message ||
                "Error al resolver conflictos";

            setImportResult({
                success: false,
                message: errorMessage,
                errors: [{ row: "N/A", error: errorMessage }],
                total_rows: 0,
                processed: 0,
                created: 0,
                updated: 0,
                skipped: 0,
            });
            setShowConflictModal(false);
        },
    });

    // Drag & Drop handlers
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0) {
            validateAndSetFiles(droppedFiles);
        }
    }, []);

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length > 0) {
            validateAndSetFiles(selectedFiles);
        }
    };

    const validateAndSetFiles = (selectedFiles) => {
        // Validar extensión
        const validExtensions = [".xlsx", ".xls"];
        const invalidFiles = [];
        const validFiles = [];

        selectedFiles.forEach((file) => {
            const fileExtension = file.name
                .toLowerCase()
                .slice(file.name.lastIndexOf("."));

            if (!validExtensions.includes(fileExtension)) {
                invalidFiles.push(file.name);
            } else {
                // Agregar archivo con metadata incluyendo tipo de operación
                validFiles.push({
                    file: file,
                    tipo_operacion: "importacion", // Default
                });
            }
        });

        if (invalidFiles.length > 0) {
            alert(
                `Los siguientes archivos tienen formato inválido y no serán importados:\n${invalidFiles.join(
                    "\n"
                )}\n\nFormatos válidos: .xlsx, .xls`
            );
        }

        if (validFiles.length > 0) {
            setFiles((prev) => [...prev, ...validFiles]);
            setImportResult(null);
        }
    };

    const handleRemoveFile = (indexToRemove) => {
        setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleTipoOperacionChange = (index, tipo) => {
        setFiles((prev) =>
            prev.map((fileData, i) =>
                i === index ? { ...fileData, tipo_operacion: tipo } : fileData
            )
        );
    };

    const handleSetAllTipo = (tipo) => {
        setFiles((prev) =>
            prev.map((fileData) => ({ ...fileData, tipo_operacion: tipo }))
        );
    };

    // Contador de archivos por tipo
    const countByTipo = {
        importacion: files.filter((f) => f.tipo_operacion === "importacion")
            .length,
        exportacion: files.filter((f) => f.tipo_operacion === "exportacion")
            .length,
    };

    const handleImport = () => {
        if (files.length === 0) {
            alert("Por favor selecciona al menos un archivo Excel");
            return;
        }

        // Extraer solo los archivos File y sus tipos
        const filesArray = files.map((f) => f.file);
        const tiposArray = files.map((f) => f.tipo_operacion);

        importMutation.mutate({
            files: filesArray,
            tipos_operacion: tiposArray,
        });
    };

    const handleResolveConflicts = (conflictResolutions) => {
        const filesArray = files.map((f) => f.file);
        const tiposArray = files.map((f) => f.tipo_operacion);

        resolveConflictsMutation.mutate({
            conflicts: conflictResolutions,
            files: filesArray,
            tipos_operacion: tiposArray,
        });
    };

    const handleReset = () => {
        setFiles([]);
        setImportResult(null);
        setConflicts([]);
        setShowConflictModal(false);
    };

    const getStatusIcon = (status) => {
        if (status === "success")
            return <CheckCircle className="h-5 w-5 text-green-500" />;
        if (status === "error")
            return <XCircle className="h-5 w-5 text-red-500" />;
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/ots")}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Importar OTs desde Excel
                        </h1>
                        <p className="text-sm text-gray-500">
                            Sube uno o más archivos Excel para importar
                            múltiples OTs automáticamente
                        </p>
                    </div>
                </div>
            </div>

            {/* Instrucciones Simplificadas */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Instrucciones
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 text-sm text-gray-600">
                        <p>
                            El sistema detecta automáticamente encabezados,
                            formatos de fecha y separa contenedores/HBLs por
                            comas.
                        </p>

                        <p className="mt-4 text-yellow-700 bg-yellow-50 p-3 rounded-md flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <span>
                                <strong>Importante:</strong> Si una OT ya
                                existe, solo se actualizarán campos no
                                modificados manualmente. Las provisiones
                                manuales tienen prioridad.
                            </span>
                        </p>

                        <p className="mt-2 text-blue-700 bg-blue-50 p-3 rounded-md flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <span>
                                <strong>Conflictos:</strong> Si la misma OT
                                tiene valores diferentes en{" "}
                                <strong>CLIENTE</strong> u{" "}
                                <strong>OPERATIVO</strong>, se mostrará un modal
                                para decidir qué valor mantener.
                            </span>
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Upload Area */}
            {!importResult && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            Seleccionar Archivos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                                isDragging
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-300 hover:border-gray-400"
                            }`}
                        >
                            {files.length > 0 ? (
                                <div className="space-y-4">
                                    <FileSpreadsheet className="h-16 w-16 text-green-500 mx-auto" />

                                    {/* Controles globales */}
                                    <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                                        <div className="flex items-center justify-between">
                                            {/* Botones para marcar todos - izquierda */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-gray-600">
                                                    Marcar todos:
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        handleSetAllTipo(
                                                            "importacion"
                                                        )
                                                    }
                                                    className="flex items-center gap-1 py-1 px-2.5 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 rounded text-xs font-medium transition-colors"
                                                    title="Marcar todos como Importación"
                                                >
                                                    <CheckCircle className="h-3 w-3" />
                                                    Importación
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleSetAllTipo(
                                                            "exportacion"
                                                        )
                                                    }
                                                    className="flex items-center gap-1 py-1 px-2.5 bg-white border border-yellow-200 hover:bg-yellow-50 text-yellow-700 rounded text-xs font-medium transition-colors"
                                                    title="Marcar todos como Exportación"
                                                >
                                                    <CheckCircle className="h-3 w-3" />
                                                    Exportación
                                                </button>
                                            </div>

                                            {/* Estadísticas - derecha */}
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 text-xs">
                                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                        <span className="font-medium text-gray-700">
                                                            {
                                                                countByTipo.importacion
                                                            }{" "}
                                                            Importación
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs">
                                                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                                        <span className="font-medium text-gray-700">
                                                            {
                                                                countByTipo.exportacion
                                                            }{" "}
                                                            Exportación
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-sm font-medium text-gray-700">
                                                    {files.length} archivo
                                                    {files.length > 1
                                                        ? "s"
                                                        : ""}{" "}
                                                    seleccionado
                                                    {files.length > 1
                                                        ? "s"
                                                        : ""}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lista de archivos seleccionados */}
                                    <div className="max-h-80 overflow-y-auto space-y-2">
                                        {files.map((fileData, index) => (
                                            <div
                                                key={index}
                                                className="bg-white rounded-md border border-gray-200 p-5 hover:border-gray-300 transition-all group"
                                            >
                                                <div className="flex items-center justify-between gap-4">
                                                    {/* Info del archivo - izquierda */}
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <FileSpreadsheet className="h-5 w-5 text-green-600 flex-shrink-0" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-medium text-sm text-gray-900 truncate text-left">
                                                                {
                                                                    fileData
                                                                        .file
                                                                        .name
                                                                }
                                                            </p>
                                                            <p className="text-xs text-gray-500 text-left">
                                                                {(
                                                                    fileData
                                                                        .file
                                                                        .size /
                                                                    1024
                                                                ).toFixed(
                                                                    2
                                                                )}{" "}
                                                                KB
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Selector de tipo + eliminar - derecha */}
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        <div className="flex gap-1.5">
                                                            <button
                                                                onClick={() =>
                                                                    handleTipoOperacionChange(
                                                                        index,
                                                                        "importacion"
                                                                    )
                                                                }
                                                                className={`py-1.5 px-3 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                                                                    fileData.tipo_operacion ===
                                                                    "importacion"
                                                                        ? "bg-blue-600 text-white"
                                                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                                }`}
                                                            >
                                                                Importación
                                                            </button>

                                                            <button
                                                                onClick={() =>
                                                                    handleTipoOperacionChange(
                                                                        index,
                                                                        "exportacion"
                                                                    )
                                                                }
                                                                className={`py-1.5 px-3 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                                                                    fileData.tipo_operacion ===
                                                                    "exportacion"
                                                                        ? "bg-yellow-500 text-white"
                                                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                                }`}
                                                            >
                                                                Exportación
                                                            </button>
                                                        </div>

                                                        <button
                                                            onClick={() =>
                                                                handleRemoveFile(
                                                                    index
                                                                )
                                                            }
                                                            className="p-1.5 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Remover archivo"
                                                        >
                                                            <X className="h-4 w-4 text-red-500" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-center gap-3">
                                        <Button
                                            onClick={handleImport}
                                            disabled={
                                                importMutation.isPending ||
                                                resolveConflictsMutation.isPending
                                            }
                                        >
                                            {importMutation.isPending ||
                                            resolveConflictsMutation.isPending ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Procesando...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="h-4 w-4 mr-2" />
                                                    Importar {files.length}{" "}
                                                    Archivo
                                                    {files.length > 1
                                                        ? "s"
                                                        : ""}
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={handleReset}
                                        >
                                            Limpiar
                                        </Button>
                                    </div>

                                    {/* Agregar más archivos */}
                                    <div className="pt-4 border-t">
                                        <input
                                            type="file"
                                            id="file-upload-more"
                                            accept=".xlsx,.xls"
                                            multiple
                                            onChange={(e) => {
                                                const newFiles = Array.from(
                                                    e.target.files
                                                );
                                                // Solo pasar los nuevos archivos, validateAndSetFiles los agregará al estado
                                                validateAndSetFiles(newFiles);
                                                e.target.value = "";
                                            }}
                                            className="hidden"
                                        />
                                        <label
                                            htmlFor="file-upload-more"
                                            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input hover:bg-accent hover:text-accent-foreground h-10 py-2 px-4 cursor-pointer"
                                        >
                                            + Agregar más archivos
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <FileSpreadsheet className="h-16 w-16 text-gray-400 mx-auto" />
                                    <div>
                                        <p className="text-lg font-semibold text-gray-700">
                                            Arrastra tus archivos Excel aquí
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            o haz clic para seleccionar
                                            (múltiples archivos soportados)
                                        </p>
                                    </div>
                                    <div>
                                        <input
                                            type="file"
                                            id="file-upload"
                                            accept=".xlsx,.xls"
                                            multiple
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        <label
                                            htmlFor="file-upload"
                                            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input hover:bg-accent hover:text-accent-foreground h-10 py-2 px-4 cursor-pointer"
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            Seleccionar archivos
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        Archivos Excel (.xlsx, .xls) - Máximo
                                        10MB por archivo
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Import Results */}
            {importResult && (
                <div className="space-y-6">
                    {/* Summary Stats */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    {getStatusIcon(
                                        importResult.success
                                            ? "success"
                                            : "error"
                                    )}
                                    Resultados de Importación
                                </CardTitle>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleReset}
                                >
                                    Importar otro archivo
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <p className="text-lg font-medium">
                                    {importResult.message}
                                </p>

                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-600">
                                            Total Filas
                                        </p>
                                        <p className="text-2xl font-bold">
                                            {importResult.total_rows}
                                        </p>
                                    </div>

                                    <div className="p-4 bg-blue-50 rounded-lg">
                                        <p className="text-sm text-blue-600">
                                            Procesadas
                                        </p>
                                        <p className="text-2xl font-bold text-blue-700">
                                            {importResult.processed}
                                        </p>
                                    </div>

                                    <div className="p-4 bg-green-50 rounded-lg">
                                        <p className="text-sm text-green-600">
                                            Creadas
                                        </p>
                                        <p className="text-2xl font-bold text-green-700">
                                            {importResult.created}
                                        </p>
                                    </div>

                                    <div className="p-4 bg-yellow-50 rounded-lg">
                                        <p className="text-sm text-yellow-600">
                                            Actualizadas
                                        </p>
                                        <p className="text-2xl font-bold text-yellow-700">
                                            {importResult.updated}
                                        </p>
                                    </div>

                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-600">
                                            Omitidas
                                        </p>
                                        <p className="text-2xl font-bold">
                                            {importResult.skipped}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Conflicts */}
                    {importResult.conflicts &&
                        importResult.conflicts.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                                        Conflictos Detectados (
                                        {importResult.conflicts.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {importResult.conflicts.map(
                                            (conflict, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm"
                                                >
                                                    <p className="font-semibold text-yellow-900">
                                                        Fila {conflict.row}:{" "}
                                                        {conflict.ot}
                                                    </p>
                                                    <p className="text-yellow-700">
                                                        {conflict.reason}
                                                    </p>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                    {/* Warnings - Filas Omitidas */}
                    {importResult.warnings &&
                        importResult.warnings.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5 text-orange-500" />
                                        Filas Omitidas (
                                        {importResult.warnings.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {importResult.warnings.map(
                                            (warning, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-orange-900">
                                                                {warning.file && (
                                                                    <span className="text-xs bg-orange-200 px-2 py-1 rounded mr-2">
                                                                        {
                                                                            warning.file
                                                                        }
                                                                    </span>
                                                                )}
                                                                Fila{" "}
                                                                {warning.row}:{" "}
                                                                {warning.ot}
                                                            </p>
                                                            <p className="text-orange-700 mt-1">
                                                                {
                                                                    warning.message
                                                                }
                                                            </p>
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className="ml-2 text-xs"
                                                        >
                                                            {warning.type ||
                                                                "advertencia"}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                    {/* Errors */}
                    {importResult.errors && importResult.errors.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <XCircle className="h-5 w-5 text-red-500" />
                                    Errores Encontrados (
                                    {importResult.errors.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {importResult.errors.map((error, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm"
                                        >
                                            <p className="font-semibold text-red-900">
                                                Fila {error.row}
                                            </p>
                                            <p className="text-red-700">
                                                {error.error}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Success Actions */}
                    {importResult.success && importResult.processed > 0 && (
                        <div className="flex items-center justify-center gap-3">
                            <Button onClick={() => navigate("/ots")}>
                                Ver OTs Importadas
                            </Button>
                            <Button variant="outline" onClick={handleReset}>
                                Importar más archivos
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de resolución de conflictos */}
            {showConflictModal && conflicts.length > 0 && (
                <ConflictResolutionModal
                    conflicts={conflicts}
                    isOpen={showConflictModal}
                    onClose={() => {
                        setShowConflictModal(false);
                        setConflicts([]);
                    }}
                    onResolve={handleResolveConflicts}
                />
            )}
        </div>
    );
}
