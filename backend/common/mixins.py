"""
Custom mixins for NextOps project.

Mixins:
    - RoleBasedFieldValidationMixin: Validates editable fields based on user role
    - CloudinaryFileMixin: Reusable file-download action for Cloudinary-backed models
"""
import logging

from django.conf import settings
from django.http import FileResponse, HttpResponse
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from common.cloudinary_utils import download_from_cloudinary

logger = logging.getLogger(__name__)


class CloudinaryFileMixin:
    """
    Mixin that adds a ``retrieve_file`` DRF action to any ModelViewSet.

    It transparently serves the file from Cloudinary (signed-URL proxy)
    or from local storage depending on ``settings.USE_CLOUDINARY``.

    Usage::

        class SalesInvoiceViewSet(CloudinaryFileMixin, viewsets.ModelViewSet):
            cloudinary_file_field = 'archivo_pdf'

            def get_download_filename(self, obj):
                return f"factura_venta_{obj.numero_factura}.pdf"

    Configuration (set on the ViewSet subclass):

    * ``cloudinary_file_field`` — **required**, name of the FileField.
    * ``get_download_filename(obj)`` — override for a friendly download name.
    * ``get_file_content_type(obj)`` — override if the content type is not
      stored on the field itself (defaults to ``application/pdf``).
    """

    cloudinary_file_field: str = None  # MUST be set by subclass

    # ------------------------------------------------------------------
    # Hooks – override in subclass when needed
    # ------------------------------------------------------------------

    def get_download_filename(self, obj):
        """Return a human-friendly filename for the download."""
        field = getattr(obj, self.cloudinary_file_field)
        if hasattr(field, 'filename') and field.filename:
            return field.filename
        name = getattr(field, 'name', '') or ''
        return name.split('/')[-1] or 'download'

    def get_file_content_type(self, obj):
        """Return the MIME content type for the response."""
        field = getattr(obj, self.cloudinary_file_field)
        if hasattr(field, 'content_type') and field.content_type:
            return field.content_type
        return 'application/pdf'

    def _get_storage_path(self, obj):
        """Resolve the storage path / Cloudinary public_id."""
        field = getattr(obj, self.cloudinary_file_field)
        # FieldFile (plain FileField) → use .name (the storage key)
        if hasattr(field, 'storage'):
            return field.name
        # FK to model (e.g., UploadedFile) with explicit path attribute
        if hasattr(field, 'path'):
            return field.path
        return str(field)

    # ------------------------------------------------------------------
    # Action
    # ------------------------------------------------------------------

    @action(detail=True, methods=['get'], url_path='file')
    def retrieve_file(self, request, pk=None):
        """Download or preview the attached file."""
        obj = self.get_object()
        field = getattr(obj, self.cloudinary_file_field, None)

        if not field:
            return Response(
                {'detail': 'Este registro no tiene archivo asociado.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        storage_path = self._get_storage_path(obj)
        filename = self.get_download_filename(obj)
        content_type = self.get_file_content_type(obj)

        download_flag = str(request.query_params.get('download', '')).lower()
        disposition = 'attachment' if download_flag in ('1', 'true', 'yes') else 'inline'

        # ---------- Cloudinary ----------
        if getattr(settings, 'USE_CLOUDINARY', False):
            try:
                file_bytes = download_from_cloudinary(storage_path)
            except FileNotFoundError:
                return Response(
                    {'detail': 'Archivo no encontrado en Cloudinary. '
                               'Por favor, suba el archivo nuevamente.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
            except TimeoutError:
                return Response(
                    {'detail': 'Timeout al descargar el archivo. Intente nuevamente.'},
                    status=status.HTTP_504_GATEWAY_TIMEOUT,
                )
            except IOError as exc:
                return Response(
                    {'detail': f'Error al obtener archivo: {exc}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            response = HttpResponse(file_bytes, content_type=content_type)
            response['Content-Disposition'] = f'{disposition}; filename="{filename}"'
            response['Content-Length'] = len(file_bytes)
            response['Access-Control-Expose-Headers'] = 'Content-Disposition'
            return response

        # ---------- Local storage ----------
        try:
            field = getattr(obj, self.cloudinary_file_field)
            if hasattr(field, 'open') and callable(field.open):
                file_handle = field.open('rb')
            else:
                from django.core.files.storage import storages
                file_handle = storages['default'].open(storage_path, 'rb')
        except Exception as exc:
            return Response(
                {'detail': f'No se pudo abrir el archivo: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = FileResponse(file_handle, content_type=content_type)
        response['Content-Disposition'] = f'{disposition}; filename="{filename}"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response


class RoleBasedFieldValidationMixin:
    """
    Mixin to validate which fields a user can edit based on their role.

    Usage in ViewSet:
        class InvoiceViewSet(RoleBasedFieldValidationMixin, viewsets.ModelViewSet):
            # Define which fields each role can edit
            role_editable_fields = {
                'finanzas': {'payment_status', 'provisioned', 'invoiced', 'status'},
                'jefe_operaciones': '__all__',  # Can edit all fields
                'admin': '__all__',  # Can edit all fields
            }

    If role_editable_fields is not defined, all roles can edit all fields.
    """

    role_editable_fields = None

    def validate_fields_for_role(self, request_data, user_role):
        """
        Validates if the user's role allows editing the requested fields.

        Args:
            request_data: The data from request.data
            user_role: The role of the authenticated user

        Returns:
            tuple: (is_valid: bool, error_message: str or None)
        """
        # If no restrictions defined, allow all
        if not self.role_editable_fields:
            return True, None

        # Get allowed fields for this role
        allowed_fields = self.role_editable_fields.get(user_role)

        # If role not in dict, deny by default
        if allowed_fields is None:
            return False, f"El rol '{user_role}' no tiene permisos para editar este recurso."

        # If '__all__' is specified, allow all fields
        if allowed_fields == '__all__':
            return True, None

        # Check if requested fields are within allowed fields
        requested_fields = set(request_data.keys())
        allowed_fields_set = set(allowed_fields)

        forbidden_fields = requested_fields - allowed_fields_set

        if forbidden_fields:
            allowed_str = ', '.join(sorted(allowed_fields_set))
            forbidden_str = ', '.join(sorted(forbidden_fields))
            return False, (
                f"No tienes permiso para editar los siguientes campos: {forbidden_str}. "
                f"Solo puedes editar: {allowed_str}"
            )

        return True, None

    def update(self, request, *args, **kwargs):
        """
        Override update to validate fields based on role.
        """
        user = request.user
        is_valid, error_message = self.validate_fields_for_role(request.data, user.role)

        if not is_valid:
            return Response(
                {"detail": error_message},
                status=status.HTTP_403_FORBIDDEN
            )

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """
        Override partial_update to validate fields based on role.
        """
        user = request.user
        is_valid, error_message = self.validate_fields_for_role(request.data, user.role)

        if not is_valid:
            return Response(
                {"detail": error_message},
                status=status.HTTP_403_FORBIDDEN
            )

        return super().partial_update(request, *args, **kwargs)
