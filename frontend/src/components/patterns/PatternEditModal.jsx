import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import apiClient from '../../lib/api';
import { Button } from '../ui/Button';

export default function PatternEditModal({ open, onClose, pattern, group, providers }) {
    const [activeTab, setActiveTab] = useState('general');
    const [formData, setFormData] = useState({});
    const [loading, ] = useState(false);

    useEffect(() => {
        if (pattern) {
            setFormData(pattern);
        } else {
            setFormData({
                tipo_patron: group?.tipo_patron || 'costo',
                proveedor: group?.proveedor_id,
                tipo_documento: group?.tipo_documento,
                activo: true,
                prioridad: 10,
                porcentaje_iva_default: 13.0,
            });
        }
    }, [pattern, group]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    if (!open) return null;

    const renderGeneralTab = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-gray-700">Tipo de Patrón</label>
                <select name="tipo_patron" value={formData.tipo_patron || 'costo'} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" disabled={!!group}>
                    <option value="costo">Costo (Proveedor)</option>
                    <option value="venta">Venta (Cliente)</option>
                </select>
            </div>
            {formData.tipo_patron === 'costo' ? (
                <div>
                    <label className="block text-sm font-medium text-gray-700">Proveedor</label>
                    <select name="proveedor" value={formData.proveedor || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" disabled={!!group}>
                        <option value="">Seleccione un proveedor</option>
                        {providers.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                </div>
            ) : (
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de Documento</label>
                    <input type="text" name="tipo_documento" value={formData.tipo_documento || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" disabled={!!group} />
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-gray-700">Nombre del Patrón</label>
                <input type="text" name="nombre" value={formData.nombre || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Campo Objetivo</label>
                <input type="text" name="campo_objetivo" value={formData.campo_objetivo || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Ej: numero_factura, total" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Prioridad</label>
                <input type="number" name="prioridad" value={formData.prioridad || 10} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
            </div>
            <div className="flex items-center">
                <input type="checkbox" name="activo" checked={formData.activo || false} onChange={handleInputChange} className="h-4 w-4 rounded border-gray-300" />
                <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">Activo</label>
            </div>
        </div>
    );
    const renderRegexTab = () => {
        const regexFields = [
            'patron_numero_factura', 'patron_numero_control', 'patron_fecha_emision', 
            'patron_nit_emisor', 'patron_nombre_emisor', 'patron_nit_cliente', 'patron_nombre_cliente',
            'patron_subtotal', 'patron_subtotal_gravado', 'patron_subtotal_exento', 'patron_iva', 
            'patron_total', 'patron_retencion', 'patron_retencion_iva', 'patron_retencion_renta', 'patron_otros_montos'
        ];

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {regexFields.map(field => (
                    <div key={field}>
                        <label className="block text-sm font-medium text-gray-700 capitalize">{field.replace('patron_','').replace(/_/g, ' ')}</label>
                        <textarea 
                            name={field} 
                            value={formData[field] || ''} 
                            onChange={handleInputChange} 
                            rows={2} 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm font-mono text-xs"
                        />
                    </div>
                ))}
            </div>
        );
    };
    const TestTab = ({ pattern }) => {
    const [testText, setTestText] = useState(pattern?.ejemplo_texto || '');
    const [testResult, setTestResult] = useState(null);
    const [testing, setTesting] = useState(false);

    const handleTest = async () => {
        if (!pattern?.id) {
            setTestResult({ error: 'Guarda el patrón antes de probarlo.' });
            return;
        }
        setTesting(true);
        setTestResult(null);
        try {
            const response = await apiClient.post(`/catalogs/invoice-pattern-catalog/${pattern.id}/test/`, { text: testText }, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } });
            setTestResult(response.data);
        } catch (error) {
            console.error('Error testing pattern', error);
            setTestResult({ error: 'Error al probar el patrón.' });
        }
        setTesting(false);
    };

    return (
        <div className="grid grid-cols-2 gap-6 h-full">
            <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-2">Texto de Prueba</label>
                <textarea
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    className="w-full flex-grow border rounded-md p-2 font-mono text-sm"
                    rows={20}
                />
                <Button onClick={handleTest} disabled={testing} className="mt-4">
                    {testing ? 'Probando...' : 'Probar Patrón'}
                </Button>
            </div>
            <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-2">Resultado</label>
                <div className="bg-gray-100 border rounded-md p-4 h-full overflow-y-auto">
                    {testResult ? (
                        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(testResult, null, 2)}</pre>
                    ) : (
                        <p className="text-gray-500">Los resultados de la prueba aparecerán aquí.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

TestTab.propTypes = {
    pattern: PropTypes.object,
};
    const handleSave = async () => {
        // Logic to save the pattern
        const isCreating = !pattern?.id;
        const url = isCreating 
            ? '/catalogs/invoice-pattern-catalog/' 
            : `/catalogs/invoice-pattern-catalog/${pattern.id}/`;
        const method = isCreating ? 'post' : 'patch';

        try {
            await apiClient[method](url, formData, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } });
            onClose(true); // Pass true to indicate success and trigger a refresh
        } catch (error) {
            console.error("Error saving pattern:", error);
            // TODO: Show error to user
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col">
                <h2 className="text-xl font-bold p-6 border-b">{pattern ? 'Editar Patrón' : 'Crear Nuevo Patrón'}</h2>
                
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('general')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'general' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            General
                        </button>
                        <button onClick={() => setActiveTab('regex')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'regex' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Campos Regex
                        </button>
                        <button onClick={() => setActiveTab('test')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'test' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Probar
                        </button>
                    </nav>
                </div>

                <div className="flex-grow overflow-y-auto p-6">
                    {activeTab === 'general' && renderGeneralTab()}
                    {activeTab === 'regex' && renderRegexTab()}
                    {activeTab === 'test' && <TestTab pattern={pattern} />}
                </div>

                <div className="flex justify-end gap-4 p-6 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => onClose(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={loading}>{loading ? 'Guardando...' : 'Guardar Cambios'}</Button>
                </div>
            </div>
        </div>
    );
}

PatternEditModal.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    pattern: PropTypes.object,
    group: PropTypes.object,
    providers: PropTypes.array,
};
