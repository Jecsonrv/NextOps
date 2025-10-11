"""
Celery tasks para el módulo de Invoices.
"""

from celery import shared_task
from django.core.management import call_command
import logging

logger = logging.getLogger(__name__)


@shared_task(name='invoices.tasks.check_invoice_due_dates')
def check_invoice_due_dates():
    """
    Task periódico para verificar fechas de vencimiento de facturas.
    Se ejecuta diariamente a las 7:00 AM vía Celery Beat.
    """
    logger.info("🔔 Iniciando verificación de alertas de vencimiento...")
    
    try:
        # Ejecutar el management command
        call_command('marcar_alertas_vencimiento', dias=7)
        logger.info("✅ Verificación de alertas completada exitosamente")
        return {"status": "success", "message": "Alertas procesadas correctamente"}
    
    except Exception as e:
        logger.error(f"❌ Error al verificar alertas: {str(e)}", exc_info=True)
        return {"status": "error", "message": str(e)}


@shared_task(name='invoices.tasks.export_for_accounting')
def export_for_accounting():
    """
    Task para exportar facturas para contabilidad.
    Placeholder para futura implementación.
    """
    logger.info("📊 Exportación para contabilidad (placeholder)")
    return {"status": "success", "message": "Placeholder task"}
