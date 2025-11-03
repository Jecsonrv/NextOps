import { useState, useEffect } from 'react';
import apiClient from '../../lib/api';
import PatternGroupCard from '../../components/patterns/PatternGroupCard';
import { Button } from '../../components/ui/Button';
import { Plus } from 'lucide-react';

import PatternEditModal from '../../components/patterns/PatternEditModal';

export default function PatternUnifiedPage() {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPattern, setEditingPattern] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [providers, setProviders] = useState([]);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("access_token");
        return {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };
    };

    const loadGroups = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/catalogs/invoice-pattern-catalog/grupos/', getAuthHeaders());
            setGroups(response.data || []);
        } catch (error) {
            console.error("Error loading groups:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadGroups();
        loadProviders();
    }, []);

    const loadProviders = async () => {
        try {
            const response = await apiClient.get('/catalogs/providers/?page_size=1000', getAuthHeaders());
            setProviders(response.data.results || []);
        } catch (error) {
            console.error("Error loading providers:", error);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Gestión de Patrones</h1>
                    <p className="text-gray-500">Una vista unificada de todos los patrones, agrupados por proveedor o tipo.</p>
                </div>
                <Button onClick={() => {
                    setEditingPattern(null);
                    setSelectedGroup(null);
                    setIsModalOpen(true);
                }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Nuevo Patrón
                </Button>
            </div>
            
            {/* TODO: Add filters */}

            <div className="space-y-4">
                {groups.map(group => (
                    <PatternGroupCard 
                        key={group.id} 
                        group={group} 
                        onAddPattern={(g) => {
                            setSelectedGroup(g);
                            setEditingPattern(null);
                            setIsModalOpen(true);
                        }}
                        onEditPattern={(p, g) => {
                            setSelectedGroup(g);
                            setEditingPattern(p);
                            setIsModalOpen(true);
                        }}
                    />
                ))}
            </div>

            <PatternEditModal 
                open={isModalOpen}
                onClose={(shouldRefresh) => {
                    setIsModalOpen(false);
                    if (shouldRefresh) loadGroups();
                }}
                pattern={editingPattern}
                group={selectedGroup}
                providers={providers}
            />
        </div>
    );
}
