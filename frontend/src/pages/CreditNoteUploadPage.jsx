import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { FileUploadZone } from "../components/ui/FileUploadZone";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import {
    ArrowLeft,
    Upload,
    CheckCircle,
    AlertCircle,
    FileText,
    Loader2,
    Edit,
} from "lucide-react";
import apiClient from "../lib/api";

export function CreditNoteUploadPage() {
    const navigate = useNavigate();
    const [mode, setMode] = useState("upload"); // "upload" | "manual"
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [selectedProveedor, setSelectedProveedor] = useState("");
    const [uploadResults, setUploadResults] = useState(null);

    // Campos para entrada manual
    const [manualForm, setManualForm] = useState({
        numero_nota: "",
        invoice_id: "",
        monto: "",
        motivo: "",
        fecha_emision: new Date().toISOString().split('T')[0],
    });
    const [manualFile, setManualFile] = useState(null);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

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

    // Query para buscar facturas
    const [invoiceSearch, setInvoiceSearch] = useState("");
    const { data: invoicesData, isLoading: loadingInvoices } = useQuery(
        ["invoices-search", invoiceSearch],
        async () => {
            if (!invoiceSearch) return { results: [] };
            const response = await apiClient.get(`/invoices/?search=${invoiceSearch}&page_size=10`);
            return response.data;
        },
        { enabled: mode === "manual" && invoiceSearch.length > 2 }
    );

    // Mutation para entrada manual
    const manualMutation = useMutation(
        async (data) => {
            const formData = new FormData();
            formData.append("numero_nota", data.numero_nota);
            formData.append("invoice_id", data.invoice_id);
            formData.append("monto", parseFloat(data.monto));
            formData.append("motivo", data.motivo);
            formData.append("fecha_emision", data.fecha_emision);
            if (data.file) {
                formData.append("file", data.file);
            }
            return apiClient.post("/invoices/credit-notes/manual/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
        },
        {
            onSuccess: (response) => {
                toast.success("Nota de crédito creada exitosamente");
                resetForm();
                navigate("/invoices/credit-notes");
            },
            onError: (error) => {
                const errorMsg = error.response?.data?.detail || "Error al crear la nota de crédito";
                toast.error(errorMsg);
            },
        }
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
        setManualForm({
            numero_nota: "",
            invoice_id: "",
            monto: "",
            motivo: "",
            fecha_emision: new Date().toISOString().split('T')[0],
        });
        setManualFile(null);
        setSelectedInvoice(null);
        setInvoiceSearch("");
    };

    const handleManualSubmit = () => {
        // Validaciones
        if (!manualForm.numero_nota.trim()) {
            toast.error("El número de nota es obligatorio");
            return;
        }
        if (!manualForm.invoice_id) {
            toast.error("Debes seleccionar una factura");
            return;
        }
        if (!manualForm.monto || parseFloat(manualForm.monto) <= 0) {
            toast.error("El monto debe ser mayor a 0");
            return;
        }
        if (!manualForm.motivo.trim()) {
            toast.error("El motivo es obligatorio");
            return;
        }

        manualMutation.mutate({
            ...manualForm,
            file: manualFile,
        });
    };

    const handleInvoiceSelect = (invoice) => {
        setSelectedInvoice(invoice);
        setManualForm(prev => ({ ...prev, invoice_id: invoice.id }));
        setInvoiceSearch("");
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
                    {/* Tabs para seleccionar modo */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex gap-2 border-b border-gray-200">
                                <button
                                    onClick={() => setMode("upload")}
                                    className={`px-4 py-2 font-medium transition-colors ${
                                        mode === "upload"
                                            ? "border-b-2 border-blue-600 text-blue-600"
                                            : "text-gray-600 hover:text-gray-900"
                                    }`}
                                >
                                    <Upload className="w-4 h-4 inline mr-2" />
                                    Carga Automática (PDF)
                                </button>
                                <button
                                    onClick={() => setMode("manual")}
                                    className={`px-4 py-2 font-medium transition-colors ${
                                        mode === "manual"
                                            ? "border-b-2 border-blue-600 text-blue-600"
                                            : "text-gray-600 hover:text-gray-900"
                                    }`}
                                >
                                    <Edit className="w-4 h-4 inline mr-2" />
                                    Entrada Manual
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    {mode === "upload" ? (
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
                                <Button variant="outline" onClick={() => navigate("/invoices/credit-notes")}>Cancelar</Button>
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
                    ) : (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Datos de la Nota de Crédito</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Número de Nota <span className="text-red-500">*</span>
                                            </label>
                                            <Input
                                                type="text"
                                                value={manualForm.numero_nota}
                                                onChange={(e) => setManualForm(prev => ({ ...prev, numero_nota: e.target.value }))}
                                                placeholder="NC-2024-001"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Fecha de Emisión <span className="text-red-500">*</span>
                                            </label>
                                            <Input
                                                type="date"
                                                value={manualForm.fecha_emision}
                                                onChange={(e) => setManualForm(prev => ({ ...prev, fecha_emision: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Factura Asociada <span className="text-red-500">*</span>
                                        </label>
                                        {selectedInvoice ? (
                                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-gray-900">{selectedInvoice.numero_factura}</p>
                                                    <p className="text-sm text-gray-600">
                                                        {selectedInvoice.proveedor_nombre} • ${selectedInvoice.monto?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                        {selectedInvoice.ot_data && ` • OT: ${selectedInvoice.ot_data.numero_ot}`}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedInvoice(null);
                                                        setManualForm(prev => ({ ...prev, invoice_id: "" }));
                                                    }}
                                                >
                                                    Cambiar
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <Input
                                                    type="text"
                                                    value={invoiceSearch}
                                                    onChange={(e) => setInvoiceSearch(e.target.value)}
                                                    placeholder="Buscar por número de factura, proveedor, OT..."
                                                />
                                                {invoicesData?.results?.length > 0 && (
                                                    <div className="mt-2 border border-gray-200 rounded-md max-h-60 overflow-y-auto">
                                                        {invoicesData.results.map((invoice) => (
                                                            <button
                                                                key={invoice.id}
                                                                onClick={() => handleInvoiceSelect(invoice)}
                                                                className="w-full p-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                                                            >
                                                                <p className="font-medium text-gray-900">{invoice.numero_factura}</p>
                                                                <p className="text-sm text-gray-600">
                                                                    {invoice.proveedor_nombre} • ${invoice.monto?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                                    {invoice.ot_data && ` • OT: ${invoice.ot_data.numero_ot}`}
                                                                </p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Monto (USD) <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            type="number"
                                            value={manualForm.monto}
                                            onChange={(e) => setManualForm(prev => ({ ...prev, monto: e.target.value }))}
                                            placeholder="0.00"
                                            step="0.01"
                                            min="0.01"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            Ingresa el monto positivo. Se guardará automáticamente como negativo.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Motivo / Referencia <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={manualForm.motivo}
                                            onChange={(e) => setManualForm(prev => ({ ...prev, motivo: e.target.value }))}
                                            placeholder="Describe el motivo de la nota de crédito..."
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Archivo PDF (Opcional)
                                        </label>
                                        <Input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => setManualFile(e.target.files[0])}
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            Sube el PDF de la nota de crédito si lo tienes disponible
                                        </p>
                                    </div>

                                    {selectedInvoice?.ot_data && (
                                        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                                            <p className="text-sm text-green-800">
                                                <strong>OT Detectada:</strong> Esta factura está asociada a la OT{" "}
                                                <strong>{selectedInvoice.ot_data.numero_ot}</strong>. La nota de crédito se vinculará automáticamente.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="flex items-center justify-between">
                                <Button variant="outline" onClick={() => navigate("/invoices/credit-notes")}>Cancelar</Button>
                                <Button
                                    onClick={handleManualSubmit}
                                    disabled={manualMutation.isLoading}
                                >
                                    {manualMutation.isLoading ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
                                    ) : (
                                        <><CheckCircle className="w-4 h-4 mr-2" /> Crear Nota de Crédito</>
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
