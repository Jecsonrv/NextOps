import PropTypes from 'prop-types';
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Eye, Edit, Trash2 } from "lucide-react";
import { formatDate } from "../../lib/dateUtils";

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

/**
 * Tabla responsiva de OTs con columnas sticky
 * Columnas siempre visibles: OT, Estado, Operativo, Cliente, MBL
 * Resto de columnas: scrollables horizontalmente
 */
export function OTsTableResponsive({ ots, onDelete, deletingId }) {
    const navigate = useNavigate();

    return (
        <div className="overflow-x-auto -mx-3 sm:mx-0 relative">
            <div className="inline-block min-w-full align-middle">
                <table className="min-w-full text-sm border-separate border-spacing-0">
                    <thead>
                        <tr className="bg-gray-50">
                            {/* OT - fija */}
                            <th className="sticky left-0 z-20 bg-gray-50 px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                                OT
                            </th>

                            {/* ESTATUS - fija */}
                            <th className="sticky left-[100px] sm:left-[130px] z-20 bg-gray-50 px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                                Estatus
                            </th>

                            {/* OPERATIVO - fija */}
                            <th className="sticky left-[200px] sm:left-[250px] z-20 bg-gray-50 px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                                Operativo
                            </th>

                            {/* CLIENTE - fija */}
                            <th className="sticky left-[300px] sm:left-[370px] z-20 bg-gray-50 px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                                Cliente
                            </th>

                            {/* MBL - última fija */}
                            <th className="sticky left-[420px] sm:left-[510px] z-20 bg-gray-50 px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-r-2 border-gray-400 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.15)] whitespace-nowrap">
                                MBL
                            </th>

                            {/* Resto de columnas - scrollables */}
                            <th className="px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                                Contenedores
                            </th>
                            <th className="px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                                Naviera
                            </th>
                            <th className="px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                                Barco
                            </th>
                            <th className="px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                                F. Provisión
                            </th>
                            <th className="px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                                F. Facturación
                            </th>
                            <th className="px-3 py-2 sm:py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                                Acciones
                            </th>
                        </tr>
                    </thead>

                    <tbody className="bg-white">
                        {ots.map((ot) => (
                            <tr
                                key={ot.id}
                                className="hover:bg-blue-50 transition-colors"
                            >
                                {/* OT - fija */}
                                <td className="sticky left-0 z-10 bg-white hover:bg-blue-50 px-2 sm:px-3 py-2 sm:py-3 border-b border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <Link
                                            to={`/ots/${ot.id}`}
                                            className="font-medium text-xs sm:text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            {ot.numero_ot}
                                        </Link>
                                        {ot.tipo_operacion === "exportacion" && (
                                            <Badge variant="warning" className="text-xs">
                                                EXP
                                            </Badge>
                                        )}
                                    </div>
                                </td>

                                {/* ESTATUS - fija */}
                                <td className="sticky left-[100px] sm:left-[130px] z-10 bg-white hover:bg-blue-50 px-2 sm:px-3 py-2 sm:py-3 border-b border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                                    <Badge
                                        variant={estadoColors[ot.estado] || "default"}
                                        className="text-xs"
                                    >
                                        {ot.estado_display}
                                    </Badge>
                                </td>

                                {/* OPERATIVO - fija */}
                                <td className="sticky left-[200px] sm:left-[250px] z-10 bg-white hover:bg-blue-50 px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 border-b border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                                    {ot.operativo || "-"}
                                </td>

                                {/* CLIENTE - fija */}
                                <td className="sticky left-[300px] sm:left-[370px] z-10 bg-white hover:bg-blue-50 px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 border-b border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                                    {ot.cliente_nombre || "-"}
                                </td>

                                {/* MBL - última fija */}
                                <td className="sticky left-[420px] sm:left-[510px] z-10 bg-white hover:bg-blue-50 px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 border-b border-r-2 border-gray-400 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.15)] whitespace-nowrap">
                                    {ot.mbl || "-"}
                                </td>

                                {/* Resto de columnas - scrollables */}
                                <td className="px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 border-b border-gray-200 whitespace-nowrap">
                                    {ot.contenedores_list || "-"}
                                </td>

                                <td className="px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 border-b border-gray-200 whitespace-nowrap">
                                    {ot.proveedor_nombre || "-"}
                                </td>

                                <td className="px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 border-b border-gray-200 whitespace-nowrap">
                                    {ot.barco || "-"}
                                </td>

                                <td className="px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 border-b border-gray-200 whitespace-nowrap">
                                    {formatDate(ot.fecha_provision)}
                                </td>

                                <td className="px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 border-b border-gray-200 whitespace-nowrap">
                                    {formatDate(ot.fecha_recepcion_factura)}
                                </td>

                                <td className="px-3 py-2 sm:py-3 text-right border-b border-gray-200 whitespace-nowrap">
                                    <div className="flex justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => navigate(`/ots/${ot.id}`)}
                                            title="Ver detalle"
                                            className="h-8 w-8"
                                        >
                                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => navigate(`/ots/${ot.id}/edit`)}
                                            title="Editar"
                                            className="h-8 w-8"
                                        >
                                            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onDelete(ot)}
                                            title="Eliminar"
                                            disabled={deletingId === ot.id}
                                            className="h-8 w-8"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Indicador visual para scroll */}
            <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-gray-100 to-transparent pointer-events-none z-5" />
        </div>
    );
}

OTsTableResponsive.propTypes = {
    ots: PropTypes.array.isRequired,
    onDelete: PropTypes.func.isRequired,
    deletingId: PropTypes.number,
};
