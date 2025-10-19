from django.db import migrations


LINKED_PREFIXES = ["FLETE", "CARGOS_NAVIERA"]


def mark_linked_cost_types(apps, schema_editor):
    CostType = apps.get_model("catalogs", "CostType")
    for prefix in LINKED_PREFIXES:
        CostType.objects.filter(code__startswith=prefix).update(is_linked_to_ot=True)


def unmark_linked_cost_types(apps, schema_editor):
    CostType = apps.get_model("catalogs", "CostType")
    for prefix in LINKED_PREFIXES:
        CostType.objects.filter(code__startswith=prefix).update(is_linked_to_ot=False)


class Migration(migrations.Migration):

    dependencies = [
        ("catalogs", "0013_ignore_index_rename"),
    ]

    operations = [
        migrations.RunPython(mark_linked_cost_types, unmark_linked_cost_types),
    ]
