#!/usr/bin/env python
"""
Script para probar el comportamiento del endpoint de login con credenciales incorrectas
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto.settings.dev')
django.setup()

from rest_framework.test import APIRequestFactory
from rest_framework_simplejwt.views import TokenObtainPairView
import json

def test_login_with_wrong_credentials():
    """Prueba login con credenciales incorrectas"""

    print("=" * 80)
    print("TEST: Login con credenciales INCORRECTAS")
    print("=" * 80)

    factory = APIRequestFactory()

    # Credenciales INCORRECTAS
    wrong_credentials = {
        'username': 'jecsonrv',
        'password': 'wrongpassword123'  # Contraseña incorrecta
    }

    print(f"\n📝 Intentando login con:")
    print(f"   Username: {wrong_credentials['username']}")
    print(f"   Password: {wrong_credentials['password']} (INCORRECTA)")

    # Crear request POST
    request = factory.post(
        '/api/token/',
        data=wrong_credentials,
        format='json'
    )

    # Llamar a la vista
    view = TokenObtainPairView.as_view()

    print("\n" + "=" * 80)
    print("Ejecutando POST /api/token/...")
    print("=" * 80)

    try:
        response = view(request)
        response.render()  # Necesario para obtener response.content

        print(f"\n✓ Status Code: {response.status_code}")
        print(f"\n📄 Response Headers:")
        for header, value in response.items():
            print(f"   {header}: {value}")

        print(f"\n📄 Response Content:")
        try:
            content = json.loads(response.content.decode('utf-8'))
            print(json.dumps(content, indent=2))
        except:
            print(response.content.decode('utf-8'))

        if response.status_code == 401:
            print("\n✅ COMPORTAMIENTO CORRECTO: Login falló con 401")
            print("   El endpoint retorna error apropiado para credenciales incorrectas")
            return True
        elif response.status_code == 400:
            print("\n✅ COMPORTAMIENTO ESPERADO: Login falló con 400")
            print("   Verificando mensaje de error...")
            try:
                content = json.loads(response.content.decode('utf-8'))
                if 'refresh' in content and content['refresh'] is None:
                    print("\n❌ PROBLEMA ENCONTRADO: Campo 'refresh' es null en error")
                    print("   Esto NO debería ocurrir en un error de autenticación")
                    return False
                else:
                    print("   Mensaje de error apropiado")
                    return True
            except:
                pass
        else:
            print(f"\n⚠️  Status code inesperado: {response.status_code}")
            return False

    except Exception as e:
        print(f"\n✗ Error ejecutando login: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_login_with_nonexistent_user():
    """Prueba login con usuario que no existe"""

    print("\n\n" + "=" * 80)
    print("TEST: Login con usuario NO EXISTENTE")
    print("=" * 80)

    factory = APIRequestFactory()

    # Usuario que NO existe
    credentials = {
        'username': 'usuarioquenoexiste',
        'password': 'cualquierpassword'
    }

    print(f"\n📝 Intentando login con:")
    print(f"   Username: {credentials['username']} (NO EXISTE)")
    print(f"   Password: {credentials['password']}")

    request = factory.post(
        '/api/token/',
        data=credentials,
        format='json'
    )

    view = TokenObtainPairView.as_view()

    try:
        response = view(request)
        response.render()

        print(f"\n✓ Status Code: {response.status_code}")

        try:
            content = json.loads(response.content.decode('utf-8'))
            print(f"\n📄 Response Content:")
            print(json.dumps(content, indent=2))

            if 'refresh' in content and content['refresh'] is None:
                print("\n❌ PROBLEMA ENCONTRADO: Campo 'refresh' es null")
                return False
        except:
            pass

        return response.status_code in [400, 401]

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_login_with_missing_fields():
    """Prueba login sin campos requeridos"""

    print("\n\n" + "=" * 80)
    print("TEST: Login SIN campos requeridos")
    print("=" * 80)

    factory = APIRequestFactory()

    # Sin password
    credentials = {
        'username': 'jecsonrv'
        # password faltante
    }

    print(f"\n📝 Intentando login sin password")

    request = factory.post(
        '/api/token/',
        data=credentials,
        format='json'
    )

    view = TokenObtainPairView.as_view()

    try:
        response = view(request)
        response.render()

        print(f"\n✓ Status Code: {response.status_code}")

        try:
            content = json.loads(response.content.decode('utf-8'))
            print(f"\n📄 Response Content:")
            print(json.dumps(content, indent=2))

            if 'refresh' in content and content['refresh'] is None:
                print("\n❌ PROBLEMA ENCONTRADO: Campo 'refresh' es null")
                return False
        except:
            pass

        return response.status_code == 400

    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False

if __name__ == '__main__':
    print("="*80)
    print("SUITE DE TESTS: LOGIN CON ERRORES")
    print("="*80)

    results = []

    results.append(('Credenciales incorrectas', test_login_with_wrong_credentials()))
    results.append(('Usuario no existente', test_login_with_nonexistent_user()))
    results.append(('Campos faltantes', test_login_with_missing_fields()))

    print("\n\n" + "="*80)
    print("RESULTADOS FINALES")
    print("="*80)

    for test_name, passed in results:
        status_icon = "✅" if passed else "❌"
        print(f"{status_icon} {test_name}")

    if all(passed for _, passed in results):
        print("\n✅ Todos los tests pasaron - No se encontró el problema")
    else:
        print("\n❌ Se encontraron problemas con el manejo de errores")
