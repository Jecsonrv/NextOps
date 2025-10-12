import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/api";

/**
 * Hook para listar notas de crédito con filtros
 */
export function useCreditNotes(filters = {}) {
    return useQuery({
        queryKey: ["credit-notes", filters],
        queryFn: async () => {
            const params = new URLSearchParams(
                Object.entries(filters).filter(([_, value]) => value)
            );
            const response = await apiClient.get(
                `/invoices/credit-notes/?${params.toString()}`
            );
            return response.data;
        },
    });
}

/**
 * Hook para obtener detalle de una nota de crédito
 */
export function useCreditNoteDetail(id) {
    return useQuery({
        queryKey: ["credit-note", id],
        queryFn: async () => {
            const response = await apiClient.get(
                `/invoices/credit-notes/${id}/`
            );
            return response.data;
        },
        enabled: !!id,
    });
}

/**
 * Hook para obtener estadísticas de notas de crédito
 */
export function useCreditNoteStats() {
    return useQuery({
        queryKey: ["credit-note-stats"],
        queryFn: async () => {
            const response = await apiClient.get(
                `/invoices/credit-notes/stats/`
            );
            return response.data;
        },
    });
}

/**
 * Hook para crear una nueva nota de crédito
 */
export function useCreateCreditNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (formData) => {
            const response = await apiClient.post(
                `/invoices/credit-notes/`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["credit-notes"]);
            queryClient.invalidateQueries(["credit-note-stats"]);
        },
    });
}

/**
 * Hook para actualizar una nota de crédito
 */
export function useUpdateCreditNote(id) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data) => {
            const response = await apiClient.patch(
                `/invoices/credit-notes/${id}/`,
                data
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["credit-notes"]);
            queryClient.invalidateQueries(["credit-note", id]);
            queryClient.invalidateQueries(["credit-note-stats"]);
        },
    });
}

/**
 * Hook para eliminar una nota de crédito
 */
export function useDeleteCreditNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/invoices/credit-notes/${id}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["credit-notes"]);
            queryClient.invalidateQueries(["credit-note-stats"]);
        },
    });
}
