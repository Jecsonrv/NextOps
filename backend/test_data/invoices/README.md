# 🧪 Test Data - Sistema de Facturas

Este directorio contiene datos de prueba para validar el sistema de procesamiento automático de facturas con parsers y matching de OTs.

## 📁 Archivos de Prueba

### 1. `test_dte.json` - DTE Digital El Salvador (MAERSK)

-   **Proveedor**: MAERSK LINE (NIT: 0614-120589-001-4)
-   **Cliente**: DISTRIBUIDORA NACIONAL SA
-   **Factura**: DTE-01-00000001-000000000000001
-   **Monto**: USD $1,638.50
-   **Referencias**:
    -   OT: OT-2025-001 ✅
    -   MBL: MAEU1234567890 ✅
    -   Container: MAEU1234567 ✅
-   **Matching esperado**:
    -   **OT-2025-001** (confidence ~0.95)
    -   Method: `ot_number_in_text` o `master_bl`

### 2. `test_factura_msc.txt` - Factura en Texto (MSC)

-   **Proveedor**: MSC MEDITERRANEAN SHIPPING (NIT: 0614-130590-002-5)
-   **Cliente**: IMPORTADORA DEL PACIFICO
-   **Factura**: FAC-MSC-2025-0002
-   **Monto**: USD $2,231.75
-   **Referencias**:
    -   OT: OT-2025-002 ✅
    -   MBL: MSCU9876543210 ✅
    -   Container: MSCU9876543 ✅
-   **Matching esperado**:
    -   **OT-2025-002** (confidence ~0.95)
    -   Method: `ot_number_in_text` o `master_bl`

### 3. `test_dte_aduanal.json` - DTE Servicios Aduanales

-   **Proveedor**: AGENTE ADUANAL EXPRESS SA (NIT: 0614-150592-004-7)
-   **Cliente**: DISTRIBUIDORA NACIONAL SA
-   **Factura**: DTE-01-00000001-000000000000003
-   **Monto**: USD $649.75
-   **Referencias**:
    -   MBL: HLCU5555666677 (parcial) ⚠️
    -   Container: HLCU5555666 ✅
-   **Matching esperado**:
    -   **OT-2025-003** (confidence ~0.70-0.85)
    -   Method: `container_match` o `partial_reference`
    -   ⚠️ **Requiere revisión manual** (confianza < 0.700)

## 🎯 Propósito de Testing

Estos archivos permiten validar:

1. **Parsers**:

    - ✅ DTEJsonParser con archivos JSON de DTE
    - ✅ PDFExtractor con archivos de texto (simulando PDF extraído)

2. **Matching Algorithm** (InvoiceMatcher):

    - Level 1: OT number exact match (OT-2025-001, OT-2025-002)
    - Level 2: Master BL exact match (MAEU1234567890, MSCU9876543210)
    - Level 3: Container exact match (MAEU1234567, MSCU9876543)
    - Level 4: Partial references (HLCU5555666677 → HLCU5555666)

3. **Confidence Scoring**:

    - Alta confianza (≥ 0.90): Matches directos
    - Media confianza (0.70-0.89): Matches parciales
    - Baja confianza (< 0.70): Requiere revisión manual

4. **Auto-assignment**:
    - Verificar que facturas se asignan automáticamente a OTs
    - Verificar que `requiere_revision` se marca correctamente
    - Verificar que `confianza_match` se calcula correctamente

## 🚀 Cómo Usar

### Opción 1: API REST - Single Invoice

```bash
# Upload con auto-parse
curl -X POST http://localhost:8000/api/invoices/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test_dte.json" \
  -F "auto_parse=true" \
  -F "tipo_costo=transporte"

# Respuesta esperada:
{
  "id": 123,
  "numero_factura": "DTE-01-00000001-000000000000001",
  "monto": "1638.50",
  "ot": 1,  // OT-2025-001
  "confianza_match": 0.95,
  "requiere_revision": false
}
```

### Opción 2: API REST - Bulk Upload

```bash
curl -X POST http://localhost:8000/api/invoices/upload/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files[]=@test_dte.json" \
  -F "files[]=@test_factura_msc.txt" \
  -F "files[]=@test_dte_aduanal.json" \
  -F "auto_parse=true" \
  -F "tipo_costo=transporte"

# Respuesta esperada:
{
  "success": [
    {
      "filename": "test_dte.json",
      "invoice_id": 123,
      "numero_factura": "DTE-01-00000001-000000000000001",
      "ot_matched": "OT-2025-001",
      "confidence": 0.95,
      "requiere_revision": false
    },
    {
      "filename": "test_factura_msc.txt",
      "invoice_id": 124,
      "numero_factura": "FAC-MSC-2025-0002",
      "ot_matched": "OT-2025-002",
      "confidence": 0.92,
      "requiere_revision": false
    },
    {
      "filename": "test_dte_aduanal.json",
      "invoice_id": 125,
      "numero_factura": "DTE-01-00000001-000000000000003",
      "ot_matched": "OT-2025-003",
      "confidence": 0.75,
      "requiere_revision": true  // ⚠️ Requiere revisión
    }
  ],
  "errors": []
}
```

### Opción 3: Django Admin

1. Ir a http://localhost:8000/admin/invoices/invoice/add/
2. Seleccionar archivo (test_dte.json, test_factura_msc.txt, etc.)
3. Marcar checkbox "Auto parse"
4. Guardar
5. Verificar que OT se asigna automáticamente
6. Verificar campo "Confianza match" y "Requiere revisión"

### Opción 4: Django Shell

```python
python manage.py shell

from invoices.serializers import InvoiceCreateSerializer
from django.core.files import File

# Cargar archivo
with open('test_data/invoices/test_dte.json', 'rb') as f:
    data = {
        'file': File(f),
        'auto_parse': True,
        'tipo_costo': 'transporte'
    }
    serializer = InvoiceCreateSerializer(data=data)
    if serializer.is_valid():
        invoice = serializer.save()
        print(f"Invoice {invoice.id}: {invoice.numero_factura}")
        print(f"OT: {invoice.ot.numero_ot if invoice.ot else 'None'}")
        print(f"Confidence: {invoice.confianza_match}")
        print(f"Requires Review: {invoice.requiere_revision}")
    else:
        print(serializer.errors)
```

## ✅ Validación de Resultados

### Checklist de Testing

-   [ ] **test_dte.json** → Asignado a OT-2025-001, confianza ≥ 0.90, NO requiere revisión
-   [ ] **test_factura_msc.txt** → Asignado a OT-2025-002, confianza ≥ 0.90, NO requiere revisión
-   [ ] **test_dte_aduanal.json** → Asignado a OT-2025-003, confianza 0.70-0.85, SÍ requiere revisión
-   [ ] Campo `numero_factura` extraído correctamente
-   [ ] Campo `fecha_emision` extraído correctamente
-   [ ] Campo `monto` extraído correctamente
-   [ ] Campo `proveedor` matcheado correctamente en catálogo
-   [ ] Campo `referencias_detectadas` contiene las referencias encontradas
-   [ ] Campo `assignment_method` indica el método de matching usado

### Queries Útiles para Verificar

```python
# Ver facturas que requieren revisión
Invoice.objects.filter(requiere_revision=True)

# Ver facturas por confianza
Invoice.objects.filter(confianza_match__gte=0.90)  # Alta confianza
Invoice.objects.filter(confianza_match__lt=0.70)   # Baja confianza

# Ver facturas sin OT asignada
Invoice.objects.filter(ot__isnull=True)

# Ver facturas de un proveedor específico
from catalogs.models import Provider
maersk = Provider.objects.get(nombre__icontains='MAERSK')
Invoice.objects.filter(proveedor=maersk)
```

## 📊 Datos de Referencia

### OTs Disponibles en Sistema

| OT          | Cliente                   | MBL            | Container   | Estado      |
| ----------- | ------------------------- | -------------- | ----------- | ----------- |
| OT-2025-001 | DISTRIBUIDORA NACIONAL SA | MAEU1234567890 | MAEU1234567 | en_transito |
| OT-2025-002 | IMPORTADORA DEL PACIFICO  | MSCU9876543210 | MSCU9876543 | pendiente   |
| OT-2025-003 | DISTRIBUIDORA NACIONAL SA | HLCU5555666677 | HLCU5555666 | entregado   |
| OT-2025-004 | IMPORTADORA DEL PACIFICO  | MAEU7777888899 | MAEU7777888 | en_transito |

### Proveedores en Catálogo

| Proveedor                  | NIT               | Tipo          |
| -------------------------- | ----------------- | ------------- |
| MAERSK LINE                | 0614-120589-001-4 | naviera       |
| MSC MEDITERRANEAN SHIPPING | 0614-130590-002-5 | naviera       |
| HAPAG-LLOYD                | 0614-140591-003-6 | naviera       |
| AGENTE ADUANAL EXPRESS SA  | 0614-150592-004-7 | agente_local  |
| TRANSPORTES TERRESTRES SA  | 0614-160593-005-8 | transportista |

## 🐛 Troubleshooting

### Problema: Archivo no se parsea

-   Verificar que `auto_parse=True`
-   Verificar que content_type es correcto (application/json o application/pdf)
-   Ver logs del parser en consola

### Problema: OT no se asigna

-   Verificar que referencias en archivo coinciden con OT
-   Verificar que OT existe en base de datos
-   Verificar que cliente del archivo coincide con cliente de OT
-   Ver campo `referencias_detectadas` para ver qué encontró el parser

### Problema: Confianza muy baja

-   Verificar que referencias están bien formateadas
-   Verificar que no hay typos en números de OT/MBL/Container
-   Considerar agregar más referencias en observaciones del documento

---

**Última actualización**: 15-01-2025
**Versión**: 1.0
**Mantenedor**: Sistema NextOps
