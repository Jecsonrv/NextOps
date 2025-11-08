"""
Permisos personalizados para el módulo de ventas.

Según la matriz de permisos del sistema:
- Admin: Acceso total a todo
- Finanzas: Acceso a Facturas de Venta, Dashboard Financiero, Pagos a Proveedores
- Jefe de Operaciones: NO tiene acceso a módulo de ventas
- Operativo: NO tiene acceso a módulo de ventas
"""
from rest_framework import permissions


class IsFinanzasOrAdmin(permissions.BasePermission):
    """
    Permiso para usuarios de finanzas o admin.
    Usado para Facturas de Venta, Dashboard Financiero.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['finanzas', 'admin']


class IsAdminOnly(permissions.BasePermission):
    """
    Solo Admin puede acceder.
    Usado para Pagos Recibidos (módulo oculto).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role == 'admin'


class CanValidatePayments(permissions.BasePermission):
    """
    Solo Admin puede gestionar Pagos Recibidos.
    Este módulo está oculto para todos excepto Admin.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Solo Admin puede acceder al módulo de Pagos Recibidos
        return request.user.role == 'admin'


class CanManageSalesInvoices(permissions.BasePermission):
    """
    Admin y Finanzas pueden gestionar Facturas de Venta.

    Permisos:
    - Admin: CRUD completo
    - Finanzas: CRUD completo
    - Otros roles: Sin acceso
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Solo Admin y Finanzas pueden acceder
        return request.user.role in ['admin', 'finanzas']
