import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import apiClient from '../../lib/api';

import { Button } from '../ui/Button';
import { Edit } from 'lucide-react';

export default function PatternList({ groupId, onEditPattern }) {
    const [patterns, setPatterns] = useState([]);
    const [loading, setLoading] = useState(false);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("access_token");
        return {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };
    };

    useEffect(() => {
        if (!groupId) return;

        const fetchPatterns = async () => {
            setLoading(true);
            try {
                const response = await apiClient.get(`/catalogs/invoice-pattern-catalog/${groupId}/patrones/`, getAuthHeaders());
                setPatterns(response.data.patrones || []);
            } catch (error) {
                console.error('Error fetching patterns for group:', error);
            }
            setLoading(false);
        };

        fetchPatterns();
    }, [groupId]);

    if (loading) {
        return <p>Cargando patrones...</p>;
    }

    return (
        <div className="space-y-2">
            {patterns.length > 0 ? (
                patterns.map(pattern => (
                    <div key={pattern.id} className="border p-3 rounded-md bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold">{pattern.nombre}</p>
                                <p className="text-sm text-gray-600 font-mono">{pattern.campo_objetivo}</p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => onEditPattern(pattern)}>
                                <Edit className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-sm text-gray-500">No hay patrones en este grupo.</p>
            )}
        </div>
    );
}

PatternList.propTypes = {
    groupId: PropTypes.number.isRequired,
    onEditPattern: PropTypes.func.isRequired,
};
