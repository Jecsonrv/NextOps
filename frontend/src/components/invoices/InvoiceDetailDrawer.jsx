import PropTypes from "prop-types";
import { useInvoiceDetail } from "../../hooks/useInvoices";
import { Sheet, SheetHeader, SheetContent, SheetFooter } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Skeleton } from "../ui/Skeleton";
import { formatDateLocalized, formatDate } from "../../lib/dateUtils";
import {
    FileText,
    Link2,
    Calendar,
    DollarSign,
    Building,
    Package,
    Ship,
    Download,
    ExternalLink,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import InvoiceStatusBadge, { CostTypeBadge } from "./InvoiceStatusBadge";

function InvoiceDrawerSkeleton() {
    return (
        <div className="space-y-8">
            <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-28 rounded-full" />
            </div>

            <section className="bg-muted p-4 rounded-lg border border-border">
                <Skeleton className="h-3 w-36 mb-4" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-5 w-24" />
                    </div>
                </div>
                <div className="mt-4 space-y-2">
                    <div className="flex justify-between">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-3 w-10" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
            </section>

            <section>
                <div className="flex items-center justify-between mb-3">
                    <Skeleton className="h-3 w-36" />
                    <Skeleton className="h-3 w-14" />
                </div>
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 bg-card border border-border p-4 rounded-lg">
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-10" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="col-span-2 pt-2 border-t border-border space-y-2">
                        <Skeleton className="h-3 w-14" />
                        <Skeleton className="h-4 w-40" />
                    </div>
                </div>
            </section>

            <section>
                <Skeleton className="h-3 w-20 mb-3" />
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <div
                            key={idx}
                            className="flex justify-between items-center py-2 border-b border-border"
                        >
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-28" />
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <Skeleton className="h-3 w-12 mb-2" />
                <div className="p-3 bg-muted rounded-md border-l-2 border-border">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6 mt-2" />
                </div>
            </section>
        </div>
    );
}

export function InvoiceDetailDrawer({ invoiceId, isOpen, onClose }) {
    const navigate = useNavigate();
    const { data: invoice, isLoading, error } = useInvoiceDetail(invoiceId);

    if (!isOpen) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetHeader onClose={onClose}>
                <div className="space-y-1">
                    <h2 className="text-xl font-bold text-foreground">
                        {isLoading
                            ? "Cargando..."
                            : invoice?.numero_factura ||
                              `Factura #${invoiceId}`}
                    </h2>
                    {!isLoading && invoice && (
                        <p className="text-sm text-muted-foreground">
                            {invoice.proveedor_data?.nombre || "Sin proveedor"}
                        </p>
                    )}
                </div>
            </SheetHeader>

            <SheetContent>
                {isLoading ? (
                    <InvoiceDrawerSkeleton />
                ) : error ? (
                    <div className="p-4 bg-destructive/10 text-red-700 rounded-md">
                        Error al cargar los detalles de la factura.
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Estado y Acciones Rápidas */}
                        <div className="flex flex-wrap gap-2">
                            <InvoiceStatusBadge invoice={invoice} />
                            <CostTypeBadge invoice={invoice} />
                            {invoice.requiere_revision && (
                                <Badge variant="warning">
                                    Requiere Revisión
                                </Badge>
                            )}
                        </div>

                        {/* Montos */}
                        <section className="bg-muted p-4 rounded-lg border border-border">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                Resumen Financiero
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Monto Total
                                    </p>
                                    <p className="text-2xl font-bold text-foreground">
                                        $
                                        {(
                                            invoice.monto_aplicable ??
                                            invoice.monto
                                        )?.toLocaleString("es-MX", {
                                            minimumFractionDigits: 2,
                                        })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Estado de Pago
                                    </p>
                                    <p className="text-sm font-medium mt-1">
                                        {invoice.estado_pago === "pagado_total"
                                            ? "✓ Pagado"
                                            : invoice.estado_pago ===
                                                "pagado_parcial"
                                              ? "⏳ Parcial"
                                              : "⏰ Pendiente"}
                                    </p>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-4">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-muted-foreground">
                                        Progreso de pago
                                    </span>
                                    <span className="font-medium text-foreground">
                                        {Math.round(
                                            (parseFloat(
                                                invoice.monto_pagado || 0,
                                            ) /
                                                parseFloat(
                                                    invoice.monto_aplicable ||
                                                        1,
                                                )) *
                                                100,
                                        )}
                                        %
                                    </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-1.5">
                                    <div
                                        className="bg-foreground h-1.5 rounded-full transition-all"
                                        style={{
                                            width: `${Math.min(100, (parseFloat(invoice.monto_pagado || 0) / parseFloat(invoice.monto_aplicable || 1)) * 100)}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Información OT */}
                        {invoice.ot_data && (
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Orden de Transporte
                                    </h3>
                                    <Link
                                        to={`/ots/${invoice.ot_data.id}`}
                                        className="text-xs text-primary hover:underline flex items-center gap-1"
                                    >
                                        Ir a OT{" "}
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </div>
                                <div className="grid grid-cols-2 gap-y-4 gap-x-2 bg-white border border-border p-4 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <Package className="w-4 h-4 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                Número OT
                                            </p>
                                            <p className="text-sm font-semibold">
                                                {invoice.ot_data.numero_ot}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Ship className="w-4 h-4 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                MBL
                                            </p>
                                            <p className="text-sm font-mono">
                                                {invoice.ot_data.mbl || "-"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="col-span-2 flex items-start gap-2 pt-2 border-t">
                                        <Building className="w-4 h-4 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                Cliente
                                            </p>
                                            <p className="text-sm">
                                                {invoice.ot_data.cliente || "-"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Fechas */}
                        <section>
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                Fechas Clave
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm py-2 border-b border-border">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="w-4 h-4" />
                                        <span>Emisión</span>
                                    </div>
                                    <span className="font-medium">
                                        {formatDateLocalized(
                                            invoice.fecha_emision,
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm py-2 border-b border-border">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="w-4 h-4" />
                                        <span>Provisión</span>
                                    </div>
                                    <span className="font-medium">
                                        {invoice.fecha_provision
                                            ? formatDate(
                                                  invoice.fecha_provision,
                                              )
                                            : "Pendiente"}
                                    </span>
                                </div>
                                {invoice.fecha_facturacion && (
                                    <div className="flex justify-between items-center text-sm py-2 border-b border-border">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Calendar className="w-4 h-4" />
                                            <span>Facturación</span>
                                        </div>
                                        <span className="font-medium">
                                            {formatDate(
                                                invoice.fecha_facturacion,
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Notas */}
                        {invoice.notas && (
                            <section>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Notas
                                </h3>
                                <div className="p-3 bg-muted rounded-md text-sm text-foreground whitespace-pre-wrap italic border-l-2 border-border">
                                    "{invoice.notas}"
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </SheetContent>

            <SheetFooter>
                <Button
                    variant="outline"
                    onClick={() => {
                        onClose();
                        navigate(`/invoices/${invoiceId}`);
                    }}
                    className="flex-1"
                >
                    Ver Detalles Completos
                </Button>
                <Button
                    variant="outline"
                    onClick={() => {
                        onClose();
                        navigate(`/invoices/${invoiceId}/edit`);
                    }}
                    className="px-3"
                >
                    Editar
                </Button>
            </SheetFooter>
        </Sheet>
    );
}

InvoiceDetailDrawer.propTypes = {
    invoiceId: PropTypes.number,
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
};
