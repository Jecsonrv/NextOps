# Generated migration for ClientResolution model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('client_aliases', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ClientResolution',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('original_name', models.CharField(db_index=True, help_text='Nombre original del cliente como aparece en el Excel', max_length=500)),
                ('normalized_name', models.CharField(help_text='Nombre normalizado para búsqueda fuzzy', max_length=500)),
                ('resolved_to', models.ForeignKey(help_text='Cliente al que se resolvió esta variación', on_delete=django.db.models.deletion.CASCADE, related_name='resolutions', to='client_aliases.clientalias')),
                ('resolution_type', models.CharField(choices=[('manual', 'Resolución Manual'), ('automatic', 'Resolución Automática'), ('conflict', 'Resolución de Conflicto')], default='manual', help_text='Tipo de resolución aplicada', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.CharField(blank=True, default='system', max_length=100)),
            ],
            options={
                'verbose_name': 'Resolución de Cliente',
                'verbose_name_plural': 'Resoluciones de Clientes',
                'db_table': 'client_resolutions',
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['original_name'], name='client_reso_origina_idx'),
                    models.Index(fields=['normalized_name'], name='client_reso_normali_idx'),
                ],
                'unique_together': {('original_name', 'resolved_to')},
            },
        ),
    ]
