/**
 * Custom hooks para gestión de facturas (Invoices)
 * Usa React Query para manejo de estado del servidor
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/api";

/**
 * Hook para obtener detalle de una factura
 * @param {number} id - ID de la factura
 */
export function useInvoiceDetail(id) {
    return useQuery({
        queryKey: ["invoice", id],
        queryFn: async () => {
            const response = await apiClient.get(`/invoices/${id}/`);
            return response.data;
        },
        enabled: !!id,
    });
}

/**
 * Hook para obtener estadísticas de facturas
 * @param {Object} filters - Filtros opcionales (fecha_desde, fecha_hasta)
 */
export function useInvoiceStats(filters = {}) {
    return useQuery({
        queryKey: ["invoices-stats", filters],
        queryFn: async () => {
            const params = new URLSearchParams(filters);
            const response = await apiClient.get(`/invoices/stats/?${params}`);
            return response.data;
        },
    });
}

/**
 * Hook para subir facturas
 */
export function useInvoiceUpload() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            files,
            auto_parse = true,
            tipo_costo = "OTRO",
            proveedor_id,
        }) => {
            const formData = new FormData();

            files.forEach((file) => {
                formData.append("files[]", file);
            });

            formData.append("auto_parse", auto_parse);
            formData.append("tipo_costo", tipo_costo);

            if (proveedor_id) {
                formData.append("proveedor_id", proveedor_id);
            }

            const response = await apiClient.post(
                "/invoices/upload/",
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
            // Invalidar queries relacionadas para refrescar datos
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            queryClient.invalidateQueries({ queryKey: ["invoices-stats"] });
        },
    });
}

/**
 * Hook para crear una factura manualmente
 */
export function useInvoiceCreate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (invoiceData) => {
            const response = await apiClient.post("/invoices/", invoiceData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            queryClient.invalidateQueries({ queryKey: ["invoices-stats"] });
        },
    });
}

/**
 * Hook para actualizar una factura
 * @param {number} id - ID de la factura
 */
export function useInvoiceUpdate(id) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (invoiceData) => {
            const response = await apiClient.patch(
                `/invoices/${id}/`,
                invoiceData
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoice", id] });
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            queryClient.invalidateQueries({ queryKey: ["invoices-stats"] });
        },
    });
}

/**
 * Hook para asignar OT a una factura
 * @param {number} invoiceId - ID de la factura
 */
export function useAssignOT(invoiceId) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ ot_id, notas }) => {
            const response = await apiClient.post(
                `/invoices/${invoiceId}/assign_ot/`,
                { ot_id, notas }
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            queryClient.invalidateQueries({ queryKey: ["invoices-stats"] });
        },
    });
}

/**
 * Hook para desasignar OT de una factura
 * @param {number} invoiceId - ID de la factura
 */
export function useUnassignOT(invoiceId) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ notas = "OT desasignada" }) => {
            const response = await apiClient.post(
                `/invoices/${invoiceId}/unassign_ot/`,
                { notas }
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            queryClient.invalidateQueries({ queryKey: ["invoices-stats"] });
        },
    });
}

/**
 * Hook para obtener facturas pendientes de revisión
 */
export function useInvoicesPending(page = 1, pageSize = 20) {
    return useQuery({
        queryKey: ["invoices-pending", page],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: pageSize.toString(),
            });
            const response = await apiClient.get(
                `/invoices/pending/?${params}`
            );
            return response.data;
        },
    });
}

/**
 * Hook para eliminar (soft delete) una factura
 * @param {number} id - ID de la factura
 */
export function useInvoiceDelete(id) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await apiClient.delete(`/invoices/${id}/`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            queryClient.invalidateQueries({ queryKey: ["invoices-stats"] });
        },
    });
}

/**
 * Hook para eliminar múltiples facturas (bulk delete)
 * @param {Array<number>} invoiceIds - IDs de las facturas a eliminar
 */
export function useBulkDeleteInvoices() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (invoiceIds) => {
            const response = await apiClient.post(
                "/invoices/bulk-delete/",
                { invoice_ids: invoiceIds }
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            queryClient.invalidateQueries({ queryKey: ["invoices-stats"] });
        },
    });
}

/**
 * Hook para obtener valores únicos de filtros (dinámicos)
 * Retorna solo proveedores y tipos de costo que tienen facturas
 */
export function useInvoiceFilterValues() {
    return useQuery({
        queryKey: ["invoice-filter-values"],
        queryFn: async () => {
            const response = await apiClient.get("/invoices/filter_values/");
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    });
}

/**
 * Hook para obtener lista de proveedores del catálogo (TODOS)
 * @param {Object} options - Opciones de búsqueda y filtrado
 */
export function useProviders(options = {}) {
    return useQuery({
        queryKey: ["providers", options],
        queryFn: async () => {
            const params = new URLSearchParams({
                page_size: "1000",
                is_active: "true",
                ...options,
            });
            const response = await apiClient.get(
                `/catalogs/providers/?${params}`
            );
            return response.data;
        },
    });
}
