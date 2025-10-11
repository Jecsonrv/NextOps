/**
 * Componente de drag & drop para subir archivos
 * Soporta múltiples archivos, validación de tipo y tamaño
 */

import { useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { Upload, X, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "./Button";

const ALLOWED_TYPES = {
    "application/pdf": [".pdf"],
    "application/json": [".json"],
    "application/xml": [".xml"],
    "text/xml": [".xml"],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function FileUploadZone({
    onFilesSelected,
    maxFiles = 10,
    accept = Object.keys(ALLOWED_TYPES),
}) {
    const [files, setFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [errors, setErrors] = useState([]);
    const inputRef = useRef(null);

    const validateFile = useCallback(
        (file) => {
            const validationErrors = [];

            // Validar tipo de archivo
            if (accept.length > 0 && !accept.includes(file.type)) {
                validationErrors.push(
                    `${file.name}: Tipo de archivo no permitido`
                );
            }

            // Validar tamaño
            if (file.size > MAX_FILE_SIZE) {
                validationErrors.push(
                    `${file.name}: Archivo muy grande (máximo 10MB)`
                );
            }

            return validationErrors;
        },
        [accept]
    );

    const handleFiles = useCallback(
        (newFiles) => {
            const validFiles = [];
            const fileErrors = [];

            Array.from(newFiles).forEach((file) => {
                const validationErrors = validateFile(file);

                if (validationErrors.length > 0) {
                    fileErrors.push(...validationErrors);
                } else {
                    validFiles.push(file);
                }
            });

            // Check max files
            if (files.length + validFiles.length > maxFiles) {
                fileErrors.push(`Máximo ${maxFiles} archivos permitidos`);
                return;
            }

            setErrors(fileErrors);

            if (validFiles.length > 0) {
                const updatedFiles = [...files, ...validFiles];
                setFiles(updatedFiles);
                onFilesSelected(updatedFiles);
            }
        },
        [files, maxFiles, onFilesSelected, validateFile]
    );

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            setIsDragging(false);

            const droppedFiles = e.dataTransfer.files;
            handleFiles(droppedFiles);
        },
        [handleFiles]
    );

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileInput = useCallback(
        (e) => {
            const selectedFiles = e.target.files;
            handleFiles(selectedFiles);
        },
        [handleFiles]
    );

    const removeFile = useCallback(
        (index) => {
            const updatedFiles = files.filter((_, i) => i !== index);
            setFiles(updatedFiles);
            onFilesSelected(updatedFiles);

            // Clear errors when removing files
            if (updatedFiles.length === 0) {
                setErrors([]);
            }
        },
        [files, onFilesSelected]
    );

    const clearAll = useCallback(() => {
        setFiles([]);
        setErrors([]);
        onFilesSelected([]);
    }, [onFilesSelected]);

    const formatFileSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (
            Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
        );
    };

    return (
        <div className="space-y-4">
            {/* Drop Zone */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    transition-colors
                    ${
                        isDragging
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-300 hover:border-gray-400"
                    }
                `}
                onClick={() => inputRef.current?.click()}
            >
                <input
                    type="file"
                    multiple
                    accept={accept.join(",")}
                    onChange={handleFileInput}
                    className="hidden"
                    ref={inputRef}
                />

                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />

                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {isDragging
                        ? "Suelta los archivos aquí"
                        : "Arrastra archivos aquí o haz click para seleccionar"}
                </h3>

                <p className="text-sm text-gray-500">
                    PDF, JSON, XML - Máximo {maxFiles} archivos de 10MB cada uno
                </p>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-semibold text-red-800 mb-1">
                                Errores de validación
                            </h4>
                            <ul className="text-sm text-red-700 space-y-1">
                                {errors.map((error, index) => (
                                    <li key={index}>• {error}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Files List */}
            {files.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-700">
                            Archivos seleccionados ({files.length})
                        </h4>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearAll}
                        >
                            Limpiar todo
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {files.map((file, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                                <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />

                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">
                                        {file.name}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {formatFileSize(file.size)}
                                    </p>
                                </div>

                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeFile(index)}
                                    className="flex-shrink-0"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

FileUploadZone.propTypes = {
    onFilesSelected: PropTypes.func.isRequired,
    maxFiles: PropTypes.number,
    accept: PropTypes.arrayOf(PropTypes.string),
};

FileUploadZone.defaultProps = {
    maxFiles: 10,
    accept: Object.keys(ALLOWED_TYPES),
};
