"""
Celery Tasks for Email Automation.
"""

import logging
from celery import shared_task
from django.utils import timezone

from automation.services.email_processor import EmailProcessor
from automation.models import EmailAutoProcessingConfig

logger = logging.getLogger(__name__)


@shared_task(
    name='automation.process_dte_mailbox',
    bind=True,
    max_retries=3,
    default_retry_delay=300  # 5 minutes
)
def process_dte_mailbox(self):
    """
    Celery task para procesar mailbox de DTEs.
    
    Esta tarea:
    - Lee la configuración de EmailAutoProcessingConfig
    - Procesa emails con attachments DTE
    - Crea facturas automáticamente
    - Loguea todo en EmailProcessingLog
    - Actualiza last_run info
    
    Returns:
        dict: Estadísticas del procesamiento
    """
    logger.info("Starting DTE mailbox processing task")
    
    try:
        # Verificar configuración activa
        try:
            config = EmailAutoProcessingConfig.objects.get(id=1)
        except EmailAutoProcessingConfig.DoesNotExist:
            logger.warning("EmailAutoProcessingConfig not found, creating default")
            config = EmailAutoProcessingConfig.objects.create(
                id=1,
                is_active=True,
                check_interval_minutes=15,
                target_folders=['Inbox'],
                subject_filters=['DTE', 'Factura', 'Invoice'],
                auto_parse_enabled=True,
                max_emails_per_run=50
            )
        
        if not config.is_active:
            logger.info("Email auto-processing is disabled, skipping task")
            return {
                'status': 'disabled',
                'message': 'Email auto-processing is disabled'
            }
        
        # Crear processor y ejecutar
        processor = EmailProcessor()
        result = processor.process_mailbox()
        
        logger.info(f"Mailbox processing completed: {result}")
        
        return result
        
    except Exception as exc:
        logger.error(f"Mailbox processing task failed: {exc}", exc_info=True)
        
        # Actualizar config con error
        try:
            config = EmailAutoProcessingConfig.objects.get(id=1)
            config.last_run_at = timezone.now()
            config.last_run_status = f"Task Error: {str(exc)}"
            config.save()
        except Exception as e:
            logger.error(f"Failed to update config after task error: {e}")
        
        # Retry en caso de error
        raise self.retry(exc=exc)


@shared_task(name='automation.test_graph_connection')
def test_graph_connection():
    """
    Tarea de prueba para verificar conexión con MS Graph.
    
    Returns:
        dict: Resultado del test
    """
    from automation.services.microsoft_graph import MicrosoftGraphClient
    
    logger.info("Testing MS Graph connection")
    
    try:
        client = MicrosoftGraphClient()
        
        # Intentar obtener token
        token = client._get_access_token()
        
        if token:
            logger.info("MS Graph connection successful")
            return {
                'status': 'success',
                'message': 'Successfully authenticated with MS Graph'
            }
        else:
            logger.error("Failed to get access token")
            return {
                'status': 'failed',
                'message': 'Failed to get access token'
            }
            
    except Exception as e:
        logger.error(f"MS Graph connection test failed: {e}", exc_info=True)
        return {
            'status': 'error',
            'message': str(e)
        }


@shared_task(name='automation.manual_process_single_email')
def manual_process_single_email(message_id: str):
    """
    Procesa un email específico manualmente.
    
    Args:
        message_id: ID del mensaje de MS Graph
    
    Returns:
        dict: Resultado del procesamiento
    """
    from automation.services.microsoft_graph import MicrosoftGraphClient
    
    logger.info(f"Manually processing email: {message_id}")
    
    try:
        graph_client = MicrosoftGraphClient()
        processor = EmailProcessor(graph_client=graph_client)
        
        # Obtener mensaje
        message = graph_client.get_message(message_id)
        
        # Procesar
        result = processor._process_single_message(message, folder='Manual')
        
        logger.info(f"Manual email processing completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Manual email processing failed: {e}", exc_info=True)
        return {
            'status': 'error',
            'message': str(e)
        }
