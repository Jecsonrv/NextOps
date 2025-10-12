# Generated manually for dispute resolution system

from django.db import migrations, models
import django.core.validators
from decimal import Decimal


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0009_remove_dispute_invoices_di_codigo_035adc_idx_and_more'),
    ]

    operations = [
        # Agregar campo 'resultado' al modelo Dispute
        migrations.AddField(
            model_name='dispute',
            name='resultado',
            field=models.CharField(
                choices=[
                    ('pendiente', 'Pendiente'),
                    ('aprobada_total', 'Aprobada Total'),
                    ('aprobada_parcial', 'Aprobada Parcial'),
                    ('rechazada', 'Rechazada por Proveedor'),
                    ('anulada', 'Anulada (Error Interno)')
                ],
                default='pendiente',
                help_text='Resultado final de la disputa',
                max_length=32,
                db_index=True
            ),
        ),
        # Agregar campo 'monto_recuperado' al modelo Dispute
        migrations.AddField(
            model_name='dispute',
            name='monto_recuperado',
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal('0.00'),
                help_text='Monto recuperado/ajustado (USD)',
                max_digits=12,
                validators=[django.core.validators.MinValueValidator(Decimal('0.00'))]
            ),
        ),
        # Agregar índice para el campo 'resultado'
        migrations.AddIndex(
            model_name='dispute',
            index=models.Index(fields=['resultado'], name='invoices_di_resulta_idx'),
        ),
    ]
