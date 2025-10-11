import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../lib/api";
import { exportOTDetailToExcel } from "../lib/exportUtils";
import { formatDate } from "../lib/dateUtils";
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
    Edit,
    Trash2,
    Download,
    Loader2,
    Package,
    Ship,
    MapPin,
    Calendar,
    FileText,
    DollarSign,
} from "lucide-react";

const estadoColors = {
    almacenadora: "secondary",
    bodega: "default",
    cerrada: "success",
    desprendimiento: "warning",
    disputa: "destructive",
    en_rada: "info",
    fact_adicionales: "warning",
    finalizada: "success",
    puerto: "info",
    transito: "default",
    // Estados legacy
    pendiente: "warning",
    en_transito: "default",
    entregado: "success",
    facturado: "success",
    cerrado: "success",
    cancelado: "destructive",
    en_proceso: "default",
    completada: "success",
    cancelada: "destructive",
};

const estadoProvisionColors = {
    pendiente: "warning",
    provisionada: "success",
    revision: "default",
    disputada: "destructive",
};

const estadoFacturadoColors = {
    pendiente: "warning",
    facturado: "success",
};

/**
 * Página de detalle de una OT
 * Muestra toda la información de la OT de forma read-only
 */
export function OTDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    // Cargar datos de la OT
    const {
        data: ot,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["ot", id],
        queryFn: async () => {
            const response = await apiClient.get(`/ots/${id}/`);
            return response.data;
        },
    });

    // Cargar facturas relacionadas
    const { data: invoicesData } = useQuery({
        queryKey: ["invoices", "ot", id],
        queryFn: async () => {
            const response = await apiClient.get(`/invoices/?ot=${id}`);
            return response.data;
        },
    });

    const handleDelete = async () => {
        if (
            window.confirm(
                `¿Está seguro de eliminar la OT ${ot?.numero_ot}? Esta acción no se puede deshacer.`
            )
        ) {
            try {
                await apiClient.delete(`/ots/${id}/`);
                alert("OT eliminada exitosamente");
                navigate("/ots");
            } catch (error) {
                console.error("Error al eliminar OT:", error);
                alert("Error al eliminar la OT");
            }
        }
    };

    // Estados de carga y error
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
                    <p className="text-gray-500">Cargando OT...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-red-500 mb-4">Error al cargar la OT</p>
                    <Button onClick={() => navigate("/ots")}>
                        Volver a la lista
                    </Button>
                </div>
            </div>
        );
    }

    const invoices = invoicesData?.results || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/ots")}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">
                                {ot.numero_ot}
                            </h1>
                            <Badge
                                variant={estadoColors[ot.estado] || "default"}
                            >
                                {ot.estado_display ||
                                    ot.get_estado_display ||
                                    ot.estado?.toUpperCase()}
                            </Badge>
                            {ot.tipo_operacion === "exportacion" && (
                                <Badge variant="warning">Exportación</Badge>
                            )}
                        </div>
                        <p className="text-sm text-gray-500">
                            Cliente: {ot.cliente?.original_name || "N/A"} •
                            Operativo: {ot.operativo || "N/A"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportOTDetailToExcel(ot)}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/ots/${id}/edit`)}
                    >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                    </Button>
                </div>
            </div>

            {/* Grid de información */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna principal */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Información Básica */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Información Básica
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Número OT
                                </p>
                                <p className="text-base font-semibold">
                                    {ot.numero_ot}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Estatus
                                </p>
                                <p className="text-base">
                                    <Badge
                                        variant={
                                            estadoColors[ot.estado] || "default"
                                        }
                                    >
                                        {ot.estado_display ||
                                            ot.get_estado_display ||
                                            ot.estado?.toUpperCase()}
                                    </Badge>
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Cliente
                                </p>
                                <p className="text-base">
                                    {ot.cliente?.original_name || "N/A"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Proveedor
                                </p>
                                <p className="text-base">
                                    {ot.proveedor?.nombre || "N/A"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Operativo
                                </p>
                                <p className="text-base">{ot.operativo}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Tipo Embarque
                                </p>
                                <p className="text-base">{ot.tipo_embarque}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Master BL
                                </p>
                                <p className="text-base">
                                    {ot.master_bl || "N/A"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Barco
                                </p>
                                <p className="text-base">{ot.barco}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* House BLs */}
                    {ot.house_bls && ot.house_bls.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    House BLs
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {ot.house_bls.map((hbl, index) => (
                                        <Badge key={index} variant="outline">
                                            {hbl}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Contenedores */}
                    {ot.contenedores && ot.contenedores.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5" />
                                    Contenedores ({ot.contenedores.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {ot.contenedores.map(
                                        (contenedor, index) => (
                                            <div
                                                key={index}
                                                className="p-3 border border-gray-200 rounded-lg flex items-start justify-between"
                                            >
                                                <div className="space-y-1">
                                                    <p className="font-semibold">
                                                        {typeof contenedor ===
                                                        "string"
                                                            ? contenedor
                                                            : contenedor?.numero ||
                                                              "-"}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Transporte y Puertos */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Ship className="h-5 w-5" />
                                Transporte y Puertos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 flex items-center gap-1 mb-2">
                                        <MapPin className="h-4 w-4" />
                                        Puerto Origen
                                    </p>
                                    <p className="text-base">
                                        {ot.puerto_origen || "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 flex items-center gap-1 mb-2">
                                        <MapPin className="h-4 w-4" />
                                        Puerto Destino
                                    </p>
                                    <p className="text-base">
                                        {ot.puerto_destino || "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 flex items-center gap-1 mb-2">
                                        <Calendar className="h-4 w-4" />
                                        ETD
                                    </p>
                                    <p className="text-base">
                                        {formatDate(ot.etd)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 flex items-center gap-1 mb-2">
                                        <Calendar className="h-4 w-4" />
                                        ETA
                                    </p>
                                    <p className="text-base">
                                        {formatDate(ot.fecha_eta)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 flex items-center gap-1 mb-2">
                                        <Calendar className="h-4 w-4" />
                                        ETA Confirmada
                                    </p>
                                    <p className="text-base">
                                        {formatDate(ot.fecha_llegada)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Documentos y Fechas */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Documentos y Fechas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-2">
                                        Express Release
                                    </p>
                                    <p className="text-base">
                                        {formatDate(ot.express_release_fecha)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-2">
                                        Contra Entrega
                                    </p>
                                    <p className="text-base">
                                        {formatDate(ot.contra_entrega_fecha)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-2">
                                        Fecha Provisión
                                    </p>
                                    <p className="text-base">
                                        {formatDate(ot.fecha_provision)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-2">
                                        Estado Provisión
                                    </p>
                                    <Badge
                                        variant={
                                            estadoProvisionColors[
                                                ot.estado_provision
                                            ] || "default"
                                        }
                                    >
                                        {ot.estado_provision?.toUpperCase() ||
                                            "N/A"}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-2">
                                        Solicitud Facturación
                                    </p>
                                    <p className="text-base">
                                        {formatDate(
                                            ot.fecha_solicitud_facturacion
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-2">
                                        Recepción Factura
                                    </p>
                                    <p className="text-base">
                                        {formatDate(ot.fecha_recepcion_factura)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-2">
                                        Estado Facturado
                                    </p>
                                    <Badge
                                        variant={
                                            estadoFacturadoColors[
                                                ot.estado_facturado
                                            ] || "default"
                                        }
                                    >
                                        {ot.estado_facturado?.toUpperCase() ||
                                            "N/A"}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-2">
                                        Envío Cierre OT
                                    </p>
                                    <p className="text-base">
                                        {formatDate(ot.envio_cierre_ot)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Comentarios */}
                    {ot.comentarios && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Comentarios</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-700 whitespace-pre-wrap">
                                    {ot.comentarios}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Columna lateral */}
                <div className="space-y-6">
                    {/* Provisiones */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Provisiones
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Estatus
                                </p>
                                <Badge
                                    variant={
                                        estadoProvisionColors[
                                            ot.estado_provision
                                        ] || "default"
                                    }
                                >
                                    {ot.estado_provision?.toUpperCase() ||
                                        "N/A"}
                                </Badge>
                            </div>

                            {ot.fecha_provision && (
                                <div>
                                    <p className="text-sm font-medium text-gray-500">
                                        Fecha Provisión
                                    </p>
                                    <p className="text-base">
                                        {formatDate(ot.fecha_provision)}
                                    </p>
                                </div>
                            )}

                            {ot.provision_source && (
                                <div>
                                    <p className="text-sm font-medium text-gray-500">
                                        Fuente
                                    </p>
                                    <Badge variant="outline">
                                        {ot.provision_source}
                                    </Badge>
                                </div>
                            )}

                            {ot.provision_hierarchy?.total && (
                                <div className="pt-3 border-t">
                                    <p className="text-sm font-medium text-gray-500">
                                        Total Provisión
                                    </p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        $
                                        {ot.provision_hierarchy.total.toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Facturación */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Facturación</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Estatus
                                </p>
                                <Badge
                                    variant={
                                        estadoFacturadoColors[
                                            ot.estado_facturado
                                        ] || "default"
                                    }
                                >
                                    {ot.estado_facturado?.toUpperCase() ||
                                        "N/A"}
                                </Badge>
                            </div>

                            {ot.fecha_solicitud_facturacion && (
                                <div>
                                    <p className="text-sm font-medium text-gray-500">
                                        Solicitud
                                    </p>
                                    <p className="text-base">
                                        {formatDate(
                                            ot.fecha_solicitud_facturacion
                                        )}
                                    </p>
                                </div>
                            )}

                            {ot.fecha_recepcion_factura && (
                                <div>
                                    <p className="text-sm font-medium text-gray-500">
                                        Recepción
                                    </p>
                                    <p className="text-base">
                                        {formatDate(ot.fecha_recepcion_factura)}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Facturas Relacionadas */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Facturas Relacionadas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {invoices.length > 0 ? (
                                <div className="space-y-2">
                                    {invoices.map((invoice) => (
                                        <Link
                                            key={invoice.id}
                                            to={`/invoices/${invoice.id}`}
                                            className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            <p className="font-semibold text-sm">
                                                {invoice.numero_factura}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {invoice.proveedor?.nombre}
                                            </p>
                                            <p className="text-sm font-medium text-blue-600">
                                                $
                                                {invoice.monto_total?.toLocaleString() ||
                                                    "0"}
                                            </p>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 text-center py-4">
                                    No hay facturas asociadas
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Metadatos */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Información del Sistema</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div>
                                <p className="font-medium text-gray-500">
                                    Creada
                                </p>
                                <p>
                                    {new Date(ot.created_at).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="font-medium text-gray-500">
                                    Última actualización
                                </p>
                                <p>
                                    {new Date(ot.updated_at).toLocaleString()}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
