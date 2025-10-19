"""
Utilidades para el módulo de Invoices.
"""

from django.conf import settings


def get_absolute_media_url(path):
    """
    Genera una URL absoluta para un archivo media.

    Args:
        path: Ruta relativa del archivo (ej: 'invoices/archivo.pdf')

    Returns:
        URL absoluta completa (ej: 'https://backend.railway.app/media/invoices/archivo.pdf')

    En desarrollo: http://localhost:8000/media/invoices/archivo.pdf
    En producción (Railway): https://nextops-production.up.railway.app/media/invoices/archivo.pdf
    """
    if not path:
        return None

    # Obtener la URL base del backend desde settings
    backend_url = settings.BACKEND_URL.rstrip('/')

    # Construir la URL completa
    return f"{backend_url}/media/{path}"
