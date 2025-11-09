#!/usr/bin/env python
"""
Script para probar el endpoint de login /api/token/
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto.settings.dev')
django.setup()

from django.test import RequestFactory
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.test import APIRequestFactory
from accounts.models import User
import json

def test_login_endpoint():
    """Prueba el endpoint de login"""

    print("=" * 80)
    print("TEST: Endpoint de Login /api/token/")
    print("=" * 80)

    # Crear un request factory
    factory = APIRequestFactory()

    # Credenciales de prueba
    credentials = {
        'username': 'jecsonrv',
        'password': 'admin123'  # Ajusta esto a la contraseña real
    }

    print(f"\n📝 Probando login con usuario: {credentials['username']}")
    print("⚠️  NOTA: Asegúrate de que la contraseña sea correcta")

    # Verificar que el usuario existe
    try:
        user = User.objects.get(username=credentials['username'])
        print(f"✓ Usuario encontrado: {user.username} ({user.email})")
        print(f"  - Role: {user.role}")
        print(f"  - Is Active: {user.is_active}")
    except User.DoesNotExist:
        print(f"✗ Usuario {credentials['username']} no encontrado")
        return

    # Crear request POST
    request = factory.post(
        '/api/token/',
        data=credentials,
        format='json'
    )

    # Llamar a la vista
    view = TokenObtainPairView.as_view()

    print("\n" + "=" * 80)
    print("Ejecutando POST /api/token/...")
    print("=" * 80)

    try:
        response = view(request)

        print(f"\n✓ Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.data
            print("\n✅ LOGIN EXITOSO!")
            print("\n📄 Respuesta:")
            print(f"   - access: {str(data.get('access', 'N/A'))[:100]}...")
            print(f"   - refresh: {str(data.get('refresh', 'N/A'))[:100]}...")

            # Verificar que ambos tokens existan
            if 'access' in data and 'refresh' in data:
                print("\n✅ Ambos tokens presentes (access y refresh)")
                print("✅ NO hay error de campo 'refresh' nulo")

                # Verificar longitud de tokens
                print(f"\n📊 Métricas:")
                print(f"   - Longitud access token: {len(data['access'])} caracteres")
                print(f"   - Longitud refresh token: {len(data['refresh'])} caracteres")

                return True
            else:
                print("\n✗ Error: Faltan tokens en la respuesta")
                print(f"   Keys presentes: {list(data.keys())}")
                return False
        else:
            print(f"\n✗ LOGIN FALLÓ con status {response.status_code}")
            print(f"   Respuesta: {response.data}")
            print("\n⚠️  Esto puede ser porque la contraseña es incorrecta.")
            print("   Puedes cambiar la contraseña del usuario con:")
            print(f"   docker exec nextops_backend python manage.py changepassword {credentials['username']}")
            return False

    except Exception as e:
        print(f"\n✗ Error ejecutando login: {e}")
        import traceback
        traceback.print_exc()
        return False

def show_all_users():
    """Muestra todos los usuarios disponibles"""
    print("\n" + "=" * 80)
    print("USUARIOS DISPONIBLES EN EL SISTEMA:")
    print("=" * 80)

    users = User.objects.all()
    for user in users:
        print(f"\n👤 {user.username}")
        print(f"   Email: {user.email}")
        print(f"   Role: {user.role}")
        print(f"   Active: {user.is_active}")
        print(f"   Has usable password: {user.has_usable_password()}")

if __name__ == '__main__':
    show_all_users()
    print("\n")
    result = test_login_endpoint()

    if result:
        print("\n" + "=" * 80)
        print("✅ ENDPOINT DE LOGIN FUNCIONA CORRECTAMENTE")
        print("=" * 80)
        print("\nEl problema del campo 'refresh' nulo está RESUELTO.")
    else:
        print("\n" + "=" * 80)
        print("⚠️  POSIBLE PROBLEMA CON CREDENCIALES")
        print("=" * 80)
        print("\nSi necesitas resetear la contraseña, ejecuta:")
        print("docker exec -it nextops_backend python manage.py changepassword jecsonrv")
