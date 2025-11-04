"""
Custom storage backends for NextOps.
Provides seamless integration with Cloudinary for production and local filesystem for development.
"""
from django.core.files.storage import FileSystemStorage
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
import os
import logging
from datetime import datetime, timedelta

try:
    import cloudinary
    import cloudinary.uploader
    import cloudinary.api
except ImportError:
    cloudinary = None

logger = logging.getLogger(__name__)


class CloudinaryMediaStorage(FileSystemStorage):
    """
    Hybrid storage backend that uses Cloudinary in production (USE_CLOUDINARY=True)
    and local filesystem in development.

    Key features:
    - Automatic fallback to filesystem when Cloudinary is disabled
    - Streaming uploads (no full file read into memory)
    - Proper error handling and logging
    - Sanitized filenames for Cloudinary compatibility
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.use_cloudinary = getattr(settings, 'USE_CLOUDINARY', False)

        if self.use_cloudinary:
            logger.info("CloudinaryMediaStorage initialized (USE_CLOUDINARY=True)")
        else:
            logger.info("CloudinaryMediaStorage initialized (USE_CLOUDINARY=False, using local filesystem)")

    def _save(self, name, content):
        """
        Save file to Cloudinary or local filesystem.

        Args:
            name (str): Desired filename/path
            content (File): Django File object

        Returns:
            str: Path where file was saved
        """
        # Use local filesystem if Cloudinary is disabled
        if not self.use_cloudinary:
            logger.debug(f"Saving to local filesystem: {name}")
            return super()._save(name, content)

        if cloudinary is None:
            raise ImproperlyConfigured("Cloudinary package is required when USE_CLOUDINARY=True")

        # Upload to Cloudinary
        try:
            # Ensure file pointer is at the beginning
            content.seek(0)

            # Extract folder and filename from path
            folder = os.path.dirname(name) or 'media'
            filename = os.path.basename(name)

            # Sanitize filename - Cloudinary doesn't like special characters
            base_name, ext = os.path.splitext(filename)
            # Keep only alphanumeric, hyphens, and underscores
            import re
            sanitized_base = re.sub(r'[^a-zA-Z0-9_-]', '_', base_name)

            # Cloudinary public_id (without extension for raw files)
            public_id = f"{folder}/{sanitized_base}"

            logger.info(f"Uploading to Cloudinary: {public_id} (original: {name})")

            # Upload file to Cloudinary (streaming, not reading full content)
            # CRITICAL: Use 'authenticated' type to bypass "untrusted customer" restrictions
            # This allows us to use private_download_url for secure access
            upload_result = cloudinary.uploader.upload(
                content,  # Pass file object directly for streaming
                folder=folder,
                public_id=sanitized_base,
                resource_type='raw',  # Use 'raw' for PDFs and non-image files
                use_filename=False,  # We control the filename via public_id
                unique_filename=True,  # Add hash to avoid collisions
                timeout=120,  # 2 minutes timeout
                chunk_size=6000000,  # 6MB chunks for efficient upload
                type='authenticated',  # Use authenticated type to bypass untrusted restrictions
            )

            # Get the public_id returned by Cloudinary
            # IMPORTANT: For 'raw' resources, Cloudinary returns public_id WITHOUT extension
            # We must use this exact public_id for future access
            cloudinary_path = upload_result['public_id']

            # DO NOT add extension back - use the public_id exactly as Cloudinary returns it
            # This ensures consistency between what's saved in DB and what exists in Cloudinary

            logger.info(f"✓ Upload successful: {cloudinary_path}")
            logger.info(f"  Cloudinary URL: {upload_result.get('secure_url', 'N/A')}")
            return cloudinary_path

        except Exception as e:
            # Log detailed error for debugging
            logger.error(f"✗ Cloudinary upload failed for {name}: {e}", exc_info=True)
            raise IOError(f"Error uploading to Cloudinary: {e}")

    def _open(self, name, mode='rb'):
        """
        Open file from storage.

        NOTE: For Cloudinary, files cannot be opened directly.
        Use url() and redirect instead.
        """
        if not self.use_cloudinary:
            return super()._open(name, mode)

        if cloudinary is None:
            raise ImproperlyConfigured("Cloudinary package is required when USE_CLOUDINARY=True")

        # Cloudinary files should be accessed via URL, not direct file access
        raise NotImplementedError(
            "Cannot open Cloudinary files directly. "
            "Use storage.url(name) and redirect to the URL instead."
        )

    def exists(self, name):
        """
        Check if file exists in storage.

        For Cloudinary: We assume files DON'T exist (always upload new).
        This prevents expensive API calls and avoids infinite loops in get_available_name().
        """
        if not self.use_cloudinary:
            return super().exists(name)

        # For Cloudinary, always return False to allow uploads
        # Cloudinary handles duplicates with unique_filename=True
        return False

    def get_available_name(self, name, max_length=None):
        """
        Override to skip the exists() loop for Cloudinary.
        Cloudinary handles unique filenames automatically.
        """
        if not self.use_cloudinary:
            return super().get_available_name(name, max_length)

        # For Cloudinary, return the name as-is
        # Cloudinary will add hash if unique_filename=True
        return name

    def url(self, name):
        """
        Get public URL for file.

        For Cloudinary raw files (PDFs), this returns a placeholder.
        Actual file access should use private_download_url in views.

        Args:
            name (str): File path/public_id (e.g., "invoices/20251019_123456_file")

        Returns:
            str: Placeholder URL (not directly accessible for raw files)
        """
        if not self.use_cloudinary:
            return super().url(name)

        if cloudinary is None:
            raise ImproperlyConfigured("Cloudinary package is required when USE_CLOUDINARY=True")

        try:
            from cloudinary.utils import private_download_url

            public_id = name.replace('\\', '/').rstrip('/')
            base_public_id, ext = os.path.splitext(public_id)
            fmt = ext.lstrip('.') if ext else None

            logger.info(f"Generando URL para: {name}, public_id: {public_id}, base: {base_public_id}, fmt: {fmt}")

            # Calcular timestamp de expiración (Unix timestamp)
            import time
            expires_at = int(time.time()) + 3600  # 1 hora desde ahora

            # Intentar generar URL firmada para archivos authenticated
            try:
                secure_url = private_download_url(
                    base_public_id if fmt else public_id,
                    format=fmt,
                    resource_type='raw',
                    type='authenticated',
                    expires_at=expires_at,
                )
                
                logger.info(f"✓ URL firmada generada exitosamente: {secure_url[:100]}...")
                return secure_url
                
            except Exception as auth_error:
                logger.warning(f"Falló URL authenticated para {name}: {auth_error}. Intentando con tipo 'upload'...")
                
                # Intentar con tipo 'upload' (archivos públicos)
                try:
                    secure_url = private_download_url(
                        base_public_id if fmt else public_id,
                        format=fmt,
                        resource_type='raw',
                        type='upload',
                        expires_at=expires_at,
                    )
                    
                    logger.info(f"✓ URL firmada tipo 'upload' generada: {secure_url[:100]}...")
                    return secure_url
                    
                except Exception as upload_error:
                    logger.warning(f"Falló URL tipo upload: {upload_error}")
                    raise upload_error
                    
        except Exception as e:
            # Si falla todo, generar URL pública como último recurso
            logger.warning(f"Todas las opciones fallaron para {name}: {e}. Generando URL pública simple.")
            
            cloud_name = settings.CLOUDINARY_STORAGE.get('CLOUD_NAME', 'unknown')
            public_id = name.replace('\\', '/').rstrip('/')
            
            # URL pública simple - funcionará si el archivo fue subido como público
            fallback_url = f"https://res.cloudinary.com/{cloud_name}/raw/upload/{public_id}"
            logger.info(f"URL pública fallback: {fallback_url}")
            return fallback_url

    def delete(self, name):
        """
        Delete file from storage.
        """
        if not self.use_cloudinary:
            return super().delete(name)

        if cloudinary is None:
            raise ImproperlyConfigured("Cloudinary package is required when USE_CLOUDINARY=True")

        try:
            logger.info(f"Deleting from Cloudinary: {name}")
            cloudinary.uploader.destroy(name, resource_type='raw')
        except Exception as e:
            logger.warning(f"Failed to delete {name} from Cloudinary: {e}")
            # Ignore deletion errors (file might already be deleted)

    def size(self, name):
        """
        Get file size in bytes.
        """
        if not self.use_cloudinary:
            return super().size(name)

        if cloudinary is None:
            raise ImproperlyConfigured("Cloudinary package is required when USE_CLOUDINARY=True")

        try:
            resource = cloudinary.api.resource(name, resource_type='raw')
            return resource.get('bytes', 0)
        except Exception:
            logger.warning(f"Could not get size for {name}")
            return 0
