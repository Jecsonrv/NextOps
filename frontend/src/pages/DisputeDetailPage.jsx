import { useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useDisputeDetail } from "../hooks/useDisputes";
import { DisputeTimeline } from "../components/disputes/DisputeTimeline";
import { ResolveDisputeModal } from "../components/disputes/ResolveDisputeModal";
import { DisputeFormModal } from "../components/disputes/DisputeFormModal";
import { DisputeResultBadge } from "../components/invoices/InvoiceStatusBadge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
    ArrowLeft,
    FileText,
    Package,
    Building2,
    Calendar,
    DollarSign,
    CheckCircle,
    Edit,
    AlertCircle,
    Loader2,
    TrendingUp,
} from "lucide-react";
import { formatDate } from "../lib/dateUtils";

const ESTADO_CONFIG = {
    abierta: {
        variant: "destructive",
        icon: AlertCircle,
        label: "Abierta",
    },
    en_revision: {
        variant: "warning",
        icon: AlertCircle,
        label: "En Revisión",
    },
    resuelta: {
        variant: "success",
        icon: CheckCircle,
        label: "Resuelta",
    },
    cerrada: {
        variant: "secondary",
        icon: CheckCircle,
        label: "Cerrada",
    },
};

export function DisputeDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const { data: dispute, isLoading, error } = useDisputeDetail(id);

    const handleGoBack = () => {
        if (location.state?.from) {
            navigate(location.state.from);
        } else {
            navigate("/disputes");
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error || !dispute) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Error al cargar la disputa
                </h2>
                <p className="text-gray-600 mb-4">{error?.message || "Disputa no encontrada"}</p>
                <Button onClick={handleGoBack}>
                    Volver a Disputas
                </Button>
            </div>
        );
    }

    const estadoConfig = ESTADO_CONFIG[dispute.estado] || ESTADO_CONFIG.abierta;
    const EstadoIcon = estadoConfig.icon;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGoBack}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver
                    </Button>
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900">
                            Disputa: {dispute.numero_caso}
                        </h1>
                        <p className="text-gray-600 mt-1">Detalle completo de la disputa</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {(dispute.estado === "abierta" || dispute.estado === "en_revision") && (
                        <Button
                            onClick={() => setIsResolveModalOpen(true)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Resolver Disputa
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                    </Button>
                </div>
            </div>

            {/* Resumen de Montos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-sm font-medium text-gray-500 mb-2">Monto Factura</div>
                        <div className="text-2xl font-bold text-gray-900">
                            ${dispute.invoice_data?.monto?.toLocaleString("es-MX", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            }) || "0.00"}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-sm font-medium text-gray-500 mb-2">Monto en Disputa</div>
                        <div className="text-2xl font-bold text-red-600">
                            ${dispute.monto_disputa?.toLocaleString("es-MX", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </div>
                        {dispute.invoice_data?.monto && (
                            <div className="text-sm text-gray-500 mt-1">
                                {((dispute.monto_disputa / dispute.invoice_data.monto) * 100).toFixed(0)}% del total
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-sm font-medium text-gray-500 mb-2">
                            {dispute.monto_recuperado > 0 ? "Monto Recuperado" : "Tipo de Disputa"}
                        </div>
                        {dispute.monto_recuperado > 0 ? (
                            <div className="text-2xl font-bold text-green-600">
                                ${dispute.monto_recuperado?.toLocaleString("es-MX", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </div>
                        ) : (
                            <div className="text-xl font-semibold text-gray-900">
                                {dispute.tipo_disputa_display}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Información Principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Información de la Disputa */}
                <Card className="lg:col-span-2">
                    <CardHeader className="border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle>Información de la Disputa</CardTitle>
                            <div className="flex gap-2">
                                <Badge variant={estadoConfig.variant} className="text-sm">
                                    <EstadoIcon className="w-4 h-4 mr-1" />
                                    {estadoConfig.label}
                                </Badge>
                                {dispute.resultado && dispute.resultado !== 'pendiente' && (
                                    <DisputeResultBadge resultado={dispute.resultado} />
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm font-medium text-gray-500">
                                    Número de Caso
                                </label>
                                <p className="text-lg font-mono font-semibold text-blue-600 mt-1">
                                    {dispute.numero_caso}
                                </p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-500">
                                    Fecha de Creación
                                </label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <p className="text-base font-medium text-gray-900">
                                        {formatDate(dispute.created_at)}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-500">
                                    Operativo Responsable
                                </label>
                                <p className="text-base font-medium text-gray-900 mt-1">
                                    {dispute.operativo || dispute.ot_data?.operativo || (
                                        <span className="text-gray-400 italic">Sin asignar</span>
                                    )}
                                </p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-500">
                                    Cliente
                                </label>
                                <p className="text-base font-medium text-gray-900 mt-1">
                                    {dispute.ot_data?.cliente_nombre || (
                                        <span className="text-gray-400 italic">-</span>
                                    )}
                                </p>
                            </div>

                            <div className="col-span-2">
                                <label className="text-sm font-medium text-gray-500">
                                    Detalle de la Disputa
                                </label>
                                <p className="text-gray-900 mt-2 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-lg min-h-[60px]">
                                    {dispute.detalle}
                                </p>
                            </div>

                            {dispute.resolucion && (
                                <div className="col-span-2">
                                    <label className="text-sm font-medium text-gray-500">
                                        Descripción de la Resolución
                                    </label>
                                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <p className="text-sm text-blue-900 whitespace-pre-wrap">
                                            {dispute.resolucion}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Información Relacionada */}
                <div className="space-y-4">
                    {/* Factura */}
                    {dispute.invoice_data && (
                        <Card>
                            <CardHeader className="border-b">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Factura Relacionada
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <Link
                                    to={`/invoices/${dispute.invoice_data.id}`}
                                    className="block hover:bg-gray-50 rounded-lg p-3 -m-3 transition-colors"
                                >
                                    <p className="font-semibold text-blue-600 hover:text-blue-800">
                                        {dispute.invoice_data.numero_factura}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {dispute.invoice_data.proveedor_nombre}
                                    </p>
                                    <p className="text-sm font-semibold text-gray-900 mt-2">
                                        $
                                        {parseFloat(dispute.invoice_data.monto).toLocaleString(
                                            "es-MX",
                                            {
                                                minimumFractionDigits: 2,
                                            }
                                        )}
                                    </p>
                                </Link>
                            </CardContent>
                        </Card>
                    )}

                    {/* OT */}
                    {dispute.ot_data && (
                        <Card>
                            <CardHeader className="border-b">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    OT Relacionada
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <Link
                                    to={`/ots/${dispute.ot_data.id}`}
                                    className="block hover:bg-gray-50 rounded-lg p-3 -m-3 transition-colors"
                                >
                                    <p className="font-semibold text-blue-600 hover:text-blue-800">
                                        {dispute.ot_data.numero_ot}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {dispute.ot_data.cliente_nombre}
                                    </p>
                                    {dispute.ot_data.master_bl && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            MBL: {dispute.ot_data.master_bl}
                                        </p>
                                    )}
                                </Link>
                            </CardContent>
                        </Card>
                    )}

                    {/* Proveedor */}
                    {dispute.invoice_data?.proveedor_nombre && (
                        <Card>
                            <CardHeader className="border-b">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    Proveedor
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <p className="font-semibold text-gray-900">
                                    {dispute.invoice_data.proveedor_nombre}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Timeline de Eventos */}
            <DisputeTimeline disputeId={dispute.id} />

            {/* Modales */}
            <ResolveDisputeModal
                isOpen={isResolveModalOpen}
                onClose={() => setIsResolveModalOpen(false)}
                dispute={dispute}
            />

            <DisputeFormModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                dispute={dispute}
                invoice={null}
            />
        </div>
    );
}

