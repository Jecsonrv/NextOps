# Generated migration for adding tipo_operacion field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ots', '0005_alter_ot_estado'),
    ]

    operations = [
        migrations.AddField(
            model_name='ot',
            name='tipo_operacion',
            field=models.CharField(
                choices=[('importacion', 'Importación'), ('exportacion', 'Exportación')],
                default='importacion',
                help_text='Tipo de operación: importación o exportación (detectado automáticamente)',
                max_length=20,
                db_index=True
            ),
        ),
    ]
