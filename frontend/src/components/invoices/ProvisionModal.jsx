import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter 
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { Input } from '../ui/Input';

export function ProvisionModal({ isOpen, onClose, onConfirm, invoice }) {
    const [provisionDate, setProvisionDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize with today's date or invoice's provision date
    useEffect(() => {
        if (isOpen) {
            if (invoice?.fecha_provision) {
                // Assuming format YYYY-MM-DD from backend
                setProvisionDate(invoice.fecha_provision.split('T')[0]);
            } else {
                setProvisionDate(new Date().toISOString().split('T')[0]);
            }
        }
    }, [isOpen, invoice]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onConfirm(invoice.id, provisionDate);
            onClose();
        } catch (error) {
            console.error("Error provisioning invoice:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!invoice) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[400px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Provisionar Factura</DialogTitle>
                        <DialogDescription>
                            Establece la fecha de provisión para la factura 
                            <span className="font-medium text-gray-900 mx-1">
                                {invoice.numero_factura || "Sin número"}
                            </span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-6 py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="provision-date" className="text-sm font-medium text-gray-700">
                                Fecha de Provisión
                            </Label>
                            <Input
                                id="provision-date"
                                type="date"
                                value={provisionDate}
                                onChange={(e) => setProvisionDate(e.target.value)}
                                className="w-full"
                                required
                            />
                            <p className="text-xs text-gray-500">
                                Esta acción cambiará el estado de la factura a "Provisionada".
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            type="submit" 
                            className="bg-gray-900 text-white hover:bg-gray-800"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Guardando...' : 'Confirmar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

ProvisionModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    invoice: PropTypes.object,
};
