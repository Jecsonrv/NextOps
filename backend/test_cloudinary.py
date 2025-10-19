#!/usr/bin/env python
"""
Test script for Cloudinary configuration.
Run this to verify that Cloudinary is properly configured and working.

Usage:
    python test_cloudinary.py
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto.settings.dev')
django.setup()

from django.conf import settings
import cloudinary
import cloudinary.uploader
import cloudinary.api
from io import BytesIO


def test_cloudinary_config():
    """Test Cloudinary configuration"""
    print("=" * 60)
    print("CLOUDINARY CONFIGURATION TEST")
    print("=" * 60)

    print(f"\n✓ USE_CLOUDINARY: {settings.USE_CLOUDINARY}")
    print(f"✓ CLOUD_NAME: {settings.CLOUDINARY_STORAGE.get('CLOUD_NAME')}")
    print(f"✓ API_KEY: {settings.CLOUDINARY_STORAGE.get('API_KEY')[:10]}...")

    # Test cloudinary config
    config = cloudinary.config()
    print(f"\n✓ Cloudinary SDK Config:")
    print(f"  - cloud_name: {config.cloud_name}")
    print(f"  - api_key: {config.api_key[:10]}...")
    print(f"  - secure: {config.secure}")


def test_cloudinary_upload():
    """Test Cloudinary upload functionality"""
    print("\n" + "=" * 60)
    print("CLOUDINARY UPLOAD TEST")
    print("=" * 60)

    # Create a simple test PDF
    test_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n%%EOF"
    test_file = BytesIO(test_content)
    test_file.name = "test_invoice.pdf"

    try:
        print("\n→ Uploading test PDF to Cloudinary...")

        upload_result = cloudinary.uploader.upload(
            test_file,
            folder="invoices",
            public_id="test_upload",
            resource_type='raw',
            unique_filename=True,
            timeout=60
        )

        print(f"✓ Upload successful!")
        print(f"  - Public ID: {upload_result['public_id']}")
        print(f"  - URL: {upload_result['secure_url']}")
        print(f"  - Format: {upload_result.get('format')}")
        print(f"  - Bytes: {upload_result.get('bytes')}")

        # Generate URL using cloudinary.utils
        url, _ = cloudinary.utils.cloudinary_url(
            upload_result['public_id'],
            resource_type='raw',
            secure=True
        )
        print(f"\n✓ Generated URL: {url}")

        # Clean up - delete test file
        print(f"\n→ Cleaning up test file...")
        cloudinary.uploader.destroy(upload_result['public_id'], resource_type='raw')
        print(f"✓ Test file deleted")

        return True

    except Exception as e:
        print(f"\n✗ Upload failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_storage_backend():
    """Test the custom storage backend"""
    print("\n" + "=" * 60)
    print("STORAGE BACKEND TEST")
    print("=" * 60)

    from django.core.files.storage import storages
    from django.core.files.base import ContentFile

    storage = storages['default']
    print(f"\n✓ Storage backend: {storage.__class__.__name__}")
    print(f"✓ Using Cloudinary: {getattr(storage, 'use_cloudinary', False)}")

    # Test file save
    test_content = b"Test content for storage backend"
    test_file = ContentFile(test_content)

    try:
        print("\n→ Testing storage.save()...")
        path = storage.save('test/backend_test.txt', test_file)
        print(f"✓ File saved: {path}")

        # Test URL generation
        print("\n→ Testing storage.url()...")
        url = storage.url(path)
        print(f"✓ URL generated: {url}")

        # Test delete
        print("\n→ Testing storage.delete()...")
        storage.delete(path)
        print(f"✓ File deleted")

        return True

    except Exception as e:
        print(f"\n✗ Storage test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("NEXTOPS CLOUDINARY DIAGNOSTICS")
    print("=" * 60)

    results = []

    # Test 1: Configuration
    try:
        test_cloudinary_config()
        results.append(("Configuration", True))
    except Exception as e:
        print(f"\n✗ Configuration test failed: {e}")
        results.append(("Configuration", False))

    # Test 2: Upload
    if settings.USE_CLOUDINARY:
        success = test_cloudinary_upload()
        results.append(("Upload", success))
    else:
        print("\n⚠ Skipping upload test (USE_CLOUDINARY=False)")
        results.append(("Upload", None))

    # Test 3: Storage Backend
    try:
        success = test_storage_backend()
        results.append(("Storage Backend", success))
    except Exception as e:
        print(f"\n✗ Storage backend test failed: {e}")
        results.append(("Storage Backend", False))

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    for test_name, status in results:
        if status is True:
            print(f"✓ {test_name}: PASSED")
        elif status is False:
            print(f"✗ {test_name}: FAILED")
        else:
            print(f"⚠ {test_name}: SKIPPED")

    all_passed = all(s in [True, None] for _, s in results)

    if all_passed:
        print("\n✓ All tests passed! Cloudinary is configured correctly.")
        return 0
    else:
        print("\n✗ Some tests failed. Please check the configuration.")
        return 1


if __name__ == '__main__':
    sys.exit(main())
