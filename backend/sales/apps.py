from django.apps import AppConfig


class SalesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'sales'
    verbose_name = 'Gestión de Ventas y Facturación'

    def ready(self):
        import sales.signals  # noqa
