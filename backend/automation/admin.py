"""
Admin configuration para el módulo de automation.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import EmailProcessingLog, EmailAutoProcessingConfig


@admin.register(EmailProcessingLog)
class EmailProcessingLogAdmin(admin.ModelAdmin):
    """Admin para EmailProcessingLog"""
    
    list_display = [
        'id',
        'subject_truncated',
        'sender_email',
        'received_date',
        'status_badge',
        'invoices_count',
        'auto_matched_ots',
        'attachment_count',
        'processing_time_seconds',
    ]
    
    list_filter = [
        'status',
        'received_date',
        'sender_email',
        'folder_path',
    ]
    
    search_fields = [
        'message_id',
        'subject',
        'sender_email',
        'error_message',
    ]
    
    readonly_fields = [
        'message_id',
        'subject',
        'sender_email',
        'received_date',
        'attachment_count',
        'attachment_filenames',
        'status',
        'invoices_count',
        'error_message',
        'processing_time_seconds',
        'folder_path',
        'auto_matched_ots',
        'created_at',
        'updated_at',
        'invoices_list',
    ]
    
    fieldsets = (
        ('Email Information', {
            'fields': (
                'message_id',
                'subject',
                'sender_email',
                'received_date',
                'folder_path',
            )
        }),
        ('Attachments', {
            'fields': (
                'attachment_count',
                'attachment_filenames',
            )
        }),
        ('Processing Results', {
            'fields': (
                'status',
                'invoices_count',
                'auto_matched_ots',
                'processing_time_seconds',
                'invoices_list',
            )
        }),
        ('Errors', {
            'fields': (
                'error_message',
            ),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': (
                'created_at',
                'updated_at',
            ),
            'classes': ('collapse',),
        }),
    )
    
    date_hierarchy = 'received_date'
    
    def subject_truncated(self, obj):
        """Truncate subject for display"""
        if len(obj.subject) > 60:
            return f"{obj.subject[:60]}..."
        return obj.subject
    subject_truncated.short_description = 'Subject'
    
    def status_badge(self, obj):
        """Display status with color badge"""
        colors = {
            'success': 'green',
            'failed': 'red',
            'partial': 'orange',
            'skipped': 'gray',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def invoices_list(self, obj):
        """Display list of created invoices with links"""
        invoices = obj.invoices_created.all()
        if not invoices:
            return "No invoices created"
        
        links = []
        for invoice in invoices:
            url = f"/admin/invoices/invoice/{invoice.id}/change/"
            links.append(
                f'<a href="{url}" target="_blank">{invoice.numero_factura}</a>'
            )
        
        return format_html('<br>'.join(links))
    invoices_list.short_description = 'Created Invoices'
    
    def has_add_permission(self, request):
        """No se permite crear logs manualmente"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Permitir eliminar logs antiguos"""
        return True


@admin.register(EmailAutoProcessingConfig)
class EmailAutoProcessingConfigAdmin(admin.ModelAdmin):
    """Admin para EmailAutoProcessingConfig"""
    
    list_display = [
        'id',
        'is_active_badge',
        'check_interval_minutes',
        'max_emails_per_run',
        'auto_parse_enabled',
        'last_run_at',
        'last_run_status_truncated',
    ]
    
    fieldsets = (
        ('Status', {
            'fields': (
                'is_active',
                'check_interval_minutes',
                'max_emails_per_run',
            )
        }),
        ('Email Filtering', {
            'fields': (
                'target_folders',
                'subject_filters',
                'sender_whitelist',
            )
        }),
        ('Processing Options', {
            'fields': (
                'auto_parse_enabled',
            )
        }),
        ('Last Run Info', {
            'fields': (
                'last_run_at',
                'last_run_status',
            ),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': (
                'created_at',
                'updated_at',
            ),
            'classes': ('collapse',),
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'last_run_at', 'last_run_status']
    
    def is_active_badge(self, obj):
        """Display active status with badge"""
        if obj.is_active:
            return format_html(
                '<span style="background-color: green; color: white; padding: 3px 10px; '
                'border-radius: 3px; font-weight: bold;">ACTIVE</span>'
            )
        else:
            return format_html(
                '<span style="background-color: red; color: white; padding: 3px 10px; '
                'border-radius: 3px; font-weight: bold;">INACTIVE</span>'
            )
    is_active_badge.short_description = 'Status'
    
    def last_run_status_truncated(self, obj):
        """Truncate last run status"""
        if not obj.last_run_status:
            return "-"
        if len(obj.last_run_status) > 50:
            return f"{obj.last_run_status[:50]}..."
        return obj.last_run_status
    last_run_status_truncated.short_description = 'Last Run Status'
    
    def has_add_permission(self, request):
        """Solo permitir una configuración"""
        if EmailAutoProcessingConfig.objects.exists():
            return False
        return True
    
    def has_delete_permission(self, request, obj=None):
        """No permitir eliminar la configuración"""
        return False
