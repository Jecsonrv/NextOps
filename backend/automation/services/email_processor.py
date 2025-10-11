"""
Email Processor Service.
Procesa emails con attachments DTE/factura y crea registros de Invoice.
"""

import logging
import base64
from typing import List, Dict, Tuple, Optional
from datetime import datetime
from decimal import Decimal
import tempfile
import os

from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone

from automation.models import EmailProcessingLog, EmailAutoProcessingConfig
from automation.services.microsoft_graph import MicrosoftGraphClient
from invoices.models import Invoice, UploadedFile
from invoices.serializers import InvoiceCreateSerializer

logger = logging.getLogger(__name__)


class EmailProcessor:
    """
    Procesa emails con DTEs y crea facturas automáticamente.
    """
    
    SUPPORTED_EXTENSIONS = ['.json', '.pdf', '.xml', '.txt']
    DTE_KEYWORDS = ['DTE', 'Factura', 'Invoice', 'Billing']
    
    def __init__(self, graph_client: Optional[MicrosoftGraphClient] = None):
        """
        Initialize email processor.
        
        Args:
            graph_client: MS Graph client instance (creates new if None)
        """
        self.graph_client = graph_client or MicrosoftGraphClient()
        self.config = self._get_config()
    
    def _get_config(self) -> EmailAutoProcessingConfig:
        """Get or create processing config"""
        config, created = EmailAutoProcessingConfig.objects.get_or_create(
            id=1,
            defaults={
                'is_active': True,
                'check_interval_minutes': 15,
                'target_folders': ['Inbox'],
                'subject_filters': self.DTE_KEYWORDS,
                'auto_parse_enabled': True,
                'max_emails_per_run': 50,
            }
        )
        return config
    
    def process_mailbox(self) -> Dict[str, any]:
        """
        Procesa todos los emails pendientes en las carpetas configuradas.
        
        Returns:
            Dict con estadísticas del procesamiento
        """
        if not self.config.is_active:
            logger.info("Email auto-processing is disabled")
            return {
                'status': 'disabled',
                'processed': 0,
                'success': 0,
                'failed': 0,
            }
        
        start_time = datetime.now()
        stats = {
            'processed': 0,
            'success': 0,
            'failed': 0,
            'skipped': 0,
            'invoices_created': 0,
        }
        
        try:
            # Iterar sobre carpetas configuradas
            for folder in self.config.target_folders:
                logger.info(f"Processing folder: {folder}")
                
                # Buscar emails con keywords en subject
                messages = self.graph_client.search_messages_by_subject(
                    keywords=self.config.subject_filters,
                    folder=folder,
                    days_back=7,
                    max_results=self.config.max_emails_per_run
                )
                
                logger.info(f"Found {len(messages)} messages in {folder}")
                
                # Procesar cada mensaje
                for message in messages:
                    stats['processed'] += 1
                    
                    result = self._process_single_message(message, folder)
                    
                    if result['status'] == 'success':
                        stats['success'] += 1
                        stats['invoices_created'] += result.get('invoices_count', 0)
                    elif result['status'] == 'failed':
                        stats['failed'] += 1
                    elif result['status'] == 'skipped':
                        stats['skipped'] += 1
                    
                    # Limitar cantidad por run
                    if stats['processed'] >= self.config.max_emails_per_run:
                        logger.info(f"Reached max emails per run: {self.config.max_emails_per_run}")
                        break
            
            # Actualizar config con last run info
            self.config.last_run_at = timezone.now()
            self.config.last_run_status = (
                f"Processed: {stats['processed']}, "
                f"Success: {stats['success']}, "
                f"Failed: {stats['failed']}, "
                f"Invoices: {stats['invoices_created']}"
            )
            self.config.save()
            
            elapsed = (datetime.now() - start_time).total_seconds()
            logger.info(f"Mailbox processing completed in {elapsed:.2f}s: {stats}")
            
            return {
                'status': 'completed',
                'elapsed_seconds': elapsed,
                **stats
            }
            
        except Exception as e:
            logger.error(f"Mailbox processing failed: {e}", exc_info=True)
            
            self.config.last_run_at = timezone.now()
            self.config.last_run_status = f"Error: {str(e)}"
            self.config.save()
            
            return {
                'status': 'error',
                'error': str(e),
                **stats
            }
    
    def _process_single_message(self, message: Dict, folder: str) -> Dict[str, any]:
        """
        Procesa un email individual.
        
        Args:
            message: Datos del mensaje de MS Graph
            folder: Carpeta donde se encontró
        
        Returns:
            Dict con resultado del procesamiento
        """
        message_id = message.get('id')
        internet_message_id = message.get('internetMessageId', message_id)
        subject = message.get('subject', 'No Subject')
        sender = message.get('from', {}).get('emailAddress', {}).get('address', 'unknown@sender.com')
        received_date = message.get('receivedDateTime')
        
        logger.info(f"Processing message: {subject} from {sender}")
        
        # Check if already processed
        if EmailProcessingLog.objects.filter(message_id=internet_message_id).exists():
            logger.debug(f"Message already processed: {internet_message_id}")
            return {'status': 'skipped', 'reason': 'already_processed'}
        
        # Check sender whitelist
        if self.config.sender_whitelist and sender not in self.config.sender_whitelist:
            logger.debug(f"Sender not in whitelist: {sender}")
            self._log_processing(
                message_id=internet_message_id,
                subject=subject,
                sender=sender,
                received_date=received_date,
                folder=folder,
                status='skipped',
                error_message=f"Sender not in whitelist: {sender}"
            )
            return {'status': 'skipped', 'reason': 'sender_not_whitelisted'}
        
        start_time = datetime.now()
        
        try:
            # Obtener attachments
            attachments = self.graph_client.list_attachments(message_id)
            
            if not attachments:
                logger.debug(f"No attachments in message: {subject}")
                self._log_processing(
                    message_id=internet_message_id,
                    subject=subject,
                    sender=sender,
                    received_date=received_date,
                    folder=folder,
                    attachment_count=0,
                    status='skipped',
                    error_message="No attachments found"
                )
                return {'status': 'skipped', 'reason': 'no_attachments'}
            
            # Filtrar attachments soportados
            valid_attachments = [
                att for att in attachments
                if any(att.get('name', '').lower().endswith(ext) for ext in self.SUPPORTED_EXTENSIONS)
            ]
            
            if not valid_attachments:
                logger.debug(f"No supported attachments in message: {subject}")
                self._log_processing(
                    message_id=internet_message_id,
                    subject=subject,
                    sender=sender,
                    received_date=received_date,
                    folder=folder,
                    attachment_count=len(attachments),
                    attachment_filenames=[att.get('name') for att in attachments],
                    status='skipped',
                    error_message="No supported file types found"
                )
                return {'status': 'skipped', 'reason': 'unsupported_files'}
            
            # Procesar cada attachment
            created_invoices = []
            errors = []
            
            for attachment in valid_attachments:
                try:
                    invoice = self._process_attachment(attachment, message_id, sender)
                    if invoice:
                        created_invoices.append(invoice)
                except Exception as e:
                    logger.error(f"Failed to process attachment {attachment.get('name')}: {e}")
                    errors.append(f"{attachment.get('name')}: {str(e)}")
            
            # Determinar status
            if created_invoices and not errors:
                status = 'success'
            elif created_invoices and errors:
                status = 'partial'
            else:
                status = 'failed'
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Crear log
            log = self._log_processing(
                message_id=internet_message_id,
                subject=subject,
                sender=sender,
                received_date=received_date,
                folder=folder,
                attachment_count=len(attachments),
                attachment_filenames=[att.get('name') for att in attachments],
                status=status,
                invoices_count=len(created_invoices),
                error_message='; '.join(errors) if errors else '',
                processing_time=processing_time
            )
            
            # Asociar facturas al log
            if created_invoices:
                log.invoices_created.set(created_invoices)
                
                # Contar auto-matched
                auto_matched = sum(1 for inv in created_invoices if inv.ot is not None)
                log.auto_matched_ots = auto_matched
                log.save()
            
            # Marcar como leído
            try:
                self.graph_client.mark_as_read(message_id)
            except Exception as e:
                logger.warning(f"Failed to mark message as read: {e}")
            
            return {
                'status': status,
                'invoices_count': len(created_invoices),
                'errors': errors
            }
            
        except Exception as e:
            logger.error(f"Failed to process message {subject}: {e}", exc_info=True)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            self._log_processing(
                message_id=internet_message_id,
                subject=subject,
                sender=sender,
                received_date=received_date,
                folder=folder,
                status='failed',
                error_message=str(e),
                processing_time=processing_time
            )
            
            return {
                'status': 'failed',
                'error': str(e)
            }
    
    def _process_attachment(
        self,
        attachment: Dict,
        message_id: str,
        sender_email: str
    ) -> Optional[Invoice]:
        """
        Procesa un attachment individual y crea una factura.
        
        Args:
            attachment: Datos del attachment de MS Graph
            message_id: ID del mensaje
            sender_email: Email del remitente
        
        Returns:
            Invoice creada o None si falla
        """
        filename = attachment.get('name', 'unknown.dat')
        content_type = attachment.get('contentType', 'application/octet-stream')
        
        logger.debug(f"Processing attachment: {filename}")
        
        # Descargar attachment completo si es necesario
        if 'contentBytes' not in attachment:
            attachment = self.graph_client.download_attachment(message_id, attachment['id'])
        
        # Decodificar content
        content_bytes_base64 = attachment.get('contentBytes', '')
        content_bytes = base64.b64decode(content_bytes_base64)
        
        # Crear UploadedFile
        uploaded_file = self._create_uploaded_file(filename, content_bytes, content_type)
        
        # Crear Invoice usando serializer con auto_parse
        invoice_data = {
            'file': uploaded_file.id,
            'auto_parse': self.config.auto_parse_enabled,
            'source': 'email',
        }
        
        # Crear usando serializer (esto triggerea el auto-parsing)
        serializer = InvoiceCreateSerializer(data=invoice_data)
        
        if serializer.is_valid():
            invoice = serializer.save()
            logger.info(f"Created invoice: {invoice.numero_factura} from {filename}")
            return invoice
        else:
            logger.error(f"Failed to create invoice from {filename}: {serializer.errors}")
            raise ValueError(f"Validation error: {serializer.errors}")
    
    def _create_uploaded_file(
        self,
        filename: str,
        content: bytes,
        content_type: str
    ) -> UploadedFile:
        """
        Crea registro de UploadedFile.
        
        Args:
            filename: Nombre del archivo
            content: Contenido en bytes
            content_type: MIME type
        
        Returns:
            UploadedFile instance
        """
        # Calcular hash
        sha256 = UploadedFile.calculate_hash(content)
        
        # Check si ya existe (deduplicación)
        existing = UploadedFile.objects.filter(sha256=sha256).first()
        if existing:
            logger.debug(f"File already exists with hash {sha256[:8]}, reusing")
            return existing
        
        # Crear path relativo
        date_path = datetime.now().strftime('%Y/%m')
        relative_path = f"invoices/email/{date_path}/{filename}"
        
        # Crear UploadedFile
        uploaded_file = UploadedFile.objects.create(
            filename=filename,
            path=relative_path,
            sha256=sha256,
            size=len(content),
            content_type=content_type
        )
        
        # TODO: Guardar archivo físicamente en storage
        # Por ahora solo creamos el registro
        
        logger.debug(f"Created UploadedFile: {uploaded_file.id}")
        return uploaded_file
    
    def _log_processing(
        self,
        message_id: str,
        subject: str,
        sender: str,
        received_date: str,
        folder: str,
        attachment_count: int = 0,
        attachment_filenames: List[str] = None,
        status: str = 'success',
        invoices_count: int = 0,
        error_message: str = '',
        processing_time: float = 0.0
    ) -> EmailProcessingLog:
        """
        Crea log de procesamiento de email.
        """
        # Parse received date
        if isinstance(received_date, str):
            received_dt = datetime.fromisoformat(received_date.replace('Z', '+00:00'))
        else:
            received_dt = received_date or timezone.now()
        
        log = EmailProcessingLog.objects.create(
            message_id=message_id,
            subject=subject,
            sender_email=sender,
            received_date=received_dt,
            folder_path=folder,
            attachment_count=attachment_count,
            attachment_filenames=attachment_filenames or [],
            status=status,
            invoices_count=invoices_count,
            error_message=error_message,
            processing_time_seconds=processing_time
        )
        
        logger.debug(f"Created EmailProcessingLog: {log.id}")
        return log
