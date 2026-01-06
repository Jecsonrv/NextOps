import { useState } from 'react';
import PropTypes from 'prop-types';
import { DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { toast } from 'sonner'; // Assuming sonner or react-hot-toast is used, will check imports in page

export function InvoiceCostTypeEditable({ invoice, options, onSave }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleValueChange = async (newValue) => {
        // Prevent unnecessary updates
        if (newValue === invoice.tipo_costo) {
            setIsEditing(false);
            return;
        }

        setIsLoading(true);
        try {
            await onSave(invoice.id, newValue);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save cost type", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isEditing) {
        return (
             <div className="w-[200px]" onClick={(e) => e.stopPropagation()}>
                <Select
                    value={invoice.tipo_costo}
                    onValueChange={handleValueChange}
                    disabled={isLoading}
                    defaultOpen={true}
                    onOpenChange={(open) => {
                        if (!open) setIsEditing(false);
                    }}
                >
                    <SelectTrigger className="h-8 text-xs bg-white">
                         <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map((option) => (
                            <SelectItem key={option.code} value={option.code} className="text-xs">
                                {option.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        );
    }

    return (
        <div 
            onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer hover:bg-emerald-100 transition-colors group relative"
            title="Clic para editar tipo de costo"
        >
            <DollarSign className="w-3.5 h-3.5" />
            {invoice.tipo_costo_display || "Sin asignar"}
        </div>
    );
}

InvoiceCostTypeEditable.propTypes = {
    invoice: PropTypes.object.isRequired,
    options: PropTypes.array,
    onSave: PropTypes.func.isRequired,
};

InvoiceCostTypeEditable.defaultProps = {
    options: [],
};
