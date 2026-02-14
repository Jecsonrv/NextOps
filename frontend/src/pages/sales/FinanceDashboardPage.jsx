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
import { StatCard } from "../../components/common/StatCard";

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
                        <p className="text-muted-foreground">
                            Cargando dashboard...
                        </p>
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
                        <p className="text-destructive">
                            Error al cargar el dashboard
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
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
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Fecha Inicio
                            </label>
                            <input
                                type="date"
                                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Fecha Fin
                            </label>
                            <input
                                type="date"
                                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Vendido"
                    value={formatCurrency(dashboard?.total_vendido)}
                    icon={DollarSign}
                />
                <StatCard
                    label="Total Cobrado"
                    value={formatCurrency(dashboard?.total_cobrado)}
                    icon={CheckCircle2}
                />
                <StatCard
                    label="Por Cobrar"
                    value={formatCurrency(dashboard?.por_cobrar)}
                    icon={Clock}
                />
                <StatCard
                    label="Margen Bruto"
                    value={formatCurrency(dashboard?.margen_bruto_total)}
                    icon={TrendingUp}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Resumen de Facturas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="space-y-4">
                            <div className="flex items-center justify-between">
                                <dt className="text-sm font-medium text-muted-foreground">
                                    Total de Facturas
                                </dt>
                                <dd className="text-lg font-bold text-foreground">
                                    {dashboard?.total_facturas || 0}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-sm font-medium text-muted-foreground">
                                    Facturas Cobradas
                                </dt>
                                <dd className="text-lg font-bold text-green-600">
                                    {dashboard?.facturas_cobradas || 0}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-sm font-medium text-muted-foreground">
                                    Facturas Pendientes
                                </dt>
                                <dd className="text-lg font-bold text-orange-600">
                                    {dashboard?.facturas_pendientes || 0}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-sm font-medium text-muted-foreground">
                                    Facturas Vencidas
                                </dt>
                                <dd className="text-lg font-bold text-destructive">
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
                                <dt className="text-sm font-medium text-muted-foreground">
                                    Total de Pagos
                                </dt>
                                <dd className="text-lg font-bold text-foreground">
                                    {dashboard?.total_pagos || 0}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-sm font-medium text-muted-foreground">
                                    Pagos Validados
                                </dt>
                                <dd className="text-lg font-bold text-green-600">
                                    {dashboard?.pagos_validados || 0}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-sm font-medium text-muted-foreground">
                                    Pagos Pendientes
                                </dt>
                                <dd className="text-lg font-bold text-orange-600">
                                    {dashboard?.pagos_pendientes || 0}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-sm font-medium text-muted-foreground">
                                    Monto Pendiente Validación
                                </dt>
                                <dd className="text-lg font-bold text-primary">
                                    {formatCurrency(
                                        dashboard?.monto_pendiente_validacion,
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
                                <thead className="bg-muted border-b border-border">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                            OT
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                            Cliente
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                                            Vendido
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                                            Costos
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                                            Margen Bruto
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                                            % Margen
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                    {dashboard.top_ots_margen.map((ot) => (
                                        <tr
                                            key={ot.id}
                                            className="hover:bg-muted"
                                        >
                                            <td className="px-4 py-3 text-sm font-medium text-foreground">
                                                <Link
                                                    to={`/ots/${ot.id}`}
                                                    className="text-primary hover:text-blue-800"
                                                >
                                                    {ot.numero_ot}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">
                                                {ot.cliente_nombre}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-foreground">
                                                {formatCurrency(
                                                    ot.monto_total_vendido,
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-foreground">
                                                {formatCurrency(
                                                    ot.monto_total_costos,
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right font-medium text-foreground">
                                                {formatCurrency(
                                                    ot.margen_bruto,
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
                                                        ot.porcentaje_margen,
                                                    )}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
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
                                    <thead className="bg-muted border-b border-border">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                                Factura
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                                Cliente
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                                Fecha Vencimiento
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                                                Saldo Pendiente
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-card divide-y divide-border">
                                        {dashboard.facturas_proximas_vencer.map(
                                            (factura) => (
                                                <tr
                                                    key={factura.id}
                                                    className="hover:bg-muted"
                                                >
                                                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                                                        {factura.numero_factura}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-muted-foreground">
                                                        {factura.cliente_nombre}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-foreground">
                                                        {formatDate(
                                                            factura.fecha_vencimiento,
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right font-medium text-destructive">
                                                        {formatCurrency(
                                                            factura.saldo_pendiente,
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <Link
                                                            to={`/sales/invoices/${factura.id}`}
                                                            className="text-primary hover:text-blue-800"
                                                        >
                                                            Ver Detalle
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ),
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
