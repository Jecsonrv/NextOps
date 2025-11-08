import PropTypes from 'prop-types';
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Eye, Edit, Trash2 } from "lucide-react";

const estadoBadgeVariant = {
    abierta: "destructive",
    en_revision: "warning",
    resuelta: "success",
    cerrada: "secondary",
};

const resultadoBadgeVariant = {
    pendiente: "secondary",
    aprobada_total: "success",
    aprobada_parcial: "default",
    rechazada: "destructive",
    anulada: "secondary",
};

/**
 * Tabla responsiva de Disputas
 * Diseño limpio y organizado con toda la información relevante
 */
export function DisputesTableResponsive({ disputes, onEdit, onDelete, deletingId }) {
    const navigate = useNavigate();

    const handleRowClick = (e, disputeId) => {
        // No navegar si se hizo click en un botón o link
        if (e.target.closest('button') || e.target.closest('a')) {
            return;
        }
        navigate(`/disputes/${disputeId}`);
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                            Caso
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                            Tipo
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                            Estado
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                            Factura / OT
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                            Proveedor / Operativo
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                            Monto
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                            Fecha
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                            Acciones
                        </th>
                    </tr>
                </thead>

                <tbody className="bg-white">
                    {disputes.map((dispute) => (
                        <tr
                            key={dispute.id}
                            onClick={(e) => handleRowClick(e, dispute.id)}
                            className="hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                            {/* CASO */}
                            <td className="px-3 sm:px-4 py-3 border-b border-gray-200 bg-white hover:bg-blue-50">
                                <Link
                                    to={`/disputes/${dispute.id}`}
                                    className="font-semibold text-sm text-blue-600 hover:text-blue-800"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {dispute.numero_caso}
                                </Link>
                            </td>

                            {/* TIPO */}
                            <td className="px-3 sm:px-4 py-3 border-b border-gray-200 bg-white hover:bg-blue-50">
                                <Badge
                                    variant={
                                        dispute.tipo_disputa === 'servicio_no_prestado' ? 'destructive' :
                                        dispute.tipo_disputa === 'monto_incorrecto' ? 'destructive' :
                                        dispute.tipo_disputa === 'otro' ? 'secondary' :
                                        'warning'
                                    }
                                    className="text-xs"
                                >
                                    {dispute.tipo_disputa === 'servicio_no_prestado' ? 'Serv. No Prestado' :
                                     dispute.tipo_disputa === 'monto_incorrecto' ? 'Monto Incorrecto' :
                                     dispute.tipo_disputa === 'almacenaje_no_aplica' ? 'Almacenaje N/A' :
                                     dispute.tipo_disputa === 'dias_libres_incorrectos' ? 'Días Libres' :
                                     dispute.tipo_disputa === 'demoras_no_aplican' ? 'Demoras N/A' :
                                     'Otro'}
                                </Badge>
                            </td>

                            {/* ESTADO */}
                            <td className="px-3 sm:px-4 py-3 border-b border-gray-200 bg-white hover:bg-blue-50">
                                <div className="flex flex-col gap-1">
                                    <Badge
                                        variant={estadoBadgeVariant[dispute.estado]}
                                        className="text-xs w-fit"
                                    >
                                        {dispute.estado_display}
                                    </Badge>
                                    {dispute.resultado && dispute.resultado !== 'pendiente' && (
                                        <Badge
                                            variant={resultadoBadgeVariant[dispute.resultado]}
                                            className="text-xs w-fit"
                                        >
                                            {dispute.resultado_display}
                                        </Badge>
                                    )}
                                </div>
                            </td>

                            {/* FACTURA/OT */}
                            <td className="px-3 sm:px-4 py-3 border-b border-gray-200 bg-white hover:bg-blue-50">
                                <div className="flex flex-col gap-1">
                                    {dispute.invoice_data ? (
                                        <Link
                                            to={`/invoices/${dispute.invoice_data.id}`}
                                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {dispute.invoice_data.numero_factura}
                                        </Link>
                                    ) : (
                                        <span className="text-gray-400 text-sm">Sin factura</span>
                                    )}
                                    {dispute.ot_data && (
                                        <Link
                                            to={`/ots/${dispute.ot_data.id}`}
                                            className="text-gray-600 hover:text-gray-800 text-xs"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {dispute.ot_data.numero_ot}
                                        </Link>
                                    )}
                                </div>
                            </td>

                            {/* PROVEEDOR / OPERATIVO */}
                            <td className="px-3 sm:px-4 py-3 border-b border-gray-200 bg-white hover:bg-blue-50">
                                <div className="text-sm">
                                    <p className="font-medium text-gray-900">
                                        {dispute.invoice_data?.proveedor_nombre || "-"}
                                    </p>
                                    {(dispute.operativo || dispute.ot_data?.operativo) && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {dispute.operativo || dispute.ot_data?.operativo}
                                        </p>
                                    )}
                                </div>
                            </td>

                            {/* MONTO DISPUTA */}
                            <td className="px-3 sm:px-4 py-3 border-b border-gray-200 bg-white hover:bg-blue-50">
                                <div className="text-right">
                                    <div className="text-sm font-semibold text-red-600">
                                        ${dispute.monto_disputa?.toLocaleString("es-MX", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </div>
                                    {dispute.invoice_data?.monto && (
                                        <div className="text-xs text-gray-500">
                                            de ${dispute.invoice_data.monto.toLocaleString("es-MX", {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 0
                                            })}
                                        </div>
                                    )}
                                </div>
                            </td>

                            {/* FECHA */}
                            <td className="px-3 sm:px-4 py-3 border-b border-gray-200 bg-white hover:bg-blue-50 text-sm text-gray-600">
                                {new Date(dispute.created_at).toLocaleDateString("es-MX")}
                            </td>

                            {/* ACCIONES */}
                            <td className="px-3 sm:px-4 py-3 border-b border-gray-200 bg-white hover:bg-blue-50">
                                <div className="flex justify-end gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/disputes/${dispute.id}`);
                                        }}
                                        title="Ver detalle"
                                        className="h-8 w-8"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(dispute);
                                        }}
                                        title="Editar"
                                        className="h-8 w-8"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(dispute);
                                        }}
                                        title="Eliminar"
                                        className="h-8 w-8"
                                        disabled={deletingId === dispute.id}
                                    >
                                        <Trash2 className={`w-4 h-4 ${deletingId === dispute.id ? 'text-gray-400' : 'text-red-600'}`} />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

DisputesTableResponsive.propTypes = {
    disputes: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.number.isRequired,
            numero_caso: PropTypes.string.isRequired,
            estado: PropTypes.string.isRequired,
            estado_display: PropTypes.string,
            tipo_disputa: PropTypes.string.isRequired,
            tipo_disputa_display: PropTypes.string,
            resultado: PropTypes.string,
            resultado_display: PropTypes.string,
            monto_disputa: PropTypes.number,
            operativo: PropTypes.string,
            created_at: PropTypes.string,
            invoice_data: PropTypes.object,
            ot_data: PropTypes.object,
        })
    ).isRequired,
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    deletingId: PropTypes.number,
};
