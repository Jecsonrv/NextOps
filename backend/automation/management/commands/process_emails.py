"""
Django Management Command to Process DTE Emails Manually.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from automation.services.email_processor import EmailProcessor
from automation.models import EmailAutoProcessingConfig


class Command(BaseCommand):
    help = 'Process DTE emails manually without using Celery'

    def add_arguments(self, parser):
        parser.add_argument(
            '--folder',
            type=str,
            default=None,
            help='Specific folder to process (overrides config)'
        )
        
        parser.add_argument(
            '--max-emails',
            type=int,
            default=None,
            help='Maximum emails to process (overrides config)'
        )
        
        parser.add_argument(
            '--subject',
            type=str,
            default=None,
            help='Subject keyword to search for (overrides config)'
        )
        
        parser.add_argument(
            '--test-connection',
            action='store_true',
            help='Test MS Graph API connection only'
        )
        
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='List emails without processing them'
        )

    def handle(self, *args, **options):
        """Execute command"""
        
        # Test connection mode
        if options['test_connection']:
            self.test_connection()
            return
        
        # Dry run mode
        if options['dry_run']:
            self.dry_run(options)
            return
        
        # Normal processing
        self.process_emails(options)
    
    def test_connection(self):
        """Test MS Graph API connection"""
        from automation.services.microsoft_graph import MicrosoftGraphClient
        
        self.stdout.write(self.style.WARNING('Testing MS Graph API connection...'))
        
        try:
            client = MicrosoftGraphClient()
            token = client._get_access_token()
            
            if token:
                self.stdout.write(self.style.SUCCESS('✓ Connection successful!'))
                self.stdout.write(f'Token acquired: {token[:20]}...')
            else:
                self.stdout.write(self.style.ERROR('✗ Failed to acquire token'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Connection failed: {e}'))
    
    def dry_run(self, options):
        """List emails without processing"""
        from automation.services.microsoft_graph import MicrosoftGraphClient
        
        self.stdout.write(self.style.WARNING('DRY RUN - Listing emails without processing...'))
        
        try:
            client = MicrosoftGraphClient()
            
            # Get config or use defaults
            try:
                config = EmailAutoProcessingConfig.objects.get(id=1)
            except EmailAutoProcessingConfig.DoesNotExist:
                self.stdout.write(self.style.WARNING('No config found, using defaults'))
                config = EmailAutoProcessingConfig(
                    target_folders=['Inbox'],
                    subject_filters=['DTE', 'Factura'],
                    max_emails_per_run=50
                )
            
            # Override with command options
            folders = [options['folder']] if options['folder'] else config.target_folders
            keywords = [options['subject']] if options['subject'] else config.subject_filters
            max_emails = options['max_emails'] or config.max_emails_per_run
            
            self.stdout.write(f'Folders: {folders}')
            self.stdout.write(f'Keywords: {keywords}')
            self.stdout.write(f'Max emails: {max_emails}')
            self.stdout.write('')
            
            # List messages
            total_found = 0
            
            for folder in folders:
                self.stdout.write(f'\nFolder: {folder}')
                self.stdout.write('─' * 80)
                
                messages = client.search_messages_by_subject(
                    keywords=keywords,
                    folder=folder,
                    days_back=7,
                    max_results=max_emails
                )
                
                total_found += len(messages)
                
                if not messages:
                    self.stdout.write(self.style.WARNING('  No messages found'))
                    continue
                
                for i, msg in enumerate(messages, 1):
                    subject = msg.get('subject', 'No subject')
                    sender = msg.get('from', {}).get('emailAddress', {}).get('address', 'Unknown')
                    received = msg.get('receivedDateTime', 'Unknown')
                    has_attachments = msg.get('hasAttachments', False)
                    
                    self.stdout.write(f'\n  {i}. {subject}')
                    self.stdout.write(f'     From: {sender}')
                    self.stdout.write(f'     Received: {received}')
                    self.stdout.write(f'     Attachments: {"Yes" if has_attachments else "No"}')
            
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS(f'\nTotal messages found: {total_found}'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Dry run failed: {e}'))
    
    def process_emails(self, options):
        """Process emails"""
        self.stdout.write(self.style.WARNING('Starting email processing...'))
        self.stdout.write('')
        
        try:
            # Create processor
            processor = EmailProcessor()
            
            # Override config if options provided
            if options['folder']:
                processor.config.target_folders = [options['folder']]
                self.stdout.write(f'Using folder: {options["folder"]}')
            
            if options['max_emails']:
                processor.config.max_emails_per_run = options['max_emails']
                self.stdout.write(f'Max emails: {options["max_emails"]}')
            
            if options['subject']:
                processor.config.subject_filters = [options['subject']]
                self.stdout.write(f'Subject filter: {options["subject"]}')
            
            self.stdout.write('')
            self.stdout.write('Processing...')
            self.stdout.write('─' * 80)
            
            # Process mailbox
            result = processor.process_mailbox()
            
            # Display results
            self.stdout.write('')
            self.stdout.write('─' * 80)
            self.stdout.write(self.style.SUCCESS('Processing completed!'))
            self.stdout.write('')
            
            self.stdout.write(f'Status: {result.get("status")}')
            self.stdout.write(f'Processed: {result.get("processed", 0)}')
            self.stdout.write(f'Success: {result.get("success", 0)}')
            self.stdout.write(f'Failed: {result.get("failed", 0)}')
            self.stdout.write(f'Skipped: {result.get("skipped", 0)}')
            self.stdout.write(f'Invoices Created: {result.get("invoices_created", 0)}')
            
            if 'elapsed_seconds' in result:
                self.stdout.write(f'Elapsed: {result["elapsed_seconds"]:.2f} seconds')
            
            if result.get('status') == 'error':
                self.stdout.write(self.style.ERROR(f'Error: {result.get("error")}'))
            
            # Summary
            self.stdout.write('')
            
            if result.get('success', 0) > 0:
                self.stdout.write(self.style.SUCCESS('✓ Emails processed successfully'))
            
            if result.get('failed', 0) > 0:
                self.stdout.write(self.style.WARNING(f'⚠ {result.get("failed")} emails failed'))
                self.stdout.write('  Check EmailProcessingLog in admin for details')
            
            if result.get('invoices_created', 0) > 0:
                self.stdout.write(self.style.SUCCESS(f'✓ Created {result.get("invoices_created")} invoices'))
            
        except Exception as e:
            self.stdout.write('')
            self.stdout.write(self.style.ERROR(f'✗ Processing failed: {e}'))
            import traceback
            traceback.print_exc()
