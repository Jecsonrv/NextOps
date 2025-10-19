"""
URL configuration for NextOps project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.utils import timezone
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint for monitoring."""
    return Response({
        'status': 'healthy',
        'service': 'NextOps API',
        'version': '1.0.0'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def cloudinary_status(request):
    """Endpoint para verificar configuración de Cloudinary."""
    import cloudinary

    config = cloudinary.config()
    storage_backend = getattr(settings, 'DEFAULT_FILE_STORAGE', 'django.core.files.storage.FileSystemStorage')
    use_cloudinary = getattr(settings, 'USE_CLOUDINARY', False)

    # Get sample invoice info
    from invoices.models import Invoice
    sample = Invoice.objects.filter(uploaded_file__isnull=False, deleted_at__isnull=True).order_by('-id').first()
    sample_info = None
    if sample:
        sample_info = {
            'id': sample.id,
            'uploaded_file_id': sample.uploaded_file.id if sample.uploaded_file else None,
            'uploaded_file_path': sample.uploaded_file.path if sample.uploaded_file else None,
        }

    return Response({
        'use_cloudinary': use_cloudinary,
        'storage_backend': storage_backend,
        'cloudinary_config': {
            'cloud_name': config.cloud_name or 'NOT SET',
            'api_key': 'SET' if config.api_key else 'NOT SET',
            'api_secret': 'SET' if config.api_secret else 'NOT SET',
        },
        'cloudinary_storage_dict': {
            'cloud_name': settings.CLOUDINARY_STORAGE.get('CLOUD_NAME') or 'NOT SET',
            'api_key': 'SET' if settings.CLOUDINARY_STORAGE.get('API_KEY') else 'NOT SET',
            'api_secret': 'SET' if settings.CLOUDINARY_STORAGE.get('API_SECRET') else 'NOT SET',
        },
        'is_using_cloudinary': 'cloudinary' in storage_backend.lower(),
        'latest_invoice_sample': sample_info,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def test_cloudinary_simple(request):
    """Test simple de Cloudinary sin archivos grandes."""
    import cloudinary.uploader
    from django.conf import settings

    try:
        # Test simple: subir texto
        result = cloudinary.uploader.upload(
            "data:text/plain;base64,SGVsbG8gQ2xvdWRpbmFyeQ==",  # "Hello Cloudinary" en base64
            folder="test",
            resource_type="raw",
            timeout=10
        )

        return Response({
            'success': True,
            'public_id': result.get('public_id'),
            'url': result.get('secure_url'),
            'resource_type': result.get('resource_type'),
        }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        return Response({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc(),
            'cloudinary_config': {
                'cloud_name': settings.CLOUDINARY_STORAGE.get('CLOUD_NAME'),
                'has_api_key': bool(settings.CLOUDINARY_STORAGE.get('API_KEY')),
                'has_secret': bool(settings.CLOUDINARY_STORAGE.get('API_SECRET')),
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def test_cloudinary_upload(request):
    """Endpoint de prueba para verificar que Cloudinary funciona."""
    from django.core.files.storage import storages
    from django.core.files.base import ContentFile
    import json

    try:
        # Usar el storage configurado en DEFAULT_FILE_STORAGE
        storage = storages['default']

        # Debug info
        use_cloudinary_attr = getattr(storage, 'use_cloudinary', 'NO ATTRIBUTE')

        # Crear un archivo de prueba
        test_content = b"Test file for Cloudinary - " + str(timezone.now()).encode()
        test_file = ContentFile(test_content, name='test_cloudinary.txt')

        # Intentar guardar
        path = storage.save('test/test_cloudinary.txt', test_file)

        # Verificar si existe
        exists = storage.exists(path)

        # Obtener URL
        url = storage.url(path)

        # Intentar leer
        try:
            stored_file = storage.open(path, 'rb')
            content_check = stored_file.read()
            stored_file.close()
            read_success = True
        except Exception as read_error:
            content_check = str(read_error)
            read_success = False

        return Response({
            'success': True,
            'storage_backend': str(type(storage)),
            'storage_class_name': storage.__class__.__name__,
            'use_cloudinary_setting': getattr(settings, 'USE_CLOUDINARY', False),
            'use_cloudinary_attr': use_cloudinary_attr,
            'saved_path': path,
            'exists': exists,
            'url': url,
            'read_success': read_success,
            'content_match': content_check == test_content if read_success else False,
        }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        from django.core.files.storage import storages
        storage = storages['default']
        return Response({
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__,
            'traceback': traceback.format_exc(),
            'storage_backend': str(type(storage)),
            'use_cloudinary_attr': getattr(storage, 'use_cloudinary', 'NO ATTRIBUTE'),
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health-check'),
    path('api/cloudinary-status/', cloudinary_status, name='cloudinary-status'),
    path('api/test-cloudinary-simple/', test_cloudinary_simple, name='test-cloudinary-simple'),
    path('api/test-cloudinary/', test_cloudinary_upload, name='test-cloudinary'),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # API Routes
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include('accounts.urls')),
    path('api/catalogs/', include('catalogs.urls')),
    path('api/patterns/', include('patterns.urls')),
    path('api/clients/', include('client_aliases.urls')),
    path('api/ots/', include('ots.urls')),
    path('api/invoices/', include('invoices.urls')),
    path('api/automation/', include('automation.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    
    # Add debug toolbar if installed
    try:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns
    except ImportError:
        pass

# Customize admin site
admin.site.site_header = 'NextOps Administration'
admin.site.site_title = 'NextOps Admin'
admin.site.index_title = 'Welcome to NextOps Administration'
