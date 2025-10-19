#!/usr/bin/env python
"""
Test de URLs autenticadas de Cloudinary
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

# ID de archivo existente
public_id = "invoices/20251019_184641_SVIMC132034.pdf"

print("=" * 60)
print("TEST DE URL AUTENTICADA")
print("=" * 60)

# Generar URL autenticada
url, _ = cloudinary.utils.cloudinary_url(
    public_id,
    resource_type='raw',
    secure=True,
    type='authenticated',
    sign_url=True,
    format='pdf'
)

print(f"\nPublic ID: {public_id}")
print(f"URL autenticada: {url}")

# Probar acceso
print("\n→ Probando acceso...")
import urllib.request
try:
    response = urllib.request.urlopen(url)
    status = response.getcode()

    if status == 200:
        print(f"✅ Acceso OK (status: {status})")
        print(f"   Content-Type: {response.headers.get('Content-Type')}")
        print(f"   Content-Length: {response.headers.get('Content-Length')}")
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
