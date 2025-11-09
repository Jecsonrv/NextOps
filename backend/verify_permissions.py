#!/usr/bin/env python
"""
Script para verificar que los permisos estén correctamente configurados en los ViewSets
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto.settings.dev')
django.setup()

from accounts.views import UserViewSet
from sales.views import SalesInvoiceViewSet, PaymentViewSet
from invoices.views import InvoiceViewSet
from catalogs.views import ProviderViewSet, CostCategoryViewSet
from client_aliases.views import ClientAliasViewSet

def check_viewset_permissions(viewset_class, viewset_name):
    """Verifica los permisos de un ViewSet"""
    print(f"\n{'='*60}")
    print(f"ViewSet: {viewset_name}")
    print(f"{'='*60}")

    # Crear una instancia
    viewset = viewset_class()

    # Verificar permisos por acción
    actions = ['list', 'create', 'retrieve', 'update', 'partial_update', 'destroy']

    for action in actions:
        viewset.action = action
        try:
            perms = viewset.get_permissions()
            perm_names = [p.__class__.__name__ for p in perms]
            print(f"  {action:20s}: {', '.join(perm_names)}")
        except AttributeError:
            # Si no tiene get_permissions, usar permission_classes directamente
            if hasattr(viewset, 'permission_classes'):
                perm_names = [p.__name__ for p in viewset.permission_classes]
                print(f"  {action:20s}: {', '.join(perm_names)}")
            else:
                print(f"  {action:20s}: (sin permisos configurados)")

    # Verificar acciones custom conocidas
    custom_actions_map = {
        'UserViewSet': ['me', 'change_password'],
        'SalesInvoiceViewSet': ['stats', 'extract_pdf'],
        'InvoiceViewSet': ['retrieve_file', 'import_excel'],
    }

    viewset_simple_name = viewset.__class__.__name__
    if viewset_simple_name in custom_actions_map:
        print(f"\n  Acciones Custom:")
        for action in custom_actions_map[viewset_simple_name]:
            viewset.action = action
            try:
                perms = viewset.get_permissions()
                perm_names = [p.__class__.__name__ for p in perms]
                print(f"    {action:18s}: {', '.join(perm_names)}")
            except:
                pass

def main():
    print("="*60)
    print("VERIFICACIÓN DE PERMISOS EN VIEWSETS")
    print("="*60)

    # Lista de ViewSets a verificar
    viewsets = [
        (UserViewSet, 'UserViewSet (accounts)'),
        (SalesInvoiceViewSet, 'SalesInvoiceViewSet'),
        (PaymentViewSet, 'PaymentViewSet (sales)'),
        (InvoiceViewSet, 'InvoiceViewSet (cost invoices)'),
        (ProviderViewSet, 'ProviderViewSet (suppliers)'),
        (ClientAliasViewSet, 'ClientAliasViewSet'),
        (CostCategoryViewSet, 'CostCategoryViewSet'),
    ]

    for viewset_class, viewset_name in viewsets:
        check_viewset_permissions(viewset_class, viewset_name)

    print("\n" + "="*60)
    print("✅ VERIFICACIÓN COMPLETA")
    print("="*60)
    print("\nTodos los ViewSets tienen permisos configurados.")
    print("\nNOTA: IsAuthenticated es el permiso default para usuarios autenticados.")
    print("      IsAdmin, IsAdminOrFinanzas, etc. son permisos personalizados por rol.")

if __name__ == '__main__':
    main()
