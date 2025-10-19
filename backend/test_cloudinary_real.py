#!/usr/bin/env python
"""
Test real de Cloudinary con las credenciales de producción.
Este script prueba la conexión DIRECTAMENTE sin Django.

Cloud name: dackhl30s
API key: 283423631597279
"""
import os
import sys

# Evitar import circular - NO importar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', '')

import cloudinary
import cloudinary.uploader
import cloudinary.api
from io import BytesIO

# Configurar Cloudinary directamente
cloudinary.config(
    cloud_name="dackhl30s",
    api_key="283423631597279",
    api_secret="AsR54uSB8up4QNSwb7gCeItoACw",
    secure=True
)

def test_connection():
    """Test de conexión a Cloudinary"""
    print("=" * 60)
    print("TEST DE CONEXIÓN CLOUDINARY")
    print("=" * 60)

    config = cloudinary.config()
    print(f"\n✓ Cloud name: {config.cloud_name}")
    print(f"✓ API key: {config.api_key[:10]}...")
    print(f"✓ Secure: {config.secure}")

    try:
        # Ping API
        print("\n→ Testing API connection...")
        result = cloudinary.api.ping()
        print(f"✓ API Response: {result.get('status')}")
        return True
    except Exception as e:
        print(f"✗ API Error: {e}")
        return False


def test_upload():
    """Test de upload de archivo"""
    print("\n" + "=" * 60)
    print("TEST DE UPLOAD")
    print("=" * 60)

    # Crear PDF de prueba mínimo válido
    test_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test Invoice) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
409
%%EOF"""

    test_file = BytesIO(test_content)
    test_file.name = "test_invoice.pdf"

    try:
        print("\n→ Uploading test PDF...")
        print(f"   File size: {len(test_content)} bytes")

        upload_result = cloudinary.uploader.upload(
            test_file,
            folder="invoices/test",
            public_id="nextops_test_upload",
            resource_type='raw',
            unique_filename=True,
            timeout=60,
            overwrite=True
        )

        print(f"\n✓ Upload successful!")
        print(f"  Public ID: {upload_result['public_id']}")
        print(f"  URL: {upload_result['secure_url']}")
        print(f"  Format: {upload_result.get('format', 'N/A')}")
        print(f"  Bytes: {upload_result.get('bytes', 0)}")
        print(f"  Created: {upload_result.get('created_at', 'N/A')}")

        # Generar URL usando cloudinary.utils
        url, _ = cloudinary.utils.cloudinary_url(
            upload_result['public_id'],
            resource_type='raw',
            secure=True
        )
        print(f"\n✓ Public URL: {url}")
        print(f"\n✅ Puedes verificar el archivo en:")
        print(f"   https://console.cloudinary.com/console/dackhl30s/media_library")

        # NO eliminar - dejar para verificación manual
        print(f"\n⚠ Archivo NO eliminado - verifica manualmente en Cloudinary Console")

        return True

    except Exception as e:
        print(f"\n✗ Upload failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Ejecutar todos los tests"""
    print("\n" + "=" * 60)
    print("CLOUDINARY PRODUCTION TEST")
    print("Cloud: dackhl30s")
    print("=" * 60)

    # Test 1: Conexión
    conn_success = test_connection()

    # Test 2: Upload
    upload_success = False
    if conn_success:
        upload_success = test_upload()
    else:
        print("\n⚠ Skipping upload test (connection failed)")

    # Resumen
    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)

    if conn_success:
        print("✓ Conexión: OK")
    else:
        print("✗ Conexión: FAILED")

    if upload_success:
        print("✓ Upload: OK")
        print("\n✅ TODO FUNCIONA CORRECTAMENTE!")
        print("   Cloudinary está configurado y listo para producción.")
        return 0
    else:
        if conn_success:
            print("✗ Upload: FAILED")
        else:
            print("⚠ Upload: SKIPPED")
        print("\n❌ Hay problemas con la configuración.")
        return 1


if __name__ == '__main__':
    import sys
    sys.exit(main())
