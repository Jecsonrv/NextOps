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
        # Paso 0: Limpiar duplicados antes de crear el índice
        # Si hay múltiples facturas activas con el mismo uploaded_file_id,
        # marca todas excepto la más reciente como eliminadas
        migrations.RunSQL(
            sql="""
                WITH duplicates AS (
                    SELECT
                        id,
                        uploaded_file_id,
                        ROW_NUMBER() OVER (
                            PARTITION BY uploaded_file_id
                            ORDER BY created_at DESC
                        ) as rn
                    FROM invoices_invoice
                    WHERE deleted_at IS NULL
                )
                UPDATE invoices_invoice
                SET deleted_at = NOW(),
                    is_deleted = true
                FROM duplicates
                WHERE invoices_invoice.id = duplicates.id
                  AND duplicates.rn > 1;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # Paso 1: Eliminar el constraint único automático del OneToOneField
        migrations.RunSQL(
            sql="""
                ALTER TABLE invoices_invoice
                DROP CONSTRAINT IF EXISTS invoices_invoice_uploaded_file_id_key;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # Paso 2: Eliminar el índice si ya existe (por si la migración se ejecuta múltiples veces)
        migrations.RunSQL(
            sql="""
                DROP INDEX IF EXISTS invoices_invoice_uploaded_file_active_unique;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # Paso 3: Crear un unique index parcial que solo aplica a registros no eliminados
        migrations.RunSQL(
            sql="""
                CREATE UNIQUE INDEX IF NOT EXISTS invoices_invoice_uploaded_file_active_unique
                ON invoices_invoice (uploaded_file_id)
                WHERE deleted_at IS NULL;
            """,
            reverse_sql="""
                DROP INDEX IF EXISTS invoices_invoice_uploaded_file_active_unique;
            """,
        ),
    ]
