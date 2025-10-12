import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import apiClient from "../lib/api";

export function CreditNoteUploadPage() {
    const navigate = useNavigate();
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [selectedProveedor, setSelectedProveedor] = useState("");
    const [uploadResults, setUploadResults] = useState(null);

    const uploadMutation = useMutation(
        (data) => {
            const formData = new FormData();
            data.files.forEach((file) => {
                formData.append("files[]", file);
            });
            formData.append("proveedor_id", data.proveedor_id);
            return apiClient.post("/invoices/credit-notes/upload/", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
        },
        {
            onSuccess: (data) => {
                setUploadResults(data.data);
                setSelectedFiles([]);
            },
            onError: (error) => {
                console.error("Error al subir notas de crédito:", error);
            },
        }
    );

    const { data: providersData, isLoading: loadingProviders } = useQuery(["providers"], () =>
        apiClient.get("/catalogs/providers/").then((res) => res.data)
    );

    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            alert("Por favor selecciona al menos un archivo");
            return;
        }
        if (!selectedProveedor) {
            alert("Por favor selecciona un proveedor");
            return;
        }
        uploadMutation.mutate({ files: selectedFiles, proveedor_id: selectedProveedor });
    };

    const resetForm = () => {
        setSelectedFiles([]);
        setUploadResults(null);
        setSelectedProveedor("");
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
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
                        <h1 className="text-4xl font-bold text-gray-900">
                            Subir Notas de Crédito
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Carga archivos PDF de notas de crédito
                        </p>
                    </div>
                </div>
            </div>

            {uploadResults && (
                <Card
                    className={
                        uploadResults.errors > 0
                            ? "border-yellow-200 bg-yellow-50"
                            : "border-green-200 bg-green-50"
                    }
                >
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                {uploadResults.errors > 0 ? (
                                    <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                                ) : (
                                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 mb-2">
                                        Resultados del procesamiento
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600">Total</p>
                                            <p className="text-2xl font-bold text-gray-900">{uploadResults.total}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Procesados</p>
                                            <p className="text-2xl font-bold text-green-600">{uploadResults.processed}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Duplicados</p>
                                            <p className="text-2xl font-bold text-yellow-600">{uploadResults.duplicates}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Errores</p>
                                            <p className="text-2xl font-bold text-red-600">{uploadResults.errors}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {uploadResults.results?.success?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">✓ Archivos procesados exitosamente ({uploadResults.results.success.length})</h4>
                                    <div className="space-y-2">
                                        {uploadResults.results.success.map((item, index) => (
                                            <div key={index} className="p-4 bg-white rounded border border-gray-200 text-sm">
                                                <p className="font-medium text-gray-900">📄 {item.filename}</p>
                                                {item.numero_nota && <p>Nota de Crédito: {item.numero_nota}</p>}
                                                {item.monto && <p>Monto: {item.monto}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {uploadResults.results?.errors?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">✗ Errores ({uploadResults.results.errors.length})</h4>
                                    <div className="space-y-2">
                                        {uploadResults.results.errors.map((item, index) => (
                                            <div key={index} className="p-3 bg-white rounded border border-red-200 text-sm">
                                                <p className="font-medium text-gray-900">{item.filename}</p>
                                                <p className="text-red-600 mt-1">{item.error}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 pt-4 border-t border-gray-200">
                                <Button onClick={resetForm} variant="outline" size="sm">Subir más</Button>
                                <Button onClick={() => navigate("/invoices")} size="sm">Ver todas las facturas</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!uploadResults && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <label className="block font-semibold text-gray-900 mb-2">Proveedor</label>
                                <select
                                    value={selectedProveedor}
                                    onChange={(e) => setSelectedProveedor(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">-- Seleccionar proveedor --</option>
                                    {loadingProviders ? (
                                        <option disabled>Cargando...</option>
                                    ) : (
                                        providersData?.results?.map((provider) => (
                                            <option key={provider.id} value={provider.id}>
                                                {provider.nombre}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Archivos de Notas de Crédito</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FileUploadZone
                                onFilesSelected={setSelectedFiles}
                                maxFiles={20}
                            />
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-between">
                        <Button variant="outline" onClick={() => navigate("/invoices")}>Cancelar</Button>
                        <Button
                            onClick={handleUpload}
                            disabled={selectedFiles.length === 0 || uploadMutation.isLoading}
                        >
                            {uploadMutation.isLoading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                            ) : (
                                <><Upload className="w-4 h-4 mr-2" /> Subir {selectedFiles.length} {selectedFiles.length === 1 ? "archivo" : "archivos"}</>
                            )}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
