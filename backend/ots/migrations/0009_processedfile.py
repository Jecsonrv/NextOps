# Generated migration for ProcessedFile model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ots', '0008_alter_ot_contenedores'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProcessedFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('file_hash', models.CharField(db_index=True, help_text='SHA256 hash del contenido del archivo', max_length=64, unique=True)),
                ('filename', models.CharField(help_text='Nombre original del archivo procesado', max_length=500)),
                ('total_rows', models.IntegerField(default=0, help_text='Total de filas procesadas')),
                ('created_count', models.IntegerField(default=0, help_text='Número de OTs creadas')),
                ('updated_count', models.IntegerField(default=0, help_text='Número de OTs actualizadas')),
                ('skipped_count', models.IntegerField(default=0, help_text='Número de filas omitidas')),
                ('processed_by', models.CharField(help_text='Usuario que procesó el archivo', max_length=100)),
                ('operation_type', models.CharField(default='importacion', help_text='Tipo de operación del archivo (importacion/exportacion)', max_length=20)),
            ],
            options={
                'verbose_name': 'Archivo Procesado',
                'verbose_name_plural': 'Archivos Procesados',
                'db_table': 'processed_files',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='processedfile',
            index=models.Index(fields=['file_hash'], name='processed_f_file_ha_idx'),
        ),
        migrations.AddIndex(
            model_name='processedfile',
            index=models.Index(fields=['-created_at'], name='processed_f_created_idx'),
        ),
    ]
