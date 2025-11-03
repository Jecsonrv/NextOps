from django.apps import AppConfig


class OtsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ots'
    verbose_name = 'Órdenes de Trabajo'

    def ready(self):
        # Import signals to connect signal handlers when app is ready
        try:
            import ots.signals  # noqa: F401
        except Exception:
            # If signals fail to import (during migrations or tests), avoid crashing the app
            pass
