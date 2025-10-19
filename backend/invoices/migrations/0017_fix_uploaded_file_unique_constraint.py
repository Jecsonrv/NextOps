"""
Migración para arreglar el constraint de uploaded_file_id en Invoice.

Problema: El OneToOneField crea un constraint único que no considera soft delete.
Solución: Crear un unique constraint parcial que solo aplica cuando deleted_at IS NULL.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0016_fix_unique_constraint_creditnote'),
    ]

    operations = [
        # Paso 1: Eliminar el constraint único automático del OneToOneField
        migrations.RunSQL(
            sql="""
                ALTER TABLE invoices_invoice 
                DROP CONSTRAINT IF EXISTS invoices_invoice_uploaded_file_id_key;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        
        # Paso 2: Crear un unique index parcial que solo aplica a registros no eliminados
        migrations.RunSQL(
            sql="""
                CREATE UNIQUE INDEX invoices_invoice_uploaded_file_active_unique
                ON invoices_invoice (uploaded_file_id)
                WHERE deleted_at IS NULL;
            """,
            reverse_sql="""
                DROP INDEX IF EXISTS invoices_invoice_uploaded_file_active_unique;
            """,
        ),
    ]
