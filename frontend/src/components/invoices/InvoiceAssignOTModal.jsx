/**
 * Modal para asignar una OT a una factura
 * Permite buscar OTs por número, MBL o contenedor y asignarlas manualmente
 */

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import apiClient from "../../lib/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Badge } from "../ui/Badge";

export function InvoiceAssignOTModal({
    isOpen = false,
    onClose = () => {},
    invoice = null,
    onAssign = async () => {}
}) {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedOT, setSelectedOT] = useState(null);
    const [isAssigning, setIsAssigning] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Función de búsqueda
    const handleSearch = async (term) => {
        const searchValue = term || searchTerm;
        if (!searchValue.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        setError(null);
        try {
            const response = await apiClient.get("/ots/", {
                params: {
                    search: searchValue,
                    page_size: 100,
                },
            });
            const results = response.data.results || response.data || [];
            setSearchResults(results);
        } catch (error) {
            const errorMsg =
                error.response?.data?.detail ||
                error.response?.data?.message ||
                error.message ||
                "Error desconocido al buscar OTs";
            setError(errorMsg);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setSearchTerm("");
            setSearchResults([]);
            setSelectedOT(null);
            setError(null);
            setSuccessMessage(null);
        }
    }, [isOpen]);

    // Búsqueda en tiempo real con debounce (300ms para respuesta más rápida)
    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (searchTerm.trim()) {
                handleSearch(searchTerm);
            } else {
                setSearchResults([]);
                setError(null);
            }
        }, 300); // Reducido a 300ms para mayor rapidez

        return () => clearTimeout(delayDebounce);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    const handleAssign = async () => {
        if (!selectedOT) return;

        setIsAssigning(true);
        setError(null);
        setSuccessMessage(null);

        try {
            await onAssign(selectedOT.id);

            // Mostrar mensaje de éxito
            setSuccessMessage(
                `OT ${selectedOT.numero_ot} asignada correctamente`
            );

            // Cerrar después de 1.5 segundos para que vea el mensaje
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error) {
            const errorMsg =
                error.response?.data?.detail ||
                error.response?.data?.message ||
                error.message ||
                "Error al asignar OT";
            setError(errorMsg);
            setIsAssigning(false); // Solo quitar loading si hay error
        }
    };

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white shadow-2xl">
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle>Asignar OT a Factura</CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            disabled={isAssigning}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                        Factura: <strong>{invoice?.numero_factura}</strong>
                    </p>
                </CardHeader>

                <CardContent className="flex-1 overflow-auto p-6 space-y-6">
                    {/* Barra de búsqueda con indicador de búsqueda en tiempo real */}
                    <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                            <div className="flex-1 relative">
                                <Input
                                    placeholder="Buscar por número de OT, MBL o contenedor..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    disabled={isAssigning}
                                />
                                {isSearching && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                    </div>
                                )}
                            </div>
                            <Button
                                onClick={handleSearch}
                                disabled={isSearching || !searchTerm.trim()}
                                variant="outline"
                            >
                                <Search className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                            {isSearching
                                ? "Buscando..."
                                : searchTerm
                                ? `${searchResults.length} resultado${
                                      searchResults.length !== 1 ? "s" : ""
                                  } encontrado${
                                      searchResults.length !== 1 ? "s" : ""
                                  }`
                                : "Escribe para buscar OTs en tiempo real"}
                        </p>
                    </div>

                    {/* Mensaje de éxito */}
                    {successMessage && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-green-900">
                                    ¡Éxito!
                                </p>
                                <p className="text-sm text-green-700 mt-1">
                                    {successMessage}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error de búsqueda */}
                    {error && !successMessage && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-red-900">
                                    Error
                                </p>
                                <p className="text-sm text-red-700 mt-1">
                                    {error}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Resultados de búsqueda */}
                    {searchResults.length > 0 ? (
                        <div className="space-y-3">
                            <h3 className="font-semibold text-gray-900">
                                Resultados ({searchResults.length})
                            </h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {searchResults.map((ot) => (
                                    <Card
                                        key={ot.id}
                                        className={`cursor-pointer transition-all ${
                                            selectedOT?.id === ot.id
                                                ? "ring-2 ring-blue-500 bg-blue-50"
                                                : "hover:bg-gray-50"
                                        }`}
                                        onClick={() => setSelectedOT(ot)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="font-semibold text-lg">
                                                            {ot.numero_ot}
                                                        </span>
                                                        {selectedOT?.id ===
                                                            ot.id && (
                                                            <CheckCircle className="w-5 h-5 text-blue-600" />
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                                                        <div>
                                                            <span className="text-gray-600">
                                                                Cliente:
                                                            </span>
                                                            <p className="font-medium">
                                                                {ot.cliente_nombre ||
                                                                    "N/A"}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">
                                                                MBL:
                                                            </span>
                                                            <p className="font-medium font-mono text-xs">
                                                                {ot.mbl ||
                                                                    ot.master_bl ||
                                                                    "N/A"}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">
                                                                Contenedores:
                                                            </span>
                                                            <p className="font-medium text-xs">
                                                                {ot.contenedores_list ||
                                                                    ot.numero_contenedores ||
                                                                    "N/A"}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">
                                                                Proveedor:
                                                            </span>
                                                            <p className="font-medium text-xs">
                                                                {ot.proveedor_nombre ||
                                                                    "N/A"}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">
                                                                Barco:
                                                            </span>
                                                            <p className="font-medium">
                                                                {ot.barco ||
                                                                    "N/A"}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">
                                                                Estado:
                                                            </span>
                                                            <Badge
                                                                variant={
                                                                    ot.estado ===
                                                                    "completada"
                                                                        ? "success"
                                                                        : ot.estado ===
                                                                          "en_proceso"
                                                                        ? "warning"
                                                                        : "default"
                                                                }
                                                            >
                                                                {ot.estado_display ||
                                                                    ot.estado}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ) : searchTerm && !isSearching ? (
                        <div className="text-center py-12">
                            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600">
                                No se encontraron OTs con el término &ldquo;
                                {searchTerm}&rdquo;
                            </p>
                        </div>
                    ) : !searchTerm ? (
                        <div className="text-center py-12">
                            <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600">
                                Ingresa un término de búsqueda para encontrar
                                OTs
                            </p>
                        </div>
                    ) : null}

                    {/* OT Actual */}
                    {invoice?.ot_data && (
                        <div className="border-t pt-6">
                            <h3 className="font-semibold text-gray-900 mb-3">
                                OT Actualmente Asignada
                            </h3>
                            <Card className="bg-blue-50 border-blue-200">
                                <CardContent className="p-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-lg text-blue-900 mb-1">
                                                    {invoice.ot_data.numero_ot}
                                                </p>
                                            </div>
                                            {invoice.confianza_match && (
                                                <Badge
                                                    variant={
                                                        parseFloat(
                                                            invoice.confianza_match
                                                        ) >= 0.8
                                                            ? "success"
                                                            : parseFloat(
                                                                  invoice.confianza_match
                                                              ) >= 0.5
                                                            ? "warning"
                                                            : "destructive"
                                                    }
                                                >
                                                    Confianza:{" "}
                                                    {(
                                                        parseFloat(
                                                            invoice.confianza_match
                                                        ) * 100
                                                    ).toFixed(0)}
                                                    %
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <span className="text-gray-600 font-medium">
                                                    Operativo:
                                                </span>
                                                <p className="text-gray-900">
                                                    {invoice.ot_data
                                                        .operativo || "N/A"}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600 font-medium">
                                                    Cliente:
                                                </span>
                                                <p className="text-gray-900">
                                                    {invoice.ot_data.cliente ||
                                                        "N/A"}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600 font-medium">
                                                    MBL:
                                                </span>
                                                <p className="text-gray-900 font-mono text-xs">
                                                    {invoice.ot_data.mbl ||
                                                        "N/A"}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600 font-medium">
                                                    Naviera:
                                                </span>
                                                <p className="text-gray-900">
                                                    {invoice.ot_data.naviera ||
                                                        "N/A"}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600 font-medium">
                                                    Barco:
                                                </span>
                                                <p className="text-gray-900">
                                                    {invoice.ot_data.barco ||
                                                        "N/A"}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600 font-medium">
                                                    Estado:
                                                </span>
                                                <p className="text-gray-900 capitalize">
                                                    {invoice.ot_data.estado ||
                                                        "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </CardContent>

                {/* Footer con acciones */}
                <div className="border-t p-6 flex items-center justify-between bg-gray-50">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isAssigning}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleAssign}
                        disabled={!selectedOT || isAssigning}
                    >
                        {isAssigning ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Asignando...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Asignar OT Seleccionada
                            </>
                        )}
                    </Button>
                </div>
            </Card>
        </div>
    );

    return createPortal(modalContent, document.body);
}
InvoiceAssignOTModal.defaultProps = {
    invoice: null,
};
