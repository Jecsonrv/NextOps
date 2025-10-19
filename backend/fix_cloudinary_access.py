#!/usr/bin/env python
"""
Script para hacer públicos todos los archivos existentes en Cloudinary.
Los archivos subidos antes del fix requieren ser actualizados.
"""
import os
import sys

# Evitar import circular
os.environ.setdefault('DJANGO_SETTINGS_MODULE', '')

import cloudinary
import cloudinary.api
import cloudinary.uploader

# Configurar Cloudinary
cloudinary.config(
    cloud_name="dackhl30s",
    api_key="283423631597279",
    api_secret="AsR54uSB8up4QNSwb7gCeItoACw",
    secure=True
)

def fix_cloudinary_access():
    """
    Actualiza todos los archivos en la carpeta invoices/ para que sean públicos.
    """
    print("=" * 60)
    print("FIX CLOUDINARY ACCESS")
    print("=" * 60)

    try:
        # Listar todos los recursos en la carpeta invoices
        print("\n→ Listando archivos en carpeta 'invoices/'...")

        result = cloudinary.api.resources(
            type='upload',
            resource_type='raw',
            prefix='invoices/',
            max_results=500
        )

        resources = result.get('resources', [])
        total = len(resources)

        print(f"✓ Encontrados {total} archivos")

        if total == 0:
            print("\n⚠ No hay archivos para actualizar")
            return True

        # Actualizar cada archivo
        print("\n→ Actualizando archivos a acceso público...")
        updated = 0
        errors = 0

        for resource in resources:
            public_id = resource['public_id']
            try:
                # Actualizar el archivo para hacerlo público
                cloudinary.uploader.explicit(
                    public_id,
                    resource_type='raw',
                    type='upload',
                    access_mode='public'
                )
                print(f"  ✓ {public_id}")
                updated += 1
            except Exception as e:
                print(f"  ✗ {public_id}: {e}")
                errors += 1

        # Resumen
        print("\n" + "=" * 60)
        print("RESUMEN")
        print("=" * 60)
        print(f"Total: {total}")
        print(f"✓ Actualizados: {updated}")
        print(f"✗ Errores: {errors}")

        if errors == 0:
            print("\n✅ Todos los archivos son ahora públicos!")
            return True
        else:
            print(f"\n⚠ {errors} archivos tuvieron errores")
            return False

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_public_access():
    """
    Prueba que un archivo sea accesible públicamente.
    """
    print("\n" + "=" * 60)
    print("TEST DE ACCESO PÚBLICO")
    print("=" * 60)

    try:
        # Listar el primer archivo
        result = cloudinary.api.resources(
            type='upload',
            resource_type='raw',
            prefix='invoices/',
            max_results=1
        )

        resources = result.get('resources', [])
        if not resources:
            print("⚠ No hay archivos para probar")
            return True

        resource = resources[0]
        public_id = resource['public_id']

        # Generar URL pública
        url = cloudinary.utils.cloudinary_url(
            public_id,
            resource_type='raw',
            secure=True,
            sign_url=False,
            type='upload'
        )[0]

        print(f"\n→ Probando acceso a:")
        print(f"  Public ID: {public_id}")
        print(f"  URL: {url}")

        # Intentar acceder
        import urllib.request
        try:
            response = urllib.request.urlopen(url)
            status = response.getcode()

            if status == 200:
                print(f"\n✅ Acceso público OK (status: {status})")
                return True
            else:
                print(f"\n⚠ Status: {status}")
                return False
        except urllib.error.HTTPError as e:
            print(f"\n✗ Error HTTP: {e.code}")
            if e.code == 401:
                print("  El archivo aún requiere autenticación")
            return False

    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False


def main():
    """Ejecutar fix y test"""
    print("\n" + "=" * 60)
    print("CLOUDINARY ACCESS FIX")
    print("Cloud: dackhl30s")
    print("=" * 60)

    # Fix access
    fix_success = fix_cloudinary_access()

    # Test access
    test_success = test_public_access()

    # Resultado final
    print("\n" + "=" * 60)
    if fix_success and test_success:
        print("✅ TODO OK - Archivos ahora son públicos")
        return 0
    else:
        print("❌ Hubo problemas - revisar logs arriba")
        return 1


if __name__ == '__main__':
    sys.exit(main())
