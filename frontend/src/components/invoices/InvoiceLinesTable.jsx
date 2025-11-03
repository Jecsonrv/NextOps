import PropTypes from 'prop-types';

/**
 * Tabla editable de líneas de factura de venta - El Salvador
 * Maneja cálculo automático de IVA 13%, subtotales y totales
 * Incluye tipo de servicio para determinación de retención de renta
 */


import { Plus, Trash2, Calculator } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';

// Conceptos comunes para facturas
const CONCEPTO_CHOICES = [
    'Servicio de consultoría',
    'Servicios profesionales',
    'Servicios técnicos',
    'Transporte y logística',
    'Venta de mercancías',
    'Licencias de software',
    'Soporte técnico',
    'Capacitación',
    'Otros servicios',
];

export function InvoiceLinesTable({ lines, onChange, readonly = false }) {
    

    // Calcular totales de una línea
    const calculateLineValues = (line) => {
        const cantidad = parseFloat(line.cantidad) || 0;
        const precio = parseFloat(line.precio_unitario) || 0;
        const subtotal = cantidad * precio;

        let iva = 0;
        if (line.aplica_iva) {
            iva = subtotal * 0.13; // IVA 13% El Salvador
        }

        const total = subtotal + iva;

        return {
            ...line,
            subtotal: subtotal.toFixed(2),
            iva: iva.toFixed(2),
            total: total.toFixed(2),
        };
    };

    // Agregar nueva línea
    const handleAddLine = () => {
        const newLine = {
            id: `temp-${Date.now()}`, // ID temporal para nuevas líneas
            numero_linea: lines.length + 1,
            descripcion: '',
            concepto: CONCEPTO_CHOICES[0],
            cantidad: 1,
            precio_unitario: 0,
            aplica_iva: true,
            subtotal: '0.00',
            iva: '0.00',
            total: '0.00',
            notas: '',
        };

        onChange([...lines, newLine]);
        
    };

    // Actualizar una línea
    const handleUpdateLine = (lineId, field, value) => {
        const updatedLines = lines.map(line => {
            if (line.id === lineId) {
                const updated = { ...line, [field]: value };
                return calculateLineValues(updated);
            }
            return line;
        });

        onChange(updatedLines);
    };

    // Eliminar línea
    const handleDeleteLine = (lineId) => {
        if (window.confirm('¿Eliminar esta línea de la factura?')) {
            const filtered = lines.filter(line => line.id !== lineId);
            // Renumerar líneas
            const renumbered = filtered.map((line, index) => ({
                ...line,
                numero_linea: index + 1
            }));
            onChange(renumbered);
        }
    };

    // Calcular totales generales
    const totals = lines.reduce((acc, line) => {
        const subtotal = parseFloat(line.subtotal) || 0;
        const iva = parseFloat(line.iva) || 0;

        if (line.aplica_iva) {
            acc.subtotal_gravado += subtotal;
        } else {
            acc.subtotal_exento += subtotal;
        }

        acc.iva_total += iva;
        acc.total += parseFloat(line.total) || 0;

        return acc;
    }, {
        subtotal_gravado: 0,
        subtotal_exento: 0,
        iva_total: 0,
        total: 0
    });

    return (
        <div className="space-y-4">
            {/* Tabla de Líneas */}
            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                                #
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[200px]">
                                Descripción
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[150px]">
                                Concepto
                            </th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">
                                Cant.
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                                Precio Unit.
                            </th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">
                                IVA?
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                                Subtotal
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                                IVA 13%
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                                Total
                            </th>
                            {!readonly && (
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">
                                    Acc.
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {lines.length === 0 ? (
                            <tr>
                                <td colSpan={readonly ? 9 : 10} className="px-3 py-8 text-center text-gray-500">
                                    <Calculator className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                                    <p className="text-sm">No hay líneas agregadas</p>
                                    {!readonly && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleAddLine}
                                            className="mt-3"
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Agregar primera línea
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ) : (
                            lines.map((line) => (
                                <tr key={line.id} className="hover:bg-gray-50">
                                    {/* Número de línea */}
                                    <td className="px-3 py-2 text-center text-sm text-gray-900 font-mono">
                                        {line.numero_linea}
                                    </td>

                                    {/* Descripción */}
                                    <td className="px-3 py-2">
                                        {readonly ? (
                                            <span className="text-sm text-gray-900">{line.descripcion}</span>
                                        ) : (
                                            <Input
                                                type="text"
                                                value={line.descripcion}
                                                onChange={(e) => handleUpdateLine(line.id, 'descripcion', e.target.value)}
                                                placeholder="Descripción del servicio/producto"
                                                className="text-sm"
                                            />
                                        )}
                                    </td>

                                    {/* Concepto */}
                                    <td className="px-3 py-2">
                                        {readonly ? (
                                            <span className="text-sm text-gray-700">{line.concepto}</span>
                                        ) : (
                                            <select
                                                value={line.concepto}
                                                onChange={(e) => handleUpdateLine(line.id, 'concepto', e.target.value)}
                                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                {CONCEPTO_CHOICES.map(concepto => (
                                                    <option key={concepto} value={concepto}>
                                                        {concepto}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </td>

                                    {/* Cantidad */}
                                    <td className="px-3 py-2">
                                        {readonly ? (
                                            <span className="text-sm text-gray-900 text-center block">{line.cantidad}</span>
                                        ) : (
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={line.cantidad}
                                                onChange={(e) => handleUpdateLine(line.id, 'cantidad', e.target.value)}
                                                className="text-sm text-center"
                                            />
                                        )}
                                    </td>

                                    {/* Precio Unitario */}
                                    <td className="px-3 py-2">
                                        {readonly ? (
                                            <span className="text-sm text-gray-900 text-right block font-mono">
                                                ${parseFloat(line.precio_unitario).toFixed(2)}
                                            </span>
                                        ) : (
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={line.precio_unitario}
                                                onChange={(e) => handleUpdateLine(line.id, 'precio_unitario', e.target.value)}
                                                className="text-sm text-right font-mono"
                                                placeholder="0.00"
                                            />
                                        )}
                                    </td>

                                    {/* Aplica IVA */}
                                    <td className="px-3 py-2 text-center">
                                        {readonly ? (
                                            line.aplica_iva ? (
                                                <Badge variant="success" className="text-xs">Sí</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-xs">No</Badge>
                                            )
                                        ) : (
                                            <input
                                                type="checkbox"
                                                checked={line.aplica_iva}
                                                onChange={(e) => handleUpdateLine(line.id, 'aplica_iva', e.target.checked)}
                                                className="w-4 h-4 text-blue-600 rounded"
                                            />
                                        )}
                                    </td>

                                    {/* Subtotal (calculado) */}
                                    <td className="px-3 py-2 text-right text-sm text-gray-900 font-mono">
                                        ${line.subtotal}
                                    </td>

                                    {/* IVA (calculado) */}
                                    <td className="px-3 py-2 text-right text-sm font-mono">
                                        {line.aplica_iva ? (
                                            <span className="text-orange-600">${line.iva}</span>
                                        ) : (
                                            <span className="text-gray-400">$0.00</span>
                                        )}
                                    </td>

                                    {/* Total (calculado) */}
                                    <td className="px-3 py-2 text-right text-sm text-gray-900 font-bold font-mono">
                                        ${line.total}
                                    </td>

                                    {/* Acciones */}
                                    {!readonly && (
                                        <td className="px-3 py-2 text-center">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteLine(line.id)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>

                    {/* Footer con totales */}
                    {lines.length > 0 && (
                        <tfoot className="bg-gray-50 font-semibold">
                            <tr className="border-t-2 border-gray-300">
                                <td colSpan={5} className="px-3 py-2 text-right text-sm text-gray-700">
                                    SUBTOTALES:
                                </td>
                                <td className="px-3 py-2 text-right text-sm text-gray-900 font-mono">
                                    ${totals.subtotal_gravado.toFixed(2)}
                                    <div className="text-xs text-gray-500 font-normal">
                                        (Gravado)
                                    </div>
                                    {totals.subtotal_exento > 0 && (
                                        <>
                                            ${totals.subtotal_exento.toFixed(2)}
                                            <div className="text-xs text-gray-500 font-normal">
                                                (Exento)
                                            </div>
                                        </>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-right text-sm text-orange-600 font-mono">
                                    ${totals.iva_total.toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-right text-sm text-gray-900 font-bold font-mono text-lg">
                                    ${totals.total.toFixed(2)}
                                </td>
                                {!readonly && <td></td>}
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Botón para agregar línea */}
            {!readonly && lines.length > 0 && (
                <div className="flex justify-start">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddLine}
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Agregar línea
                    </Button>
                </div>
            )}

            {/* Resumen de Totales */}
            {lines.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm max-w-md ml-auto">
                        <div className="text-gray-700">Subtotal Gravado:</div>
                        <div className="text-right font-mono">${totals.subtotal_gravado.toFixed(2)}</div>

                        {totals.subtotal_exento > 0 && (
                            <>
                                <div className="text-gray-700">Subtotal Exento:</div>
                                <div className="text-right font-mono">${totals.subtotal_exento.toFixed(2)}</div>
                            </>
                        )}

                        <div className="text-gray-700">IVA 13% 🇸🇻:</div>
                        <div className="text-right font-mono text-orange-600">${totals.iva_total.toFixed(2)}</div>

                        <div className="text-lg font-bold text-gray-900 pt-2 border-t-2 border-blue-300">Total Factura:</div>
                        <div className="text-lg text-right font-bold font-mono text-gray-900 pt-2 border-t-2 border-blue-300">
                            ${totals.total.toFixed(2)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

InvoiceLinesTable.propTypes = {
    lines: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        numero_linea: PropTypes.number,
        descripcion: PropTypes.string,
        concepto: PropTypes.string,
        cantidad: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        precio_unitario: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        aplica_iva: PropTypes.bool,
        subtotal: PropTypes.string,
        iva: PropTypes.string,
        total: PropTypes.string,
        notas: PropTypes.string,
    })).isRequired,
    onChange: PropTypes.func.isRequired,
    readonly: PropTypes.bool,
};
