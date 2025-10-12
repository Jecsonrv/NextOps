import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Search, FileText, Loader2, CheckCircle } from "lucide-react";
import apiClient from "../../lib/api";
import { Input } from "../ui/Input";
import { Card, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { formatDate } from "../../lib/dateUtils";

export function InvoiceSelector({ selectedInvoice, onSelect }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [invoices, setInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const delayDebounce = setTimeout(async () => {
            if (!searchTerm.trim()) {
                setInvoices([]);
                return;
            }

            setIsLoading(true);
            try {
                const response = await apiClient.get("/invoices/", {
                    params: {
                        search: searchTerm,
                        page_size: 10,
                        ordering: "-created_at"
                    }
                });
                setInvoices(response.data.results || []);
            } catch (error) {
                console.error("Error buscando facturas:", error);
                setInvoices([]);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [searchTerm]);

    return (
        <div className="space-y-3">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Factura <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        placeholder="Buscar por número de factura, proveedor, OT..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                    {isLoading && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-blue-500" />
                    )}
                </div>
            </div>

            {selectedInvoice && !searchTerm && (
                <Card className="border-2 border-green-500 bg-green-50">
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-5 h-5 text-green-600" />
                                    <span className="font-semibold text-gray-900">
                                        {selectedInvoice.numero_factura}
                                    </span>
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                    <p>
                                        <span className="font-medium">Proveedor:</span>{" "}
                                        {selectedInvoice.proveedor_nombre}
                                    </p>
                                    {selectedInvoice.ot_number && (
                                        <p>
                                            <span className="font-medium">OT:</span>{" "}
                                            {selectedInvoice.ot_number}
                                        </p>
                                    )}
                                    <p>
                                        <span className="font-medium">Monto:</span> $
                                        {parseFloat(selectedInvoice.monto).toLocaleString("es-MX", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </p>
                                    <p>
                                        <span className="font-medium">Fecha:</span>{" "}
                                        {formatDate(selectedInvoice.fecha_emision)}
                                    </p>
                                </div>
                            </div>
                            <Badge variant="success" className="mt-1">
                                Seleccionada
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            )}

            {searchTerm && invoices.length > 0 && (
                <div className="max-h-80 overflow-y-auto space-y-2 border rounded-lg p-2 bg-gray-50">
                    {invoices.map((invoice) => (
                        <Card
                            key={invoice.id}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                                selectedInvoice?.id === invoice.id
                                    ? "ring-2 ring-blue-500 bg-blue-50"
                                    : "hover:bg-white"
                            }`}
                            onClick={() => onSelect(invoice)}
                        >
                            <CardContent className="p-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-gray-900">
                                                {invoice.numero_factura}
                                            </span>
                                            {selectedInvoice?.id === invoice.id && (
                                                <CheckCircle className="w-4 h-4 text-blue-600" />
                                            )}
                                        </div>
                                        <div className="space-y-0.5 text-xs text-gray-600">
                                            <p>{invoice.proveedor_nombre}</p>
                                            {invoice.ot_number && (
                                                <p className="text-blue-600">OT: {invoice.ot_number}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-gray-900">
                                            ${parseFloat(invoice.monto).toLocaleString("es-MX", {
                                                minimumFractionDigits: 2,
                                            })}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatDate(invoice.fecha_emision)}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {searchTerm && !isLoading && invoices.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No se encontraron facturas</p>
                </div>
            )}
        </div>
    );
}

InvoiceSelector.propTypes = {
    selectedInvoice: PropTypes.object,
    onSelect: PropTypes.func.isRequired,
};
