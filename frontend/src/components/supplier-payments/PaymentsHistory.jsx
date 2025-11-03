import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import apiClient from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { EditPaymentModal } from "./EditPaymentModal";
import {
    Calendar,
    FileText,
    DollarSign,
    Edit2,
    Trash2,
    Search,
    Download,
    Eye,
    User,
} from "lucide-react";
import { format } from "date-fns";

export default function PaymentsHistory() {
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState({
        search: "",
        fecha_desde: "",
        fecha_hasta: "",
    });

    const [selectedPayment, setSelectedPayment] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState(null);

    const { data: pagos, isLoading } = useQuery({
        queryKey: ["supplier-payments-history", filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.search) params.append("search", filters.search);
            if (filters.fecha_desde)
                params.append("fecha_desde", filters.fecha_desde);
            if (filters.fecha_hasta)
                params.append("fecha_hasta", filters.fecha_hasta);

            const response = await apiClient.get(
                `/supplier-payments/historial/?${params.toString()}`
            );
            return response.data.results || response.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (paymentId) => {
            return await apiClient.delete(`/supplier-payments/${paymentId}/`);
        },
        onSuccess: async () => {
            // Refetch forzado para actualizar la UI inmediatamente
            await Promise.all([
                queryClient.refetchQueries(["supplier-payments-history"]),
                queryClient.invalidateQueries(["supplier-payment-stats"]),
                queryClient.invalidateQueries(["invoices"]),
            ]);

            toast.success("Pago eliminado exitosamente", {
                duration: 3000,
                icon: "✅",
            });

            setPaymentToDelete(null);
        },
        onError: (error) => {
            const errorMsg =
                error.response?.data?.detail ||
                error.response?.data?.error ||
                "Error al eliminar el pago";

            toast.error(errorMsg, {
                duration: 4000,
            });
        },
    });

    const handleEdit = (pago) => {
        setSelectedPayment(pago);
        setIsEditModalOpen(true);
    };

    const handleDelete = (pago) => {
        setPaymentToDelete(pago);
    };

    const confirmDelete = () => {
        if (paymentToDelete) {
            deleteMutation.mutate(paymentToDelete.id);
        }
    };

    return (
        <div className="space-y-6 mt-6">
            {/* Filtros */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Filtros</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Búsqueda */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Buscar
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Referencia o notas..."
                                    value={filters.search}
                                    onChange={(e) =>
                                        setFilters({
                                            ...filters,
                                            search: e.target.value,
                                        })
                                    }
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {/* Fecha desde */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Desde
                            </label>
                            <Input
                                type="date"
                                value={filters.fecha_desde}
                                onChange={(e) =>
                                    setFilters({
                                        ...filters,
                                        fecha_desde: e.target.value,
                                    })
                                }
                            />
                        </div>

                        {/* Fecha hasta */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Hasta
                            </label>
                            <Input
                                type="date"
                                value={filters.fecha_hasta}
                                onChange={(e) =>
                                    setFilters({
                                        ...filters,
                                        fecha_hasta: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Lista de pagos */}
            {isLoading ? (
                <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                        Cargando historial...
                    </CardContent>
                </Card>
            ) : !pagos || pagos.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                        No se encontraron pagos registrados
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {pagos.map((pago) => (
                        <Card
                            key={pago.id}
                            className="hover:shadow-md transition-shadow"
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    {/* Información principal */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="font-semibold text-gray-900">
                                                {pago.proveedor_nombre ||
                                                    "Proveedor no especificado"}
                                            </h4>
                                            <Badge
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                {pago.invoice_links?.length ||
                                                    0}{" "}
                                                facturas
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                                            {/* Fecha */}
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-gray-400" />
                                                <span>
                                                    {format(
                                                        new Date(
                                                            pago.fecha_pago
                                                        ),
                                                        "dd/MM/yyyy"
                                                    )}
                                                </span>
                                            </div>

                                            {/* Referencia */}
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-gray-400" />
                                                <span className="font-medium">
                                                    {pago.referencia ||
                                                        "Sin referencia"}
                                                </span>
                                            </div>

                                            {/* Monto */}
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="h-4 w-4 text-gray-400" />
                                                <span className="font-bold text-gray-900">
                                                    {parseFloat(
                                                        pago.monto_total
                                                    ).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Notas */}
                                        {pago.notas && (
                                            <p className="mt-2 text-sm text-gray-600 italic">
                                                {pago.notas}
                                            </p>
                                        )}

                                        {/* Comprobante de pago */}
                                        {pago.archivo_comprobante && (
                                            <div className="mt-3 pt-3 border-t">
                                                <p className="text-xs font-medium text-gray-700 mb-2">
                                                    Comprobante:
                                                </p>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            window.open(
                                                                pago.archivo_comprobante,
                                                                "_blank"
                                                            )
                                                        }
                                                        className="text-blue-600 hover:bg-blue-50"
                                                    >
                                                        <Eye className="h-3 w-3 mr-1.5" />
                                                        Ver
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={async () => {
                                                            try {
                                                                const response =
                                                                    await fetch(
                                                                        pago.archivo_comprobante
                                                                    );
                                                                const blob =
                                                                    await response.blob();
                                                                const url =
                                                                    window.URL.createObjectURL(
                                                                        blob
                                                                    );
                                                                const link =
                                                                    document.createElement(
                                                                        "a"
                                                                    );
                                                                link.href = url;
                                                                link.download = `comprobante-${
                                                                    pago.referencia ||
                                                                    pago.id
                                                                }.pdf`;
                                                                document.body.appendChild(
                                                                    link
                                                                );
                                                                link.click();
                                                                document.body.removeChild(
                                                                    link
                                                                );
                                                                window.URL.revokeObjectURL(
                                                                    url
                                                                );
                                                                toast.success(
                                                                    "Descargando comprobante..."
                                                                );
                                                            } catch {
                                                                toast.error(
                                                                    "Error al descargar el comprobante"
                                                                );
                                                            }
                                                        }}
                                                        className="text-green-600 hover:bg-green-50"
                                                    >
                                                        <Download className="h-3 w-3 mr-1.5" />
                                                        Descargar
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Facturas pagadas - Tabla detallada */}
                                        {pago.invoice_links &&
                                            pago.invoice_links.length > 0 && (
                                                <div className="mt-3 pt-3 border-t">
                                                    <p className="text-xs font-medium text-gray-700 mb-2">
                                                        Facturas pagadas (
                                                        {
                                                            pago.invoice_links
                                                                .length
                                                        }
                                                        ):
                                                    </p>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-xs">
                                                            <thead className="bg-gray-50 border-b">
                                                                <tr>
                                                                    <th className="text-left py-2 px-2 font-medium text-gray-700">
                                                                        Factura
                                                                    </th>
                                                                    <th className="text-left py-2 px-2 font-medium text-gray-700">
                                                                        OT
                                                                    </th>
                                                                    <th className="text-left py-2 px-2 font-medium text-gray-700">
                                                                        Cliente
                                                                    </th>
                                                                    <th className="text-left py-2 px-2 font-medium text-gray-700">
                                                                        Tipo
                                                                        Costo
                                                                    </th>
                                                                    <th className="text-right py-2 px-2 font-medium text-gray-700">
                                                                        Monto
                                                                        Total
                                                                    </th>
                                                                    <th className="text-right py-2 px-2 font-medium text-gray-700">
                                                                        Monto
                                                                        Pagado
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y">
                                                                {pago.invoice_links.map(
                                                                    (link) => (
                                                                        <tr
                                                                            key={
                                                                                link.id
                                                                            }
                                                                            className="hover:bg-gray-50"
                                                                        >
                                                                            <td className="py-2 px-2">
                                                                                <Link
                                                                                    to={`/invoices/${link.cost_invoice}`}
                                                                                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                                                                >
                                                                                    {link.invoice_numero ||
                                                                                        `ID ${link.cost_invoice}`}
                                                                                </Link>
                                                                            </td>
                                                                            <td className="py-2 px-2 text-gray-600">
                                                                                {link.invoice_ot ||
                                                                                    "-"}
                                                                            </td>
                                                                            <td className="py-2 px-2 text-gray-600">
                                                                                <div className="flex items-center gap-1">
                                                                                    <User className="h-3 w-3 text-gray-400" />
                                                                                    {link.invoice_cliente ||
                                                                                        "-"}
                                                                                </div>
                                                                            </td>
                                                                            <td className="py-2 px-2">
                                                                                <Badge
                                                                                    variant="secondary"
                                                                                    className="text-xs"
                                                                                >
                                                                                    {link.invoice_tipo_costo_display ||
                                                                                        link.invoice_tipo_costo ||
                                                                                        "-"}
                                                                                </Badge>
                                                                            </td>
                                                                            <td className="py-2 px-2 text-right text-gray-600">
                                                                                $
                                                                                {parseFloat(
                                                                                    link.invoice_monto ||
                                                                                        0
                                                                                ).toFixed(
                                                                                    2
                                                                                )}
                                                                            </td>
                                                                            <td className="py-2 px-2 text-right">
                                                                                <span className="font-bold text-green-700">
                                                                                    $
                                                                                    {parseFloat(
                                                                                        link.monto_pagado_factura
                                                                                    ).toFixed(
                                                                                        2
                                                                                    )}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    )
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                    </div>

                                    {/* Acciones */}
                                    <div className="ml-4 flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(pago)}
                                            className="text-blue-600 hover:bg-blue-50 border-blue-200"
                                            title="Editar pago"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDelete(pago)}
                                            className="text-red-600 hover:bg-red-50 border-red-200"
                                            title="Eliminar pago"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Modal de Edición */}
            <EditPaymentModal
                payment={selectedPayment}
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedPayment(null);
                }}
            />

            {/* Diálogo de Confirmación de Eliminación */}
            <ConfirmDialog
                isOpen={!!paymentToDelete}
                onClose={() => setPaymentToDelete(null)}
                onConfirm={confirmDelete}
                title="Eliminar Pago"
                message={
                    paymentToDelete ? (
                        <div>
                            <p className="mb-2">
                                ¿Estás seguro de que deseas eliminar este pago?
                            </p>
                            <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                                <p>
                                    <strong>Proveedor:</strong>{" "}
                                    {paymentToDelete.proveedor_nombre}
                                </p>
                                <p>
                                    <strong>Monto:</strong> $
                                    {parseFloat(
                                        paymentToDelete.monto_total
                                    ).toFixed(2)}
                                </p>
                                <p>
                                    <strong>Referencia:</strong>{" "}
                                    {paymentToDelete.referencia ||
                                        "Sin referencia"}
                                </p>
                                <p>
                                    <strong>Facturas afectadas:</strong>{" "}
                                    {paymentToDelete.invoice_links?.length || 0}
                                </p>
                            </div>
                            <p className="mt-3 text-red-600 font-medium">
                                Esta acción revertirá el estado de pago de las
                                facturas asociadas.
                            </p>
                        </div>
                    ) : (
                        ""
                    )
                }
                confirmText="Eliminar"
                confirmVariant="danger"
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
}
