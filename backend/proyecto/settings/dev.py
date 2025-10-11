"""
Development settings for NextOps project.
Includes debug toolbar and relaxed security for local development.
"""
from .base import *

DEBUG = True

# Additional apps for development
INSTALLED_APPS += [
    'django_extensions',
]

# CORS - Allow all origins in development
CORS_ALLOW_ALL_ORIGINS = True

# Django Debug Toolbar (optional, add if needed)
if DEBUG:
    try:
        import debug_toolbar
        INSTALLED_APPS += ['debug_toolbar']
        MIDDLEWARE.insert(0, 'debug_toolbar.middleware.DebugToolbarMiddleware')
        INTERNAL_IPS = ['127.0.0.1', 'localhost']
    except ImportError:
        pass

# Email backend for development (console)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Celery eager mode for development (optional)
# CELERY_TASK_ALWAYS_EAGER = True
# CELERY_TASK_EAGER_PROPAGATES = True

# Show SQL queries in console (optional)
# LOGGING['loggers']['django.db.backends'] = {
#     'handlers': ['console'],
#     'level': 'DEBUG',
#     'propagate': False,
# }
