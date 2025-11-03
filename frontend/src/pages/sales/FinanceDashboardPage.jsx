import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import apiClient from "../../lib/api";
import { formatDate } from "../../lib/dateUtils";
import {
    getTodayString,
    getFirstDayOfMonthString,
} from "../../utils/dateHelpers";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import {
    DollarSign,
    TrendingUp,
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle,
    Calendar,
} from "lucide-react";

export default function FinanceDashboardPage() {
    const [dateRange, setDateRange] = useState({
        start: getFirstDayOfMonthString(),
        end: getTodayString(),
    });

    const {
        data: dashboard,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["finance-dashboard", dateRange],
        queryFn: async () => {
            const response = await apiClient.get("/sales/dashboard/", {
                params: {
                    fecha_inicio: dateRange.start,
                    fecha_fin: dateRange.end,
                },
            });
            return response.data;
        },
    });

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("es-EC", {
            style: "currency",
            currency: "USD",
        }).format(amount || 0);
    };

    const formatPercentage = (value) => {
        return `${(value || 0).toFixed(2)}%`;
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardContent className="text-center py-8">
                        <p className="text-gray-600">Cargando dashboard...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardContent className="text-center py-8">
                        <p className="text-red-600">
                            Error al cargar el dashboard
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Dashboard Financiero
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Resumen de ventas, pagos y métricas financieras
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Rango de Fechas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Fecha Inicio
                            </label>
                            <input
                                type="date"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={dateRange.start}
                                onChange={(e) =>
                                    setDateRange((prev) => ({
                                        ...prev,
                                        start: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Fecha Fin
                            </label>
                            <input
                                type="date"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={dateRange.end}
                                onChange={(e) =>
                                    setDateRange((prev) => ({
                                        ...prev,
                                        end: e.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <DollarSign className="h-8 w-8 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">
                                    Total Vendido
                                </p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(dashboard?.total_vendido)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <CheckCircle2 className="h-8 w-8 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">
                                    Total Cobrado
                                </p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(dashboard?.total_cobrado)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Clock className="h-8 w-8 text-orange-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">
                                    Por Cobrar
                                </p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(dashboard?.por_cobrar)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <TrendingUp className="h-8 w-8 text-purple-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">
                                    Margen Bruto
                                </p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(
                                        dashboard?.margen_bruto_total
                                    )}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Resumen de Facturas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="space-y-4">
                            <div className="flex items-center justify-between">
                                <dt className="text-sm font-medium text-gray-600">
                                    Total de Facturas
                                </dt>
                                <dd className="text-lg font-bold text-gray-900">
                                    {dashboard?.total_facturas || 0}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-sm font-medium text-gray-600">
                                    Facturas Cobradas
                                </dt>
                                <dd className="text-lg font-bold text-green-600">
                                    {dashboard?.facturas_cobradas || 0}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-sm font-medium text-gray-600">
                                    Facturas Pendientes
                                </dt>
                                <dd className="text-lg font-bold text-orange-600">
                                    {dashboard?.facturas_pendientes || 0}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-sm font-medium text-gray-600">
                                    Facturas Vencidas
                                </dt>
                                <dd className="text-lg font-bold text-red-600">
                                    {dashboard?.facturas_vencidas || 0}
                                </dd>
                            </div>
                        </dl>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Resumen de Pagos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="space-y-4">
                            <div className="flex items-center justify-between">
                                <dt className="text-sm font-medium text-gray-600">
                                    Total de Pagos
                                </dt>
                                <dd className="text-lg font-bold text-gray-900">
                                    {dashboard?.total_pagos || 0}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-sm font-medium text-gray-600">
                                    Pagos Validados
                                </dt>
                                <dd className="text-lg font-bold text-green-600">
                                    {dashboard?.pagos_validados || 0}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-sm font-medium text-gray-600">
                                    Pagos Pendientes
                                </dt>
                                <dd className="text-lg font-bold text-orange-600">
                                    {dashboard?.pagos_pendientes || 0}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-sm font-medium text-gray-600">
                                    Monto Pendiente Validación
                                </dt>
                                <dd className="text-lg font-bold text-blue-600">
                                    {formatCurrency(
                                        dashboard?.monto_pendiente_validacion
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Márgenes por OT</CardTitle>
                </CardHeader>
                <CardContent>
                    {dashboard?.top_ots_margen &&
                    dashboard.top_ots_margen.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            OT
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Cliente
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                            Vendido
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                            Costos
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                            Margen Bruto
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                            % Margen
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {dashboard.top_ots_margen.map((ot) => (
                                        <tr
                                            key={ot.id}
                                            className="hover:bg-gray-50"
                                        >
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                <Link
                                                    to={`/ots/${ot.id}`}
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    {ot.numero_ot}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {ot.cliente_nombre}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-900">
                                                {formatCurrency(
                                                    ot.monto_total_vendido
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-900">
                                                {formatCurrency(
                                                    ot.monto_total_costos
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                                                {formatCurrency(
                                                    ot.margen_bruto
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right">
                                                <Badge
                                                    variant={
                                                        ot.porcentaje_margen >=
                                                        30
                                                            ? "success"
                                                            : ot.porcentaje_margen >=
                                                              15
                                                            ? "info"
                                                            : ot.porcentaje_margen >=
                                                              5
                                                            ? "warning"
                                                            : "destructive"
                                                    }
                                                >
                                                    {formatPercentage(
                                                        ot.porcentaje_margen
                                                    )}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-4">
                            No hay datos de OTs en el período seleccionado
                        </p>
                    )}
                </CardContent>
            </Card>

            {dashboard?.facturas_proximas_vencer &&
                dashboard.facturas_proximas_vencer.length > 0 && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-orange-600" />
                                <CardTitle>
                                    Facturas Próximas a Vencer
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Factura
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Cliente
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Fecha Vencimiento
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                                Saldo Pendiente
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {dashboard.facturas_proximas_vencer.map(
                                            (factura) => (
                                                <tr
                                                    key={factura.id}
                                                    className="hover:bg-gray-50"
                                                >
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                        {factura.numero_factura}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-500">
                                                        {factura.cliente_nombre}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        {formatDate(
                                                            factura.fecha_vencimiento
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                                                        {formatCurrency(
                                                            factura.saldo_pendiente
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <Link
                                                            to={`/sales/invoices/${factura.id}`}
                                                            className="text-blue-600 hover:text-blue-800"
                                                        >
                                                            Ver Detalle
                                                        </Link>
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
        </div>
    );
}
