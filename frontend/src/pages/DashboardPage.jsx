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
import { Skeleton } from "../components/ui/Skeleton";
import { StatCard } from "../components/common/StatCard";
import {
    FileText,
    TrendingUp,
    CheckCircle,
    AlertCircle,
    Truck,
    DollarSign,
    Layers,
    ArrowRight,
    Ship,
} from "lucide-react";

const estadoBadgeVariant = {
    pendiente: "warning",
    provisionada: "success",
    revision: "warning",
    disputada: "destructive",
};

// ─── Skeleton states ───────────────────────────────────────────
function StatCardSkeleton() {
    return (
        <div className="rounded-xl bg-card shadow-sm px-6 py-5 w-full min-w-[240px] flex items-center justify-between">
            <div className="flex flex-col gap-1">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
    );
}

function InvoiceListSkeleton() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-center justify-between pb-3 border-b last:border-0"
                >
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <div className="space-y-1.5">
                            <Skeleton className="h-3.5 w-28" />
                            <Skeleton className="h-3 w-36" />
                        </div>
                    </div>
                    <div className="text-right space-y-1.5">
                        <Skeleton className="h-3.5 w-16 ml-auto" />
                        <Skeleton className="h-5 w-20 ml-auto rounded-full" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Dashboard ─────────────────────────────────────────────────
export function DashboardPage() {
    const { data: otsStats, isLoading: loadingOts } = useQuery({
        queryKey: ["ots-statistics"],
        queryFn: async () => {
            const response = await apiClient.get("/ots/statistics/");
            return response.data;
        },
    });

    const { data: invoicesStats, isLoading: loadingStats } = useQuery({
        queryKey: ["invoices-stats"],
        queryFn: async () => {
            const response = await apiClient.get("/invoices/stats/");
            return response.data;
        },
    });

    const { data: recentInvoices, isLoading: loadingInvoices } = useQuery({
        queryKey: ["recent-invoices"],
        queryFn: async () => {
            const response = await apiClient.get(
                "/invoices/?page=1&page_size=5",
            );
            return response.data.results || [];
        },
    });

    const isLoadingKPI = loadingOts || loadingStats;

    return (
        <div className="space-y-8">
            {/* KPI Grid */}
            <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
                {isLoadingKPI ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <StatCardSkeleton key={i} />
                    ))
                ) : (
                    <>
                        <StatCard
                            label="Total OTs"
                            value={otsStats?.total_ots || 0}
                            subtitle={`${otsStats?.total_contenedores || 0} contenedores`}
                            icon={Layers}
                        />
                        <StatCard
                            label="Total Facturas"
                            value={invoicesStats?.total || 0}
                            subtitle={`$${(invoicesStats?.total_monto || 0).toLocaleString("es-SV", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                            icon={FileText}
                        />
                        <StatCard
                            label="Provisionadas"
                            value={invoicesStats?.provisionadas || 0}
                            subtitle="Facturas provisionadas"
                            icon={CheckCircle}
                        />
                        <StatCard
                            label="Pendientes"
                            value={invoicesStats?.pendientes_provision || 0}
                            subtitle="Facturas pendientes"
                            icon={AlertCircle}
                        />
                    </>
                )}
            </div>

            {/* Content Grid */}
            <div className="grid gap-6 lg:grid-cols-5">
                {/* Recent Invoices — wider */}
                <Card className="lg:col-span-3 border-0 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Facturas Recientes</CardTitle>
                            <CardDescription>
                                Últimas facturas ingresadas
                            </CardDescription>
                        </div>
                        <Link
                            to="/invoices"
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 hover:border-primary/30"
                        >
                            Ver todas las facturas{" "}
                            <ArrowRight className="h-3 w-3" />
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {loadingInvoices ? (
                            <InvoiceListSkeleton />
                        ) : recentInvoices && recentInvoices.length > 0 ? (
                            <div className="space-y-1">
                                {recentInvoices.map((invoice) => (
                                    <Link
                                        key={invoice.id}
                                        to={`/invoices/${invoice.id}`}
                                        className="flex items-center justify-between rounded-lg border border-transparent p-2.5 transition-colors hover:bg-primary/10 hover:border-border"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                                                <FileText className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-foreground truncate">
                                                    {invoice.numero_factura ||
                                                        "SIN NÚMERO"}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {invoice.proveedor_data
                                                        ?.nombre ||
                                                        invoice.proveedor_nombre ||
                                                        "Sin proveedor"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-3">
                                            <div className="flex items-center justify-end gap-0.5">
                                                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-sm font-medium text-foreground">
                                                    {invoice.monto?.toLocaleString(
                                                        "es-SV",
                                                        {
                                                            minimumFractionDigits: 0,
                                                            maximumFractionDigits: 0,
                                                        },
                                                    ) || "0"}
                                                </span>
                                            </div>
                                            <Badge
                                                variant={
                                                    estadoBadgeVariant[
                                                        invoice.estado_provision
                                                    ] || "secondary"
                                                }
                                                className="mt-1 text-[10px]"
                                            >
                                                {(
                                                    invoice.estado_provision_display ||
                                                    invoice.estado_provision ||
                                                    ""
                                                )
                                                    .toLowerCase()
                                                    .split(" ")
                                                    .map(
                                                        (w) =>
                                                            w
                                                                .charAt(0)
                                                                .toUpperCase() +
                                                            w.slice(1),
                                                    )
                                                    .join(" ")}
                                            </Badge>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="py-10 text-center text-sm text-muted-foreground">
                                No hay facturas recientes
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions — narrower */}
                <Card className="lg:col-span-2 border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle>Acciones Rápidas</CardTitle>
                        <CardDescription>
                            Funciones más utilizadas
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2.5">
                        <QuickAction
                            to="/invoices/new"
                            icon={FileText}
                            label="Subir Facturas"
                            description="Cargar facturas al sistema"
                        />
                        <QuickAction
                            to="/invoices"
                            icon={TrendingUp}
                            label="Ver Facturas"
                            description="Revisar y gestionar facturas"
                        />
                        <QuickAction
                            to="/ots"
                            icon={Ship}
                            label="Ver OTs"
                            description="Revisar órdenes de trabajo"
                        />
                        <QuickAction
                            to="/disputes"
                            icon={AlertCircle}
                            label="Disputas"
                            description="Gestionar disputas activas"
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// ─── Quick action item ─────────────────────────────────────────
function QuickAction({ to, icon: Icon, label, description }) {
    return (
        <Link
            to={to}
            className="group flex items-center gap-3.5 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:bg-primary/10 hover:shadow-sm"
        >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15 group-hover:text-primary">
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground hidden sm:block">
                    {description}
                </p>
            </div>
        </Link>
    );
}
