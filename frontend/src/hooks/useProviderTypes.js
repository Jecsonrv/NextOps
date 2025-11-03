import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

/**
 * Hook para obtener los tipos de proveedores disponibles desde el backend
 * GET /api/catalogs/providers/tipos/
 *
 * Retorna los tipos dinámicamente para evitar opciones hardcodeadas en frontend
 */
export function useProviderTypes() {
    return useQuery({
        queryKey: ['provider-types'],
        queryFn: async () => {
            const response = await api.get('/catalogs/providers/tipos/');
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // Los tipos no cambian frecuentemente (5 min)
        cacheTime: 10 * 60 * 1000,
    });
}
