import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
    useCreateSalesInvoice,
    useUpdateSalesInvoice,
    useSalesInvoice,
    useProvisionadas,
} from "../../hooks/useSalesInvoices";
import apiClient from "../../lib/api";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Save, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

const ESTADO_FACTURACION_CHOICES = [
    { value: "facturada", label: "Facturada" },
    { value: "pendiente_cobro", label: "Pendiente de Cobro" },
    { value: "pagada", label: "Pagada" },
    { value: "anulada_parcial", label: "Anulada Parcialmente" },
    { value: "anulada", label: "Anulada" },
];

export default function SalesInvoiceFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isEdit = !!id;

    // Obtener parámetros de URL para pre-llenar
    const otIdFromUrl = searchParams.get("ot_id");
    const costInvoiceIdFromUrl = searchParams.get("cost_invoice_id");

    const { data: invoice } = useSalesInvoice(id);
    const createMutation = useCreateSalesInvoice();
    const updateMutation = useUpdateSalesInvoice();

    const [formData, setFormData] = useState({
        numero_factura: "",
        ot: otIdFromUrl || "",
        ot_numero: "",
        cliente: "",
        cliente_nombre: "",
        cliente_data: null, // Datos completos del cliente (para retenciones)
        subtotal_gravado: "",
        subtotal_exento: "",
        iva_total: "",
        monto_total: "",
        fecha_emision: "",
        fecha_vencimiento: "",
        estado_facturacion: "facturada",
        estado_pago: "pendiente",
        notas: "",
    });

    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedOT, setSelectedOT] = useState(otIdFromUrl || null);
    const [selectedCostInvoices, setSelectedCostInvoices] = useState(
        costInvoiceIdFromUrl ? [parseInt(costInvoiceIdFromUrl)] : []
    );
    const [otSearchTerm, setOtSearchTerm] = useState("");
    const [manualRetention, setManualRetention] = useState(false);
    const [porcentajeIva, setPorcentajeIva] = useState(13.0); // IVA por defecto El Salvador
    const [tipoOperacion, setTipoOperacion] = useState("nacional"); // "nacional" o "internacional"
    const [extractionPreview, setExtractionPreview] = useState(null);
    const [isExtracting, setIsExtracting] = useState(false);

    // Ajustar IVA según tipo de operación
    useEffect(() => {
        if (tipoOperacion === "internacional") {
            setPorcentajeIva(0); // Facturas internacionales sin IVA
            // NO forzar valores a 0 - permitir que vengan del PDF o edición
            // Solo inicializar si están vacíos
            setFormData((prev) => ({
                ...prev,
                subtotal_gravado: prev.subtotal_gravado || "0.00",
                iva_total: "0.00", // Siempre 0 para internacionales
            }));
        } else {
            setPorcentajeIva(13.0); // Facturas nacionales con 13% IVA
        }
    }, [tipoOperacion]);

    // Calcular IVA y Total automáticamente (SOLO para facturas nacionales)
    useEffect(() => {
        // NO calcular automáticamente para facturas internacionales
        // (el monto total viene directamente del PDF sin impuestos)
        if (tipoOperacion === "internacional") {
            return;
        }

        const subtotalGravado = parseFloat(formData.subtotal_gravado) || 0;
        const subtotalExento = parseFloat(formData.subtotal_exento) || 0;

        // Calcular IVA solo sobre el subtotal gravado
        const ivaCalculado = subtotalGravado * (porcentajeIva / 100);

        // Calcular total
        const totalCalculado = subtotalGravado + subtotalExento + ivaCalculado;

        setFormData((prev) => ({
            ...prev,
            iva_total: ivaCalculado.toFixed(2),
            monto_total: totalCalculado.toFixed(2),
        }));
    }, [
        formData.subtotal_gravado,
        formData.subtotal_exento,
        porcentajeIva,
        tipoOperacion,
    ]);

    // Obtener OTs para búsqueda (TODAS, sin paginación)
    const { data: ots } = useQuery({
        queryKey: ["ots-search"],
        queryFn: async () => {
            const response = await apiClient.get("/ots/", {
                params: {
                    page_size: 9999, // Obtener todas las OTs
                },
            });
            return response.data;
        },
    });

    // Obtener facturas provisionadas cuando se selecciona OT
    const { data: provisionadas } = useProvisionadas(selectedOT);

    // Cargar datos si es edición
    useEffect(() => {
        if (invoice) {
            setFormData((prev) => ({
                ...prev,
                numero_factura: invoice.numero_factura || "",
                ot: invoice.ot ? invoice.ot.toString() : "",
                ot_numero: invoice.ot_numero || "",
                cliente: invoice.cliente ? invoice.cliente.toString() : "",
                cliente_nombre: invoice.cliente_nombre || "",
                subtotal_gravado: invoice.subtotal_gravado || "",
                subtotal_exento: invoice.subtotal_exento || "",
                iva_total: invoice.iva_total || "",
                monto_total: invoice.monto_total || "",
                fecha_emision: invoice.fecha_emision || "",
                fecha_vencimiento: invoice.fecha_vencimiento || "",
                estado_facturacion: invoice.estado_facturacion || "facturada",
                estado_pago: invoice.estado_pago || "pendiente",
                notas: invoice.notas || "",
            }));
            if (invoice.ot) {
                setSelectedOT(invoice.ot.toString());
            }
        }
    }, [invoice]);

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleOTSearchChange = (e) => {
        const value = e.target.value;
        setOtSearchTerm(value);
    };

    const handleSelectOT = async (ot) => {
        console.log("OT seleccionada completa:", ot);

        setSelectedOT(ot.id.toString());
        setOtSearchTerm(ot.numero_ot);

        // CORRECCIÓN: Usar cliente.id, NO cliente_alias (que es solo para renombrar PDFs)
        // El cliente_nombre YA viene con el nombre completo correcto
        const clienteId = ot.cliente?.toString() || "";

        setFormData((prev) => ({
            ...prev,
            ot: ot.id.toString(),
            ot_numero: ot.numero_ot,
            cliente: clienteId, // ID del cliente real
            cliente_nombre: ot.cliente_nombre || "", // Nombre completo del cliente
            cliente_data: null, // Se cargará abajo
        }));

        // Cargar datos completos del cliente (para calcular retenciones)
        if (clienteId) {
            try {
                const response = await apiClient.get(
                    `/clients/client-aliases/${clienteId}/`
                );
                setFormData((prev) => ({
                    ...prev,
                    cliente_data: response.data,
                }));
                console.log("Cliente data cargado:", response.data);
            } catch (error) {
                console.error("Error cargando cliente:", error);
            }
        }

        // No mostrar toast aquí para evitar múltiples notificaciones
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type === "application/pdf") {
                setSelectedFile(file);
                setExtractionPreview(null); // Limpiar preview anterior
                // No mostrar toast para evitar saturación
            } else {
                toast.error("Solo se permiten archivos PDF");
            }
        }
    };

    const handlePreviewExtraction = async () => {
        if (!selectedFile) {
            toast.error("Debes seleccionar un archivo PDF primero");
            return;
        }

        setIsExtracting(true);
        const previewData = new FormData();
        previewData.append("archivo_pdf", selectedFile);
        previewData.append("tipo_operacion", tipoOperacion);

        try {
            const response = await apiClient.post(
                "/sales/invoices/extract-pdf/",
                previewData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            setExtractionPreview(response.data);

            // Aplicar datos extraídos al formulario
            if (response.data.extracted_data) {
                const extracted = response.data.extracted_data;

                setFormData((prev) => ({
                    ...prev,
                    numero_factura:
                        extracted.numero_factura || prev.numero_factura,
                    fecha_emision:
                        extracted.fecha_emision || prev.fecha_emision,
                    fecha_vencimiento:
                        extracted.fecha_vencimiento || prev.fecha_vencimiento,
                    subtotal_gravado:
                        extracted.subtotal_gravado || prev.subtotal_gravado,
                    subtotal_exento:
                        extracted.subtotal_exento || prev.subtotal_exento,
                    // Solo usar iva_total del PDF si es > 0, sino dejar que se calcule
                    iva_total:
                        extracted.iva_total &&
                        parseFloat(extracted.iva_total) > 0
                            ? extracted.iva_total
                            : prev.iva_total,
                    monto_total: extracted.monto_total || prev.monto_total,
                }));

                // Actualizar % IVA si fue extraído
                if (extracted.porcentaje_iva) {
                    setPorcentajeIva(parseFloat(extracted.porcentaje_iva));
                }

                // IMPORTANTE: Detectar Gran Contribuyente automáticamente
                // Si hay retención IVA > 0, marcar checkbox automáticamente
                if (
                    extracted.monto_retencion_iva &&
                    parseFloat(extracted.monto_retencion_iva) > 0
                ) {
                    setManualRetention(true);
                }

                // Buscar OT automáticamente si se extrajo numero_ot (SIN toast, silencioso)
                if (extracted.numero_ot) {
                    const numeroOT = extracted.numero_ot;

                    // Buscar la OT en el backend usando search
                    apiClient
                        .get(`/ots/`, {
                            params: { search: numeroOT },
                        })
                        .then((otResponse) => {
                            if (
                                otResponse.data.results &&
                                otResponse.data.results.length > 0
                            ) {
                                // Buscar coincidencia exacta en los resultados
                                const otEncontrada =
                                    otResponse.data.results.find(
                                        (ot) => ot.numero_ot === numeroOT
                                    ) || otResponse.data.results[0];

                                handleSelectOT(otEncontrada);
                            } else {
                                setOtSearchTerm(numeroOT);
                            }
                        })
                        .catch((error) => {
                            console.error("Error buscando OT:", error);
                            setOtSearchTerm(numeroOT);
                        });
                }

                // UN SOLO TOAST al final con toda la info
                const confidencePercent = (
                    response.data.confidence * 100
                ).toFixed(0);
                toast.success(
                    `✓ Datos extraídos exitosamente (${confidencePercent}% confianza)`,
                    { duration: 3000 }
                );
            }
        } catch (error) {
            console.error("Error en preview de extracción:", error);
            toast.error(
                error.response?.data?.error || "Error al extraer datos del PDF"
            );
        } finally {
            setIsExtracting(false);
        }
    };

    const toggleCostInvoice = (invoiceId) => {
        setSelectedCostInvoices((prev) => {
            if (prev.includes(invoiceId)) {
                return prev.filter((id) => id !== invoiceId);
            } else {
                return [...prev, invoiceId];
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validaciones

        if (!formData.cliente) {
            toast.error(
                "Debes seleccionar un cliente"
            );
            return;
        }

        const data = new FormData();

        // 🔍 DEBUG: Ver valores antes de enviar
        console.log("📤 Valores antes de enviar:", {
            subtotal_gravado: formData.subtotal_gravado,
            subtotal_exento: formData.subtotal_exento,
            iva_total: formData.iva_total,
            monto_total: formData.monto_total,
        });

        // Agregar campos requeridos
        data.append("numero_factura", formData.numero_factura);
        data.append("ot", formData.ot);
        data.append("cliente", formData.cliente);
        data.append("monto_total", formData.monto_total || 0);
        data.append("fecha_emision", formData.fecha_emision);
        // fecha_vencimiento es requerida: usar fecha_emision si no existe
        data.append(
            "fecha_vencimiento",
            formData.fecha_vencimiento || formData.fecha_emision
        );
        data.append("estado_facturacion", formData.estado_facturacion);
        data.append("estado_pago", formData.estado_pago);

        // Tipo de operación (nacional o internacional)
        data.append("tipo_operacion", tipoOperacion);

        // Campos opcionales
        if (formData.subtotal_gravado)
            data.append("subtotal_gravado", formData.subtotal_gravado);
        if (formData.subtotal_exento)
            data.append("subtotal_exento", formData.subtotal_exento);
        if (formData.iva_total) data.append("iva_total", formData.iva_total);
        if (formData.notas) data.append("notas", formData.notas);

        // Archivo PDF
        if (selectedFile) {
            data.append("archivo_pdf", selectedFile);
        }

        if (manualRetention) {
            data.append("aplica_retencion_iva", "true");
        } else {
            data.append("aplica_retencion_iva", "false");
        }

        try {
            let savedInvoice;

            if (isEdit) {
                savedInvoice = await updateMutation.mutateAsync({ id, data });
                toast.success("Factura actualizada exitosamente");
            } else {
                savedInvoice = await createMutation.mutateAsync(data);

                // Si hubo extracción automática, mostrar info
                // Mostrar mensaje de éxito simple
                toast.success("✓ Factura creada exitosamente!", {
                    duration: 4000,
                });
            }

            // Si hay facturas de costo seleccionadas, asociarlas
            if (selectedCostInvoices.length > 0 && savedInvoice) {
                try {
                    // Usar el ID de la factura recién creada
                    const invoiceId = savedInvoice.id;

                    // Asociar todos los costos de una sola vez
                    await apiClient.post(
                        `/sales/invoices/${invoiceId}/associate_costs/`,
                        { invoice_ids: selectedCostInvoices }
                    );

                    // No mostrar toast adicional, ya se mostró el de factura creada
                } catch (error) {
                    // No mostrar error si la factura ya se creó correctamente
                    console.error("Error asociando costos:", error);
                }
            }

            navigate("/sales/invoices");
        } catch (error) {
            console.error("Error:", error);
            const errorData = error.response?.data;

            if (errorData) {
                // Si hay errores de validación específicos del campo
                if (typeof errorData === "object") {
                    Object.entries(errorData).forEach(([field, messages]) => {
                        // messages puede ser un array o un string
                        const message = Array.isArray(messages)
                            ? messages.join(" ")
                            : messages;
                        toast.error(`${field}: ${message}`);
                    });
                } else {
                    // Error genérico
                    toast.error(
                        errorData.detail ||
                            errorData.message ||
                            "Error al guardar la factura"
                    );
                }
            } else {
                toast.error("Error de red o respuesta no recibida");
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {isEdit
                            ? "Editar Factura de Venta"
                            : "Nueva Factura de Venta"}
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEdit
                            ? "Actualizar información de la factura"
                            : "Cargar nueva factura de venta emitida al cliente"}
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => navigate("/sales/invoices")}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
            </div>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>
                            Información de la Factura de Venta
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* PASO 1: Tipo de Operación - Primero */}
                            {!isEdit && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Paso 1: Tipo de Operación *
                                    </label>
                                    <select
                                        value={tipoOperacion}
                                        onChange={(e) =>
                                            setTipoOperacion(e.target.value)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="nacional">
                                            Factura Nacional
                                        </option>
                                        <option value="internacional">
                                            Factura Internacional
                                        </option>
                                    </select>
                                </div>
                            )}

                            {/* PASO 2: Archivo PDF - Drag & Drop Design */}
                            {!isEdit && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Paso 2: Archivo PDF de la Factura *
                                    </label>

                                    {!selectedFile ? (
                                        <div className="mt-2 flex justify-center px-6 pt-10 pb-10 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
                                            <div className="space-y-2 text-center">
                                                <svg
                                                    className="mx-auto h-16 w-16 text-gray-400"
                                                    stroke="currentColor"
                                                    fill="none"
                                                    viewBox="0 0 48 48"
                                                    aria-hidden="true"
                                                >
                                                    <path
                                                        d="M24 8v24m0 0l-8-8m8 8l8-8"
                                                        strokeWidth={2}
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                    <path
                                                        d="M8 40h32"
                                                        strokeWidth={2}
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                <div className="text-sm text-gray-600">
                                                    <label
                                                        htmlFor="pdf-upload"
                                                        className="relative cursor-pointer rounded-md font-semibold text-blue-600 hover:text-blue-500"
                                                    >
                                                        <span>
                                                            Arrastra archivos
                                                            aquí o haz click
                                                            para seleccionar
                                                        </span>
                                                        <input
                                                            id="pdf-upload"
                                                            type="file"
                                                            className="sr-only"
                                                            accept=".pdf"
                                                            onChange={
                                                                handleFileChange
                                                            }
                                                        />
                                                    </label>
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                    PDF, JSON, XML - Máximo 20
                                                    archivos de 10MB cada uno
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-300 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {selectedFile.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {(
                                                                selectedFile.size /
                                                                1024 /
                                                                1024
                                                            ).toFixed(2)}{" "}
                                                            MB
                                                        </p>
                                                    </div>
                                                </div>
                                                <label
                                                    htmlFor="pdf-upload-change"
                                                    className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer font-medium"
                                                >
                                                    Cambiar
                                                    <input
                                                        id="pdf-upload-change"
                                                        type="file"
                                                        className="sr-only"
                                                        accept=".pdf"
                                                        onChange={
                                                            handleFileChange
                                                        }
                                                    />
                                                </label>
                                            </div>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={
                                                    handlePreviewExtraction
                                                }
                                                disabled={isExtracting}
                                                className="w-full"
                                            >
                                                {isExtracting ? (
                                                    <>
                                                        <span className="animate-spin mr-2">
                                                            ⏳
                                                        </span>
                                                        Extrayendo datos...
                                                    </>
                                                ) : (
                                                    <>
                                                        🔍 Extraer Datos del PDF
                                                    </>
                                                )}
                                            </Button>

                                            {extractionPreview && (
                                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                                                    <p className="font-semibold text-green-900">
                                                        ✓ Datos extraídos (
                                                        {(
                                                            extractionPreview.confidence *
                                                            100
                                                        ).toFixed(0)}
                                                        % confianza)
                                                    </p>
                                                    <p className="text-xs text-green-700 mt-1">
                                                        Patrón:{" "}
                                                        {
                                                            extractionPreview.patron_utilizado
                                                        }
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Separador visual */}
                            <div className="md:col-span-2 border-t pt-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                    Paso 3: Datos de la Factura
                                    (auto-completados o edita manualmente)
                                </h3>
                            </div>

                            {/* OT - Con búsqueda */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Número de OT *{" "}
                                    {formData.ot_numero && (
                                        <CheckCircle2 className="inline h-4 w-4 text-green-600 ml-1" />
                                    )}
                                </label>
                                <div className="space-y-2">
                                    <Input
                                        type="text"
                                        value={otSearchTerm}
                                        onChange={handleOTSearchChange}
                                        placeholder="Buscar OT por número o cliente..."
                                        className="w-full"
                                    />
                                    {otSearchTerm && ots?.results && (
                                        <div className="max-h-48 overflow-y-auto border rounded-md bg-white shadow-lg">
                                            {ots.results
                                                .filter(
                                                    (ot) =>
                                                        ot.numero_ot
                                                            .toLowerCase()
                                                            .includes(
                                                                otSearchTerm.toLowerCase()
                                                            ) ||
                                                        ot.cliente_nombre
                                                            ?.toLowerCase()
                                                            .includes(
                                                                otSearchTerm.toLowerCase()
                                                            )
                                                )
                                                .map((ot) => (
                                                    <div
                                                        key={ot.id}
                                                        onClick={() => {
                                                            handleSelectOT(ot);
                                                            setOtSearchTerm("");
                                                        }}
                                                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                                                    >
                                                        <div className="font-medium text-gray-900">
                                                            {ot.numero_ot}
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            {ot.cliente_nombre}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                    {selectedOT &&
                                        formData.ot_numero &&
                                        !otSearchTerm && (
                                            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                    <div>
                                                        <div className="font-medium text-gray-900">
                                                            {formData.ot_numero}
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            {
                                                                formData.cliente_nombre
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Escribe para buscar. El cliente se
                                    auto-completará.
                                </p>
                            </div>

                            {/* Cliente - Auto-completado */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cliente{" "}
                                    {formData.cliente_nombre && (
                                        <CheckCircle2 className="inline h-4 w-4 text-green-600 ml-1" />
                                    )}
                                </label>
                                <Input
                                    type="text"
                                    value={formData.cliente_nombre}
                                    readOnly
                                    placeholder="Se auto-completa al seleccionar OT"
                                    className={
                                        formData.cliente_nombre
                                            ? "bg-green-50 border-green-300"
                                            : "bg-gray-50"
                                    }
                                />
                                {!formData.cliente_nombre && (
                                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Primero selecciona una OT
                                    </p>
                                )}
                                {formData.cliente_nombre && (
                                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Cliente detectado automáticamente
                                    </p>
                                )}
                            </div>

                            {/* Número de Factura */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Número de Factura *
                                </label>
                                <Input
                                    type="text"
                                    required
                                    value={formData.numero_factura}
                                    onChange={(e) =>
                                        handleInputChange(
                                            "numero_factura",
                                            e.target.value
                                        )
                                    }
                                    placeholder="DTE-03-M001P001-000000000003465"
                                />
                            </div>

                            {/* Fecha de Emisión */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Fecha de Emisión *
                                </label>
                                <Input
                                    type="date"
                                    required
                                    value={formData.fecha_emision}
                                    onChange={(e) =>
                                        handleInputChange(
                                            "fecha_emision",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            {/* Fecha de Vencimiento */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Fecha de Vencimiento
                                </label>
                                <Input
                                    type="date"
                                    value={formData.fecha_vencimiento}
                                    onChange={(e) =>
                                        handleInputChange(
                                            "fecha_vencimiento",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            {/* Estado Facturación */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Estado de Facturación
                                </label>
                                <select
                                    value={formData.estado_facturacion}
                                    onChange={(e) =>
                                        handleInputChange(
                                            "estado_facturacion",
                                            e.target.value
                                        )
                                    }
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {ESTADO_FACTURACION_CHOICES.map(
                                        (choice) => (
                                            <option
                                                key={choice.value}
                                                value={choice.value}
                                            >
                                                {choice.label}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            {/* Montos */}
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-5 gap-6 border-t pt-6 mt-6">
                                {/* Subtotal Gravado - Solo para Nacional */}
                                {tipoOperacion === "nacional" && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Subtotal Gravado
                                        </label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.subtotal_gravado}
                                            onChange={(e) =>
                                                handleInputChange(
                                                    "subtotal_gravado",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="0.00"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Con IVA
                                        </p>
                                    </div>
                                )}

                                {/* Subtotal Exento - Solo para Nacional */}
                                {tipoOperacion === "nacional" && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Subtotal Exento
                                        </label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.subtotal_exento}
                                            onChange={(e) =>
                                                handleInputChange(
                                                    "subtotal_exento",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="0.00"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Sin IVA
                                        </p>
                                    </div>
                                )}

                                {/* % IVA - Solo para Nacional */}
                                {tipoOperacion === "nacional" && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            % IVA
                                        </label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={porcentajeIva}
                                            onChange={(e) =>
                                                setPorcentajeIva(
                                                    parseFloat(
                                                        e.target.value
                                                    ) || 13
                                                )
                                            }
                                            placeholder="13.00"
                                            className="bg-blue-50"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            El Salvador: 13%
                                        </p>
                                    </div>
                                )}

                                {/* IVA Total - Solo para Nacional */}
                                {tipoOperacion === "nacional" && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            IVA Total
                                        </label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.iva_total}
                                            readOnly
                                            className="bg-gray-100 font-semibold"
                                            placeholder="0.00"
                                        />
                                        <p className="text-xs text-green-600 mt-1">
                                            Auto-calculado
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Monto Total *
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        required
                                        readOnly={tipoOperacion === "nacional"}
                                        className={
                                            tipoOperacion === "nacional"
                                                ? "bg-gray-100 font-bold text-lg"
                                                : "font-bold text-lg"
                                        }
                                        value={formData.monto_total}
                                        onChange={(e) =>
                                            tipoOperacion === "internacional" &&
                                            handleInputChange(
                                                "monto_total",
                                                e.target.value
                                            )
                                        }
                                        placeholder="0.00"
                                    />
                                    <p className="text-xs text-green-600 mt-1">
                                        {tipoOperacion === "nacional"
                                            ? "Auto-calculado"
                                            : "Extraído del PDF o manual"}
                                    </p>
                                </div>
                            </div>

                            {/* Checkbox para Retención Manual - Solo para Nacional */}
                            {tipoOperacion === "nacional" && (
                                <div className="md:col-span-2 mt-4">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="manualRetention"
                                            checked={manualRetention}
                                            onChange={(e) =>
                                                setManualRetention(
                                                    e.target.checked
                                                )
                                            }
                                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <label
                                            htmlFor="manualRetention"
                                            className="text-sm font-medium text-gray-700"
                                        >
                                            Aplicar Retención 1% (Gran
                                            Contribuyente)
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Resumen de Retención - Solo para Nacional */}
                            {tipoOperacion === "nacional" &&
                                (manualRetention ||
                                    formData.cliente_data
                                        ?.aplica_retencion_iva) &&
                                formData.monto_total > 0 && (
                                    <div className="md:col-span-2 mt-4">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>
                                                    Resumen de Retención
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-700">
                                                            Total Factura:
                                                        </span>
                                                        <span className="font-mono">
                                                            $
                                                            {parseFloat(
                                                                formData.monto_total ||
                                                                    0
                                                            ).toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-700">
                                                            (-) Retención 1%:
                                                        </span>
                                                        <span className="font-mono text-red-600">
                                                            -$
                                                            {(
                                                                parseFloat(
                                                                    formData.subtotal_gravado ||
                                                                        0
                                                                ) * 0.01
                                                            ).toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between pt-2 border-t font-bold">
                                                        <span className="text-gray-900">
                                                            Neto a Cobrar:
                                                        </span>
                                                        <span className="font-mono text-green-600">
                                                            $
                                                            {(manualRetention ||
                                                            formData
                                                                .cliente_data
                                                                ?.aplica_retencion_iva
                                                                ? parseFloat(
                                                                      formData.monto_total ||
                                                                          0
                                                                  ) -
                                                                  parseFloat(
                                                                      formData.subtotal_gravado ||
                                                                          0
                                                                  ) *
                                                                      0.01
                                                                : parseFloat(
                                                                      formData.monto_total ||
                                                                          0
                                                                  )
                                                            ).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                        </div>
                    </CardContent>
                </Card>

                {/* Facturas de Costo Provisionadas */}
                {provisionadas && provisionadas.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Facturas de Costo Provisionadas para esta OT (
                                {provisionadas.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-600 mb-3">
                                Selecciona las facturas de costo que deseas
                                asociar a esta factura de venta:
                            </p>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {provisionadas.map((factura) => (
                                    <label
                                        key={factura.id}
                                        className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors bg-white"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedCostInvoices.includes(
                                                factura.id
                                            )}
                                            onChange={() =>
                                                toggleCostInvoice(factura.id)
                                            }
                                            className="mr-3 h-4 w-4 text-blue-600"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">
                                                        {factura.numero_factura}
                                                    </span>
                                                    <Badge variant="outline">
                                                        {factura.estado_provision.toUpperCase()}
                                                    </Badge>
                                                </div>
                                                <span className="font-bold text-sm">
                                                    $
                                                    {parseFloat(
                                                        factura.monto_aplicable ||
                                                            0
                                                    ).toFixed(2)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {factura.proveedor_nombre} -{" "}
                                                {factura.tipo_costo_display}
                                            </p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            {selectedCostInvoices.length > 0 && (
                                <div className="mt-3 p-2 bg-blue-50 rounded">
                                    <p className="text-sm font-medium text-blue-900">
                                        {selectedCostInvoices.length} factura(s)
                                        de costo seleccionada(s)
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Notas y Botones */}
                <Card>
                    <CardHeader>
                        <CardTitle>Notas Adicionales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Notas
                                </label>
                                <textarea
                                    rows="3"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.notas}
                                    onChange={(e) =>
                                        handleInputChange(
                                            "notas",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Notas adicionales sobre la factura..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate("/sales/invoices")}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={
                                        createMutation.isPending ||
                                        updateMutation.isPending
                                    }
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    {createMutation.isPending ||
                                    updateMutation.isPending
                                        ? "Guardando..."
                                        : "Guardar Factura"}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
