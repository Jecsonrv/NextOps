import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import apiClient from "../lib/api";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import {
    FileText,
    TrendingUp,
    Clock,
    CheckCircle,
    AlertCircle,
    Truck,
    Loader2,
    DollarSign,
    Layers,
    XCircle,
    AlertTriangle,
} from "lucide-react";

const estadoBadgeVariant = {
    pendiente: "warning",
    provisionada: "success",
    revision: "warning",
    disputada: "destructive",
};

export function DashboardPage() {
    // Obtener estadísticas de OTs
    const { data: otsStats } = useQuery({
        queryKey: ["ots-statistics"],
        queryFn: async () => {
            const response = await apiClient.get("/ots/statistics/");
            return response.data;
        },
    });

    // Obtener estadísticas de facturas
    const { data: invoicesStats } = useQuery({
        queryKey: ["invoices-stats"],
        queryFn: async () => {
            const response = await apiClient.get("/invoices/stats/");
            return response.data;
        },
    });

    // Obtener facturas recientes
    const { data: recentInvoices, isLoading: loadingInvoices } = useQuery({
        queryKey: ["recent-invoices"],
        queryFn: async () => {
            const response = await apiClient.get(
                "/invoices/?page=1&page_size=5"
            );
            return response.data.results || [];
        },
    });

    // Estadísticas principales con el mismo estilo de OTsPage
    const stats = [
        {
            name: "Total OT's",
            value: otsStats?.total_ots || 0,
            subtitle: `${otsStats?.total_contenedores || 0} contenedores`,
            icon: Layers,
            iconColor: "text-blue-600",
            valueColor: "text-gray-900",
        },
        {
            name: "Total Facturas",
            value: invoicesStats?.total || 0,
            subtitle: `$${(invoicesStats?.total_monto || 0).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            icon: FileText,
            iconColor: "text-blue-600",
            valueColor: "text-gray-900",
        },
        {
            name: "Provisionadas",
            value: invoicesStats?.provisionadas || 0,
            subtitle: "Facturas Provisionadas",
            icon: CheckCircle,
            iconColor: "text-green-600",
            valueColor: "text-green-600",
        },
        {
            name: "Pendientes",
            value: invoicesStats?.pendientes_provision || 0,
            subtitle: "Facturas Pendientes",
            icon: AlertCircle,
            iconColor: "text-yellow-600",
            valueColor: "text-yellow-600",
        },
    ];

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Stats Cards - Mismo estilo que OTsPage */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.name} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700">
                                    {stat.name}
                                </CardTitle>
                                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.iconColor} flex-shrink-0`} />
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className={`text-2xl sm:text-3xl font-bold ${stat.valueColor}`}>
                                    {stat.value}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {stat.subtitle}
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Recent Activity */}
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                {/* Recent Invoices */}
                <Card>
                    <CardHeader>
                        <CardTitle>Facturas Recientes</CardTitle>
                        <CardDescription>
                            Últimas facturas ingresadas al sistema
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingInvoices ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                            </div>
                        ) : recentInvoices && recentInvoices.length > 0 ? (
                            <div className="space-y-4">
                                {recentInvoices.map((invoice) => (
                                    <Link
                                        key={invoice.id}
                                        to={`/invoices/${invoice.id}`}
                                        className="flex items-center justify-between pb-3 sm:pb-4 border-b last:border-b-0 last:pb-0 hover:bg-gray-50 transition-colors rounded-lg p-2"
                                    >
                                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                                            <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg flex-shrink-0">
                                                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                                    {invoice.numero_factura ||
                                                        "SIN NÚMERO"}
                                                </p>
                                                <p className="text-xs text-gray-600 truncate">
                                                    {invoice.proveedor_data
                                                        ?.nombre ||
                                                        invoice.proveedor_nombre ||
                                                        "Sin proveedor"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-2">
                                            <div className="flex items-center justify-end">
                                                <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 mr-0.5 sm:mr-1" />
                                                <p className="text-xs sm:text-sm font-medium text-gray-900">
                                                    {invoice.monto?.toLocaleString(
                                                        "es-MX",
                                                        {
                                                            minimumFractionDigits: 0,
                                                            maximumFractionDigits: 0,
                                                        }
                                                    ) || "0"}
                                                </p>
                                            </div>
                                            <Badge
                                                variant={
                                                    estadoBadgeVariant[
                                                        invoice.estado_provision
                                                    ] || "secondary"
                                                }
                                                className="mt-1 text-xs"
                                            >
                                                {(invoice.estado_provision_display || invoice.estado_provision)
                                                    .toLowerCase()
                                                    .split(' ')
                                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                                    .join(' ')}
                                            </Badge>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-8">
                                No hay facturas recientes
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Acciones Rápidas</CardTitle>
                        <CardDescription>
                            Accede a las funciones más utilizadas
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-2.5 sm:gap-3">
                            <Link
                                to="/invoices/new"
                                className="flex items-center p-3 sm:p-4 text-left transition-colors bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                                <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-blue-600 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs sm:text-sm font-medium text-gray-900">
                                        Subir Facturas
                                    </p>
                                    <p className="text-xs text-gray-600 hidden sm:block">
                                        Cargar facturas al sistema
                                    </p>
                                </div>
                            </Link>

                            <Link
                                to="/invoices"
                                className="flex items-center p-3 sm:p-4 text-left transition-colors bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-blue-600 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs sm:text-sm font-medium text-gray-900">
                                        Ver Facturas
                                    </p>
                                    <p className="text-xs text-gray-600 hidden sm:block">
                                        Revisar y gestionar facturas
                                    </p>
                                </div>
                            </Link>

                            <Link
                                to="/ots"
                                className="flex items-center p-3 sm:p-4 text-left transition-colors bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                                <Truck className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-blue-600 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs sm:text-sm font-medium text-gray-900">
                                        Ver OTs
                                    </p>
                                    <p className="text-xs text-gray-600 hidden sm:block">
                                        Revisar órdenes de Trabajo
                                    </p>
                                </div>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
