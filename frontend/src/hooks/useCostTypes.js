import { useQuery } from "@tanstack/react-query";
import apiClient from "../lib/api";

export function useCostTypes(params = {}) {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page);
    if (params.page_size) queryParams.append("page_size", params.page_size);

    const queryString = queryParams.toString();
    const url = `/catalogs/cost-types/?${queryString}`;

    return useQuery({
        queryKey: ["cost-types", params],
        queryFn: async () => {
            const response = await apiClient.get(url);
            return response.data;
        },
    });
}
