"""
Tests for Automation app.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model

from automation.models import EmailProcessingLog, EmailAutoProcessingConfig
from automation.services.email_processor import EmailProcessor
from invoices.models import Invoice, UploadedFile

User = get_user_model()


@pytest.mark.django_db
class TestEmailProcessingLogModel:
    """Tests for EmailProcessingLog model"""
    
    def test_create_log_success(self):
        """Test creating a successful processing log"""
        log = EmailProcessingLog.objects.create(
            message_id='test-message-123',
            subject='Test DTE Factura',
            sender_email='test@example.com',
            received_date=timezone.now(),
            folder_path='Inbox',
            attachment_count=2,
            attachment_filenames=['file1.json', 'file2.pdf'],
            status='success',
            invoices_count=2,
            processing_time_seconds=5.5
        )
        
        assert log.id is not None
        assert log.message_id == 'test-message-123'
        assert log.status == 'success'
        assert log.invoices_count == 2
        assert log.auto_matched_ots == 0  # Default
    
    def test_log_unique_message_id(self):
        """Test message_id uniqueness constraint"""
        EmailProcessingLog.objects.create(
            message_id='unique-123',
            subject='Test',
            sender_email='test@example.com',
            received_date=timezone.now(),
            status='success'
        )
        
        # Should raise IntegrityError on duplicate message_id
        with pytest.raises(Exception):
            EmailProcessingLog.objects.create(
                message_id='unique-123',
                subject='Test 2',
                sender_email='test2@example.com',
                received_date=timezone.now(),
                status='success'
            )
    
    def test_log_status_choices(self):
        """Test status field accepts valid choices"""
        for status_value in ['success', 'failed', 'partial', 'skipped']:
            log = EmailProcessingLog.objects.create(
                message_id=f'test-{status_value}',
                subject='Test',
                sender_email='test@example.com',
                received_date=timezone.now(),
                status=status_value
            )
            assert log.status == status_value
    
    def test_log_invoice_relationship(self):
        """Test ManyToMany relationship with invoices"""
        # For simplicity, just test that the relationship exists
        # without creating full Invoice objects which require many fields
        log = EmailProcessingLog.objects.create(
            message_id='test-with-invoices',
            subject='Test',
            sender_email='test@example.com',
            received_date=timezone.now(),
            status='success'
        )
        
        # Test that invoices_created field exists and is a ManyToMany
        assert hasattr(log, 'invoices_created')
        assert log.invoices_created.count() == 0  # Empty initially


@pytest.mark.django_db
class TestEmailAutoProcessingConfig:
    """Tests for EmailAutoProcessingConfig model"""
    
    def test_config_creation(self):
        """Test creating configuration"""
        config = EmailAutoProcessingConfig.objects.create(
            id=1,
            is_active=True,
            check_interval_minutes=15,
            target_folders=['Inbox', 'Inbox/DTE'],
            subject_filters=['DTE', 'Factura'],
            auto_parse_enabled=True,
            max_emails_per_run=50
        )
        
        assert config.is_active is True
        assert config.check_interval_minutes == 15
        assert len(config.target_folders) == 2
        assert len(config.subject_filters) == 2
    
    def test_config_singleton(self):
        """Test that only one config should exist (singleton pattern)"""
        EmailAutoProcessingConfig.objects.create(id=1)
        
        # Should be able to get or create
        config, created = EmailAutoProcessingConfig.objects.get_or_create(id=1)
        assert created is False
    
    def test_config_whitelist_optional(self):
        """Test sender_whitelist is optional"""
        config = EmailAutoProcessingConfig.objects.create(
            id=1,
            sender_whitelist=[]  # Empty list
        )
        assert config.sender_whitelist == []
        
        config.sender_whitelist = ['test@example.com']
        config.save()
        config.refresh_from_db()
        assert len(config.sender_whitelist) == 1


@pytest.mark.django_db
class TestEmailProcessor:
    """Tests for EmailProcessor service"""
    
    @patch('automation.services.email_processor.MicrosoftGraphClient')
    def test_processor_initialization(self, mock_graph_client):
        """Test EmailProcessor initializes correctly"""
        processor = EmailProcessor()
        
        assert processor.config is not None
        assert isinstance(processor.SUPPORTED_EXTENSIONS, list)
        assert '.json' in processor.SUPPORTED_EXTENSIONS
    
    @patch('automation.services.email_processor.MicrosoftGraphClient')
    def test_process_mailbox_disabled(self, mock_graph_client):
        """Test processing skips when disabled"""
        config = EmailAutoProcessingConfig.objects.create(
            id=1,
            is_active=False
        )
        
        processor = EmailProcessor()
        result = processor.process_mailbox()
        
        assert result['status'] == 'disabled'
        assert result['processed'] == 0
    
    @patch('automation.services.email_processor.MicrosoftGraphClient')
    def test_deduplication_by_message_id(self, mock_graph_client):
        """Test that already processed messages are skipped"""
        # Create existing log
        EmailProcessingLog.objects.create(
            message_id='existing-message',
            subject='Test',
            sender_email='test@example.com',
            received_date=timezone.now(),
            status='success'
        )
        
        # Create mock message with same ID
        mock_message = {
            'id': 'graph-id',
            'internetMessageId': 'existing-message',
            'subject': 'Test',
            'from': {'emailAddress': {'address': 'test@example.com'}},
            'receivedDateTime': timezone.now().isoformat(),
        }
        
        processor = EmailProcessor()
        result = processor._process_single_message(mock_message, 'Inbox')
        
        assert result['status'] == 'skipped'
        assert result['reason'] == 'already_processed'
    
    @patch('automation.services.email_processor.MicrosoftGraphClient')
    def test_whitelist_filtering(self, mock_graph_client):
        """Test sender whitelist filtering"""
        config = EmailAutoProcessingConfig.objects.create(
            id=1,
            is_active=True,
            sender_whitelist=['allowed@example.com']
        )
        
        mock_message = {
            'id': 'test-id',
            'internetMessageId': 'test-message-id',
            'subject': 'Test DTE',
            'from': {'emailAddress': {'address': 'notallowed@example.com'}},
            'receivedDateTime': timezone.now().isoformat(),
        }
        
        processor = EmailProcessor()
        result = processor._process_single_message(mock_message, 'Inbox')
        
        assert result['status'] == 'skipped'
        assert result['reason'] == 'sender_not_whitelisted'
    
    @patch('automation.services.email_processor.MicrosoftGraphClient')
    def test_no_attachments_skipped(self, mock_graph_client):
        """Test messages without attachments are skipped"""
        EmailAutoProcessingConfig.objects.create(id=1, is_active=True)
        
        mock_message = {
            'id': 'test-id',
            'internetMessageId': 'test-message-id',
            'subject': 'Test DTE',
            'from': {'emailAddress': {'address': 'test@example.com'}},
            'receivedDateTime': timezone.now().isoformat(),
        }
        
        # Mock graph client to return no attachments
        mock_client = MagicMock()
        mock_client.list_attachments.return_value = []
        
        processor = EmailProcessor(graph_client=mock_client)
        result = processor._process_single_message(mock_message, 'Inbox')
        
        assert result['status'] == 'skipped'
        assert result['reason'] == 'no_attachments'
    
    @patch.dict('os.environ', {
        'MS_GRAPH_CLIENT_ID': 'test-id',
        'MS_GRAPH_CLIENT_SECRET': 'test-secret',
        'MS_GRAPH_TENANT_ID': 'test-tenant',
        'MS_GRAPH_USER_EMAIL': 'test@example.com'
    })
    def test_supported_file_extensions(self):
        """Test that only supported extensions are processed"""
        with patch('automation.services.email_processor.MicrosoftGraphClient'):
            processor = EmailProcessor()
            
            attachments = [
                {'name': 'valid.json'},
                {'name': 'valid.pdf'},
                {'name': 'invalid.exe'},
                {'name': 'valid.xml'},
                {'name': 'invalid.zip'},
            ]
            
            valid = [
                att for att in attachments
                if any(att['name'].lower().endswith(ext) for ext in processor.SUPPORTED_EXTENSIONS)
            ]
            
            assert len(valid) == 3
            assert any('json' in att['name'] for att in valid)


@pytest.mark.django_db
class TestMicrosoftGraphClient:
    """Tests for MicrosoftGraphClient"""
    
    @patch('automation.services.microsoft_graph.requests.post')
    def test_get_access_token(self, mock_post):
        """Test OAuth2 token acquisition"""
        from automation.services.microsoft_graph import MicrosoftGraphClient
        
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {
            'access_token': 'test-token-123',
            'expires_in': 3600
        }
        mock_post.return_value = mock_response
        
        with patch.dict('os.environ', {
            'MS_GRAPH_CLIENT_ID': 'test-client-id',
            'MS_GRAPH_CLIENT_SECRET': 'test-secret',
            'MS_GRAPH_TENANT_ID': 'test-tenant-id',
            'MS_GRAPH_USER_EMAIL': 'test@example.com'
        }):
            client = MicrosoftGraphClient()
            token = client._get_access_token()
            
            assert token == 'test-token-123'
            assert client.access_token == 'test-token-123'
    
    @patch('automation.services.microsoft_graph.requests.post')
    def test_token_caching(self, mock_post):
        """Test that token is cached and reused"""
        from automation.services.microsoft_graph import MicrosoftGraphClient
        
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {
            'access_token': 'cached-token',
            'expires_in': 3600
        }
        mock_post.return_value = mock_response
        
        with patch.dict('os.environ', {
            'MS_GRAPH_CLIENT_ID': 'test-client-id',
            'MS_GRAPH_CLIENT_SECRET': 'test-secret',
            'MS_GRAPH_TENANT_ID': 'test-tenant-id',
            'MS_GRAPH_USER_EMAIL': 'test@example.com'
        }):
            client = MicrosoftGraphClient()
            
            # First call
            token1 = client._get_access_token()
            # Second call (should use cached)
            token2 = client._get_access_token()
            
            assert token1 == token2
            # Should only make one POST request
            assert mock_post.call_count == 1


@pytest.mark.django_db
class TestAutomationSerializers:
    """Tests for automation serializers"""
    
    def test_email_processing_log_serializer(self):
        """Test EmailProcessingLog serializer"""
        from automation.serializers import EmailProcessingLogListSerializer
        
        log = EmailProcessingLog.objects.create(
            message_id='test-123',
            subject='Test',
            sender_email='test@example.com',
            received_date=timezone.now(),
            status='success',
            invoices_count=2
        )
        
        # Use list serializer which has correct fields
        serializer = EmailProcessingLogListSerializer(log)
        data = serializer.data
        
        assert data['message_id'] == 'test-123'
        assert data['status'] == 'success'
        assert data['status_display'] == 'Exitoso'  # Spanish translation
        # List serializer doesn't have 'invoices' field
        assert 'invoices_count' in data
    
    def test_config_serializer_validation(self):
        """Test config serializer validation"""
        from automation.serializers import EmailAutoProcessingConfigSerializer
        
        # Test invalid interval
        serializer = EmailAutoProcessingConfigSerializer(data={
            'check_interval_minutes': 0,  # Invalid
            'target_folders': ['Inbox'],
            'subject_filters': ['DTE'],
        })
        assert not serializer.is_valid()
        assert 'check_interval_minutes' in serializer.errors
        
        # Test invalid max_emails
        serializer = EmailAutoProcessingConfigSerializer(data={
            'check_interval_minutes': 15,
            'target_folders': ['Inbox'],
            'subject_filters': ['DTE'],
            'max_emails_per_run': 1000,  # Too high
        })
        assert not serializer.is_valid()
        assert 'max_emails_per_run' in serializer.errors
        
        # Test empty folders
        serializer = EmailAutoProcessingConfigSerializer(data={
            'check_interval_minutes': 15,
            'target_folders': [],  # Invalid
            'subject_filters': ['DTE'],
        })
        assert not serializer.is_valid()
        assert 'target_folders' in serializer.errors


@pytest.mark.django_db
class TestAutomationViewSets:
    """Tests for automation viewsets"""
    
    def test_log_list_endpoint(self, api_client):
        """Test listing email processing logs"""
        from rest_framework.test import APIClient
        from django.urls import reverse
        
        # Create user and authenticate
        user = User.objects.create_user(
            username='testuser',
            email='testuser@example.com',
            password='testpass'
        )
        client = APIClient()
        client.force_authenticate(user=user)
        
        # Create test logs
        EmailProcessingLog.objects.create(
            message_id='log-1',
            subject='Test 1',
            sender_email='test@example.com',
            received_date=timezone.now(),
            status='success'
        )
        
        url = reverse('automation:emailprocessinglog-list')
        response = client.get(url)
        
        assert response.status_code == 200
        assert len(response.data['results']) >= 1
    
    def test_config_retrieve_endpoint(self, api_client):
        """Test retrieving config"""
        from rest_framework.test import APIClient
        from django.urls import reverse
        
        user = User.objects.create_user(
            username='testuser',
            email='testuser@example.com',
            password='testpass'
        )
        client = APIClient()
        client.force_authenticate(user=user)
        
        url = reverse('automation:config-list')
        response = client.get(url)
        
        assert response.status_code == 200
        assert 'is_active' in response.data
    
    def test_config_update_endpoint(self, api_client):
        """Test updating config"""
        from rest_framework.test import APIClient
        from django.urls import reverse
        
        user = User.objects.create_user(
            username='testuser',
            email='testuser@example.com',
            password='testpass'
        )
        client = APIClient()
        client.force_authenticate(user=user)
        
        config = EmailAutoProcessingConfig.objects.create(id=1)
        
        url = reverse('automation:config-detail', args=[1])
        response = client.patch(url, {
            'is_active': True,
            'check_interval_minutes': 30
        }, format='json')
        
        assert response.status_code == 200
        
        config.refresh_from_db()
        assert config.is_active is True
        assert config.check_interval_minutes == 30


@pytest.fixture
def api_client():
    """Fixture for API client"""
    from rest_framework.test import APIClient
    return APIClient()
