/**
 * Modal para editar pagos a proveedores existentes
 */
import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import apiClient from '../../lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
    Calendar,
    FileText,
    DollarSign,
    Loader2,
    Save,
    AlertCircle
} from 'lucide-react';

export function EditPaymentModal({ payment, isOpen, onClose }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        fecha_pago: '',
        monto_total: 0,
        referencia: '',
        notas: '',
    });

    const [errors, setErrors] = useState({});

    // Obtener datos frescos del pago desde el servidor
    const { data: freshPayment } = useQuery({
        queryKey: ['supplier-payment', payment?.id],
        queryFn: async () => {
            if (!payment?.id) return null;
            const response = await apiClient.get(`/supplier-payments/${payment.id}/`);
            return response.data;
        },
        enabled: isOpen && !!payment?.id,
        staleTime: 0, // Siempre considerar los datos como stale
        cacheTime: 0, // No cachear
    });

    // Cargar datos del pago cuando se obtienen del servidor
    useEffect(() => {
        if (isOpen && freshPayment) {
            setFormData({
                fecha_pago: freshPayment.fecha_pago || '',
                monto_total: freshPayment.monto_total || 0,
                referencia: freshPayment.referencia || '',
                notas: freshPayment.notas || '',
            });
            setErrors({});
        }
    }, [isOpen, freshPayment]);

    const updateMutation = useMutation({
        mutationFn: async (data) => {
            // Solo enviamos campos editables: fecha_pago, referencia, notas
            // NO enviamos monto_total porque no es editable
            return await apiClient.patch(`/supplier-payments/${payment.id}/`, {
                fecha_pago: data.fecha_pago,
                referencia: data.referencia,
                notas: data.notas,
            });
        },
        onSuccess: async () => {
            // Primero invalidar todas las queries
            queryClient.invalidateQueries({ queryKey: ['supplier-payments-history'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-payment-stats'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });

            // Refetch explícito de las facturas afectadas
            if (payment.invoice_links) {
                const promises = payment.invoice_links.map(link =>
                    queryClient.refetchQueries({
                        queryKey: ['invoice', link.cost_invoice],
                        exact: true
                    })
                );
                await Promise.all(promises);
            }

            toast.success('Pago actualizado exitosamente', {
                duration: 3000,
                icon: '✅',
            });

            onClose();
        },
        onError: (error) => {
            const errorMsg = error.response?.data?.detail
                || error.response?.data?.error
                || 'Error al actualizar el pago';

            toast.error(errorMsg, {
                duration: 4000,
            });
        },
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.fecha_pago) {
            newErrors.fecha_pago = 'La fecha de pago es requerida';
        }

        // No validamos monto_total porque no es editable

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validate()) {
            toast.error('Por favor corrige los errores en el formulario');
            return;
        }

        updateMutation.mutate(formData);
    };

    if (!payment) return null;

    // Usar freshPayment si está disponible, sino usar payment
    const displayPayment = freshPayment || payment;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Editar Pago
                    </DialogTitle>
                    <DialogDescription>
                        Modificar información del pago a <strong>{displayPayment.proveedor_nombre}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="px-8 pb-8">
                    {/* Información del pago */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800">
                                <p className="font-medium">Importante:</p>
                                <p className="mt-1">
                                    Este pago está asociado a {displayPayment.invoice_links?.length || 0} factura(s).
                                    Los cambios se reflejarán en todas las facturas asociadas.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Facturas asociadas */}
                    {displayPayment.invoice_links && displayPayment.invoice_links.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                            <p className="text-sm font-medium text-gray-700 mb-2">Facturas asociadas:</p>
                            <div className="space-y-2">
                                {displayPayment.invoice_links.map((link) => (
                                    <div key={link.id} className="flex justify-between text-sm">
                                        <span className="text-gray-600">
                                            {link.invoice_data?.numero_factura || link.invoice_numero || `Factura #${link.cost_invoice}`}
                                        </span>
                                        <span className="font-semibold text-gray-900">
                                            ${parseFloat(link.monto_pagado_factura).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Formulario */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Monto Total (Solo lectura) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
                                <DollarSign className="w-4 h-4" />
                                Monto Total <span className="text-gray-400 text-xs font-normal">(no editable)</span>
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.monto_total}
                                readOnly
                                disabled
                                className="h-11 bg-gray-100 cursor-not-allowed"
                                placeholder="0.00"
                            />
                            <p className="text-gray-500 text-xs mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                El monto está vinculado a las facturas y no se puede modificar
                            </p>
                        </div>

                        {/* Fecha de Pago */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                Fecha de Pago <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="date"
                                value={formData.fecha_pago}
                                onChange={(e) => handleChange('fecha_pago', e.target.value)}
                                className={`h-11 ${errors.fecha_pago ? 'border-red-500 focus:ring-red-500' : ''}`}
                            />
                            {errors.fecha_pago && (
                                <p className="text-red-600 text-xs mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                    {errors.fecha_pago}
                                </p>
                            )}
                        </div>

                        {/* Referencia */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
                                <FileText className="w-4 h-4" />
                                Referencia <span className="text-gray-400 text-xs font-normal">(opcional)</span>
                            </label>
                            <Input
                                type="text"
                                value={formData.referencia}
                                onChange={(e) => handleChange('referencia', e.target.value)}
                                placeholder="Ej: TRF-2025-001, Cheque #123"
                                className="h-11"
                            />
                        </div>

                        {/* Notas */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Notas <span className="text-gray-400 text-xs font-normal">(opcional)</span>
                            </label>
                            <textarea
                                value={formData.notas}
                                onChange={(e) => handleChange('notas', e.target.value)}
                                placeholder="Observaciones adicionales..."
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            />
                        </div>

                        {/* Botones */}
                        <div className="flex gap-4 pt-6 border-t border-gray-200 mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={updateMutation.isPending}
                                className="flex-1 h-12 text-base font-medium"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="flex-1 h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {updateMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5 mr-2" />
                                        Guardar Cambios
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}

EditPaymentModal.propTypes = {
    payment: PropTypes.shape({
        id: PropTypes.number,
        invoice_links: PropTypes.arrayOf(PropTypes.shape({
            cost_invoice: PropTypes.number,
            invoice_data: PropTypes.shape({
                numero_factura: PropTypes.string,
            }),
            invoice_numero: PropTypes.string,
            monto_pagado_factura: PropTypes.string,
        })),
        proveedor_nombre: PropTypes.string,
    }),
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
};
