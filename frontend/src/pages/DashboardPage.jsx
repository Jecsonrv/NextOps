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
    Truck,
    TrendingUp,
    Clock,
    CheckCircle,
    AlertCircle,
} from "lucide-react";

const stats = [
    {
        name: "Total OTs",
        value: "48",
        change: "+12%",
        trend: "up",
        icon: Truck,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
    },
    {
        name: "Facturas Pendientes",
        value: "23",
        change: "-8%",
        trend: "down",
        icon: Clock,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
    },
    {
        name: "Facturas Procesadas",
        value: "156",
        change: "+24%",
        trend: "up",
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-50",
    },
    {
        name: "Requieren Revisión",
        value: "5",
        change: "0%",
        trend: "neutral",
        icon: AlertCircle,
        color: "text-red-600",
        bgColor: "bg-red-50",
    },
];

const recentInvoices = [
    {
        id: 1,
        numero: "FAC-001-2025",
        proveedor: "Naviera XYZ",
        monto: "$1,500.00",
        estado: "pendiente",
    },
    {
        id: 2,
        numero: "FAC-002-2025",
        proveedor: "Transporte ABC",
        monto: "$2,300.00",
        estado: "procesada",
    },
    {
        id: 3,
        numero: "FAC-003-2025",
        proveedor: "Agente Aduanal",
        monto: "$890.00",
        estado: "procesada",
    },
    {
        id: 4,
        numero: "FAC-004-2025",
        proveedor: "Almacén DEF",
        monto: "$1,200.00",
        estado: "revision",
    },
];

const estadoBadgeVariant = {
    pendiente: "warning",
    procesada: "success",
    revision: "destructive",
};

export function DashboardPage() {
    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.name}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <CardTitle className="text-sm font-medium text-gray-600">
                                    {stat.name}
                                </CardTitle>
                                <div
                                    className={`p-2 rounded-lg ${stat.bgColor}`}
                                >
                                    <Icon className={`w-4 h-4 ${stat.color}`} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {stat.value}
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                    <span
                                        className={
                                            stat.trend === "up"
                                                ? "text-green-600"
                                                : stat.trend === "down"
                                                ? "text-red-600"
                                                : "text-gray-600"
                                        }
                                    >
                                        {stat.change}
                                    </span>{" "}
                                    vs. mes anterior
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Recent Activity */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Invoices */}
                <Card>
                    <CardHeader>
                        <CardTitle>Facturas Recientes</CardTitle>
                        <CardDescription>
                            Últimas facturas ingresadas al sistema
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentInvoices.map((invoice) => (
                                <div
                                    key={invoice.id}
                                    className="flex items-center justify-between pb-4 border-b last:border-b-0 last:pb-0"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <FileText className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {invoice.numero}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                                {invoice.proveedor}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900">
                                            {invoice.monto}
                                        </p>
                                        <Badge
                                            variant={
                                                estadoBadgeVariant[
                                                    invoice.estado
                                                ]
                                            }
                                            className="mt-1"
                                        >
                                            {invoice.estado}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
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
                        <div className="grid gap-3">
                            <button className="flex items-center p-4 text-left transition-colors bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                                <FileText className="w-5 h-5 mr-3 text-blue-600" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        Nueva Factura
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        Registrar manualmente
                                    </p>
                                </div>
                            </button>

                            <button className="flex items-center p-4 text-left transition-colors bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                                <Truck className="w-5 h-5 mr-3 text-blue-600" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        Nueva OT
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        Crear orden de transporte
                                    </p>
                                </div>
                            </button>

                            <button className="flex items-center p-4 text-left transition-colors bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                                <TrendingUp className="w-5 h-5 mr-3 text-blue-600" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        Ver Reportes
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        Estadísticas y análisis
                                    </p>
                                </div>
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
