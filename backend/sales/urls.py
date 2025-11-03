from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SalesInvoiceViewSet, SalesInvoiceItemViewSet, PaymentViewSet, FinanceDashboardView, CreditNoteViewSet

router = DefaultRouter()
router.register(r'invoices', SalesInvoiceViewSet, basename='sales-invoice')
router.register(r'invoice-items', SalesInvoiceItemViewSet, basename='sales-invoice-item')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'credit-notes', CreditNoteViewSet, basename='credit-note')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', FinanceDashboardView.as_view(), name='finance-dashboard'),
]
