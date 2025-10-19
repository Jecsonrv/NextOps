"""
Custom storage backends for NextOps
"""
from django.core.files.storage import FileSystemStorage
from django.conf import settings
import cloudinary
import cloudinary.uploader
import cloudinary.api
import os


class CloudinaryMediaStorage(FileSystemStorage):
    """
    Custom storage backend que usa Cloudinary cuando USE_CLOUDINARY=True,
    y FileSystemStorage en desarrollo.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.use_cloudinary = getattr(settings, 'USE_CLOUDINARY', False)

    def _save(self, name, content):
        """
        Save file to Cloudinary or local filesystem depending on USE_CLOUDINARY
        """
        if not self.use_cloudinary:
            return super()._save(name, content)

        # Upload to Cloudinary
        try:
            # Reset file pointer
            content.seek(0)

            # Extract folder and filename
            folder = os.path.dirname(name)
            filename = os.path.basename(name)

            # Sanitize filename - remove special characters but keep extension
            import re
            base_name, ext = os.path.splitext(filename)
            # Remove special chars, keep alphanumeric, hyphens, underscores
            sanitized_base = re.sub(r'[^a-zA-Z0-9_-]', '_', base_name)

            # Upload directly from file object (streaming, no memory read)
            upload_result = cloudinary.uploader.upload(
                content,  # Pass file object directly, not .read()
                folder=folder,
                public_id=sanitized_base,
                resource_type='raw',  # Force raw for PDFs
                use_filename=False,
                unique_filename=True,
                timeout=120,  # 2 minute timeout
                chunk_size=6000000  # 6MB chunks for large files
            )

            # Return the full path including extension
            public_id = upload_result['public_id']
            if not public_id.endswith(ext):
                return f"{public_id}{ext}"
            return public_id

        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            raise IOError(f"Error uploading to Cloudinary: {e}\n{error_detail}")

    def _open(self, name, mode='rb'):
        """
        Open file from Cloudinary or local filesystem.

        NOTE: For Cloudinary files, this should NOT be used.
        Instead, use url() and redirect directly to Cloudinary.
        This method is only for backward compatibility.
        """
        if not self.use_cloudinary:
            return super()._open(name, mode)

        # For Cloudinary, we don't support opening files
        # The views should redirect to url() instead
        raise NotImplementedError(
            "Cannot open Cloudinary files directly. "
            "Use storage.url() and redirect to the URL instead."
        )

    def exists(self, name):
        """
        Check if file exists in Cloudinary or local filesystem
        """
        if not self.use_cloudinary:
            return super().exists(name)

        # For Cloudinary, if we have a name/path, assume it exists
        # Checking via API is expensive and unnecessary
        # Files are immutable once uploaded
        return bool(name)

    def url(self, name):
        """
        Get URL for file from Cloudinary or local filesystem
        """
        if not self.use_cloudinary:
            return super().url(name)

        # Generate Cloudinary URL
        try:
            # Remove extension for public_id if it exists
            base_name = name
            ext = os.path.splitext(name)[1].lower()

            # Remove extension from name for Cloudinary public_id
            if ext:
                base_name = name[:-len(ext)]

            # Determine resource type based on extension
            if ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff']:
                resource_type = 'image'
            elif ext in ['.mp4', '.avi', '.mov', '.webm', '.flv']:
                resource_type = 'video'
            else:
                resource_type = 'raw'

            # For raw files (PDFs, etc), include the extension
            if resource_type == 'raw':
                public_id = name  # Keep full name with extension
            else:
                public_id = base_name

            url, options = cloudinary.utils.cloudinary_url(
                public_id,
                resource_type=resource_type,
                secure=True
            )
            return url
        except Exception as e:
            # Fallback to a basic URL construction
            cloud_name = settings.CLOUDINARY_STORAGE.get('CLOUD_NAME')
            return f"https://res.cloudinary.com/{cloud_name}/raw/upload/{name}"

    def delete(self, name):
        """
        Delete file from Cloudinary or local filesystem
        """
        if not self.use_cloudinary:
            return super().delete(name)

        try:
            cloudinary.uploader.destroy(name, resource_type='raw')
        except Exception:
            pass  # If deletion fails, ignore it

    def size(self, name):
        """
        Get file size from Cloudinary or local filesystem
        """
        if not self.use_cloudinary:
            return super().size(name)

        try:
            resource = cloudinary.api.resource(name, resource_type='raw')
            return resource.get('bytes', 0)
        except Exception:
            return 0
