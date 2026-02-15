from django.db import migrations


def clear_short_name_for_soft_deleted_aliases(apps, schema_editor):
    ClientAlias = apps.get_model('client_aliases', 'ClientAlias')

    ClientAlias._base_manager.filter(
        is_deleted=True,
    ).exclude(
        short_name__isnull=True,
    ).update(short_name=None)


class Migration(migrations.Migration):

    dependencies = [
        ('client_aliases', '0008_clientalias_acepta_credito_fiscal_and_more'),
    ]

    operations = [
        migrations.RunPython(
            clear_short_name_for_soft_deleted_aliases,
            migrations.RunPython.noop,
        ),
    ]
