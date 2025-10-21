"""
Memory Monitor Middleware
Tracks memory usage in production to detect memory leaks.
"""
import logging
import random
from django.conf import settings

logger = logging.getLogger('memory')


class MemoryMonitorMiddleware:
    """
    Middleware para monitorear uso de memoria en producción.

    Características:
    - Sampling: Solo muestrea 1% de requests (bajo overhead)
    - Logging: Registra memoria por proceso
    - Production-safe: Solo usa psutil si está disponible
    """

    def __init__(self, get_response):
        self.get_response = get_response

        # Check if psutil is available
        try:
            import psutil
            self.psutil = psutil
            self.available = True
        except ImportError:
            self.psutil = None
            self.available = False
            logger.warning('psutil not installed - memory monitoring disabled')

    def __call__(self, request):
        response = self.get_response(request)

        # Only monitor in production and if psutil is available
        if not settings.DEBUG and self.available:
            # Sample 1% of requests to minimize overhead
            if random.randint(1, 100) == 1:
                self._log_memory(request)

        return response

    def _log_memory(self, request):
        """Log current memory usage"""
        try:
            process = self.psutil.Process()
            mem_info = process.memory_info()

            # RSS (Resident Set Size) = actual physical memory used
            mem_mb = mem_info.rss / 1024 / 1024

            # VMS (Virtual Memory Size) = total virtual memory
            vms_mb = mem_info.vms / 1024 / 1024

            # Log with request path for debugging
            logger.warning(
                f'Memory: RSS={mem_mb:.0f}MB VMS={vms_mb:.0f}MB | '
                f'Path: {request.path} | '
                f'Method: {request.method}'
            )

            # Alert if memory is critically high (>1.5GB)
            if mem_mb > 1500:
                logger.error(
                    f'HIGH MEMORY USAGE: {mem_mb:.0f}MB | '
                    f'Path: {request.path} | '
                    f'User: {getattr(request.user, "username", "anonymous")}'
                )

        except Exception as e:
            # Don't fail requests due to monitoring errors
            logger.debug(f'Error logging memory: {e}')


class RequestSizeMonitorMiddleware:
    """
    Middleware para monitorear tamaño de requests/responses.
    Útil para detectar uploads/downloads grandes que consumen memoria.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Check request size
        if hasattr(request, 'META') and 'CONTENT_LENGTH' in request.META:
            try:
                content_length = int(request.META['CONTENT_LENGTH'])
                if content_length > 10 * 1024 * 1024:  # > 10MB
                    logger.warning(
                        f'Large request: {content_length / 1024 / 1024:.1f}MB | '
                        f'Path: {request.path} | '
                        f'Method: {request.method}'
                    )
            except (ValueError, TypeError):
                pass

        response = self.get_response(request)

        # Check response size
        if hasattr(response, 'content') and len(response.content) > 10 * 1024 * 1024:
            logger.warning(
                f'Large response: {len(response.content) / 1024 / 1024:.1f}MB | '
                f'Path: {request.path}'
            )

        return response
