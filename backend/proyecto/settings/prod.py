"""
Production settings for NextOps project.
Enhanced security, caching, and performance optimizations.
"""
from .base import *

DEBUG = False

# Cloudinary Storage
USE_CLOUDINARY = config('USE_CLOUDINARY', default=True, cast=bool)


# Security Settings
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Additional security headers
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

_redis_url = config('REDIS_URL', default='')

if _redis_url:
    # Caching with Redis (requires django-redis)
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': _redis_url,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            },
            'KEY_PREFIX': 'nextops',
            'TIMEOUT': 300,  # 5 minutes default
        }
    }

    # Session backend - use cache
    SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
    SESSION_CACHE_ALIAS = 'default'
else:
    # Fallback to in-memory cache when Redis is unavailable
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'TIMEOUT': 300,
        }
    }

    # Use database-backed sessions
    SESSION_ENGINE = 'django.contrib.sessions.backends.db'

# REST Framework - Remove BrowsableAPIRenderer in production
REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = [
    'rest_framework.renderers.JSONRenderer',
]

# Logging - More structured logging for production
LOGGING['formatters']['json'] = {
    'format': '%(asctime)s %(name)s %(levelname)s %(message)s',
}

LOGGING['handlers']['file']['formatter'] = 'json'
LOGGING['handlers']['error_file']['formatter'] = 'json'

# Email backend for production
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@nextops.com')

# Disable admin for production (optional, comment out if you need it)
# INSTALLED_APPS.remove('django.contrib.admin')
