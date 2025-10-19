"""
Custom storage backends for NextOps.
Provides seamless integration with Cloudinary for production and local filesystem for development.
"""
from django.core.files.storage import FileSystemStorage
from django.conf import settings
import cloudinary
import cloudinary.uploader
import cloudinary.api
import os
import logging

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
            upload_result = cloudinary.uploader.upload(
                content,  # Pass file object directly for streaming
                folder=folder,
                public_id=sanitized_base,
                resource_type='raw',  # Use 'raw' for PDFs and non-image files
                use_filename=False,  # We control the filename via public_id
                unique_filename=True,  # Add hash to avoid collisions
                timeout=120,  # 2 minutes timeout
                chunk_size=6000000,  # 6MB chunks for efficient upload
            )

            # Get the public_id returned by Cloudinary
            cloudinary_path = upload_result['public_id']

            # Re-add extension if needed (Cloudinary strips it)
            if not cloudinary_path.endswith(ext) and ext:
                cloudinary_path = f"{cloudinary_path}{ext}"

            logger.info(f"✓ Upload successful: {cloudinary_path}")
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

        Args:
            name (str): File path/public_id

        Returns:
            str: Public URL for accessing the file
        """
        if not self.use_cloudinary:
            return super().url(name)

        # Generate Cloudinary URL
        try:
            # Detect resource type based on extension
            ext = os.path.splitext(name)[1].lower()

            # Determine resource type
            if ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']:
                resource_type = 'image'
            elif ext in ['.mp4', '.avi', '.mov', '.webm', '.mkv']:
                resource_type = 'video'
            else:
                resource_type = 'raw'  # PDFs, documents, etc.

            # For raw files, keep the full name with extension
            public_id = name

            # Generate secure URL
            url, _ = cloudinary.utils.cloudinary_url(
                public_id,
                resource_type=resource_type,
                secure=True,  # Always use HTTPS
            )

            logger.debug(f"Generated Cloudinary URL: {url}")
            return url

        except Exception as e:
            logger.error(f"Error generating Cloudinary URL for {name}: {e}")
            # Fallback URL construction
            cloud_name = settings.CLOUDINARY_STORAGE.get('CLOUD_NAME', 'unknown')
            return f"https://res.cloudinary.com/{cloud_name}/raw/upload/{name}"

    def delete(self, name):
        """
        Delete file from storage.
        """
        if not self.use_cloudinary:
            return super().delete(name)

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

        try:
            resource = cloudinary.api.resource(name, resource_type='raw')
            return resource.get('bytes', 0)
        except Exception:
            logger.warning(f"Could not get size for {name}")
            return 0
