/**
 * Custom hooks para gestión de catálogos (Providers, Patterns, Aliases, etc.)
 * Centraliza toda la lógica de catálogos del sistema
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/api";

// Utilidad para normalizar respuestas potencialmente no paginadas
function normalizePaginatedResponse(data) {
    if (!data) return { results: [], count: 0 };

    if (Array.isArray(data)) {
        return { results: data, count: data.length };
    }

    const { results, count, ...rest } = data;

    return {
        results: results || [],
        count: typeof count === "number" ? count : (results || []).length,
        ...rest,
    };
}

// ============================================================================
// PROVIDERS (Proveedores)
// ============================================================================

/**
 * Hook para obtener lista de proveedores con filtros y paginación
 */
export function useProviders(filters = {}, options = {}) {
    const params = new URLSearchParams();

    // Filtros disponibles
    if (filters.tipo) params.append("tipo", filters.tipo);
    if (filters.categoria) params.append("categoria", filters.categoria);
    if (filters.is_active !== undefined)
        params.append("is_active", filters.is_active);
    if (filters.search) params.append("search", filters.search);
    if (filters.page) params.append("page", filters.page);
    if (filters.page_size) params.append("page_size", filters.page_size);

    return useQuery({
        queryKey: ["providers", filters],
        queryFn: async () => {
            const response = await apiClient.get(
                `/catalogs/providers/?${params}`
            );
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
        ...options,
    });
}

/**
 * Hook para obtener un proveedor específico
 */
export function useProvider(id, options = {}) {
    return useQuery({
        queryKey: ["provider", id],
        queryFn: async () => {
            const response = await apiClient.get(`/catalogs/providers/${id}/`);
            return response.data;
        },
        enabled: !!id,
        ...options,
    });
}

/**
 * Hook para obtener tipos de proveedor disponibles
 */
export function useProviderTypes() {
    return useQuery({
        queryKey: ["provider-types"],
        queryFn: async () => {
            const response = await apiClient.get("/catalogs/providers/tipos/");
            return response.data;
        },
        staleTime: 60 * 60 * 1000, // 1 hora (no cambia frecuentemente)
    });
}

/**
 * Hook para obtener categorías de proveedor disponibles
 */
export function useProviderCategories() {
    return useQuery({
        queryKey: ["provider-categories"],
        queryFn: async () => {
            const response = await apiClient.get(
                "/catalogs/providers/categorias/"
            );
            return response.data;
        },
        staleTime: 60 * 60 * 1000,
    });
}

/**
 * Hook para crear un proveedor
 */
export function useCreateProvider() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data) => {
            const response = await apiClient.post("/catalogs/providers/", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["providers"] });
        },
    });
}

/**
 * Hook para actualizar un proveedor
 */
export function useUpdateProvider() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }) => {
            const response = await apiClient.patch(
                `/catalogs/providers/${id}/`,
                data
            );
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["providers"] });
            queryClient.invalidateQueries({ queryKey: ["provider", data.id] });
        },
    });
}

/**
 * Hook para eliminar un proveedor (soft delete)
 */
export function useDeleteProvider() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/catalogs/providers/${id}/`);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["providers"] });
        },
    });
}

// ============================================================================
// REGEX PATTERNS (Patrones Regex)
// ============================================================================

/**
 * Hook para obtener lista de patrones regex
 */
export function useRegexPatterns(filters = {}, options = {}) {
    const params = new URLSearchParams();

    if (filters.category) params.append("category", filters.category);
    if (filters.is_active !== undefined)
        params.append("is_active", filters.is_active);
    if (filters.search) params.append("search", filters.search);
    if (filters.page) params.append("page", filters.page);
    if (filters.page_size) params.append("page_size", filters.page_size);

    return useQuery({
        queryKey: ["regex-patterns", filters],
        queryFn: async () => {
            const response = await apiClient.get(
                `/patterns/regex-patterns/?${params}`
            );
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
        ...options,
    });
}

/**
 * Hook para obtener un patrón específico
 */
export function useRegexPattern(id, options = {}) {
    return useQuery({
        queryKey: ["regex-pattern", id],
        queryFn: async () => {
            const response = await apiClient.get(
                `/patterns/regex-patterns/${id}/`
            );
            return response.data;
        },
        enabled: !!id,
        ...options,
    });
}

/**
 * Hook para obtener categorías de patrones
 */
export function usePatternCategories() {
    return useQuery({
        queryKey: ["pattern-categories"],
        queryFn: async () => {
            const response = await apiClient.get(
                "/patterns/regex-patterns/categories/"
            );
            return response.data;
        },
        staleTime: 60 * 60 * 1000,
    });
}

/**
 * Hook para probar un patrón regex contra texto
 */
export function useTestPattern() {
    return useMutation({
        mutationFn: async ({ pattern, text, flags = "" }) => {
            const response = await apiClient.post(
                "/patterns/regex-patterns/test_pattern/",
                {
                    pattern,
                    text,
                    flags,
                }
            );
            return response.data;
        },
    });
}

/**
 * Hook para ejecutar test_cases de un patrón
 */
export function useRunPatternTests(id) {
    return useQuery({
        queryKey: ["pattern-tests", id],
        queryFn: async () => {
            const response = await apiClient.get(
                `/patterns/regex-patterns/${id}/run_tests/`
            );
            return response.data;
        },
        enabled: !!id,
    });
}

/**
 * Hook para crear un patrón regex
 */
export function useCreatePattern() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data) => {
            const response = await apiClient.post(
                "/patterns/regex-patterns/",
                data
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["regex-patterns"] });
        },
    });
}

/**
 * Hook para actualizar un patrón regex
 */
export function useUpdatePattern() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }) => {
            const response = await apiClient.patch(
                `/patterns/regex-patterns/${id}/`,
                data
            );
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["regex-patterns"] });
            queryClient.invalidateQueries({
                queryKey: ["regex-pattern", data.id],
            });
        },
    });
}

/**
 * Hook para eliminar un patrón regex
 */
export function useDeletePattern() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/patterns/regex-patterns/${id}/`);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["regex-patterns"] });
        },
    });
}

// ============================================================================
// CLIENT ALIASES (Aliases de Clientes)
// ============================================================================

/**
 * Hook para obtener lista de aliases de clientes REALES de la base de datos
 * Trae TODOS los aliases sin límite de paginación
 */
export function useClientAliases(filters = {}, options = {}) {
    const params = new URLSearchParams({
        page_size: "1000", // Traer todos los aliases
    });

    if (filters.country) params.append("country", filters.country);
    if (filters.is_verified !== undefined)
        params.append("is_verified", filters.is_verified);
    if (filters.merged !== undefined) params.append("merged", filters.merged);
    if (filters.provider) params.append("provider", filters.provider);
    if (filters.search) params.append("search", filters.search);
    if (filters.page) params.append("page", filters.page);

    return useQuery({
        queryKey: ["client-aliases", filters],
        queryFn: async () => {
            const response = await apiClient.get(
                `/clients/client-aliases/?${params}`
            );
            return normalizePaginatedResponse(response.data);
        },
        staleTime: 5 * 60 * 1000,
        ...options,
    });
}

/**
 * Hook para obtener un alias específico
 */
export function useClientAlias(id, options = {}) {
    return useQuery({
        queryKey: ["client-alias", id],
        queryFn: async () => {
            const response = await apiClient.get(
                `/clients/client-aliases/${id}/`
            );
            return response.data;
        },
        enabled: !!id,
        ...options,
    });
}

/**
 * Hook para buscar aliases similares (fuzzy matching)
 */
export function useFindSimilarAliases() {
    return useMutation({
        mutationFn: async ({
            name,
            threshold = 80,
            country = null,
            limit = 10,
        }) => {
            const response = await apiClient.post(
                "/clients/client-aliases/find_similar/",
                {
                    name,
                    threshold,
                    country,
                    limit,
                }
            );
            return response.data;
        },
    });
}

/**
 * Hook para aprobar una fusión de aliases
 */
export function useApproveMerge() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, merge_into_id, notes = "" }) => {
            const response = await apiClient.post(
                `/clients/client-aliases/${id}/approve_merge/`,
                { merge_into_id, notes }
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client-aliases"] });
        },
    });
}

/**
 * Hook para rechazar una fusión de aliases
 */
export function useRejectMerge() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            source_alias_id,
            target_alias_id,
            reason = "",
        }) => {
            const response = await apiClient.post(
                `/clients/client-aliases/reject_merge/`,
                { source_alias_id, target_alias_id, reason }
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client-aliases"] });
            queryClient.invalidateQueries({ queryKey: ["similarity-matches"] });
        },
    });
}

/**
 * Hook para verificar manualmente un alias
 */
export function useVerifyAlias() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, notes = "" }) => {
            const response = await apiClient.post(
                `/clients/client-aliases/${id}/verify/`,
                { notes }
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client-aliases"] });
        },
    });
}

/**
 * Hook para crear un alias de cliente
 */
export function useCreateAlias() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data) => {
            const response = await apiClient.post(
                "/clients/client-aliases/",
                data
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client-aliases"] });
        },
    });
}

/**
 * Hook para actualizar un alias
 */
export function useUpdateAlias() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }) => {
            const response = await apiClient.patch(
                `/clients/client-aliases/${id}/`,
                data
            );
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["client-aliases"] });
            queryClient.invalidateQueries({
                queryKey: ["client-alias", data.id],
            });
        },
    });
}

/**
 * Hook para eliminar un alias
 */
export function useDeleteAlias() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/clients/client-aliases/${id}/`);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client-aliases"] });
        },
    });
}

/**
 * Hook para detectar duplicados masivamente
 */
export function useSuggestAllMatches() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ threshold = 85, limit_per_alias = 5 }) => {
            const response = await apiClient.post(
                "/clients/client-aliases/suggest_all_matches/",
                {},
                {
                    params: { threshold, limit_per_alias },
                }
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["similarity-matches"],
            });
        },
    });
}

/**
 * Hook para aplicar normalización masiva (actualiza OTs)
 */
export function useApplyNormalization() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            source_alias_id,
            target_alias_id,
            notes = "",
            custom_target_name = undefined,
        }) => {
            const response = await apiClient.post(
                "/clients/client-aliases/apply_normalization/",
                {
                    source_alias_id,
                    target_alias_id,
                    notes,
                    custom_target_name,
                }
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client-aliases"] });
            queryClient.invalidateQueries({ queryKey: ["ots"] });
        },
    });
}

/**
 * Hook para contar OTs de un alias
 */
export function useCountAliasOTs(id, options = {}) {
    return useQuery({
        queryKey: ["alias-ots-count", id],
        queryFn: async () => {
            const response = await apiClient.get(
                `/clients/client-aliases/${id}/count_ots/`
            );
            return response.data;
        },
        enabled: !!id,
        ...options,
    });
}

/**
 * Hook para obtener sugerencias de similitud
 */
export function useSimilarityMatches(filters = {}, options = {}) {
    const params = new URLSearchParams();

    if (filters.status) params.append("status", filters.status);
    if (filters.min_score) params.append("min_score", filters.min_score);
    if (filters.detection_method)
        params.append("detection_method", filters.detection_method);
    if (filters.page) params.append("page", filters.page);
    if (filters.page_size) params.append("page_size", filters.page_size);

    return useQuery({
        queryKey: ["similarity-matches", filters],
        queryFn: async () => {
            const response = await apiClient.get(
                `/clients/similarity-matches/?${params}`
            );
            return normalizePaginatedResponse(response.data);
        },
        staleTime: 2 * 60 * 1000,
        ...options,
    });
}

/**
 * Hook para obtener estadísticas de sugerencias de similitud
 */
export function useSimilarityStats(options = {}) {
    return useQuery({
        queryKey: ["similarity-stats"],
        queryFn: async () => {
            const response = await apiClient.get(
                "/clients/similarity-matches/stats/"
            );
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
        ...options,
    });
}

/**
 * Hook para obtener estadísticas REALES de clientes/aliases
 * Incluye: total aliases, verificados, pendientes, top 10, etc.
 */
export function useClientAliasStats(options = {}) {
    return useQuery({
        queryKey: ["client-alias-stats"],
        queryFn: async () => {
            const response = await apiClient.get(
                "/clients/client-aliases/stats/"
            );
            return response.data;
        },
        staleTime: 2 * 60 * 1000, // Cache 2 minutos
        ...options,
    });
}

/**
 * Hook para generar aliases cortos en batch
 */
export function useGenerateShortNames() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ alias_ids = [], force = false }) => {
            const response = await apiClient.post(
                "/clients/client-aliases/generate_short_names/",
                { alias_ids, force }
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client-aliases"] });
        },
    });
}

/**
 * Hook para regenerar el short_name de un alias específico
 */
export function useRegenerateShortName() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (aliasId) => {
            const response = await apiClient.post(
                `/clients/client-aliases/${aliasId}/regenerate_short_name/`
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client-aliases"] });
        },
    });
}

// ============================================================================
// COST CATEGORIES (Categorías de Tipos de Costo) - API Implementada
// ============================================================================

/**
 * Hook para obtener categorías de tipos de costo
 */
export function useCostCategories(params = {}) {
    const queryParams = new URLSearchParams();

    if (params.is_active !== undefined)
        queryParams.append("is_active", params.is_active);
    if (params.search) queryParams.append("search", params.search);
    if (params.ordering) queryParams.append("ordering", params.ordering);

    const queryString = queryParams.toString();
    const url = `/catalogs/cost-categories/${
        queryString ? `?${queryString}` : ""
    }`;

    return useQuery({
        queryKey: ["cost-categories", params],
        queryFn: async () => {
            const response = await apiClient.get(url);
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
    });
}

/**
 * Hook para obtener una categoría por ID
 */
export function useCostCategory(id) {
    return useQuery({
        queryKey: ["cost-category", id],
        queryFn: async () => {
            const response = await apiClient.get(
                `/catalogs/cost-categories/${id}/`
            );
            return response.data;
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook para obtener solo categorías activas
 */
export function useActiveCostCategories() {
    return useQuery({
        queryKey: ["active-cost-categories"],
        queryFn: async () => {
            const response = await apiClient.get(
                "/catalogs/cost-categories/activas/"
            );
            return response.data;
        },
        staleTime: 10 * 60 * 1000, // 10 minutos - las categorías no cambian frecuentemente
    });
}

/**
 * Hook para crear una categoría
 */
export function useCreateCostCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data) => {
            const response = await apiClient.post(
                "/catalogs/cost-categories/",
                data
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["cost-categories"] });
            queryClient.invalidateQueries({
                queryKey: ["active-cost-categories"],
            });
        },
    });
}

/**
 * Hook para actualizar una categoría (PUT completo)
 */
export function useUpdateCostCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }) => {
            const response = await apiClient.put(
                `/catalogs/cost-categories/${id}/`,
                data
            );
            return response.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["cost-categories"] });
            queryClient.invalidateQueries({
                queryKey: ["cost-category", variables.id],
            });
            queryClient.invalidateQueries({
                queryKey: ["active-cost-categories"],
            });
        },
    });
}

/**
 * Hook para actualizar parcialmente una categoría (PATCH)
 */
export function usePatchCostCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }) => {
            const response = await apiClient.patch(
                `/catalogs/cost-categories/${id}/`,
                data
            );
            return response.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["cost-categories"] });
            queryClient.invalidateQueries({
                queryKey: ["cost-category", variables.id],
            });
            queryClient.invalidateQueries({
                queryKey: ["active-cost-categories"],
            });
        },
    });
}

/**
 * Hook para eliminar una categoría (soft delete)
 */
export function useDeleteCostCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/catalogs/cost-categories/${id}/`);
            return id;
        },
        onMutate: async (id) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ["cost-categories"] });

            // Snapshot the previous value
            const previousCategories = queryClient.getQueryData([
                "cost-categories",
            ]);

            // Optimistically update to the new value
            if (previousCategories?.results) {
                queryClient.setQueryData(["cost-categories"], (old) => ({
                    ...old,
                    results: old.results.filter((cat) => cat.id !== id),
                    count: old.count - 1,
                }));
            }

            return { previousCategories };
        },
        onError: (err, id, context) => {
            // Rollback on error
            if (context?.previousCategories) {
                queryClient.setQueryData(
                    ["cost-categories"],
                    context.previousCategories
                );
            }
        },
        onSettled: () => {
            // Always refetch after error or success
            queryClient.invalidateQueries({ queryKey: ["cost-categories"] });
            queryClient.invalidateQueries({
                queryKey: ["active-cost-categories"],
            });
        },
    });
}

/**
 * Hook para activar/desactivar una categoría
 */
export function useToggleCostCategoryActive() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            const response = await apiClient.post(
                `/catalogs/cost-categories/${id}/toggle_active/`
            );
            return response.data;
        },
        onMutate: async (id) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ["cost-categories"] });

            // Snapshot the previous value
            const previousCategories = queryClient.getQueryData([
                "cost-categories",
            ]);

            // Optimistically update
            if (previousCategories?.results) {
                queryClient.setQueryData(["cost-categories"], (old) => ({
                    ...old,
                    results: old.results.map((cat) =>
                        cat.id === id
                            ? { ...cat, is_active: !cat.is_active }
                            : cat
                    ),
                }));
            }

            return { previousCategories };
        },
        onError: (err, id, context) => {
            // Rollback on error
            if (context?.previousCategories) {
                queryClient.setQueryData(
                    ["cost-categories"],
                    context.previousCategories
                );
            }
        },
        onSettled: () => {
            // Always refetch after error or success
            queryClient.invalidateQueries({ queryKey: ["cost-categories"] });
            queryClient.invalidateQueries({
                queryKey: ["active-cost-categories"],
            });
        },
    });
}

// ============================================================================
// COST TYPES (Tipos de Costo) - API Implementada
// ============================================================================

/**
 * Hook para obtener tipos de costo
 */
export function useCostTypes(params = {}) {
    const queryParams = new URLSearchParams();

    if (params.category) queryParams.append("category", params.category);
    if (params.is_active !== undefined)
        queryParams.append("is_active", params.is_active);
    if (params.search) queryParams.append("search", params.search);
    if (params.ordering) queryParams.append("ordering", params.ordering);

    const queryString = queryParams.toString();
    const url = `/catalogs/cost-types/${queryString ? `?${queryString}` : ""}`;

    return useQuery({
        queryKey: ["cost-types", params],
        queryFn: async () => {
            const response = await apiClient.get(url);
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
    });
}

/**
 * Hook para obtener un tipo de costo por ID
 */
export function useCostType(id) {
    return useQuery({
        queryKey: ["cost-type", id],
        queryFn: async () => {
            const response = await apiClient.get(`/catalogs/cost-types/${id}/`);
            return response.data;
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook para obtener las categorías de tipos de costo
 */
export function useCostTypeCategories() {
    return useQuery({
        queryKey: ["cost-type-categories"],
        queryFn: async () => {
            const response = await apiClient.get(
                "/catalogs/cost-types/categorias/"
            );
            return response.data;
        },
        staleTime: 60 * 60 * 1000, // 1 hora
    });
}

/**
 * Hook para obtener solo tipos de costo activos
 */
export function useActiveCostTypes() {
    return useQuery({
        queryKey: ["cost-types-active"],
        queryFn: async () => {
            const response = await apiClient.get(
                "/catalogs/cost-types/activos/"
            );
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook para crear un tipo de costo
 */
export function useCreateCostType() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data) => {
            const response = await apiClient.post(
                "/catalogs/cost-types/",
                data
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["cost-types"] });
            queryClient.invalidateQueries({ queryKey: ["cost-types-active"] });
        },
    });
}

/**
 * Hook para actualizar un tipo de costo
 */
export function useUpdateCostType() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }) => {
            const response = await apiClient.put(
                `/catalogs/cost-types/${id}/`,
                data
            );
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["cost-types"] });
            queryClient.invalidateQueries({ queryKey: ["cost-type", data.id] });
            queryClient.invalidateQueries({ queryKey: ["cost-types-active"] });
        },
    });
}

/**
 * Hook para actualizar parcialmente un tipo de costo
 */
export function usePatchCostType() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }) => {
            const response = await apiClient.patch(
                `/catalogs/cost-types/${id}/`,
                data
            );
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["cost-types"] });
            queryClient.invalidateQueries({ queryKey: ["cost-type", data.id] });
            queryClient.invalidateQueries({ queryKey: ["cost-types-active"] });
        },
    });
}

/**
 * Hook para eliminar un tipo de costo
 */
export function useDeleteCostType() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/catalogs/cost-types/${id}/`);
            return id;
        },
        onMutate: async (id) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ["cost-types"] });

            // Snapshot the previous value
            const previousCostTypes = queryClient.getQueryData(["cost-types"]);

            // Optimistically update
            if (previousCostTypes?.results) {
                queryClient.setQueryData(["cost-types"], (old) => ({
                    ...old,
                    results: old.results.filter((type) => type.id !== id),
                    count: old.count - 1,
                }));
            }

            return { previousCostTypes };
        },
        onError: (err, id, context) => {
            // Rollback on error
            if (context?.previousCostTypes) {
                queryClient.setQueryData(
                    ["cost-types"],
                    context.previousCostTypes
                );
            }
        },
        onSettled: () => {
            // Always refetch after error or success
            queryClient.invalidateQueries({ queryKey: ["cost-types"] });
            queryClient.invalidateQueries({ queryKey: ["cost-types-active"] });
        },
    });
}

/**
 * Hook para activar/desactivar un tipo de costo
 */
export function useToggleCostTypeActive() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            const response = await apiClient.post(
                `/catalogs/cost-types/${id}/toggle_active/`
            );
            return response.data;
        },
        onMutate: async (id) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ["cost-types"] });

            // Snapshot the previous value
            const previousCostTypes = queryClient.getQueryData(["cost-types"]);

            // Optimistically update
            if (previousCostTypes?.results) {
                queryClient.setQueryData(["cost-types"], (old) => ({
                    ...old,
                    results: old.results.map((type) =>
                        type.id === id
                            ? { ...type, is_active: !type.is_active }
                            : type
                    ),
                }));
            }

            return { previousCostTypes };
        },
        onError: (err, id, context) => {
            // Rollback on error
            if (context?.previousCostTypes) {
                queryClient.setQueryData(
                    ["cost-types"],
                    context.previousCostTypes
                );
            }
        },
        onSettled: () => {
            // Always refetch after error or success
            queryClient.invalidateQueries({ queryKey: ["cost-types"] });
            queryClient.invalidateQueries({ queryKey: ["cost-types-active"] });
        },
    });
}
