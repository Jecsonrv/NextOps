/**
 * Página de Pagos a Proveedores - Estilo Maersk
 *
 * Características:
 * - Diseño limpio y profesional
 * - Sistema de tabs para Pendientes e Historial
 * - Selección múltiple de facturas
 * - Resumen visual de deuda por proveedor
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../lib/api";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "../../components/ui/Tabs";
import { Button } from "../../components/ui/Button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/Dialog";
import {
    DollarSign,
    Building2,
    FileText,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Receipt,
    CreditCard,
} from "lucide-react";
import SupplierPaymentForm from "../../components/supplier-payments/SupplierPaymentForm";
import PaymentsHistory from "../../components/supplier-payments/PaymentsHistory";

function ProveedoresList({ proveedores, selected, onSelect }) {
    if (proveedores.length === 0) {
        return (
            <div className="text-center py-12">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-3" />
                <p className="text-gray-600 font-medium">
                    No hay proveedores con facturas pendientes
                </p>
                <p className="text-gray-500 text-sm mt-1">
                    Todas las cuentas están al día
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {proveedores.map((p) => {
                const isSelected = selected?.proveedor_id === p.proveedor_id;

                return (
                    <button
                        key={p.proveedor_id}
                        onClick={() => onSelect(p)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                            isSelected
                                ? "bg-blue-50 border-blue-500 shadow-sm"
                                : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
                        }`}
                    >
                        <div className="flex items-start gap-2.5">
                            <div
                                className={`mt-0.5 p-1.5 rounded-md ${
                                    isSelected ? "bg-blue-100" : "bg-gray-100"
                                }`}
                            >
                                <Building2
                                    className={`h-4 w-4 ${
                                        isSelected
                                            ? "text-blue-600"
                                            : "text-gray-600"
                                    }`}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2 mb-1.5">
                                    <p
                                        className={`font-semibold text-sm truncate ${
                                            isSelected
                                                ? "text-blue-900"
                                                : "text-gray-900"
                                        }`}
                                    >
                                        {p.proveedor_nombre}
                                    </p>
                                    <Badge
                                        variant={
                                            isSelected ? "default" : "secondary"
                                        }
                                        className="flex-shrink-0 text-xs"
                                    >
                                        {p.total_facturas}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">
                                        Pendiente
                                    </span>
                                    <span
                                        className={`text-sm font-bold ${
                                            isSelected
                                                ? "text-blue-700"
                                                : "text-gray-900"
                                        }`}
                                    >
                                        ${p.total_pendiente.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

function FacturasPendientesList({ facturas, selected, onToggle }) {
    if (facturas.length === 0) {
        return (
            <div className="text-center py-12">
                <Receipt className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-600 font-medium">
                    No hay facturas pendientes
                </p>
                <p className="text-gray-500 text-sm mt-1">
                    Este proveedor no tiene deudas
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {facturas.map((f) => {
                const isSelected = selected.includes(f.id);
                const diasVencimiento = f.dias_hasta_vencimiento;
                const estaVencida = f.esta_vencida;

                return (
                    <label
                        key={f.id}
                        className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                            isSelected
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                    >
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggle(f.id)}
                            className="mt-0.5 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                        />

                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-1.5">
                                <div className="flex items-start gap-1.5 flex-1 min-w-0">
                                    <FileText
                                        className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                                            isSelected
                                                ? "text-blue-600"
                                                : "text-gray-400"
                                        }`}
                                    />
                                    <div className="min-w-0">
                                        <p
                                            className={`font-semibold text-sm truncate ${
                                                isSelected
                                                    ? "text-blue-900"
                                                    : "text-gray-900"
                                            }`}
                                        >
                                            {f.numero_factura}
                                        </p>
                                        <div className="flex gap-2 mt-0.5">
                                            {f.ot_number && (
                                                <span className="text-xs text-gray-500">
                                                    {f.ot_number}
                                                </span>
                                            )}
                                            {f.ot_data?.cliente && (
                                                <span className="text-xs text-gray-500">
                                                    • {f.ot_data.cliente}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p
                                        className={`text-base font-bold ${
                                            isSelected
                                                ? "text-blue-700"
                                                : "text-gray-900"
                                        }`}
                                    >
                                        $
                                        {parseFloat(f.monto_pendiente).toFixed(
                                            2
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        de $
                                        {parseFloat(f.monto_aplicable).toFixed(
                                            2
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 text-xs">
                                <span className="text-gray-500">
                                    {new Date(
                                        f.fecha_emision
                                    ).toLocaleDateString("es-MX")}
                                </span>
                                <span className="text-gray-300">•</span>
                                {estaVencida ? (
                                    <div className="flex items-center gap-1 text-red-600 font-medium">
                                        <AlertTriangle className="h-3 w-3" />
                                        Vencida {Math.abs(diasVencimiento)}d
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-amber-600">
                                        <Clock className="h-3 w-3" />
                                        Vence en {diasVencimiento}d
                                    </div>
                                )}
                            </div>
                        </div>
                    </label>
                );
            })}
        </div>
    );
}

export default function SupplierPaymentsPage() {
    const [activeTab, setActiveTab] = useState("pendientes");
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [selectedInvoices, setSelectedInvoices] = useState([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    const { data: proveedoresStats, isLoading: isLoadingProveedores } =
        useQuery({
            queryKey: ["supplier-payment-stats"],
            queryFn: async () => {
                const response = await apiClient.get(
                    "/supplier-payments/stats_por_proveedor/"
                );
                return response.data;
            },
        });

    const { data: facturasPendientes, isLoading: isLoadingFacturas } = useQuery(
        {
            queryKey: ["facturas-pendientes", selectedProvider?.proveedor_id],
            queryFn: async () => {
                const response = await apiClient.get(
                    "/supplier-payments/facturas_pendientes/",
                    {
                        params: {
                            proveedor_id: selectedProvider.proveedor_id,
                            incluir_parciales: true,
                        },
                    }
                );
                return response.data;
            },
            enabled: !!selectedProvider,
        }
    );

    const handleSelectProvider = (proveedor) => {
        setSelectedProvider(proveedor);
        setSelectedInvoices([]);
    };

    const toggleInvoiceSelection = (invoiceId) => {
        setSelectedInvoices((prev) =>
            prev.includes(invoiceId)
                ? prev.filter((id) => id !== invoiceId)
                : [...prev, invoiceId]
        );
    };

    const totalSeleccionado = useMemo(() => {
        if (!facturasPendientes) return 0;
        return selectedInvoices.reduce((acc, id) => {
            const factura = facturasPendientes.find((f) => f.id === id);
            return acc + parseFloat(factura?.monto_pendiente || 0);
        }, 0);
    }, [selectedInvoices, facturasPendientes]);

    const facturasSeleccionadas = useMemo(() => {
        if (!facturasPendientes) return [];
        return facturasPendientes.filter((f) =>
            selectedInvoices.includes(f.id)
        );
    }, [selectedInvoices, facturasPendientes]);

    const handlePaymentSuccess = () => {
        setShowPaymentModal(false);
        setSelectedInvoices([]);
        setSelectedProvider(null);
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="border-b border-gray-200 pb-4">
                <h1 className="text-2xl font-bold text-gray-900">
                    Pagos a Proveedores
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                    Gestión de cuentas por pagar (CxP) - Registra pagos y
                    consulta el historial
                </p>
            </div>

            {/* Tabs Navigation */}
            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
            >
                <TabsList className="grid w-full max-w-md grid-cols-2 h-10 bg-gray-100 p-1">
                    <TabsTrigger
                        value="pendientes"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium text-sm"
                    >
                        <DollarSign className="h-4 w-4 mr-1.5" />
                        Pendientes
                    </TabsTrigger>
                    <TabsTrigger
                        value="historial"
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium text-sm"
                    >
                        <Clock className="h-4 w-4 mr-1.5" />
                        Historial
                    </TabsTrigger>
                </TabsList>

                {/* Tab: Pendientes de Pago */}
                <TabsContent value="pendientes" className="mt-5">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Columna: Proveedores */}
                        <div className="lg:col-span-1">
                            <Card className="border border-gray-300 shadow-sm">
                                <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white pb-3">
                                    <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-gray-600" />
                                        Proveedores con Deuda
                                    </CardTitle>
                                    {proveedoresStats &&
                                        proveedoresStats.length > 0 && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {proveedoresStats.length}{" "}
                                                proveedor(es) pendiente(s)
                                            </p>
                                        )}
                                </CardHeader>
                                <CardContent className="pt-3">
                                    {isLoadingProveedores ? (
                                        <div className="text-center py-12">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto"></div>
                                            <p className="text-gray-500 text-sm mt-4">
                                                Cargando proveedores...
                                            </p>
                                        </div>
                                    ) : (
                                        <ProveedoresList
                                            proveedores={proveedoresStats || []}
                                            selected={selectedProvider}
                                            onSelect={handleSelectProvider}
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Columna: Facturas Pendientes */}
                        <div className="lg:col-span-2">
                            <Card className="border border-gray-300 shadow-sm">
                                <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white pb-3">
                                    <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-gray-600" />
                                        {selectedProvider
                                            ? `Facturas de ${selectedProvider.proveedor_nombre}`
                                            : "Selecciona un Proveedor"}
                                    </CardTitle>
                                    {selectedProvider && facturasPendientes && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            {facturasPendientes.length}{" "}
                                            factura(s) pendiente(s)
                                        </p>
                                    )}
                                </CardHeader>
                                <CardContent className="pt-3">
                                    {isLoadingFacturas ? (
                                        <div className="text-center py-12">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto"></div>
                                            <p className="text-gray-500 text-sm mt-4">
                                                Cargando facturas...
                                            </p>
                                        </div>
                                    ) : selectedProvider &&
                                      facturasPendientes ? (
                                        <>
                                            <FacturasPendientesList
                                                facturas={facturasPendientes}
                                                selected={selectedInvoices}
                                                onToggle={
                                                    toggleInvoiceSelection
                                                }
                                            />

                                            {/* Resumen de Selección */}
                                            {selectedInvoices.length > 0 && (
                                                <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-lg border border-blue-300 shadow-sm">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <p className="text-xs font-medium text-blue-700">
                                                                {
                                                                    selectedInvoices.length
                                                                }{" "}
                                                                factura(s)
                                                                seleccionada(s)
                                                            </p>
                                                            <p className="text-xl font-bold text-blue-900 mt-0.5">
                                                                $
                                                                {totalSeleccionado.toFixed(
                                                                    2
                                                                )}
                                                            </p>
                                                            <p className="text-xs text-blue-600 mt-0.5">
                                                                Total a pagar
                                                            </p>
                                                        </div>
                                                        <Button
                                                            onClick={() =>
                                                                setShowPaymentModal(
                                                                    true
                                                                )
                                                            }
                                                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all"
                                                        >
                                                            <DollarSign className="mr-2 h-4 w-4" />
                                                            Registrar Pago
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-center py-16">
                                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
                                                <Building2 className="h-10 w-10 text-gray-400" />
                                            </div>
                                            <p className="text-gray-600 font-medium mb-2">
                                                Selecciona un proveedor
                                            </p>
                                            <p className="text-gray-500 text-sm">
                                                Elige un proveedor de la lista
                                                para ver sus facturas pendientes
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* Tab: Historial de Pagos */}
                <TabsContent value="historial" className="mt-6">
                    <PaymentsHistory />
                </TabsContent>
            </Tabs>

            {/* Modal: Formulario de Pago */}
            <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                            Registrar Pago
                        </DialogTitle>
                    </DialogHeader>
                    {selectedProvider && facturasSeleccionadas.length > 0 && (
                        <SupplierPaymentForm
                            proveedor={selectedProvider}
                            invoices={facturasSeleccionadas}
                            onSuccess={handlePaymentSuccess}
                            onCancel={() => setShowPaymentModal(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
