"""
Custom permissions for NextOps project.

Permission Classes:
    - IsAdmin: Only admin users
    - IsAdminOrJefeOps: Admin or Jefe de Operaciones
    - IsAdminOrFinanzas: Admin or Finanzas
    - IsJefeOperaciones: Admin or Jefe de Operaciones (legacy)
    - IsFinanzas: Admin, Jefe Ops, or Finanzas (legacy)
    - IsOperativo: Any authenticated user
    - RoleRequired: Dynamic role checking
    - ReadOnly: Only safe methods (GET, HEAD, OPTIONS)
    - CanImportData: Admin or Jefe de Operaciones
    - CanEditFinancialStatus: Admin or Finanzas
"""
from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Permission check for admin role only.

    Used for:
    - User management
    - Catalogs (providers, cost types, etc.)
    - Automation
    - Sales Payments (Pagos Recibidos)
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsAdminOrJefeOps(permissions.BasePermission):
    """
    Permission check for Admin or Jefe de Operaciones.

    Used for:
    - Importing OTs, Invoices, Reports
    - Creating/editing OTs and Invoices
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['admin', 'jefe_operaciones']
        )


class IsAdminOrFinanzas(permissions.BasePermission):
    """
    Permission check for Admin or Finanzas.

    Used for:
    - Sales Invoices (Facturas de Venta)
    - Supplier Payments (Pagos a Proveedores)
    - Financial Dashboard
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['admin', 'finanzas']
        )


class IsJefeOperaciones(permissions.BasePermission):
    """
    Permission check for jefe_operaciones role.
    Legacy class - prefer IsAdminOrJefeOps for clarity.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['admin', 'jefe_operaciones']
        )


class IsFinanzas(permissions.BasePermission):
    """
    Permission check for finanzas role.
    Legacy class - kept for backward compatibility.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['admin', 'jefe_operaciones', 'finanzas']
        )


class IsOperativo(permissions.BasePermission):
    """
    Permission check for operativo role (any authenticated user).

    Used for:
    - Viewing OTs, Invoices, Clients, Disputes
    - Downloading files
    - Exporting to Excel
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


class RoleRequired(permissions.BasePermission):
    """
    Custom permission to check if user has required role.

    Usage in views:
        permission_classes = [RoleRequired]
        required_roles = ['admin', 'jefe_operaciones']
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        required_roles = getattr(view, 'required_roles', None)
        if required_roles is None:
            return True

        return request.user.role in required_roles


class ReadOnly(permissions.BasePermission):
    """
    Permission that only allows read operations (GET, HEAD, OPTIONS).
    """
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS


class CanImportData(permissions.BasePermission):
    """
    Permission for importing data (OTs, Invoices, Reports).
    Only Admin and Jefe de Operaciones can import.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['admin', 'jefe_operaciones']
        )


class CanEditFinancialStatus(permissions.BasePermission):
    """
    Permission for editing financial status of documents.
    Only Admin and Finanzas can edit payment_status, provisioned, invoiced fields.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['admin', 'finanzas']
        )
