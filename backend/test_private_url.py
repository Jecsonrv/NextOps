#!/usr/bin/env python
"""
Test de private_download_url para archivos raw en Cloudinary
"""
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', '')

import cloudinary
import cloudinary.utils

cloudinary.config(
    cloud_name="dackhl30s",
    api_key="283423631597279",
    api_secret="AsR54uSB8up4QNSwb7gCeItoACw",
    secure=True
)

# ID de archivo existente (subido como type='authenticated')
public_id = "invoices/20251019_184641_SVIMC132034.pdf"

print("=" * 60)
print("TEST DE PRIVATE_DOWNLOAD_URL")
print("=" * 60)

# Generar URL privada
print(f"\nPublic ID: {public_id}")

try:
    url = cloudinary.utils.private_download_url(
        public_id,
        format=None,
        resource_type='raw',
        attachment=False,
    )

    print(f"URL privada: {url}")

    # Probar acceso
    print("\n→ Probando acceso...")
    import urllib.request
    try:
        response = urllib.request.urlopen(url)
        status = response.getcode()

        if status == 200:
            content_type = response.headers.get('Content-Type')
            content_length = response.headers.get('Content-Length')

            print(f"✅ Acceso OK!")
            print(f"   Status: {status}")
            print(f"   Content-Type: {content_type}")
            print(f"   Content-Length: {content_length} bytes")

            # Leer primeros 100 bytes para verificar que es un PDF
            data = response.read(100)
            if data.startswith(b'%PDF'):
                print(f"   ✓ Es un PDF válido")
            else:
                print(f"   ⚠ No parece ser un PDF")

        else:
            print(f"⚠ Status: {status}")
    except urllib.error.HTTPError as e:
        print(f"✗ Error HTTP: {e.code}")
        if e.code == 401:
            print("  El archivo requiere autenticación")
        elif e.code == 404:
            print("  El archivo no existe")
    except Exception as e:
        print(f"✗ Error: {e}")

except Exception as e:
    print(f"✗ Error generando URL: {e}")
    import traceback
    traceback.print_exc()
