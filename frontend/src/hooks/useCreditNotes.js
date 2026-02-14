import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/api";

function patchCreditNotesListSnapshot(previous, updater) {
    if (!previous) return previous;

    if (Array.isArray(previous)) {
        return updater(previous);
    }

    if (Array.isArray(previous.results)) {
        return {
            ...previous,
            results: updater(previous.results),
        };
    }

    return previous;
}

/**
 * Hook para listar notas de crédito de COSTOS (proveedores) con filtros
 */
export function useCreditNotes(filters = {}) {
    return useQuery({
        queryKey: ["credit-notes", filters],
        queryFn: async () => {
            const params = new URLSearchParams(
                Object.entries(filters).filter(([, value]) => value),
            );
            const response = await apiClient.get(
                `/invoices/credit-notes/?${params.toString()}`,
            );
            return response.data;
        },
        keepPreviousData: true,
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
                `/invoices/credit-notes/${id}/`,
            );
            return response.data;
        },
        enabled: !!id,
    });
}

/**
 * Hook para obtener estadísticas de notas de crédito de costos
 */
export function useCreditNoteStats() {
    return useQuery({
        queryKey: ["credit-note-stats"],
        queryFn: async () => {
            const response = await apiClient.get(
                `/invoices/credit-notes/stats/`,
            );
            return response.data;
        },
    });
}

/**
 * Hook para crear una nueva nota de crédito de costo
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
                },
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
 * Hook para actualizar una nota de crédito de costo
 */
export function useUpdateCreditNote(id) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data) => {
            const response = await apiClient.patch(
                `/invoices/credit-notes/${id}/`,
                data,
            );
            return response.data;
        },
        onMutate: async (data) => {
            await queryClient.cancelQueries(["credit-notes"]);
            await queryClient.cancelQueries(["credit-note", id]);

            const previousCreditNotes = queryClient.getQueriesData({
                queryKey: ["credit-notes"],
            });
            const previousDetail = queryClient.getQueryData([
                "credit-note",
                id,
            ]);

            previousCreditNotes.forEach(([queryKey]) => {
                queryClient.setQueryData(queryKey, (current) =>
                    patchCreditNotesListSnapshot(current, (rows) =>
                        rows.map((row) =>
                            row.id === id ? { ...row, ...data } : row,
                        ),
                    ),
                );
            });

            queryClient.setQueryData(["credit-note", id], (current) =>
                current ? { ...current, ...data } : current,
            );

            return { previousCreditNotes, previousDetail };
        },
        onError: (_error, _variables, context) => {
            context?.previousCreditNotes?.forEach(([queryKey, snapshot]) => {
                queryClient.setQueryData(queryKey, snapshot);
            });
            if (context?.previousDetail) {
                queryClient.setQueryData(
                    ["credit-note", id],
                    context.previousDetail,
                );
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["credit-notes"]);
            queryClient.invalidateQueries(["credit-note", id]);
            queryClient.invalidateQueries(["credit-note-stats"]);
        },
    });
}

/**
 * Hook para eliminar una nota de crédito de costo
 */
export function useDeleteCreditNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/invoices/credit-notes/${id}/`);
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries(["credit-notes"]);

            const previousCreditNotes = queryClient.getQueriesData({
                queryKey: ["credit-notes"],
            });

            previousCreditNotes.forEach(([queryKey]) => {
                queryClient.setQueryData(queryKey, (current) =>
                    patchCreditNotesListSnapshot(current, (rows) =>
                        rows.filter((row) => row.id !== id),
                    ),
                );
            });

            return { previousCreditNotes };
        },
        onError: (_error, _variables, context) => {
            context?.previousCreditNotes?.forEach(([queryKey, snapshot]) => {
                queryClient.setQueryData(queryKey, snapshot);
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["credit-notes"]);
            queryClient.invalidateQueries(["credit-note-stats"]);
        },
    });
}
