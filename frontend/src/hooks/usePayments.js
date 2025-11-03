import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsAPI } from "../lib/api";

export function usePayments(filters = {}) {
    return useQuery({
        queryKey: ["payments", filters],
        queryFn: async () => {
            const response = await paymentsAPI.list(filters);
            return response.data;
        },
    });
}

export function usePayment(id) {
    return useQuery({
        queryKey: ["payment", id],
        queryFn: async () => {
            const response = await paymentsAPI.get(id);
            return response.data;
        },
        enabled: !!id,
    });
}

export function useCreatePayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data) => {
            const response = await paymentsAPI.create(data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payments"] });
            queryClient.invalidateQueries({ queryKey: ["salesInvoices"] });
        },
    });
}

export function useValidatePayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            const response = await paymentsAPI.validate(id);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payments"] });
            queryClient.invalidateQueries({ queryKey: ["salesInvoices"] });
        },
    });
}

export function useRejectPayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, motivo }) => {
            const response = await paymentsAPI.reject(id, motivo);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payments"] });
        },
    });
}

export function useDeletePayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            const response = await paymentsAPI.delete(id);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payments"] });
            queryClient.invalidateQueries({ queryKey: ["salesInvoices"] });
        },
    });
}
