/**
 * Página para editar una factura existente
 * Permite actualizar todos los campos editables y estados
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    useInvoiceDetail,
    useInvoiceUpdate,
    useProviders,
} from "../hooks/useInvoices";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { ArrowLeft, Save, Loader2, AlertCircle } from "lucide-react";

const TIPO_COSTO_OPTIONS = [
    { value: "FLETE", label: "Flete" },
    { value: "CARGOS_NAVIERA", label: "Cargos de Naviera" },
    { value: "TRANSPORTE", label: "Transporte" },
    { value: "ADUANA", label: "Aduana" },
    { value: "ALMACENAJE", label: "Almacenaje" },
    { value: "DEMORA", label: "Demora" },
    { value: "OTRO", label: "Otro" },
];

const TIPO_PROVEEDOR_OPTIONS = [
    { value: "naviera", label: "Naviera" },
    { value: "transporte_local", label: "Transporte Local" },
    { value: "aduana", label: "Aduana" },
    { value: "agente_carga", label: "Agente de Carga" },
    { value: "otro", label: "Otro" },
];

const ESTADO_PROVISION_OPTIONS = [
    { value: "pendiente", label: "Pendiente" },
    { value: "provisionada", label: "Provisionada" },
    { value: "revision", label: "En Revisión" },
    { value: "disputada", label: "Disputada" },
];

const MANUAL_PROVISION_STATES = new Set(["revision", "disputada"]);

const ESTADO_FACTURACION_OPTIONS = [
    { value: "pendiente", label: "Pendiente" },
    { value: "facturada", label: "Facturada" },
];

export function InvoiceEditPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: invoice, isLoading, error } = useInvoiceDetail(id);
    const { data: providers, isLoading: providersLoading } = useProviders();
    const updateMutation = useInvoiceUpdate(id);

    const [formData, setFormData] = useState({
        numero_factura: "",
        fecha_emision: "",
        fecha_vencimiento: "",
        fecha_provision: "",
        fecha_facturacion: "",
        monto: "",
        tipo_costo: "OTRO",
        proveedor_id: "",
        tipo_proveedor: "otro",
        estado_provision: "pendiente",
        estado_facturacion: "pendiente",
        notas: "",
    });

    // Cargar datos de la factura cuando estén disponibles
    useEffect(() => {
        if (invoice) {
            // Determinar si debe sincronizar con OT
            const shouldSyncWithOT =
                (invoice.tipo_costo?.startsWith("FLETE") ||
                    invoice.tipo_costo === "CARGOS_NAVIERA") &&
                invoice.tipo_proveedor === "naviera" &&
                invoice.ot_data;

            // Si debe sincronizar y la factura no tiene fechas, usar las de la OT
            const safeDate = (value) => value || "";

            const fechaProvision =
                shouldSyncWithOT && !invoice.fecha_provision
                    ? safeDate(invoice.ot_data?.fecha_provision)
                    : safeDate(invoice.fecha_provision);

            const fechaFacturacion =
                shouldSyncWithOT && !invoice.fecha_facturacion
                    ? safeDate(invoice.ot_data?.fecha_recepcion_factura)
                    : safeDate(invoice.fecha_facturacion);

            // Auto-marcar estados según fechas existentes
            const rawEstadoProvision = invoice.estado_provision || "pendiente";

            const estadoProvision = fechaProvision
                ? "provisionada"
                : rawEstadoProvision === "provisionada"
                ? "provisionada"
                : MANUAL_PROVISION_STATES.has(rawEstadoProvision)
                ? rawEstadoProvision
                : "pendiente";

            const estadoFacturacion = fechaFacturacion
                ? "facturada"
                : invoice.estado_facturacion || "pendiente";

            const resolveProveedorId = () => {
                const rawProveedor = invoice.proveedor;
                if (
                    typeof rawProveedor === "number" ||
                    typeof rawProveedor === "string"
                ) {
                    return String(rawProveedor);
                }

                if (
                    rawProveedor &&
                    typeof rawProveedor === "object" &&
                    rawProveedor.id
                ) {
                    return String(rawProveedor.id);
                }

                if (invoice.proveedor_data?.id != null) {
                    return String(invoice.proveedor_data.id);
                }

                return "";
            };

            const resolvedProveedorId = resolveProveedorId();

            const resolvedTipoProveedor =
                invoice.tipo_proveedor ||
                invoice.proveedor_data?.tipo ||
                "otro";

            const resolvedTipoCosto = invoice.tipo_costo || "OTRO";

            const resolvedMonto =
                invoice.monto !== null && invoice.monto !== undefined
                    ? String(invoice.monto)
                    : "";

            setFormData({
                numero_factura: invoice.numero_factura || "",
                fecha_emision: invoice.fecha_emision || "",
                fecha_vencimiento: invoice.fecha_vencimiento || "",
                fecha_provision: fechaProvision,
                fecha_facturacion: fechaFacturacion,
                monto: resolvedMonto,
                tipo_costo: resolvedTipoCosto,
                proveedor_id: resolvedProveedorId,
                tipo_proveedor: resolvedTipoProveedor,
                estado_provision: estadoProvision,
                estado_facturacion: estadoFacturacion,
                notas: invoice.notas || "",
            });
        }
    }, [invoice]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => {
            const newData = {
                ...prev,
                [name]: value,
            };

            // Auto-marcado de estados según fechas
            // Si se ingresa fecha_provision, marcar como provisionada
            if (name === "fecha_provision") {
                if (value) {
                    newData.estado_provision = "provisionada";
                } else {
                    if (!MANUAL_PROVISION_STATES.has(prev.estado_provision)) {
                        newData.estado_provision = "pendiente";
                    }
                }
            }

            // Si se ingresa fecha_facturacion, marcar como facturada
            if (name === "fecha_facturacion") {
                if (value) {
                    newData.estado_facturacion = "facturada";
                } else {
                    newData.estado_facturacion = "pendiente";
                }
            }

            if (name === "estado_provision") {
                if (value === "pendiente") {
                    newData.fecha_provision = "";
                }

                if (MANUAL_PROVISION_STATES.has(value)) {
                    newData.fecha_provision = "";
                }
            }

            // Limpiar fecha_facturacion si se marca en estados negativos
            // (preparado para futuros estados como 'disputada', 'en_revision')
            if (
                name === "estado_facturacion" &&
                ["disputada", "en_revision"].includes(value)
            ) {
                newData.fecha_facturacion = "";
            }

            return newData;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const normalizeDate = (value) => (value ? value : null);

            let normalizedMonto =
                formData.monto === "" ? null : Number(formData.monto);
            if (normalizedMonto !== null && Number.isNaN(normalizedMonto)) {
                normalizedMonto = null;
            }

            const payload = {
                ...formData,
                monto: normalizedMonto,
                proveedor_id: formData.proveedor_id
                    ? Number(formData.proveedor_id)
                    : null,
                fecha_emision: normalizeDate(formData.fecha_emision),
                fecha_vencimiento: normalizeDate(formData.fecha_vencimiento),
                fecha_provision: normalizeDate(formData.fecha_provision),
                fecha_facturacion: normalizeDate(formData.fecha_facturacion),
            };

            await updateMutation.mutateAsync(payload);
            navigate(`/invoices/${id}`);
        } catch (error) {
            console.error("Error al actualizar factura:", error);
            alert(
                "Error al actualizar la factura: " +
                    (error.response?.data?.detail || error.message)
            );
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">Cargando factura...</p>
                </div>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Error al cargar factura
                </h2>
                <p className="text-gray-600 mb-6">
                    {error?.message || "No se encontró la factura"}
                </p>
                <Button onClick={() => navigate("/invoices")}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver a facturas
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/invoices/${id}`)}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Editar Factura
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {invoice.numero_factura}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Información General */}
                <Card>
                    <CardHeader>
                        <CardTitle>Información General</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Número de Factura *
                                </label>
                                <Input
                                    name="numero_factura"
                                    value={formData.numero_factura}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Monto (USD) *
                                </label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    name="monto"
                                    value={formData.monto}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha de Emisión *
                                </label>
                                <Input
                                    type="date"
                                    name="fecha_emision"
                                    value={formData.fecha_emision}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha de Vencimiento
                                </label>
                                <Input
                                    type="date"
                                    name="fecha_vencimiento"
                                    value={formData.fecha_vencimiento}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo de Costo *
                                </label>
                                <select
                                    name="tipo_costo"
                                    value={formData.tipo_costo}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    {TIPO_COSTO_OPTIONS.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo de Proveedor
                                </label>
                                <select
                                    name="tipo_proveedor"
                                    value={formData.tipo_proveedor}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {TIPO_PROVEEDOR_OPTIONS.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Información del Proveedor */}
                <Card>
                    <CardHeader>
                        <CardTitle>Información del Proveedor</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Proveedor *
                                </label>
                                <select
                                    name="proveedor_id"
                                    value={formData.proveedor_id}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                    disabled={providersLoading}
                                >
                                    <option value="">
                                        Selecciona un proveedor...
                                    </option>
                                    {providers?.results?.map((proveedor) => (
                                        <option
                                            key={proveedor.id}
                                            value={String(proveedor.id)}
                                        >
                                            {proveedor.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo de Proveedor
                                </label>
                                <select
                                    name="tipo_proveedor"
                                    value={formData.tipo_proveedor}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {TIPO_PROVEEDOR_OPTIONS.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Estados */}
                <Card>
                    <CardHeader>
                        <CardTitle>Estados y Fechas</CardTitle>
                        {(formData.tipo_costo?.startsWith("FLETE") ||
                            formData.tipo_costo === "CARGOS_NAVIERA") &&
                            formData.tipo_proveedor === "naviera" &&
                            invoice?.ot && (
                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                                    <strong>Sincronización Activa:</strong> Las
                                    fechas se sincronizan automáticamente con la
                                    OT{" "}
                                    <span className="font-mono">
                                        {invoice.ot_data?.numero_ot}
                                    </span>
                                </div>
                            )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Estado de Provisión
                                </label>
                                <select
                                    name="estado_provision"
                                    value={formData.estado_provision}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {ESTADO_PROVISION_OPTIONS.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha de Provisión
                                </label>
                                <Input
                                    type="date"
                                    name="fecha_provision"
                                    value={formData.fecha_provision}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Estado de Facturación
                                </label>
                                <select
                                    name="estado_facturacion"
                                    value={formData.estado_facturacion}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {ESTADO_FACTURACION_OPTIONS.map(
                                        (option) => (
                                            <option
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha de Facturación
                                </label>
                                <Input
                                    type="date"
                                    name="fecha_facturacion"
                                    value={formData.fecha_facturacion}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Notas */}
                <Card>
                    <CardHeader>
                        <CardTitle>Notas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <textarea
                            name="notas"
                            value={formData.notas}
                            onChange={handleChange}
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Agrega notas u observaciones sobre esta factura..."
                        />
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate(`/invoices/${id}`)}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Guardar cambios
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
