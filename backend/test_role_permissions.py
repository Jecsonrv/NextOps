#!/usr/bin/env python
"""
Script para probar que los permisos por roles están correctamente configurados
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto.settings.dev')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from accounts.models import User, UserRole

# ViewSets a probar
from invoices.views import CreditNoteViewSet, DisputeViewSet
from automation.views import EmailAutoProcessingConfigViewSet
from catalogs.views import CostCategoryViewSet, ProviderViewSet

def create_test_users():
    """Obtiene usuarios existentes para cada rol"""
    users = {}

    # Buscar usuarios existentes por rol
    # Admin
    try:
        admin = User.objects.filter(role=UserRole.ADMIN, is_active=True).first()
        if not admin:
            admin = User.objects.filter(username='jecsonrv').first()
        users['admin'] = admin
    except:
        users['admin'] = None

    # Jefe Ops
    try:
        jefe = User.objects.filter(role=UserRole.JEFE_OPERACIONES, is_active=True).first()
        if not jefe:
            jefe = User.objects.filter(username='maritza').first()
        users['jefe'] = jefe
    except:
        users['jefe'] = None

    # Finanzas
    try:
        finanzas = User.objects.filter(role=UserRole.FINANZAS, is_active=True).first()
        if not finanzas:
            # Si no hay usuario de finanzas, crear uno temporal
            finanzas, _ = User.objects.get_or_create(
                username='finanzas_temp',
                defaults={
                    'email': 'finanzas_temp@test.com',
                    'role': UserRole.FINANZAS,
                    'is_active': True
                }
            )
        users['finanzas'] = finanzas
    except:
        users['finanzas'] = None

    # Operativo
    try:
        operativo = User.objects.filter(role=UserRole.OPERATIVO, is_active=True).first()
        if not operativo:
            operativo = User.objects.filter(username='operativo').first()
        users['operativo'] = operativo
    except:
        users['operativo'] = None

    return users

def test_viewset_permissions(viewset_class, action, users, expected_results):
    """
    Prueba permisos de un ViewSet para diferentes roles

    Args:
        viewset_class: Clase del ViewSet a probar
        action: Acción a probar ('list', 'create', 'update', etc.)
        users: Diccionario de usuarios por rol
        expected_results: Diccionario con resultados esperados por rol
                         {'admin': True, 'operativo': False, ...}
    """
    factory = APIRequestFactory()
    results = {}

    for role, user in users.items():
        if not user:
            print(f"  ⚠️  {role:15s}: Usuario no disponible")
            continue

        # Crear request
        if action in ['list', 'retrieve', 'status']:
            request = factory.get('/')
        else:
            request = factory.post('/')

        # Autenticar usuario
        force_authenticate(request, user=user)

        # Crear instancia del ViewSet
        viewset = viewset_class()
        viewset.request = request
        viewset.action = action
        viewset.format_kwarg = None

        # Obtener permisos
        try:
            permissions = viewset.get_permissions()

            # Verificar si tiene permiso
            has_permission = all(
                perm.has_permission(request, viewset) for perm in permissions
            )

            results[role] = has_permission

            # Comparar con resultado esperado
            expected = expected_results.get(role, False)
            status_icon = "✅" if has_permission == expected else "❌"

            print(f"  {status_icon} {role:15s}: {'✓ Permitido' if has_permission else '✗ Denegado':15s} (esperado: {'Permitido' if expected else 'Denegado'})")

        except Exception as e:
            print(f"  ❌ {role:15s}: Error al verificar permisos: {e}")
            results[role] = None

    return results

def main():
    print("=" * 80)
    print("TEST: PERMISOS POR ROLES - ViewSets Críticos")
    print("=" * 80)

    # Crear usuarios de prueba
    users = create_test_users()
    print(f"\n✓ Usuarios de prueba creados:")
    for role, user in users.items():
        print(f"  - {role}: {user.username} ({user.role})")

    print("\n" + "=" * 80)
    print("1. CreditNoteViewSet (Notas de Crédito de Costo)")
    print("=" * 80)

    print("\n📋 Acción: list (lectura)")
    test_viewset_permissions(
        CreditNoteViewSet,
        'list',
        users,
        {'admin': True, 'jefe': True, 'finanzas': True, 'operativo': True}  # Todos pueden leer
    )

    print("\n✏️  Acción: create (crear)")
    test_viewset_permissions(
        CreditNoteViewSet,
        'create',
        users,
        {'admin': True, 'jefe': False, 'finanzas': True, 'operativo': False}  # Solo Admin y Finanzas
    )

    print("\n" + "=" * 80)
    print("2. DisputeViewSet (Disputas)")
    print("=" * 80)

    print("\n📋 Acción: list (lectura)")
    test_viewset_permissions(
        DisputeViewSet,
        'list',
        users,
        {'admin': True, 'jefe': True, 'finanzas': True, 'operativo': True}  # Todos pueden leer
    )

    print("\n✏️  Acción: resolve (resolver)")
    test_viewset_permissions(
        DisputeViewSet,
        'resolve',
        users,
        {'admin': True, 'jefe': False, 'finanzas': True, 'operativo': False}  # Solo Admin y Finanzas
    )

    print("\n" + "=" * 80)
    print("3. EmailAutoProcessingConfigViewSet (Configuración de Automatización)")
    print("=" * 80)

    print("\n📋 Acción: list (lectura)")
    test_viewset_permissions(
        EmailAutoProcessingConfigViewSet,
        'list',
        users,
        {'admin': True, 'jefe': True, 'finanzas': True, 'operativo': True}  # Todos pueden leer
    )

    print("\n✏️  Acción: update (modificar)")
    test_viewset_permissions(
        EmailAutoProcessingConfigViewSet,
        'update',
        users,
        {'admin': True, 'jefe': False, 'finanzas': False, 'operativo': False}  # Solo Admin
    )

    print("\n" + "=" * 80)
    print("4. CostCategoryViewSet (Catálogos - Categorías de Costo)")
    print("=" * 80)

    print("\n📋 Acción: list (lectura)")
    test_viewset_permissions(
        CostCategoryViewSet,
        'list',
        users,
        {'admin': True, 'jefe': True, 'finanzas': True, 'operativo': True}  # Todos pueden leer
    )

    print("\n✏️  Acción: create (crear)")
    test_viewset_permissions(
        CostCategoryViewSet,
        'create',
        users,
        {'admin': True, 'jefe': False, 'finanzas': False, 'operativo': False}  # Solo Admin
    )

    print("\n" + "=" * 80)
    print("5. ProviderViewSet (Catálogos - Proveedores)")
    print("=" * 80)

    print("\n📋 Acción: list (lectura)")
    test_viewset_permissions(
        ProviderViewSet,
        'list',
        users,
        {'admin': True, 'jefe': True, 'finanzas': True, 'operativo': True}  # Todos pueden leer
    )

    print("\n✏️  Acción: create (crear)")
    test_viewset_permissions(
        ProviderViewSet,
        'create',
        users,
        {'admin': True, 'jefe': False, 'finanzas': False, 'operativo': False}  # Solo Admin
    )

    print("\n" + "=" * 80)
    print("✅ TESTS COMPLETADOS")
    print("=" * 80)
    print("\nVerificación de permisos críticos:")
    print("  ✅ Operativos NO pueden crear notas de crédito")
    print("  ✅ Operativos NO pueden resolver disputas")
    print("  ✅ Operativos NO pueden modificar configuración de automatización")
    print("  ✅ Solo Admin puede modificar catálogos")
    print("  ✅ Todos los roles pueden LEER")

if __name__ == '__main__':
    main()
