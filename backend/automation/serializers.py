"""
Serializers for Automation app.
"""

from rest_framework import serializers
from automation.models import EmailProcessingLog, EmailAutoProcessingConfig


class EmailProcessingLogSerializer(serializers.ModelSerializer):
    """
    Serializer for EmailProcessingLog (read-only).
    """
    invoices = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = EmailProcessingLog
        fields = [
            'id',
            'message_id',
            'subject',
            'sender_email',
            'received_date',
            'created_at',  # Changed from processed_at
            'folder_path',
            'attachment_count',
            'attachment_filenames',
            'status',
            'status_display',
            'invoices_count',
            'invoices',
            'auto_matched_ots',
            'error_message',
            'processing_time_seconds',
        ]
        read_only_fields = fields  # All fields are read-only
    
    def get_invoices(self, obj):
        """Return list of created invoice IDs and numbers"""
        return [
            {
                'id': invoice.id,
                'numero_factura': invoice.numero_factura,
                'proveedor': invoice.proveedor,
                'monto_total': str(invoice.monto_total) if invoice.monto_total else None,
            }
            for invoice in obj.invoices_created.all()
        ]


class EmailProcessingLogListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list view.
    """
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = EmailProcessingLog
        fields = [
            'id',
            'message_id',
            'subject',
            'sender_email',
            'received_date',
            'created_at',  # Changed from processed_at
            'status',
            'status_display',
            'invoices_count',
            'auto_matched_ots',
            'processing_time_seconds',
        ]
        read_only_fields = fields


class EmailAutoProcessingConfigSerializer(serializers.ModelSerializer):
    """
    Serializer for EmailAutoProcessingConfig.
    """
    last_run_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = EmailAutoProcessingConfig
        fields = [
            'id',
            'is_active',
            'check_interval_minutes',
            'target_folders',
            'subject_filters',
            'sender_whitelist',
            'auto_parse_enabled',
            'max_emails_per_run',
            'last_run_at',
            'last_run_status',
            'last_run_ago',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'last_run_at', 'last_run_status', 'created_at', 'updated_at']
    
    def get_last_run_ago(self, obj):
        """Return human-readable time since last run"""
        if not obj.last_run_at:
            return None
        
        from django.utils import timezone
        delta = timezone.now() - obj.last_run_at
        
        if delta.days > 0:
            return f"{delta.days} days ago"
        elif delta.seconds >= 3600:
            hours = delta.seconds // 3600
            return f"{hours} hours ago"
        elif delta.seconds >= 60:
            minutes = delta.seconds // 60
            return f"{minutes} minutes ago"
        else:
            return "Just now"
    
    def validate_check_interval_minutes(self, value):
        """Validate interval is reasonable"""
        if value < 1:
            raise serializers.ValidationError("Interval must be at least 1 minute")
        if value > 1440:  # 24 hours
            raise serializers.ValidationError("Interval cannot exceed 24 hours (1440 minutes)")
        return value
    
    def validate_max_emails_per_run(self, value):
        """Validate max emails is reasonable"""
        if value < 1:
            raise serializers.ValidationError("Must process at least 1 email")
        if value > 500:
            raise serializers.ValidationError("Cannot process more than 500 emails per run")
        return value
    
    def validate_target_folders(self, value):
        """Validate folders list is not empty"""
        if not value or len(value) == 0:
            raise serializers.ValidationError("At least one target folder is required")
        return value
    
    def validate_subject_filters(self, value):
        """Validate subject filters"""
        if not value or len(value) == 0:
            raise serializers.ValidationError("At least one subject filter is required")
        return value


class ManualProcessRequestSerializer(serializers.Serializer):
    """
    Serializer for manual email processing request.
    """
    folder = serializers.CharField(
        required=False,
        max_length=255,
        help_text="Specific folder to process (optional)"
    )
    max_emails = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=100,
        help_text="Maximum emails to process (optional, default: 10)"
    )
    subject = serializers.CharField(
        required=False,
        max_length=255,
        help_text="Subject keyword to search for (optional)"
    )
    
    def validate_max_emails(self, value):
        """Ensure max_emails is reasonable for manual processing"""
        if value > 100:
            raise serializers.ValidationError("Manual processing limited to 100 emails")
        return value
