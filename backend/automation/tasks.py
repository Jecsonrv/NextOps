"""
Celery Tasks for Email Automation.

DEPRECATED: Email automation disabled to save memory (~3GB).
Tasks are kept for backward compatibility but should not be used.
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
    default_retry_delay=300,  # 5 minutes
    time_limit=600,  # 10 minutes hard limit (MEMORY OPTIMIZATION)
    soft_time_limit=540  # 9 minutes soft limit (MEMORY OPTIMIZATION)
)
def process_dte_mailbox(self):
    """
    DEPRECATED: Email auto-processing disabled.

    This task is disabled to save memory in production.
    Returns immediately without processing.

    Returns:
        dict: Status indicating task is disabled
    """
    logger.warning("Email auto-processing is DISABLED - task skipped")

    return {
        'status': 'disabled',
        'message': 'Email auto-processing is permanently disabled to save memory'
    }


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
