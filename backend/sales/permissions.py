"""
Permisos personalizados para el módulo de ventas.
"""
from rest_framework import permissions


class IsFinanzasOrAdmin(permissions.BasePermission):
    """
    Permiso para usuarios de finanzas o admin.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['finanzas', 'admin']


class CanValidatePayments(permissions.BasePermission):
    """
    Solo finanzas/admin pueden validar o rechazar pagos.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Para acciones de validación/rechazo, solo finanzas/admin
        if view.action in ['validate', 'reject']:
            return request.user.role in ['finanzas', 'admin']
        
        # Para otras acciones, todos los autenticados pueden
        return True


class CanManageSalesInvoices(permissions.BasePermission):
    """
    Operaciones puede crear/editar facturas de venta.
    Finanzas solo puede ver.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # GET: todos pueden ver
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # POST/PUT/DELETE: solo operaciones y admin
        return request.user.role in ['jefe_operaciones', 'operativo', 'admin']
