import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesInvoicesAPI } from "../lib/api";

export function useSalesInvoices(filters = {}) {
    return useQuery({
        queryKey: ["salesInvoices", JSON.stringify(filters)],
        queryFn: async () => {
            const response = await salesInvoicesAPI.list(filters);
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

export function useSalesInvoice(id) {
    return useQuery({
        queryKey: ["salesInvoice", id],
        queryFn: async () => {
            const response = await salesInvoicesAPI.get(id);
            return response.data;
        },
        enabled: !!id,
    });
}

export function useCreateSalesInvoice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data) => {
            const response = await salesInvoicesAPI.create(data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["salesInvoices"] });
        },
    });
}

export function useUpdateSalesInvoice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }) => {
            const response = await salesInvoicesAPI.update(id, data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["salesInvoices"] });
            queryClient.invalidateQueries({
                queryKey: ["salesInvoice", data.id],
            });
        },
    });
}

export function useDeleteSalesInvoice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            await salesInvoicesAPI.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["salesInvoices"] });
        },
    });
}

export function useSalesInvoiceStats(filters = {}) {
    return useQuery({
        queryKey: ["salesInvoicesStats", filters],
        queryFn: async () => {
            const response = await salesInvoicesAPI.stats(filters);
            return response.data;
        },
        staleTime: 30000, // 30 segundos
        refetchInterval: 60000, // Refetch cada minuto
    });
}

// Obtener info de OT para auto-completar
export function useOTInfo(otId) {
    return useQuery({
        queryKey: ["otInfo", otId],
        queryFn: async () => {
            const response = await salesInvoicesAPI.getOTInfo(otId);
            return response.data;
        },
        enabled: !!otId,
        staleTime: 5 * 60 * 1000, // 5 minutos
    });
}

// Obtener facturas de costo provisionadas
export function useProvisionadas(otId = null) {
    return useQuery({
        queryKey: ["provisionadas", otId],
        queryFn: async () => {
            const response = await salesInvoicesAPI.getProvisionadas(otId);
            return response.data;
        },
        enabled: !!otId, // Only fetch if otId is not null
        staleTime: 2 * 60 * 1000, // 2 minutos
    });
}

export function useAssociateCosts(invoiceId) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (costInvoiceIds) => {
            const response = await salesInvoicesAPI.associateCosts(invoiceId, {
                invoice_ids: costInvoiceIds,
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["salesInvoice", invoiceId],
            });
        },
    });
}
