"""
Custom permissions for NextOps project.
"""
from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Permission check for admin role.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsJefeOperaciones(permissions.BasePermission):
    """
    Permission check for jefe_operaciones role.
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
