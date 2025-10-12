import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import apiClient from "../lib/api";
import { formatDate } from "../lib/dateUtils";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { FileText, Search, Download, Upload, Filter, ChevronDown, ChevronUp, X } from "lucide-react";
import { useProviders } from "../hooks/useInvoices";

export function CreditNotesPage() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        estado: "",
        proveedor_id: "",
        fecha_desde: "",
        fecha_hasta: "",
    });

    const { data: providersData } = useProviders();

    const { data, isLoading, error } = useQuery({
        queryKey: ["credit-notes", page, search, filters],
        queryFn: async () => {
            const params = new URLSearchParams(
                Object.entries({
                    page: page.toString(),
                    page_size: "20",
                    search,
                    ...filters
                }).filter(([_, value]) => value)
            );
            const response = await apiClient.get(`/invoices/credit-notes/?${params}`);
            return response.data;
        }
    });

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const handleClearFilters = () => {
        setFilters({ estado: "", proveedor_id: "", fecha_desde: "", fecha_hasta: "" });
        setSearch("");
        setPage(1);
    };

    if (error) {
        return <div className="p-4 text-center"><p className="text-red-600">Error al cargar las notas de crédito: {error.message}</p></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900">Notas de Crédito</h1>
                    <p className="text-gray-600 mt-2">Gestión de notas de crédito de proveedores</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => window.location.href = "/invoices/credit-notes/new"}>
                        <Upload className="w-4 h-4 mr-2" />
                        Subir Nota de Crédito
                    </Button>
                    <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Exportar
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Buscar por número de nota, proveedor, factura..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                            <Filter className="w-4 h-4 mr-2" />
                            Filtros
                            {showFilters ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                        </Button>
                    </div>
                </CardHeader>
                {showFilters && (
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                                <select value={filters.estado} onChange={(e) => handleFilterChange("estado", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="">Todos</option>
                                    <option value="pendiente">Pendiente</option>
                                    <option value="aplicada">Aplicada</option>
                                    <option value="rechazada">Rechazada</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                                <select value={filters.proveedor_id} onChange={(e) => handleFilterChange("proveedor_id", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="">Todos</option>
                                    {providersData?.results?.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
                                <Input type="date" value={filters.fecha_desde} onChange={(e) => handleFilterChange("fecha_desde", e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
                                <Input type="date" value={filters.fecha_hasta} onChange={(e) => handleFilterChange("fecha_hasta", e.target.value)} />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <Button variant="outline" size="sm" onClick={handleClearFilters}><X className="w-4 h-4 mr-2" />Limpiar Filtros</Button>
                        </div>
                    </CardContent>
                )}
            </Card>

            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><p className="mt-2 text-sm text-gray-600">Cargando...</p></div>
                    ) : data?.results?.length === 0 ? (
                        <div className="text-center py-12"><FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-600">No se encontraron notas de crédito</p></div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50">
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Número</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Proveedor</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Factura Relacionada</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Fecha Emisión</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Monto</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {data?.results?.map((cn) => (
                                            <tr key={cn.id} className="hover:bg-blue-50 transition-colors">
                                                <td className="px-4 py-3"><Link to={`/invoices/credit-notes/${cn.id}`} className="font-medium text-blue-600 hover:text-blue-800">{cn.numero_nota}</Link></td>
                                                <td className="px-4 py-3">{cn.proveedor_nombre}</td>
                                                <td className="px-4 py-3">{cn.invoice_data?.numero_factura ? <Link to={`/invoices/${cn.invoice_data.id}`} className="text-blue-600 hover:text-blue-800">{cn.invoice_data.numero_factura}</Link> : "-"}</td>
                                                <td className="px-4 py-3">{formatDate(cn.fecha_emision)}</td>
                                                <td className="px-3 py-3 text-right font-bold text-red-600">-${parseFloat(cn.monto || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${cn.estado === 'aplicada' ? 'bg-green-100 text-green-800' : cn.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                                        {cn.estado_display || cn.estado}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {data?.count > 20 && (
                                <div className="mt-6 flex items-center justify-between">
                                    <p className="text-sm text-gray-600">Mostrando {(page - 1) * 20 + 1} - {Math.min(page * 20, data.count)} de {data.count} notas</p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data.previous}>Anterior</Button>
                                        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!data.next}>Siguiente</Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
