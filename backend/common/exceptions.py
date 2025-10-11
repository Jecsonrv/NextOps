"""
Custom exception handler for NextOps project.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError
import logging

logger = logging.getLogger('nextops')


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns a consistent error response format.
    
    Format:
    {
        "code": "error_code",
        "message": "Human readable message",
        "errors": [{"field": "field_name", "message": "error message"}],
        "detail": "Optional additional detail"
    }
    """
    # Call DRF's default exception handler first
    response = exception_handler(exc, context)

    if response is not None:
        # Customize the response
        custom_response = {
            'code': exc.__class__.__name__,
            'message': str(exc),
        }

        # Handle validation errors
        if isinstance(exc, (DRFValidationError, DjangoValidationError)):
            errors = []
            if hasattr(exc, 'detail'):
                if isinstance(exc.detail, dict):
                    for field, messages in exc.detail.items():
                        if isinstance(messages, list):
                            for message in messages:
                                errors.append({
                                    'field': field,
                                    'message': str(message)
                                })
                        else:
                            errors.append({
                                'field': field,
                                'message': str(messages)
                            })
                elif isinstance(exc.detail, list):
                    for message in exc.detail:
                        errors.append({
                            'field': 'non_field_errors',
                            'message': str(message)
                        })
            
            custom_response['errors'] = errors

        # Add detail if available
        if hasattr(exc, 'detail'):
            custom_response['detail'] = str(exc.detail)

        response.data = custom_response

        # Log the error
        logger.error(
            f"API Error: {exc.__class__.__name__} - {str(exc)}",
            exc_info=True,
            extra={
                'view': context.get('view'),
                'request': context.get('request'),
            }
        )

    return response
