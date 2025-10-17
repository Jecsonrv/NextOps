
import pytest
from django.utils import timezone
from decimal import Decimal
from rest_framework.test import APIRequestFactory, force_authenticate
from invoices.views import CreditNoteViewSet
from invoices.models import Invoice, Provider, UploadedFile
from accounts.models import User

@pytest.mark.django_db
def test_credit_note_manual_creation_default_date(mocker):
    """
    Tests that the manual credit note creation uses the local date as default for fecha_emision.
    """
    # 1. Mock timezone.localdate to return a fixed date
    mock_date = timezone.datetime(2025, 10, 16).date()
    mocker.patch('django.utils.timezone.localdate', return_value=mock_date)

    # 2. Create prerequisite objects
    user = User.objects.create(username='testuser')
    provider = Provider.objects.create(nombre='Test Provider')
    uploaded_file_invoice = UploadedFile.objects.create(filename='invoice.pdf', path='invoice.pdf', sha256='a'*64, size=100)
    invoice = Invoice.objects.create(
        numero_factura='INV-001',
        proveedor=provider,
        proveedor_nombre='Test Provider',
        monto=Decimal('1000.00'),
        fecha_emision=mock_date,
        uploaded_file=uploaded_file_invoice
    )

    # 3. Create a request to the 'manual' action
    factory = APIRequestFactory()
    data = {
        'numero_nota': 'NC-001',
        'invoice_id': invoice.id,
        'monto': '100.00',
        'motivo': 'Test',
        # 'fecha_emision' is omitted to test the default value
    }
    request = factory.post('/api/invoices/credit-notes/manual/', data)
    force_authenticate(request, user=user)

    # 4. Instantiate and call the viewset action
    view = CreditNoteViewSet.as_view({'post': 'manual'})
    response = view(request)

    # 5. Assertions
    assert response.status_code == 201, "Should create the credit note successfully"
    assert response.data['fecha_emision'] == mock_date.isoformat(), "Fecha de emision should be the mocked local date"
