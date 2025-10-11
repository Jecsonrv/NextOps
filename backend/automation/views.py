"""
ViewSets for Automation app.
"""

from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from automation.models import EmailProcessingLog, EmailAutoProcessingConfig
from automation.serializers import (
    EmailProcessingLogSerializer,
    EmailProcessingLogListSerializer,
    EmailAutoProcessingConfigSerializer,
    ManualProcessRequestSerializer,
)


class EmailProcessingLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for EmailProcessingLog.
    
    Read-only access to email processing logs.
    
    list: Get list of all processing logs
    retrieve: Get details of a specific log
    stats: Get processing statistics
    """
    queryset = EmailProcessingLog.objects.all().order_by('-created_at')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    # Filters
    filterset_fields = {
        'status': ['exact'],
        'sender_email': ['exact', 'icontains'],
        'created_at': ['gte', 'lte', 'date'],  # Changed from processed_at
        'received_date': ['gte', 'lte', 'date'],
        'folder_path': ['exact', 'icontains'],
    }
    
    # Search
    search_fields = ['message_id', 'subject', 'sender_email', 'error_message']
    
    # Ordering
    ordering_fields = ['created_at', 'received_date', 'processing_time_seconds', 'invoices_count']  # Changed from processed_at
    ordering = ['-created_at']  # Changed from processed_at
    
    def get_serializer_class(self):
        """Use lightweight serializer for list view"""
        if self.action == 'list':
            return EmailProcessingLogListSerializer
        return EmailProcessingLogSerializer
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get processing statistics.
        
        Query params:
        - days: Number of days to look back (default: 7)
        """
        from django.db.models import Count, Sum, Avg, Q
        from django.utils import timezone
        from datetime import timedelta
        
        days = int(request.query_params.get('days', 7))
        since = timezone.now() - timedelta(days=days)
        
        logs = self.get_queryset().filter(created_at__gte=since)  # Changed from processed_at
        
        stats = logs.aggregate(
            total=Count('id'),
            success=Count('id', filter=Q(status='success')),
            failed=Count('id', filter=Q(status='failed')),
            partial=Count('id', filter=Q(status='partial')),
            skipped=Count('id', filter=Q(status='skipped')),
            total_invoices=Sum('invoices_count'),
            total_auto_matched=Sum('auto_matched_ots'),
            avg_processing_time=Avg('processing_time_seconds'),
        )
        
        # Calculate success rate
        total = stats['total'] or 0
        success_rate = (stats['success'] / total * 100) if total > 0 else 0
        
        # Get most common errors
        error_logs = logs.filter(status='failed').exclude(error_message='')
        top_errors = error_logs.values('error_message').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        # Get top senders
        top_senders = logs.values('sender_email').annotate(
            count=Count('id'),
            invoices=Sum('invoices_count')
        ).order_by('-count')[:10]
        
        return Response({
            'period_days': days,
            'summary': {
                'total_processed': total,
                'success': stats['success'],
                'failed': stats['failed'],
                'partial': stats['partial'],
                'skipped': stats['skipped'],
                'success_rate': round(success_rate, 2),
                'total_invoices_created': stats['total_invoices'] or 0,
                'total_auto_matched_ots': stats['total_auto_matched'] or 0,
                'avg_processing_time_seconds': round(stats['avg_processing_time'] or 0, 2),
            },
            'top_errors': list(top_errors),
            'top_senders': list(top_senders),
        })
    
    @action(detail=True, methods=['get'])
    def retry(self, request, pk=None):
        """
        Retry processing a failed email.
        
        Note: This triggers the manual_process_single_email Celery task.
        """
        log = self.get_object()
        
        if log.status == 'success':
            return Response(
                {'error': 'Cannot retry successful processing'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Import here to avoid circular dependency
        from automation.tasks import manual_process_single_email
        
        # Trigger Celery task
        task = manual_process_single_email.delay(log.message_id)
        
        return Response({
            'message': 'Retry task queued',
            'task_id': task.id,
            'log_id': log.id,
        }, status=status.HTTP_202_ACCEPTED)


class EmailAutoProcessingConfigViewSet(mixins.RetrieveModelMixin,
                                       mixins.UpdateModelMixin,
                                       mixins.ListModelMixin,
                                       viewsets.GenericViewSet):
    """
    ViewSet for EmailAutoProcessingConfig.
    
    Singleton configuration - only one instance exists.
    
    list: Get current configuration
    retrieve: Get configuration details
    update: Update configuration (PUT)
    partial_update: Partially update configuration (PATCH)
    trigger_processing: Manually trigger email processing
    test_connection: Test MS Graph API connection
    """
    queryset = EmailAutoProcessingConfig.objects.all()
    serializer_class = EmailAutoProcessingConfigSerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request, *args, **kwargs):
        """Return the singleton config"""
        config, created = EmailAutoProcessingConfig.objects.get_or_create(
            id=1,
            defaults={
                'is_active': False,
                'check_interval_minutes': 15,
                'target_folders': ['Inbox'],
                'subject_filters': ['DTE', 'Factura', 'Invoice'],
                'auto_parse_enabled': True,
                'max_emails_per_run': 50,
            }
        )
        serializer = self.get_serializer(config)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        """Get config by ID (always returns config with id=1)"""
        config, created = EmailAutoProcessingConfig.objects.get_or_create(id=1)
        serializer = self.get_serializer(config)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def trigger_processing(self, request):
        """
        Manually trigger email processing.
        
        Body params (all optional):
        - folder: Specific folder to process
        - max_emails: Maximum emails to process (default: 10)
        - subject: Subject keyword to search for
        """
        serializer = ManualProcessRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Import here to avoid circular dependency
        from automation.tasks import process_dte_mailbox
        
        # Trigger Celery task
        task = process_dte_mailbox.delay()
        
        return Response({
            'message': 'Email processing task queued',
            'task_id': task.id,
            'params': serializer.validated_data,
        }, status=status.HTTP_202_ACCEPTED)
    
    @action(detail=False, methods=['post'])
    def test_connection(self, request):
        """
        Test MS Graph API connection.
        
        Returns connection status and any errors.
        """
        from automation.services.microsoft_graph import MicrosoftGraphClient
        
        try:
            client = MicrosoftGraphClient()
            token = client._get_access_token()
            
            if token:
                return Response({
                    'status': 'success',
                    'message': 'Successfully connected to MS Graph API',
                    'token_preview': f"{token[:20]}...",
                })
            else:
                return Response({
                    'status': 'error',
                    'message': 'Failed to get access token',
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e),
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """
        Get current processing status.
        
        Returns configuration status, last run info, and Celery worker status.
        """
        config, created = EmailAutoProcessingConfig.objects.get_or_create(id=1)
        
        # Check Celery worker status
        from celery import current_app
        
        try:
            inspector = current_app.control.inspect()
            active_workers = inspector.active()
            worker_available = active_workers is not None and len(active_workers) > 0
        except Exception:
            worker_available = False
        
        return Response({
            'is_active': config.is_active,
            'last_run_at': config.last_run_at,
            'last_run_status': config.last_run_status,
            'check_interval_minutes': config.check_interval_minutes,
            'celery_worker_available': worker_available,
            'configuration_complete': bool(
                config.target_folders and 
                config.subject_filters and 
                config.check_interval_minutes > 0
            ),
        })
