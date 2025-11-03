import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/api";

/**
 * Hook para listar notas de crédito de VENTAS con filtros
 */
export function useSalesCreditNotes(filters = {}) {
    return useQuery({
        queryKey: ["sales-credit-notes", filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== "") {
                    params.append(key, value);
                }
            });
            const response = await apiClient.get(
                `/sales/credit-notes/?${params.toString()}`
            );
            // Return the results array if paginated, or the data itself if it's an array
            // Ensure we always return an array
            if (Array.isArray(response.data)) {
                return response.data;
            }
            if (response.data && Array.isArray(response.data.results)) {
                return response.data.results;
            }
            // Fallback to empty array
            return [];
        },
    });
}

/**
 * Hook para obtener detalle de una nota de crédito de venta
 */
export function useSalesCreditNoteDetail(id) {
    return useQuery({
        queryKey: ["sales-credit-note", id],
        queryFn: async () => {
            const response = await apiClient.get(`/sales/credit-notes/${id}/`);
            return response.data;
        },
        enabled: !!id,
    });
}

/**
 * Hook para crear una nueva nota de crédito de venta
 */
export function useCreateSalesCreditNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (formData) => {
            const response = await apiClient.post(
                `/sales/credit-notes/`,
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
            queryClient.invalidateQueries({ queryKey: ["sales-credit-notes"] });
            queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
            queryClient.invalidateQueries({
                queryKey: ["sales-invoice-stats"],
            });
        },
    });
}

/**
 * Hook para actualizar una nota de crédito de venta
 */
export function useUpdateSalesCreditNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, formData }) => {
            const response = await apiClient.patch(
                `/sales/credit-notes/${id}/`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["sales-credit-notes"] });
            queryClient.invalidateQueries({
                queryKey: ["sales-credit-note", data.id],
            });
            queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
            queryClient.invalidateQueries({
                queryKey: ["sales-invoice-stats"],
            });
        },
    });
}

/**
 * Hook para eliminar una nota de crédito de venta
 */
export function useDeleteSalesCreditNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/sales/credit-notes/${id}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sales-credit-notes"] });
            queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
            queryClient.invalidateQueries({
                queryKey: ["sales-invoice-stats"],
            });
        },
    });
}
