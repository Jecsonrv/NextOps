#!/usr/bin/env python
"""
Migrar archivos existentes en Cloudinary de type='upload' a type='authenticated'
"""
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', '')

import cloudinary
import cloudinary.api
import cloudinary.uploader

cloudinary.config(
    cloud_name="dackhl30s",
    api_key="283423631597279",
    api_secret="AsR54uSB8up4QNSwb7gCeItoACw",
    secure=True
)

def migrate_to_authenticated():
    """
    Cambia todos los archivos de invoices/ de type='upload' a type='authenticated'
    """
    print("=" * 60)
    print("MIGRAR ARCHIVOS A TYPE='AUTHENTICATED'")
    print("=" * 60)

    try:
        # Listar recursos en invoices/ con type='upload'
        print("\n→ Listando archivos type='upload' en invoices/...")

        result = cloudinary.api.resources(
            type='upload',
            resource_type='raw',
            prefix='invoices/',
            max_results=500
        )

        resources = result.get('resources', [])
        print(f"✓ Encontrados {len(resources)} archivos type='upload'")

        if len(resources) == 0:
            print("\n⚠ No hay archivos para migrar")
            return True

        # Migrar cada archivo
        print("\n→ Migrando archivos a type='authenticated'...")
        migrated = 0
        errors = 0

        for resource in resources:
            public_id = resource['public_id']

            try:
                # Usar explicit() para cambiar el tipo
                result = cloudinary.uploader.explicit(
                    public_id,
                    type='authenticated',
                    resource_type='raw',
                )
                print(f"  ✓ {public_id}")
                migrated += 1
            except Exception as e:
                print(f"  ✗ {public_id}: {e}")
                errors += 1

        # Resumen
        print("\n" + "=" * 60)
        print("RESUMEN")
        print("=" * 60)
        print(f"Total: {len(resources)}")
        print(f"✓ Migrados: {migrated}")
        print(f"✗ Errores: {errors}")

        if errors == 0:
            print("\n✅ Todos los archivos migrados a type='authenticated'")
            return True
        else:
            print(f"\n⚠ {errors} archivos tuvieron errores")
            return False

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_authenticated_access():
    """
    Probar acceso a un archivo con type='authenticated'
    """
    print("\n" + "=" * 60)
    print("TEST DE ACCESO AUTHENTICATED")
    print("=" * 60)

    try:
        # Listar archivos type='authenticated'
        result = cloudinary.api.resources(
            type='authenticated',
            resource_type='raw',
            prefix='invoices/',
            max_results=1
        )

        resources = result.get('resources', [])
        if not resources:
            print("⚠ No hay archivos type='authenticated' para probar")
            return False

        resource = resources[0]
        public_id = resource['public_id']

        print(f"\n→ Probando acceso a: {public_id}")

        # Generar URL privada
        download_url = cloudinary.utils.private_download_url(
            public_id,
            format=None,
            resource_type='raw',
            type='authenticated',
            attachment=False,
        )

        print(f"  URL: {download_url[:80]}...")

        # Intentar descargar
        import urllib.request
        response = urllib.request.urlopen(download_url)
        status = response.getcode()

        if status == 200:
            content = response.read(100)
            print(f"\n✅ Acceso OK!")
            print(f"   Status: {status}")
            print(f"   Size: {len(content)} bytes (primeros 100)")
            if content.startswith(b'%PDF'):
                print(f"   ✓ Es un PDF válido")
            return True
        else:
            print(f"\n⚠ Status: {status}")
            return False

    except urllib.error.HTTPError as e:
        print(f"\n✗ Error HTTP: {e.code}")
        if e.code == 404:
            print("  Archivo no encontrado")
        elif e.code == 401:
            print("  Problema de autenticación")
        return False
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False


def main():
    """Ejecutar migración y test"""
    print("\n" + "=" * 60)
    print("CLOUDINARY MIGRATION TO AUTHENTICATED")
    print("Cloud: dackhl30s")
    print("=" * 60)

    # Migrar
    migrate_success = migrate_to_authenticated()

    # Test
    test_success = test_authenticated_access()

    # Resultado final
    print("\n" + "=" * 60)
    if migrate_success and test_success:
        print("✅ MIGRACIÓN COMPLETA - Archivos ahora accesibles")
        return 0
    elif migrate_success:
        print("⚠ Migración OK pero test falló - verificar credenciales")
        return 1
    else:
        print("❌ Migración falló - revisar logs")
        return 1


if __name__ == '__main__':
    sys.exit(main())
