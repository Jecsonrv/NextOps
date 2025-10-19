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
            # Read file content
            content.seek(0)
            file_content = content.read()

            # Extract folder and filename
            folder = os.path.dirname(name)
            filename = os.path.basename(name)

            # Upload to Cloudinary
            upload_result = cloudinary.uploader.upload(
                file_content,
                folder=folder,
                public_id=os.path.splitext(filename)[0],
                resource_type='auto',
                use_filename=True,
                unique_filename=True
            )

            # Return the Cloudinary public_id as the "name"
            # Format: folder/public_id.extension
            return upload_result['public_id']

        except Exception as e:
            raise IOError(f"Error uploading to Cloudinary: {e}")

    def _open(self, name, mode='rb'):
        """
        Open file from Cloudinary or local filesystem
        """
        if not self.use_cloudinary:
            return super()._open(name, mode)

        # For Cloudinary, we don't support direct file opening
        # The file should be accessed via URL
        raise NotImplementedError("Direct file opening not supported with Cloudinary. Use url() method instead.")

    def exists(self, name):
        """
        Check if file exists in Cloudinary or local filesystem
        """
        if not self.use_cloudinary:
            return super().exists(name)

        try:
            # Try to get resource info from Cloudinary
            cloudinary.api.resource(name, resource_type='raw')
            return True
        except cloudinary.api.NotFound:
            return False
        except Exception:
            # If we can't check, assume it doesn't exist
            return False

    def url(self, name):
        """
        Get URL for file from Cloudinary or local filesystem
        """
        if not self.use_cloudinary:
            return super().url(name)

        # Generate Cloudinary URL
        try:
            # Determine resource type based on extension
            ext = os.path.splitext(name)[1].lower()
            if ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
                resource_type = 'image'
            elif ext in ['.mp4', '.avi', '.mov', '.webm']:
                resource_type = 'video'
            else:
                resource_type = 'raw'

            url, options = cloudinary.utils.cloudinary_url(
                name,
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
