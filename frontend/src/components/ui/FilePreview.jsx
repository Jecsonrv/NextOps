/**
 * Componente para previsualizar archivos (PDF, JSON, XML)
 * Muestra el contenido sin necesidad de descargar
 */

import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import apiClient from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "./Card";
import { Button } from "./Button";
import { Badge } from "./Badge";
import {
    FileText,
    Download,
    Maximize2,
    Minimize2,
    AlertCircle,
    Loader2,
    ExternalLink,
} from "lucide-react";

export function FilePreview({
    invoiceId,
    fileUrl,
    fileName,
    contentType,
    cachedFile,
    onFileLoaded,
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [jsonData, setJsonData] = useState(null);
    const [xmlData, setXmlData] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [downloadUrl, setDownloadUrl] = useState(null);

    const previewUrlRef = useRef(null);
    const downloadUrlRef = useRef(null);

    const baseUrl = import.meta.env.VITE_BASE_URL;
    const fallbackUrl = fileUrl ? `${baseUrl}${fileUrl}` : null;

    const fileLabel = fileName || "Archivo de factura";

    const isPDF =
        contentType?.includes("pdf") ||
        fileName?.toLowerCase().endsWith(".pdf");
    const isJSON =
        contentType?.includes("json") ||
        fileName?.toLowerCase().endsWith(".json");
    const isXML =
        contentType?.includes("xml") ||
        fileName?.toLowerCase().endsWith(".xml");

    const resetState = () => {
        setError(null);
        setJsonData(null);
        setXmlData(null);
        setPreviewUrl(null);
        setDownloadUrl(null);
    };

    const releaseObjectUrls = () => {
        const currentPreview = previewUrlRef.current;
        const currentDownload = downloadUrlRef.current;

        if (currentPreview) {
            URL.revokeObjectURL(currentPreview);
        }

        if (currentDownload && currentDownload !== currentPreview) {
            URL.revokeObjectURL(currentDownload);
        }

        previewUrlRef.current = null;
        downloadUrlRef.current = null;
    };

    useEffect(() => {
        return () => {
            releaseObjectUrls();
        };
    }, []);

    useEffect(() => {
        let isActive = true;

        const hydrateFromBlob = async (blob) => {
            if (!isActive) return;

            const effectiveBlob =
                blob instanceof Blob ? blob : new Blob([blob]);

            // Siempre generamos una URL para descarga
            if (downloadUrlRef.current) {
                URL.revokeObjectURL(downloadUrlRef.current);
            }
            const downloadObjectUrl = URL.createObjectURL(effectiveBlob);
            downloadUrlRef.current = downloadObjectUrl;
            setDownloadUrl(downloadObjectUrl);

            if (isPDF) {
                // Reutilizar la misma URL para previsualización
                previewUrlRef.current = downloadObjectUrl;
                setPreviewUrl(downloadObjectUrl);
                setIsLoading(false);
                return;
            }

            if (isJSON) {
                try {
                    const text = await effectiveBlob.text();
                    const parsed = JSON.parse(text);
                    setJsonData(parsed);
                } catch (error) {
                    console.error("Error parsing JSON preview", error);
                    setError("No pudimos leer el JSON adjunto");
                }
                setIsLoading(false);
                return;
            }

            if (isXML) {
                try {
                    const text = await effectiveBlob.text();
                    setXmlData(text);
                } catch (error) {
                    console.error("Error parsing XML preview", error);
                    setError("No pudimos leer el XML adjunto");
                }
                setIsLoading(false);
                return;
            }

            // Otros tipos: intentamos mostrarlos en iframe si es posible
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
            }
            previewUrlRef.current = downloadObjectUrl;
            setPreviewUrl(downloadObjectUrl);
            setIsLoading(false);
        };

        const fetchFromApi = async () => {
            if (!invoiceId) return null;
            const response = await apiClient.get(
                `/invoices/${invoiceId}/file/`,
                {
                    responseType: "blob",
                }
            );
            return response.data;
        };

        const fetchFromFallback = async () => {
            if (!fallbackUrl) return null;
            const response = await fetch(fallbackUrl);
            if (!response.ok) {
                throw new Error("Respuesta inesperada al cargar archivo");
            }
            return await response.blob();
        };

        const loadFile = async () => {
            try {
                setIsLoading(true);
                releaseObjectUrls();
                resetState();

                const existingBlob = cachedFile?.blob;
                if (existingBlob) {
                    await hydrateFromBlob(existingBlob);
                    return;
                }

                const blobFromApi = await fetchFromApi();
                const blobToUse = blobFromApi || (await fetchFromFallback());

                if (!blobToUse) {
                    throw new Error("No se encontró el archivo adjunto");
                }

                await hydrateFromBlob(blobToUse);

                onFileLoaded?.({
                    blob: blobToUse,
                    filename: fileName,
                    contentType: contentType,
                });
            } catch (err) {
                console.error("Error al cargar archivo de factura", err);
                if (!isActive) return;
                setError(
                    err?.message ||
                        "No pudimos cargar el archivo. Intenta nuevamente."
                );
                setIsLoading(false);
            }
        };

        loadFile();

        return () => {
            isActive = false;
        };
    }, [
        invoiceId,
        fileUrl,
        cachedFile,
        isPDF,
        isJSON,
        isXML,
        contentType,
        fileName,
        fallbackUrl,
        onFileLoaded,
    ]);

    const handleDownload = () => {
        if (!downloadUrl && fallbackUrl) {
            // Último recurso: abrir la URL pública
            window.open(fallbackUrl, "_blank", "noopener,noreferrer");
            return;
        }

        if (!downloadUrl) return;

        const link = document.createElement("a");
        link.href = downloadUrl;
        const normalizedName = fileName || `archivo-factura-${invoiceId || ""}`;
        link.setAttribute("download", normalizedName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleOpenNewTab = () => {
        if (previewUrl) {
            window.open(previewUrl, "_blank", "noopener,noreferrer");
            return;
        }

        if (downloadUrl) {
            window.open(downloadUrl, "_blank", "noopener,noreferrer");
            return;
        }

        if (fallbackUrl) {
            window.open(fallbackUrl, "_blank", "noopener,noreferrer");
        }
    };

    return (
        <Card className={isExpanded ? "fixed inset-4 z-50 overflow-auto" : ""}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                            <CardTitle className="text-lg">
                                Vista Previa
                            </CardTitle>
                            <p className="text-sm text-gray-600 mt-1">
                                {fileLabel}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                            {contentType || "Desconocido"}
                        </Badge>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsExpanded(!isExpanded)}
                            title={isExpanded ? "Minimizar" : "Maximizar"}
                        >
                            {isExpanded ? (
                                <Minimize2 className="w-4 h-4" />
                            ) : (
                                <Maximize2 className="w-4 h-4" />
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOpenNewTab}
                            disabled={isLoading || !!error}
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Abrir pestaña
                        </Button>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleDownload}
                            disabled={isLoading || !!error}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Descargar
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading && (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                )}

                {error && !isLoading && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded">
                        <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
                        <div className="text-sm text-red-700">
                            <p className="font-semibold text-red-900">
                                No pudimos cargar el archivo
                            </p>
                            <p>{error}</p>
                            {fallbackUrl && (
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="mt-2 px-0"
                                    onClick={() =>
                                        window.open(
                                            fallbackUrl,
                                            "_blank",
                                            "noopener,noreferrer"
                                        )
                                    }
                                >
                                    Abrir vínculo público
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {!isLoading && !error && (
                    <>
                        {isPDF && previewUrl && (
                            <div
                                className={
                                    isExpanded
                                        ? "h-[calc(100vh-200px)]"
                                        : "h-[600px]"
                                }
                            >
                                <iframe
                                    src={previewUrl}
                                    className="w-full h-full border border-gray-300 rounded"
                                    title="Vista previa de PDF"
                                />
                            </div>
                        )}

                        {isJSON && jsonData && (
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto text-sm max-h-[600px]">
                                <code>{JSON.stringify(jsonData, null, 2)}</code>
                            </pre>
                        )}

                        {isXML && xmlData && (
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto text-sm max-h-[600px]">
                                <code className="language-xml">{xmlData}</code>
                            </pre>
                        )}

                        {!isPDF && !isJSON && !isXML && previewUrl && (
                            <div
                                className={
                                    isExpanded
                                        ? "h-[calc(100vh-200px)]"
                                        : "h-[600px]"
                                }
                            >
                                <iframe
                                    src={previewUrl}
                                    className="w-full h-full border border-gray-300 rounded"
                                    title="Vista previa de archivo"
                                />
                            </div>
                        )}

                        {!previewUrl && !jsonData && !xmlData && (
                            <div className="text-center py-12">
                                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-600">
                                    No hay vista previa disponible para este
                                    formato.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

FilePreview.propTypes = {
    invoiceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    fileUrl: PropTypes.string,
    fileName: PropTypes.string,
    contentType: PropTypes.string,
    cachedFile: PropTypes.shape({
        blob: PropTypes.any,
    }),
    onFileLoaded: PropTypes.func,
};
