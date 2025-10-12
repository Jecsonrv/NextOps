# Generated migration to populate monto_aplicable for existing invoices

from django.db import migrations
from decimal import Decimal


def populate_monto_aplicable(apps, schema_editor):
    """
    Populate monto_aplicable for all existing invoices.
    - If monto_aplicable is NULL, set it to monto
    - If invoice has active disputes with resultado, recalculate based on that
    """
    Invoice = apps.get_model('invoices', 'Invoice')
    Dispute = apps.get_model('invoices', 'Dispute')

    invoices_updated = 0

    for invoice in Invoice.objects.all():
        # Si ya tiene monto_aplicable, skip
        if invoice.monto_aplicable is not None:
            continue

        # Por defecto: monto_aplicable = monto
        invoice.monto_aplicable = invoice.monto

        # Verificar si tiene disputas resueltas
        disputa_activa = Dispute.objects.filter(
            invoice=invoice,
            is_deleted=False
        ).exclude(resultado='pendiente').first()

        if disputa_activa:
            # Ajustar según resultado de la disputa
            # LÓGICA CORRECTA:
            # - aprobada_total: monto_aplicable = monto - monto_disputa
            # - aprobada_parcial: monto_aplicable = monto - monto_recuperado
            if disputa_activa.resultado == 'aprobada_total':
                monto_a_descontar = disputa_activa.monto_disputa
                nuevo_monto = invoice.monto - monto_a_descontar
                invoice.monto_aplicable = max(nuevo_monto, Decimal('0.00'))
            elif disputa_activa.resultado == 'aprobada_parcial':
                monto_recuperado = disputa_activa.monto_recuperado or Decimal('0.00')
                nuevo_monto = invoice.monto - monto_recuperado
                invoice.monto_aplicable = max(nuevo_monto, Decimal('0.00'))
            else:
                # rechazada o anulada -> monto completo
                invoice.monto_aplicable = invoice.monto

        invoice.save(update_fields=['monto_aplicable'])
        invoices_updated += 1

    print(f"✅ {invoices_updated} facturas actualizadas con monto_aplicable")


def reverse_populate(apps, schema_editor):
    """Rollback: Set monto_aplicable to NULL for all invoices"""
    Invoice = apps.get_model('invoices', 'Invoice')
    Invoice.objects.all().update(monto_aplicable=None)


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0011_invoice_monto_aplicable'),
    ]

    operations = [
        migrations.RunPython(populate_monto_aplicable, reverse_populate),
    ]
