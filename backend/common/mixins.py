"""
Custom mixins for NextOps project.

Mixins:
    - RoleBasedFieldValidationMixin: Validates editable fields based on user role
"""
from rest_framework import status
from rest_framework.response import Response


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
