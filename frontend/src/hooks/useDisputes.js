import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/api";

/**
 * Hook para listar disputas con filtros
 */
export function useDisputes(filters = {}) {
    return useQuery({
        queryKey: ["disputes", filters],
        queryFn: async () => {
            const params = new URLSearchParams(
                Object.entries(filters).filter(([_, value]) => value)
            );
            const response = await apiClient.get(
                `/invoices/disputes/?${params.toString()}`
            );
            return response.data;
        },
    });
}

/**
 * Hook para obtener detalle de una disputa
 */
export function useDisputeDetail(id) {
    return useQuery({
        queryKey: ["dispute", id],
        queryFn: async () => {
            const response = await apiClient.get(`/invoices/disputes/${id}/`);
            return response.data;
        },
        enabled: !!id,
    });
}

/**
 * Hook para obtener estadísticas de disputas
 */
export function useDisputeStats() {
    return useQuery({
        queryKey: ["dispute-stats"],
        queryFn: async () => {
            const response = await apiClient.get(`/invoices/disputes/stats/`);
            return response.data;
        },
    });
}

/**
 * Hook para obtener valores únicos de filtros
 */
export function useDisputeFilterValues() {
    return useQuery({
        queryKey: ["dispute-filter-values"],
        queryFn: async () => {
            const response = await apiClient.get(`/invoices/disputes/filter_values/`);
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    });
}

/**
 * Hook para crear una nueva disputa
 */
export function useCreateDispute() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data) => {
            const response = await apiClient.post(`/invoices/disputes/`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["disputes"]);
            queryClient.invalidateQueries(["dispute-stats"]);
        },
    });
}

/**
 * Hook para actualizar una disputa
 */
export function useUpdateDispute(id) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data) => {
            const response = await apiClient.patch(
                `/invoices/disputes/${id}/`,
                data
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["disputes"]);
            queryClient.invalidateQueries(["dispute", id]);
            queryClient.invalidateQueries(["dispute-stats"]);
        },
    });
}

/**
 * Hook para eliminar una disputa
 */
export function useDeleteDispute() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/invoices/disputes/${id}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["disputes"]);
            queryClient.invalidateQueries(["dispute-stats"]);
        },
    });
}
