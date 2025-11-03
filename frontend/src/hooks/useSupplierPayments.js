import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierPaymentsAPI } from '../lib/api';

export function useStatsPorProveedor() {
  return useQuery({
    queryKey: ['supplier-payment-stats'],
    queryFn: async () => {
      const response = await supplierPaymentsAPI.getStatsPorProveedor();
      return response.data;
    },
  });
}

export function useFacturasPendientes(filters = {}) {
  return useQuery({
    queryKey: ['facturas-pendientes', filters],
    queryFn: async () => {
      const response = await supplierPaymentsAPI.getFacturasPendientes(filters);
      return response.data;
    },
    enabled: !!filters.proveedor_id,
  });
}

export function useCreateSupplierPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const response = await supplierPaymentsAPI.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-payment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['facturas-pendientes'] });
    },
  });
}