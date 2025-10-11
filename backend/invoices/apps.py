"""
Configuración de la app Invoices.
"""

from django.apps import AppConfig


class InvoicesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'invoices'
    verbose_name = 'Facturas'
    
    def ready(self):
        """
        Importar signals cuando la app esté lista.
        Este es el lugar correcto para registrar signals en Django.
        """
        import invoices.signals  # noqa
