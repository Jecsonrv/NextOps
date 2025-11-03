import PropTypes from 'prop-types';
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import InvoiceStatusBadge, {
    CostTypeBadge,
    ExcludedFromStatsBadge,
} from "./InvoiceStatusBadge";
import {
    Eye,
    Link2,
    AlertCircle,
    AlertTriangle,
    FileMinus,
    Download,
    Ship,
    DollarSign,
} from "lucide-react";
import { formatDate } from "../../lib/dateUtils";

/**
 * Tabla responsiva de facturas con columnas sticky
 * Columnas siempre visibles: Checkbox, Operativo, OT, Cliente, MBL, Estado
 * Resto de columnas: scrollables horizontalmente
 */
export function InvoicesTableResponsive({
    invoices,
    selectedInvoices,
    onSelectAll,
    onSelectOne,
    onAssignOT,
    onCreateDispute,
}) {
    return (
        <div className="overflow-x-auto -mx-3 sm:mx-0 relative">
            <div className="inline-block min-w-full align-middle">
                <table className="min-w-full text-sm border-separate border-spacing-0">
                    <thead>
                        <tr className="bg-gray-50">
                            {/* Checkbox - siempre fija */}
                            <th className="sticky left-0 z-20 bg-gray-50 px-2 sm:px-3 py-2 sm:py-3 text-center border-b border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                <input
                                    type="checkbox"
                                    checked={
                                        selectedInvoices.length === invoices.length &&
                                        invoices.length > 0
                                    }
                                    onChange={onSelectAll}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                            </th>

                            {/* OPERATIVO - fija */}
                            <th className="sticky left-[40px] sm:left-[52px] z-20 bg-gray-50 px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                                Operativo
                            </th>

                            {/* OT - fija */}
                            <th className="sticky left-[120px] sm:left-[160px] z-20 bg-gray-50 px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                                OT
                            </th>

                            {/* CLIENTE - fija */}
                            <th className="sticky left-[220px] sm:left-[280px] z-20 bg-gray-50 px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                                Cliente
                            </th>

                            {/* MBL - fija */}
                            <th className="sticky left-[340px] sm:left-[420px] z-20 bg-gray-50 px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                                MBL
                            </th>

                            {/* ESTADO - última columna fija con borde más grueso */}
                            <th className="sticky left-[440px] sm:left-[540px] z-20 bg-gray-50 px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-r-2 border-gray-400 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.15)] whitespace-nowrap">
                                Estado
                            </th>

                            {/* Resto de columnas - scrollables */}
                            <th className="px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                                Naviera
                            </th>
                            <th className="px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                                Proveedor
                            </th>
                            <th className="px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                                Barco
                            </th>
                            <th className="px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                                Tipo Prov.
                            </th>
                            <th className="px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                                Tipo Costo
                            </th>
                            <th className="px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                                # Factura
                            </th>
                            <th className="px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                                F. Emisión
                            </th>
                            <th className="px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                                F. Provisión
                            </th>
                            <th className="px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                                F. Facturación
                            </th>
                            <th className="px-3 py-2 sm:py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                                Monto
                            </th>
                            <th className="px-3 py-2 sm:py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                                Acciones
                            </th>
                        </tr>
                    </thead>

                    <tbody className="bg-white">
                        {invoices.map((invoice) => (
                            <tr
                                key={invoice.id}
                                className="hover:bg-blue-50 transition-colors"
                            >
                                {/* Checkbox - fija */}
                                <td className="sticky left-0 z-10 bg-white hover:bg-blue-50 px-2 sm:px-3 py-2 sm:py-3 text-center border-b border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    <input
                                        type="checkbox"
                                        checked={selectedInvoices.includes(invoice.id)}
                                        onChange={() => onSelectOne(invoice.id)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </td>

                                {/* OPERATIVO - fija */}
                                <td className="sticky left-[40px] sm:left-[52px] z-10 bg-white hover:bg-blue-50 px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 border-b border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                                    {invoice.ot_data?.operativo || "-"}
                                </td>

                                {/* OT - fija */}
                                <td className="sticky left-[120px] sm:left-[160px] z-10 bg-white hover:bg-blue-50 px-2 sm:px-3 py-2 sm:py-3 border-b border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                                    {invoice.ot_data ? (
                                        <Link
                                            to={`/ots/${invoice.ot_data.id}`}
                                            className="text-blue-600 hover:text-blue-800 font-medium text-xs sm:text-sm flex items-center gap-1"
                                        >
                                            <Link2 className="w-3.5 h-3.5" />
                                            {invoice.ot_data.numero_ot}
                                        </Link>
                                    ) : (
                                        <span className="text-gray-400 text-xs sm:text-sm italic">
                                            Sin asignar
                                        </span>
                                    )}
                                </td>

                                {/* CLIENTE - fija */}
                                <td className="sticky left-[220px] sm:left-[280px] z-10 bg-white hover:bg-blue-50 px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 border-b border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                                    {invoice.ot_data?.cliente || "-"}
                                </td>

                                {/* MBL - fija */}
                                <td className="sticky left-[340px] sm:left-[420px] z-10 bg-white hover:bg-blue-50 px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 border-b border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                                    {invoice.ot_data?.mbl || "-"}
                                </td>

                                {/* ESTADO - última fija */}
                                <td className="sticky left-[440px] sm:left-[540px] z-10 bg-white hover:bg-blue-50 px-2 sm:px-3 py-2 sm:py-3 border-b border-r-2 border-gray-400 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.15)] whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                        <InvoiceStatusBadge invoice={invoice} />
                                        <div className="flex gap-1">
                                            <CostTypeBadge invoice={invoice} />
                                            <ExcludedFromStatsBadge invoice={invoice} />
                                        </div>
                                    </div>
                                </td>

                                {/* Resto de columnas - scrollables */}
                                <td className="px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 border-b border-gray-200 whitespace-nowrap">
                                    {invoice.ot_data?.naviera || "-"}
                                </td>

                                <td className="px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 border-b border-gray-200 whitespace-nowrap">
                                    {invoice.proveedor_data?.nombre || "-"}
                                </td>

                                <td className="px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 border-b border-gray-200 whitespace-nowrap">
                                    {invoice.ot_data?.barco || "-"}
                                </td>

                                <td className="px-3 py-2 sm:py-3 border-b border-gray-200 whitespace-nowrap">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                                        <Ship className="w-3.5 h-3.5" />
                                        {invoice.proveedor_data?.tipo_display || "-"}
                                    </div>
                                </td>

                                <td className="px-3 py-2 sm:py-3 border-b border-gray-200 whitespace-nowrap">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <DollarSign className="w-3.5 h-3.5" />
                                        {invoice.tipo_costo_display || "-"}
                                    </div>
                                </td>

                                <td className="px-3 py-2 sm:py-3 border-b border-gray-200 whitespace-nowrap">
                                    <div className="flex items-center gap-1">
                                        <Link
                                            to={`/invoices/${invoice.id}`}
                                            className="font-medium text-xs sm:text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            {invoice.numero_factura || "SIN-NUM"}
                                        </Link>
                                        {invoice.requiere_revision && (
                                            <AlertCircle
                                                className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-500 flex-shrink-0"
                                                title="Requiere Revisión"
                                            />
                                        )}
                                        {invoice.has_disputes && invoice.dispute_id && (
                                            <Link
                                                to={`/invoices/disputes/${invoice.dispute_id}`}
                                                onClick={(e) => e.stopPropagation()}
                                                title="Ver Disputa"
                                            >
                                                <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-500 hover:text-yellow-700 flex-shrink-0" />
                                            </Link>
                                        )}
                                        {invoice.has_credit_notes && (
                                            <FileMinus
                                                className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-500 flex-shrink-0"
                                                title="Tiene Notas de Crédito"
                                            />
                                        )}
                                    </div>
                                </td>

                                <td className="px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 border-b border-gray-200 whitespace-nowrap">
                                    {formatDate(invoice.fecha_emision)}
                                </td>

                                <td className="px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 border-b border-gray-200 whitespace-nowrap">
                                    {formatDate(invoice.fecha_provision)}
                                </td>

                                <td className="px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 border-b border-gray-200 whitespace-nowrap">
                                    {formatDate(invoice.fecha_facturacion)}
                                </td>

                                <td className="px-3 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900 border-b border-gray-200 whitespace-nowrap">
                                    ${(invoice.monto_aplicable ?? invoice.monto)?.toLocaleString(
                                        "es-MX",
                                        {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        }
                                    ) || "0.00"}
                                </td>

                                <td className="px-3 py-2 sm:py-3 text-right border-b border-gray-200 whitespace-nowrap">
                                    <div className="flex justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                (window.location.href = `/invoices/${invoice.id}`)
                                            }
                                            title="Ver detalles"
                                            className="h-8 w-8"
                                        >
                                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onAssignOT(invoice)}
                                            title={
                                                invoice.ot_data ? "Cambiar OT" : "Asignar OT"
                                            }
                                            className="h-8 w-8"
                                        >
                                            <Link2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onCreateDispute(invoice)}
                                            title="Crear Disputa"
                                            className="h-8 w-8"
                                        >
                                            <AlertTriangle className="w-4 h-4" />
                                        </Button>
                                        {invoice.file_url && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    window.open(
                                                        `${import.meta.env.VITE_BASE_URL}${
                                                            invoice.file_url
                                                        }`,
                                                        "_blank"
                                                    )
                                                }
                                                title="Descargar archivo"
                                                className="h-8 w-8"
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        )}
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

InvoicesTableResponsive.propTypes = {
    invoices: PropTypes.array.isRequired,
    selectedInvoices: PropTypes.array.isRequired,
    onSelectAll: PropTypes.func.isRequired,
    onSelectOne: PropTypes.func.isRequired,
    onAssignOT: PropTypes.func.isRequired,
    onCreateDispute: PropTypes.func.isRequired,
};
