from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("invoices", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="invoice",
            name="estado_provision",
            field=models.CharField(
                choices=[
                    ("pendiente", "Pendiente"),
                    ("provisionada", "Provisionada"),
                    ("revision", "En Revisión"),
                    ("disputada", "Disputada"),
                    ("rechazada", "Rechazada (Legacy)"),
                ],
                default="pendiente",
                help_text="Estado de la provisión",
                max_length=32,
            ),
        ),
    ]
