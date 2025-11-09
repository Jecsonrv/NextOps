import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import { Layout } from "./components/layout/Layout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { OTsPage } from "./pages/OTsPage";
import { OTEditPage } from "./pages/OTEditPage";
import { OTDetailPage } from "./pages/OTDetailPage";
import { OTImportPage } from "./pages/OTImportPage";
import { DisputesPage } from "./pages/DisputesPage";
import { DisputeDetailPage } from "./pages/DisputeDetailPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { InvoiceDetailPage } from "./pages/InvoiceDetailPage";
import { InvoiceUploadPage } from "./pages/InvoiceUploadPage";

import { CreditNotesPage } from "./pages/CreditNotesPage";
import { CreditNoteDetailPage } from "./pages/CreditNoteDetailPage";
import { InvoiceEditPage } from "./pages/InvoiceEditPage";
import ClientsPage from "./pages/ClientsPage";
import InvoicePatternCatalogPage from "./pages/InvoicePatternCatalogPage";

// Catalog pages
import { ProvidersPage } from "./pages/ProvidersPage";
import { ProviderFormPage } from "./pages/ProviderFormPage";
import { ClientAliasesPage } from "./pages/ClientAliasesPage";
import { ClientAliasFormPage } from "./pages/ClientAliasFormPage";
import { CostTypesPage } from "./pages/CostTypesPage";
import { CostTypeFormPage } from "./pages/CostTypeFormPage";
import { CostCategoriesPage } from "./pages/CostCategoriesPage";
import { CostCategoryFormPage } from "./pages/CostCategoryFormPage";
import { UserManagementPage } from "./pages/Admin/UserManagementPage";
import { UserProfilePage } from "./pages/Admin/UserProfilePage";

// Sales/CRM pages
import SalesInvoicesPage from "./pages/sales/SalesInvoicesPage";
import SalesInvoiceFormPage from "./pages/sales/SalesInvoiceFormPage";
import SalesInvoiceDetailPage from "./pages/sales/SalesInvoiceDetailPage";
import PaymentsPage from "./pages/sales/PaymentsPage";
import PaymentFormPage from "./pages/sales/PaymentFormPage";
import FinanceDashboardPage from "./pages/sales/FinanceDashboardPage";

// Supplier Payments (CxP) pages
import SupplierPaymentsPage from "./pages/supplier-payments/SupplierPaymentsPage";

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: true,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes
        },
    },
});

// Placeholder page for automation
const AutomationPage = () => (
    <div className="text-2xl font-bold">Automatización - En construcción</div>
);

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <Router>
                <AuthProvider>
                    <Toaster
                        position="top-right"
                        reverseOrder={false}
                        gutter={8}
                        toastOptions={{
                            // Default options
                            duration: 4000,
                            style: {
                                background: "#fff",
                                color: "#363636",
                                borderRadius: "0.5rem",
                                boxShadow:
                                    "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                                padding: "1rem",
                                fontSize: "0.875rem",
                            },
                            // Success toast
                            success: {
                                duration: 3000,
                                iconTheme: {
                                    primary: "#10b981",
                                    secondary: "#fff",
                                },
                                style: {
                                    border: "1px solid #10b981",
                                },
                            },
                            // Error toast
                            error: {
                                duration: 5000,
                                iconTheme: {
                                    primary: "#ef4444",
                                    secondary: "#fff",
                                },
                                style: {
                                    border: "1px solid #ef4444",
                                },
                            },
                            // Loading toast
                            loading: {
                                iconTheme: {
                                    primary: "#3b82f6",
                                    secondary: "#fff",
                                },
                            },
                        }}
                    />
                    <Routes>
                        {/* Public routes */}
                        <Route path="/login" element={<LoginPage />} />
                        {/* Protected routes */}
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <DashboardPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/ots"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <OTsPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/ots/import"
                            element={
                                <ProtectedRoute allowedRoles={["admin", "jefe_operaciones"]}>
                                    <Layout>
                                        <OTImportPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/ots/:id"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <OTDetailPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/ots/:id/edit"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <OTEditPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/invoices"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <InvoicesPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/invoices/new"
                            element={
                                <ProtectedRoute allowedRoles={["admin", "jefe_operaciones"]}>
                                    <Layout>
                                        <InvoiceUploadPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/invoices/:id"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <InvoiceDetailPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/invoices/:id/edit"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <InvoiceEditPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/invoices/credit-notes"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <CreditNotesPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/invoices/credit-notes/:id"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <CreditNoteDetailPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        {/* Sales/CRM Routes - Admin + Finanzas */}
                        <Route
                            path="/sales/invoices"
                            element={
                                <ProtectedRoute allowedRoles={["admin", "finanzas"]}>
                                    <Layout>
                                        <SalesInvoicesPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/sales/invoices/new"
                            element={
                                <ProtectedRoute allowedRoles={["admin", "finanzas"]}>
                                    <Layout>
                                        <SalesInvoiceFormPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/sales/invoices/:id"
                            element={
                                <ProtectedRoute allowedRoles={["admin", "finanzas"]}>
                                    <Layout>
                                        <SalesInvoiceDetailPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/sales/invoices/:id/edit"
                            element={
                                <ProtectedRoute allowedRoles={["admin", "finanzas"]}>
                                    <Layout>
                                        <SalesInvoiceFormPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        {/* Pagos Recibidos - MÓDULO OCULTO: Solo Admin */}
                        <Route
                            path="/sales/payments"
                            element={
                                <ProtectedRoute allowedRoles={["admin"]}>
                                    <Layout>
                                        <PaymentsPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/sales/payments/new"
                            element={
                                <ProtectedRoute allowedRoles={["admin"]}>
                                    <Layout>
                                        <PaymentFormPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/sales/dashboard"
                            element={
                                <ProtectedRoute allowedRoles={["admin", "finanzas"]}>
                                    <Layout>
                                        <FinanceDashboardPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        {/* Supplier Payments (CxP) Routes - Admin + Finanzas */}
                        <Route
                            path="/supplier-payments"
                            element={
                                <ProtectedRoute allowedRoles={["admin", "finanzas"]}>
                                    <Layout>
                                        <SupplierPaymentsPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/clients"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <ClientsPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/disputes"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <DisputesPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/disputes/:id"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <DisputeDetailPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/patterns"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <InvoicePatternCatalogPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        {/* Catalog Routes - Ver: Todos, Crear/Editar: Solo Admin */}
                        <Route
                            path="/catalogs/providers"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <ProvidersPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/catalogs/providers/create"
                            element={
                                <ProtectedRoute allowedRoles={["admin"]}>
                                    <Layout>
                                        <ProviderFormPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/catalogs/providers/:id/edit"
                            element={
                                <ProtectedRoute allowedRoles={["admin"]}>
                                    <Layout>
                                        <ProviderFormPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/catalogs/aliases"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <ClientAliasesPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/catalogs/aliases/create"
                            element={
                                <ProtectedRoute allowedRoles={["admin"]}>
                                    <Layout>
                                        <ClientAliasFormPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/catalogs/aliases/:id/edit"
                            element={
                                <ProtectedRoute allowedRoles={["admin"]}>
                                    <Layout>
                                        <ClientAliasFormPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/catalogs/cost-types"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <CostTypesPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/catalogs/cost-types/create"
                            element={
                                <ProtectedRoute allowedRoles={["admin"]}>
                                    <Layout>
                                        <CostTypeFormPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/catalogs/cost-types/:id/edit"
                            element={
                                <ProtectedRoute allowedRoles={["admin"]}>
                                    <Layout>
                                        <CostTypeFormPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/catalogs/cost-categories"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <CostCategoriesPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/catalogs/cost-categories/create"
                            element={
                                <ProtectedRoute allowedRoles={["admin"]}>
                                    <Layout>
                                        <CostCategoryFormPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/catalogs/cost-categories/:id/edit"
                            element={
                                <ProtectedRoute allowedRoles={["admin"]}>
                                    <Layout>
                                        <CostCategoryFormPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        {/* Admin Routes */}
                        <Route
                            path="/admin/users"
                            element={
                                <ProtectedRoute allowedRoles={["admin"]}>
                                    <Layout>
                                        <UserManagementPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/profile/:userId"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <UserProfilePage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/profile"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <UserProfilePage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        {/* Legacy provider route - redirect to new catalog route */}
                        <Route
                            path="/providers"
                            element={
                                <Navigate to="/catalogs/providers" replace />
                            }
                        />
                        {/* Automatización - Solo Admin */}
                        <Route
                            path="/automation"
                            element={
                                <ProtectedRoute allowedRoles={["admin"]}>
                                    <Layout>
                                        <AutomationPage />
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                        {/* Catch all - redirect to home */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </AuthProvider>
            </Router>
        </QueryClientProvider>
    );
}

export default App;
