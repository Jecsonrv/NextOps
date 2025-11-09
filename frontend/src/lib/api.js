import axios from "axios";

const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Interceptor para agregar token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("access_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor para manejar errores y refresh token
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // NO intentar refresh token si:
        // 1. La request original es al endpoint de login (/token/)
        // 2. Ya se intentó una vez (_retry flag)
        // 3. No hay refresh_token en localStorage
        const isLoginRequest = originalRequest.url?.includes("/token/");
        const refreshToken = localStorage.getItem("refresh_token");

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !isLoginRequest &&
            refreshToken
        ) {
            originalRequest._retry = true;

            try {
                const response = await axios.post(
                    `${API_BASE_URL}/token/refresh/`,
                    {
                        refresh: refreshToken,
                    }
                );

                localStorage.setItem("access_token", response.data.access);
                originalRequest.headers.Authorization = `Bearer ${response.data.access}`;

                return api(originalRequest);
            } catch (refreshError) {
                // Si el refresh falla, limpiar tokens y redirigir a login
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                window.location.href = "/login";
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// ===== SALES INVOICES =====
export const salesInvoicesAPI = {
    list: (params) => api.get("/sales/invoices/", { params }),
    get: (id) => api.get(`/sales/invoices/${id}/`),
    create: (data) =>
        api.post("/sales/invoices/", data, {
            headers: { "Content-Type": "multipart/form-data" },
        }),
    update: (id, data) =>
        api.put(`/sales/invoices/${id}/`, data, {
            headers: { "Content-Type": "multipart/form-data" },
        }),
    delete: (id) => api.delete(`/sales/invoices/${id}/`),
    associateCosts: (id, data) =>
        api.post(`/sales/invoices/${id}/associate_costs/`, data),
    stats: (params) => api.get("/sales/invoices/stats/", { params }),
    extractPdf: (file, tipoOperacion = "nacional") => {
        const formData = new FormData();
        formData.append("archivo_pdf", file);
        formData.append("tipo_operacion", tipoOperacion);
        return api.post("/sales/invoices/extract-pdf/", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },

    getOTInfo: (otId) =>
        api.get("/sales/invoices/ot_info/", { params: { ot_id: otId } }),
    getProvisionadas: (otId) =>
        api.get("/sales/invoices/provisionadas/", {
            params: otId ? { ot_id: otId } : {},
        }),
};

// ===== PAYMENTS =====
export const paymentsAPI = {
    list: (params) => api.get("/sales/payments/", { params }),
    get: (id) => api.get(`/sales/payments/${id}/`),
    create: (data) =>
        api.post("/sales/payments/", data, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }),
    validate: (id) => api.post(`/sales/payments/${id}/validate/`),
    reject: (id, motivo) =>
        api.post(`/sales/payments/${id}/reject/`, { motivo }),
    delete: (id) => api.delete(`/sales/payments/${id}/`),
};

// ===== FINANCE DASHBOARD =====
export const financeDashboardAPI = {
    getData: (params) => api.get("/sales/dashboard/", { params }),
};

// ===== SUPPLIER PAYMENTS (CxP - Cuentas por Pagar) =====
export const supplierPaymentsAPI = {
    list: (params) => api.get("/supplier-payments/", { params }),
    get: (id) => api.get(`/supplier-payments/${id}/`),
    create: (data) => {
        const formData = new FormData();

        // Agregar campos básicos
        formData.append("proveedor", data.proveedor);
        formData.append("fecha_pago", data.fecha_pago);
        formData.append("monto_total", data.monto_total);

        if (data.referencia) formData.append("referencia", data.referencia);
        if (data.notas) formData.append("notas", data.notas);
        if (data.archivo_comprobante)
            formData.append("archivo_comprobante", data.archivo_comprobante);

        // Agregar facturas_a_pagar como JSON
        if (data.facturas_a_pagar) {
            formData.append(
                "facturas_a_pagar",
                JSON.stringify(data.facturas_a_pagar)
            );
        }

        return api.post("/supplier-payments/", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },
    delete: (id) => api.delete(`/supplier-payments/${id}/`),
    getFacturasPendientes: (params) =>
        api.get("/supplier-payments/facturas_pendientes/", { params }),
    getStatsPorProveedor: () =>
        api.get("/supplier-payments/stats_por_proveedor/"),
    getHistorial: (params) =>
        api.get("/supplier-payments/historial/", { params }),
};

export default api;
