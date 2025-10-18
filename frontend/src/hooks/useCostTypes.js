import { useQuery } from "@tanstack/react-query";
import apiClient from "../lib/api";

export function useCostTypes() {
    return useQuery({
        queryKey: ["cost-types"],
        queryFn: async () => {
            const response = await apiClient.get("/catalogs/cost-types/");
            return response.data;
        },
    });
}
