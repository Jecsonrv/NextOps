# Generated manually

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('catalogs', '0006_step2_populate_categories_and_migrate_data'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='costtype',
            name='category_old',
        ),
    ]
