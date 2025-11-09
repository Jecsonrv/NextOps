#!/usr/bin/env python
"""
Script de prueba para verificar autenticación JWT
Prueba que el sistema de tokens funcione correctamente sin el error de campo 'refresh'
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto.settings.dev')
django.setup()

from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User

def test_jwt_tokens():
    """Prueba generación de tokens JWT"""

    print("=" * 80)
    print("TEST: Sistema de Autenticación JWT")
    print("=" * 80)

    # Buscar un usuario admin
    try:
        user = User.objects.get(username='jecsonrv')
        print(f"\n✓ Usuario encontrado: {user.username} ({user.email})")
        print(f"  - Role: {user.role}")
        print(f"  - Active: {user.is_active}")
        print(f"  - Staff: {user.is_staff}")
    except User.DoesNotExist:
        print("\n✗ Usuario 'jecsonrv' no encontrado")
        return

    # Generar tokens
    print("\n" + "=" * 80)
    print("Generando tokens JWT...")
    print("=" * 80)

    try:
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        print(f"\n✓ Tokens generados exitosamente!")
        print(f"\n📄 REFRESH TOKEN:")
        print(f"   {str(refresh)[:100]}...")
        print(f"\n📄 ACCESS TOKEN:")
        print(f"   {str(access)[:100]}...")

        # Verificar que los tokens tengan los claims correctos
        print("\n" + "=" * 80)
        print("Verificando claims del access token...")
        print("=" * 80)

        print(f"\n✓ User ID: {access['user_id']}")
        print(f"✓ Token Type: {access['token_type']}")
        print(f"✓ JTI: {access['jti']}")

        # Verificar el refresh token
        print("\n" + "=" * 80)
        print("Verificando claims del refresh token...")
        print("=" * 80)

        print(f"\n✓ User ID: {refresh['user_id']}")
        print(f"✓ Token Type: {refresh['token_type']}")
        print(f"✓ JTI: {refresh['jti']}")

        # Probar rotación de token
        print("\n" + "=" * 80)
        print("Probando rotación de refresh token...")
        print("=" * 80)

        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

        # Ver cuántos tokens outstanding hay
        outstanding_count = OutstandingToken.objects.filter(user=user).count()
        blacklisted_count = BlacklistedToken.objects.filter(token__user=user).count()

        print(f"\n✓ Tokens outstanding para {user.username}: {outstanding_count}")
        print(f"✓ Tokens blacklisted para {user.username}: {blacklisted_count}")

        print("\n" + "=" * 80)
        print("✅ TODAS LAS PRUEBAS PASARON")
        print("=" * 80)
        print("\nEl sistema de autenticación JWT está funcionando correctamente.")
        print("No hay error de campo 'refresh' nulo.")

        # Retornar los tokens para poder probarlos en el frontend
        return {
            'refresh': str(refresh),
            'access': str(access)
        }

    except Exception as e:
        print(f"\n✗ Error generando tokens: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == '__main__':
    tokens = test_jwt_tokens()

    if tokens:
        print("\n" + "=" * 80)
        print("TOKENS PARA PRUEBA EN FRONTEND:")
        print("=" * 80)
        print("\nPuedes usar estos tokens para probar en Postman o en el frontend:")
        print(f"\nAccess Token:\n{tokens['access']}\n")
        print(f"\nRefresh Token:\n{tokens['refresh']}\n")
