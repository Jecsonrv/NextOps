"""
Custom exception handler for NextOps project.
"""
from django.db import IntegrityError
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError
import logging
import re

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

    # Si DRF no manejó la excepción, lo hacemos nosotros
    if response is None:
        # Manejar errores de integridad de la base de datos (ej. duplicados)
        if isinstance(exc, IntegrityError):
            # Intentar extraer un mensaje más específico del error
            error_message = str(exc)
            friendly_message = "Se ha producido un error de integridad en la base de datos. Es posible que estés intentando crear un registro que ya existe o que falte una referencia requerida."

            # Personalizar mensaje para errores de unicidad
            if 'UNIQUE constraint failed' in error_message or 'duplicate key value violates unique constraint' in error_message:
                friendly_message = "Ya existe un registro con los datos proporcionados. Por favor, verifica la información e intenta de nuevo."
                # Opcional: intentar extraer el campo del error
                field = None
                # Intenta con el formato de SQLite
                match = re.search(r'UNIQUE constraint failed: \w+\.(\w+)', error_message)
                if match:
                    field = match.group(1)
                else:
                    # Intenta con el formato de PostgreSQL
                    match = re.search(r'Key \((\w+)\)=', error_message)
                    if match:
                        field = match.group(1)

                if field:
                    if field == 'uploaded_file_id':
                        friendly_message = "El archivo que intentas subir ya ha sido procesado en otra factura. Por favor, sube un archivo diferente."
                    else:
                        friendly_message = f"Ya existe un registro con este valor en el campo '{field}'. Por favor, utiliza un valor diferente."

            custom_response = {
                'code': 'IntegrityError',
                'message': friendly_message,
                'detail': error_message,
            }
            response = Response(custom_response, status=status.HTTP_409_CONFLICT)

        # Manejar otras excepciones no controladas por DRF
        else:
            custom_response = {
                'code': 'UnhandledException',
                'message': 'Se ha producido un error inesperado en el servidor.',
                'detail': str(exc)
            }
            response = Response(custom_response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Loguear el error no manejado
        logger.error(
            f"Unhandled API Error: {exc.__class__.__name__} - {str(exc)}",
            exc_info=True,
            extra={
                'view': context.get('view'),
                'request': context.get('request'),
            }
        )

    return response
