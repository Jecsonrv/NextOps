"""
Filtros personalizados para el módulo de Sales.
"""
import django_filters
from .models import SalesInvoice, Payment


class SalesInvoiceFilter(django_filters.FilterSet):
    """
    FilterSet personalizado para SalesInvoice que permite:
    - Filtrado por múltiples estados separados por comas
    - Búsqueda por texto en número de factura, cliente, OT
    """

    # Permitir múltiples valores separados por comas para estado_facturacion
    estado_facturacion = django_filters.CharFilter(method='filter_estado_facturacion')

    # Búsqueda de texto
    search = django_filters.CharFilter(method='filter_search')

    class Meta:
        model = SalesInvoice
        fields = {
            'ot': ['exact'],
            'cliente': ['exact'],
            'estado_pago': ['exact'],
        }

    def filter_estado_facturacion(self, queryset, name, value):
        """
        Permite filtrar por uno o múltiples estados separados por comas.
        Ej: estado_facturacion=facturada
        Ej: estado_facturacion=anulada,anulada_parcial
        """
        if not value:
            return queryset

        # Separar por comas y limpiar espacios
        estados = [estado.strip() for estado in value.split(',')]

        # Filtrar por cualquiera de los estados (OR)
        return queryset.filter(estado_facturacion__in=estados)

    def filter_search(self, queryset, name, value):
        """
        Búsqueda de texto en múltiples campos:
        - Número de factura
        - Nombre del cliente
        - Número de OT
        """
        if not value:
            return queryset

        from django.db.models import Q

        return queryset.filter(
            Q(numero_factura__icontains=value) |
            Q(cliente__short_name__icontains=value) |
            Q(cliente__original_name__icontains=value) |
            Q(ot__numero_ot__icontains=value)
        )


class PaymentFilter(django_filters.FilterSet):
    """
    FilterSet para Payment que permite filtrar por:
    - Factura de venta (sales_invoice)
    - Estado del pago
    """

    class Meta:
        model = Payment
        fields = {
            'sales_invoice': ['exact'],
            'estado': ['exact'],
        }

