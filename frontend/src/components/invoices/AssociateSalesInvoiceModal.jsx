import PropTypes from 'prop-types';

/**
 * Modal para asociar/crear factura de venta desde una factura de costo
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { salesInvoicesAPI } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { X, Upload, Link as LinkIcon, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export function AssociateSalesInvoiceModal({ invoice, onClose, onSuccess }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('select'); // 'select' | 'create'
  const [selectedSalesInvoice, setSelectedSalesInvoice] = useState(null);

  // Obtener facturas de venta del mismo OT
  const { data: salesInvoices = [] } = useQuery({
    queryKey: ['sales-invoices-for-ot', invoice?.ot?.id],
    queryFn: async () => {
      if (!invoice?.ot?.id) return [];
      const response = await salesInvoicesAPI.list({ ot_id: invoice.ot.id });
      return response.data.results || response.data;
    },
    enabled: !!invoice?.ot?.id && mode === 'select',
  });

  const handleAssociate = async () => {
    if (!selectedSalesInvoice) return;

    try {
      await salesInvoicesAPI.associateCosts(selectedSalesInvoice.id, {
        invoice_ids: [invoice.id],
      });
      toast.success('Factura de venta asociada exitosamente');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al asociar factura de venta');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Asociar Factura de Venta</CardTitle>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Factura de Costo:</strong> {invoice.numero_factura}
              </p>
              <p className="text-sm text-blue-700">
                OT: {invoice.ot?.numero_ot || 'Sin OT asignada'} | Monto: {invoice.monto_aplicable?.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            <Button
              variant={mode === 'select' ? 'primary' : 'outline'}
              onClick={() => setMode('select')}
              className="flex-1"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Asociar Existente
            </Button>
            <Button
              variant={mode === 'create' ? 'primary' : 'outline'}
              onClick={() => setMode('create')}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Nueva
            </Button>
          </div>

          {mode === 'select' ? (
            <div>
              {!invoice?.ot?.id ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Esta factura de costo no tiene OT asignada.</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Asigna una OT primero para poder asociar facturas de venta.
                  </p>
                </div>
              ) : salesInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <Upload className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">No hay facturas de venta para esta OT</p>
                  <p className="text-sm text-gray-500 mt-2">Crea una nueva factura de venta</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {salesInvoices.map((si) => (
                    <button
                      key={si.id}
                      onClick={() => setSelectedSalesInvoice(si)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedSalesInvoice?.id === si.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{si.numero_factura}</p>
                          <p className="text-sm text-gray-600">Cliente: {si.cliente_nombre || 'N/A'}</p>
                          <p className="text-sm text-gray-500">Fecha: {si.fecha_emision}</p>
                        </div>
                        <div className="text-right">
                                                      <p className="text-lg font-bold text-green-600">
                                                          {si.monto_total?.toFixed(2)}
                                                      </p>                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedSalesInvoice && (
                <div className="mt-6 flex gap-3">
                  <Button onClick={handleAssociate} className="flex-1">
                    Asociar Factura
                  </Button>
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="text-center py-8">
                <Plus className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">Crear nueva factura de venta</p>
                <Button
                  onClick={() => {
                    navigate(`/sales/invoices/new?ot_id=${invoice.ot?.id}&cost_invoice_id=${invoice.id}`);
                  }}
                >
                  Ir a Formulario de Factura de Venta
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

AssociateSalesInvoiceModal.propTypes = {
  invoice: PropTypes.shape({
    id: PropTypes.number.isRequired,
    numero_factura: PropTypes.string,
    monto_aplicable: PropTypes.number,
    ot: PropTypes.shape({
      id: PropTypes.number,
      numero_ot: PropTypes.string,
    }),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};
