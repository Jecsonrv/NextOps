import { lazy, Suspense } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { Layout } from "./components/layout/Layout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";

// Lazy-loaded pages — code-split by route
const DashboardPage = lazy(() =>
    import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const OTsPage = lazy(() =>
    import("./pages/OTsPage").then((m) => ({ default: m.OTsPage })),
);
const OTEditPage = lazy(() =>
    import("./pages/OTEditPage").then((m) => ({ default: m.OTEditPage })),
);
const OTDetailPage = lazy(() =>
    import("./pages/OTDetailPage").then((m) => ({ default: m.OTDetailPage })),
);
const OTImportPage = lazy(() =>
    import("./pages/OTImportPage").then((m) => ({ default: m.OTImportPage })),
);
const DisputesPage = lazy(() =>
    import("./pages/DisputesPage").then((m) => ({ default: m.DisputesPage })),
);
const DisputeDetailPage = lazy(() =>
    import("./pages/DisputeDetailPage").then((m) => ({
        default: m.DisputeDetailPage,
    })),
);
const InvoicesPage = lazy(() =>
    import("./pages/InvoicesPage").then((m) => ({ default: m.InvoicesPage })),
);
const InvoiceDetailPage = lazy(() =>
    import("./pages/InvoiceDetailPage").then((m) => ({
        default: m.InvoiceDetailPage,
    })),
);
const InvoiceUploadPage = lazy(() =>
    import("./pages/InvoiceUploadPage").then((m) => ({
        default: m.InvoiceUploadPage,
    })),
);
const CreditNotesPage = lazy(() =>
    import("./pages/CreditNotesPage").then((m) => ({
        default: m.CreditNotesPage,
    })),
);
const CreditNoteDetailPage = lazy(() =>
    import("./pages/CreditNoteDetailPage").then((m) => ({
        default: m.CreditNoteDetailPage,
    })),
);
const InvoiceEditPage = lazy(() =>
    import("./pages/InvoiceEditPage").then((m) => ({
        default: m.InvoiceEditPage,
    })),
);
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const InvoicePatternCatalogPage = lazy(
    () => import("./pages/InvoicePatternCatalogPage"),
);
const ProvidersPage = lazy(() =>
    import("./pages/ProvidersPage").then((m) => ({ default: m.ProvidersPage })),
);
const ProviderFormPage = lazy(() =>
    import("./pages/ProviderFormPage").then((m) => ({
        default: m.ProviderFormPage,
    })),
);
const ClientAliasesPage = lazy(() =>
    import("./pages/ClientAliasesPage").then((m) => ({
        default: m.ClientAliasesPage,
    })),
);
const ClientAliasFormPage = lazy(() =>
    import("./pages/ClientAliasFormPage").then((m) => ({
        default: m.ClientAliasFormPage,
    })),
);
const CostTypesPage = lazy(() =>
    import("./pages/CostTypesPage").then((m) => ({ default: m.CostTypesPage })),
);
const CostTypeFormPage = lazy(() =>
    import("./pages/CostTypeFormPage").then((m) => ({
        default: m.CostTypeFormPage,
    })),
);
const CostCategoriesPage = lazy(() =>
    import("./pages/CostCategoriesPage").then((m) => ({
        default: m.CostCategoriesPage,
    })),
);
const CostCategoryFormPage = lazy(() =>
    import("./pages/CostCategoryFormPage").then((m) => ({
        default: m.CostCategoryFormPage,
    })),
);
const UserManagementPage = lazy(() =>
    import("./pages/Admin/UserManagementPage").then((m) => ({
        default: m.UserManagementPage,
    })),
);
const UserProfilePage = lazy(() =>
    import("./pages/Admin/UserProfilePage").then((m) => ({
        default: m.UserProfilePage,
    })),
);
const SalesInvoicesPage = lazy(() => import("./pages/sales/SalesInvoicesPage"));
const SalesInvoiceFormPage = lazy(
    () => import("./pages/sales/SalesInvoiceFormPage"),
);
const SalesInvoiceDetailPage = lazy(
    () => import("./pages/sales/SalesInvoiceDetailPage"),
);
const PaymentsPage = lazy(() => import("./pages/sales/PaymentsPage"));
const PaymentFormPage = lazy(() => import("./pages/sales/PaymentFormPage"));
const FinanceDashboardPage = lazy(
    () => import("./pages/sales/FinanceDashboardPage"),
);
const SupplierPaymentsPage = lazy(
    () => import("./pages/supplier-payments/SupplierPaymentsPage"),
);

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

// Loading fallback for lazy-loaded routes
const PageLoader = () => (
    <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700" />
    </div>
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
                                background: "#ffffff",
                                color: "#1f2a3a",
                                borderRadius: "0.5rem",
                                boxShadow:
                                    "0 8px 20px -10px rgba(15, 23, 42, 0.28)",
                                border: "1px solid #cfd7e3",
                                padding: "1rem",
                                fontSize: "0.875rem",
                            },
                            // Success toast
                            success: {
                                duration: 3000,
                                iconTheme: {
                                    primary: "#1f4f8a",
                                    secondary: "#fff",
                                },
                                style: {
                                    border: "1px solid #b7c5d9",
                                },
                            },
                            // Error toast
                            error: {
                                duration: 5000,
                                iconTheme: {
                                    primary: "#b23939",
                                    secondary: "#fff",
                                },
                                style: {
                                    border: "1px solid #e7b3b3",
                                },
                            },
                            // Loading toast
                            loading: {
                                iconTheme: {
                                    primary: "#1f4f8a",
                                    secondary: "#fff",
                                },
                            },
                        }}
                    />
                    <ErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
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
                                        <ProtectedRoute
                                            allowedRoles={[
                                                "admin",
                                                "jefe_operaciones",
                                            ]}
                                        >
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
                                        <ProtectedRoute
                                            allowedRoles={[
                                                "admin",
                                                "jefe_operaciones",
                                            ]}
                                        >
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
                                        <ProtectedRoute
                                            allowedRoles={["admin", "finanzas"]}
                                        >
                                            <Layout>
                                                <SalesInvoicesPage />
                                            </Layout>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/sales/invoices/new"
                                    element={
                                        <ProtectedRoute
                                            allowedRoles={["admin", "finanzas"]}
                                        >
                                            <Layout>
                                                <SalesInvoiceFormPage />
                                            </Layout>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/sales/invoices/:id"
                                    element={
                                        <ProtectedRoute
                                            allowedRoles={["admin", "finanzas"]}
                                        >
                                            <Layout>
                                                <SalesInvoiceDetailPage />
                                            </Layout>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/sales/invoices/:id/edit"
                                    element={
                                        <ProtectedRoute
                                            allowedRoles={["admin", "finanzas"]}
                                        >
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
                                        <ProtectedRoute
                                            allowedRoles={["admin"]}
                                        >
                                            <Layout>
                                                <PaymentsPage />
                                            </Layout>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/sales/payments/new"
                                    element={
                                        <ProtectedRoute
                                            allowedRoles={["admin"]}
                                        >
                                            <Layout>
                                                <PaymentFormPage />
                                            </Layout>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/sales/dashboard"
                                    element={
                                        <ProtectedRoute
                                            allowedRoles={["admin", "finanzas"]}
                                        >
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
                                        <ProtectedRoute
                                            allowedRoles={["admin", "finanzas"]}
                                        >
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
                                        <ProtectedRoute
                                            allowedRoles={["admin"]}
                                        >
                                            <Layout>
                                                <ProviderFormPage />
                                            </Layout>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/catalogs/providers/:id/edit"
                                    element={
                                        <ProtectedRoute
                                            allowedRoles={["admin"]}
                                        >
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
                                        <ProtectedRoute
                                            allowedRoles={["admin"]}
                                        >
                                            <Layout>
                                                <ClientAliasFormPage />
                                            </Layout>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/catalogs/aliases/:id/edit"
                                    element={
                                        <ProtectedRoute
                                            allowedRoles={["admin"]}
                                        >
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
                                        <ProtectedRoute
                                            allowedRoles={["admin"]}
                                        >
                                            <Layout>
                                                <CostTypeFormPage />
                                            </Layout>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/catalogs/cost-types/:id/edit"
                                    element={
                                        <ProtectedRoute
                                            allowedRoles={["admin"]}
                                        >
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
                                        <ProtectedRoute
                                            allowedRoles={["admin"]}
                                        >
                                            <Layout>
                                                <CostCategoryFormPage />
                                            </Layout>
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/catalogs/cost-categories/:id/edit"
                                    element={
                                        <ProtectedRoute
                                            allowedRoles={["admin"]}
                                        >
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
                                        <ProtectedRoute
                                            allowedRoles={["admin"]}
                                        >
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
                                        <Navigate
                                            to="/catalogs/providers"
                                            replace
                                        />
                                    }
                                />
                                {/* Catch all - redirect to home */}
                                <Route
                                    path="*"
                                    element={<Navigate to="/" replace />}
                                />
                            </Routes>
                        </Suspense>
                    </ErrorBoundary>
                </AuthProvider>
            </Router>
        </QueryClientProvider>
    );
}

export default App;
