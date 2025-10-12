# Generated migration for monto_aplicable field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0010_dispute_resultado_monto_recuperado'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoice',
            name='monto_aplicable',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Monto real a pagar después de ajustes por disputa. Si null, se usa el monto original.',
                max_digits=12,
                null=True
            ),
        ),
        migrations.AddIndex(
            model_name='invoice',
            index=models.Index(fields=['monto_aplicable'], name='invoices_in_monto_a_idx'),
        ),
    ]
