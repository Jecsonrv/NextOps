"""
Cloudinary file download utilities for NextOps.

Centralizes the Cloudinary signed-URL download logic that was previously
duplicated across 6+ viewsets (invoices, sales, supplier_payments, etc.).
"""
import logging
import os

logger = logging.getLogger(__name__)


def download_from_cloudinary(storage_path: str) -> bytes:
    """
    Download a raw file from Cloudinary using signed URLs.

    Tries multiple public_id candidates (with/without extension) and
    both 'authenticated' and 'upload' resource types.

    Args:
        storage_path: The Cloudinary public_id / path stored in the model field.

    Returns:
        File content as bytes.

    Raises:
        FileNotFoundError: If the file was not found (404) in Cloudinary.
        IOError: If the download failed for other reasons.
        TimeoutError: If all download attempts timed out.
    """
    import cloudinary.utils
    import requests

    base_name, ext = os.path.splitext(storage_path)
    ext_clean = ext.lstrip('.')

    # Build candidate public_ids — without extension first (correct for raw files),
    # then with extension as fallback for legacy uploads.
    candidates = []
    if ext:
        candidates.append(base_name)
    candidates.append(storage_path)

    # Deduplicate preserving order
    unique_candidates = list(dict.fromkeys(c for c in candidates if c))

    last_status = None
    last_timeout = False

    for public_id in unique_candidates:
        for cloudinary_type in ('authenticated', 'upload'):
            # 1. Generate signed URL
            try:
                options = {
                    'resource_type': 'raw',
                    'type': cloudinary_type,
                    'secure': True,
                    'sign_url': True,
                }
                if ext_clean and not public_id.lower().endswith(f".{ext_clean.lower()}"):
                    options['format'] = ext_clean

                download_url, _ = cloudinary.utils.cloudinary_url(public_id, **options)
                logger.debug(f"Signed URL ({cloudinary_type}): {download_url[:100]}...")
            except Exception as url_error:
                logger.error(f"Error generating signed URL ({cloudinary_type}): {url_error}")
                continue

            # 2. Download
            try:
                response = requests.get(download_url, timeout=30)
            except requests.exceptions.Timeout:
                logger.error(f"Timeout downloading from Cloudinary: {public_id}")
                last_timeout = True
                continue
            except requests.exceptions.RequestException as exc:
                logger.error(f"Network error downloading from Cloudinary: {exc}")
                continue

            if response.status_code == 200:
                logger.info(f"Downloaded {len(response.content)} bytes from Cloudinary")
                return response.content

            last_status = response.status_code
            logger.warning(f"Cloudinary {response.status_code} for {public_id} ({cloudinary_type})")

    # All attempts failed
    if last_status == 404:
        raise FileNotFoundError(f"File not found in Cloudinary: {storage_path}")
    if last_timeout and last_status is None:
        raise TimeoutError(f"All Cloudinary download attempts timed out: {storage_path}")
    raise IOError(f"Cloudinary download failed (last status: {last_status}) for: {storage_path}")
