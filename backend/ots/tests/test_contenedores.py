import pandas as pd
import pytest
from django.core.exceptions import ValidationError

from client_aliases.models import ClientAlias
from ots.models import OT
from ots.serializers import OTDetailSerializer
from ots.services.excel_processor import ExcelProcessor


@pytest.mark.django_db
def test_ot_normalizes_container_numbers_on_save():
    client = ClientAlias.objects.create(
        original_name="Cliente Uno",
        normalized_name="CLIENTE UNO",
        country="GT",
    )

    ot = OT.objects.create(
        numero_ot="ot-001",
        cliente=client,
        contenedores=[
            {"numero": "mscu1234567"},
            "mscu1234567 ",
            "MSCU-1234567",
            " CMAU7654321",
            {"numero": "cmau7654321"},
        ],
    )

    assert ot.contenedores == ["MSCU1234567", "CMAU7654321"]


@pytest.mark.django_db
def test_add_contenedor_prevents_duplicates():
    client = ClientAlias.objects.create(
        original_name="Cliente Dos",
        normalized_name="CLIENTE DOS",
        country="GT",
    )
    ot = OT.objects.create(
        numero_ot="ot-002",
        cliente=client,
        contenedores=["MSCU1234567"],
    )

    with pytest.raises(ValidationError):
        ot.add_contenedor("mscu1234567")


@pytest.mark.django_db
def test_add_contenedor_validates_format():
    client = ClientAlias.objects.create(
        original_name="Cliente Tres",
        normalized_name="CLIENTE TRES",
        country="GT",
    )
    ot = OT.objects.create(
        numero_ot="ot-003",
        cliente=client,
    )

    ot.add_contenedor("maeu-0000001")
    assert ot.contenedores == ["MAEU0000001"]

    with pytest.raises(ValidationError):
        ot.add_contenedor("BAD123")


@pytest.mark.django_db
def test_ot_detail_serializer_handles_string_list():
    client = ClientAlias.objects.create(
        original_name="Cliente Cuatro",
        normalized_name="CLIENTE CUATRO",
        country="GT",
    )
    ot = OT.objects.create(
        numero_ot="ot-004",
        cliente=client,
        contenedores=["MSCU1234567"],
    )

    serializer = OTDetailSerializer(
        instance=ot,
        data={"contenedores": ["mscu1234567", " CMAU7654321", "MSCU1234567"]},
        partial=True,
    )
    assert serializer.is_valid(), serializer.errors

    updated_ot = serializer.save()
    assert updated_ot.contenedores == ["MSCU1234567", "CMAU7654321"]

    serialized = OTDetailSerializer(instance=updated_ot)
    assert serialized.data["contenedores"] == ["MSCU1234567", "CMAU7654321"]


def test_excel_processor_extract_contenedores_normalizes_and_deduplicates():
    processor = ExcelProcessor()
    row = pd.Series({"contenedor": "MSCU1234567, mscu1234567, CMAU7654321"})

    result = processor._extract_contenedores(row)

    assert result == ["MSCU1234567", "CMAU7654321"]
