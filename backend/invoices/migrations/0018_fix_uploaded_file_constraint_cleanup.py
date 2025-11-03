"""
Migración para limpiar facturas duplicadas y asegurar el constraint único.

Esta migración:
1. Marca como eliminadas las facturas antiguas que tienen el mismo uploaded_file_id
2. Asegura que solo quede UNA factura activa por archivo
3. Reaplica el constraint único parcial

IMPORTANTE: Esta migración se ejecuta automáticamente en Railway/producción.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0017_fix_uploaded_file_unique_constraint'),
    ]

    operations = [
        # Paso 1: Asegurar que deleted_at esté sincronizado con is_deleted
        migrations.RunSQL(
            sql="""
                UPDATE invoices_invoice
                SET deleted_at = NOW()
                WHERE is_deleted = true
                  AND deleted_at IS NULL;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # Paso 2: Marcar como eliminadas las facturas duplicadas (dejar solo la más reciente)
        migrations.RunSQL(
            sql="""
                WITH duplicates AS (
                    SELECT
                        id,
                        uploaded_file_id,
                        ROW_NUMBER() OVER (
                            PARTITION BY uploaded_file_id
                            ORDER BY created_at DESC, id DESC
                        ) as rn
                    FROM invoices_invoice
                    WHERE is_deleted = false
                      AND deleted_at IS NULL
                )
                UPDATE invoices_invoice
                SET 
                    deleted_at = NOW(),
                    is_deleted = true
                FROM duplicates
                WHERE invoices_invoice.id = duplicates.id
                  AND duplicates.rn > 1;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # Paso 3: Recrear el índice único parcial (por si se corrompió)
        migrations.RunSQL(
            sql="""
                -- Eliminar índice existente
                DROP INDEX IF EXISTS invoices_invoice_uploaded_file_active_unique;
                
                -- Eliminar constraint si existe
                ALTER TABLE invoices_invoice 
                DROP CONSTRAINT IF EXISTS invoices_invoice_uploaded_file_id_key;
                
                -- Crear nuevo índice único parcial
                CREATE UNIQUE INDEX invoices_invoice_uploaded_file_active_unique
                ON invoices_invoice (uploaded_file_id)
                WHERE is_deleted = false AND deleted_at IS NULL;
            """,
            reverse_sql="""
                DROP INDEX IF EXISTS invoices_invoice_uploaded_file_active_unique;
            """,
        ),
    ]
