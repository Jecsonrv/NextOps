"""
Script para crear patrones genéricos del sistema.
Estos patrones se usan como fallback cuando no hay patrones específicos del proveedor.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto.settings.dev')
django.setup()

from patterns.models import TargetField, ProviderPattern
from catalogs.models import Provider

def create_generic_patterns():
    """
    Crea patrones genéricos para campos comunes.
    Estos patrones tienen prioridad baja (1-3) para que los específicos del proveedor tengan precedencia.
    """
    
    # Obtener o crear proveedor "GENERICO" para los patrones del sistema
    generic_provider, created = Provider.objects.get_or_create(
        nombre="SISTEMA",
        defaults={
            'nit': '000000000',
            'tipo': 'NAVIERA',
            'categoria': 'A',
            'is_active': True,
        }
    )
    
    print(f"{'✓ Creado' if created else '✓ Usando'} proveedor SISTEMA (ID: {generic_provider.id})")
    
    # Obtener campos objetivo
    try:
        container_field = TargetField.objects.get(code='numero_contenedor')
        mbl_field = TargetField.objects.get(code='mbl')
        invoice_field = TargetField.objects.get(code='numero_factura')
        amount_field = TargetField.objects.get(code='monto_total')
    except TargetField.DoesNotExist as e:
        print(f"❌ Error: Campo objetivo no encontrado: {e}")
        print("Ejecuta primero: python manage.py shell < backend/patterns/scripts/load_target_fields.py")
        return
    
    patterns_to_create = [
        {
            'name': 'Contenedor (4 letras + 7 números)',
            'target_field': container_field,
            'pattern': r'\b([A-Z]{4}\d{7})\b',
            'description': 'Patrón genérico para números de contenedor ISO (ejemplo: TCNU1234567)',
            'priority': 1,  # Baja prioridad - se usa solo si no hay patrón específico
            'case_sensitive': False,
            'test_cases': [
                {
                    'text': 'Contenedor TCNU1234567 en tránsito',
                    'should_match': True,
                    'expected': 'TCNU1234567'
                },
                {
                    'text': 'Containers: MSCU9876543, HLXU4567890',
                    'should_match': True,
                    'expected': 'MSCU9876543'
                },
                {
                    'text': 'No container here',
                    'should_match': False
                }
            ]
        },
        {
            'name': 'MBL (Master Bill of Lading)',
            'target_field': mbl_field,
            'pattern': r'(?:MBL|Master\s*B/?L|Bill\s*of\s*Lading)[:\s]*([A-Z]{3,4}[A-Z0-9]{8,})',
            'description': 'Patrón genérico para MBL (usualmente 3-4 letras seguidas de 8+ caracteres)',
            'priority': 1,
            'case_sensitive': False,
            'test_cases': [
                {
                    'text': 'MBL: HLCUSHG123456789',
                    'should_match': True,
                    'expected': 'HLCUSHG123456789'
                },
                {
                    'text': 'Master B/L OOLU12345678901',
                    'should_match': True,
                    'expected': 'OOLU12345678901'
                }
            ]
        },
        {
            'name': 'Número de Factura Genérico',
            'target_field': invoice_field,
            'pattern': r'(?:Invoice|Factura|N[oº]\.?\s*)[:\s#]*([A-Z]{2,6}[-\s]?\d{5,})',
            'description': 'Patrón genérico para números de factura (2-6 letras seguidas de 5+ dígitos)',
            'priority': 1,  # Baja prioridad - los patrones específicos del proveedor tienen precedencia
            'case_sensitive': False,
            'test_cases': [
                {
                    'text': 'Invoice No: ABC-12345',
                    'should_match': True,
                    'expected': 'ABC-12345'
                },
                {
                    'text': 'Factura: XYZ 987654',
                    'should_match': True,
                    'expected': 'XYZ 987654'
                }
            ]
        },
        {
            'name': 'Monto Total (USD)',
            'target_field': amount_field,
            'pattern': r'([\d,]+\.?\d{0,2})\s*(?:USD|US\$|\$)',
            'description': 'Patrón para montos totales en USD (captura solo el número)',
            'priority': 2,
            'case_sensitive': False,
            'test_cases': [
                {
                    'text': 'Total: USD 1,234.56',
                    'should_match': True,
                    'expected': '1,234.56'
                },
                {
                    'text': 'Monto Total: 5,678.90 USD',
                    'should_match': True,
                    'expected': '5,678.90'
                },
                {
                    'text': 'Importe Total: 11,374.00 USD',
                    'should_match': True,
                    'expected': '11,374.00'
                }
            ]
        },
    ]
    
    created_count = 0
    updated_count = 0
    
    for pattern_data in patterns_to_create:
        # Verificar si ya existe un patrón genérico para este campo
        existing = ProviderPattern.objects.filter(
            provider=generic_provider,
            target_field=pattern_data['target_field'],
            name=pattern_data['name']
        ).first()
        
        if existing:
            # Actualizar si es necesario
            existing.pattern = pattern_data['pattern']
            existing.description = pattern_data['description']
            existing.priority = pattern_data['priority']
            existing.case_sensitive = pattern_data['case_sensitive']
            existing.test_cases = pattern_data['test_cases']
            existing.is_active = True
            existing.save()
            print(f"  ↻ Actualizado: {pattern_data['name']}")
            updated_count += 1
        else:
            # Crear nuevo
            ProviderPattern.objects.create(
                provider=generic_provider,
                target_field=pattern_data['target_field'],
                name=pattern_data['name'],
                description=pattern_data['description'],
                pattern=pattern_data['pattern'],
                priority=pattern_data['priority'],
                case_sensitive=pattern_data['case_sensitive'],
                test_cases=pattern_data['test_cases'],
                is_active=True
            )
            print(f"  + Creado: {pattern_data['name']}")
            created_count += 1
    
    print(f"\n✅ Patrones genéricos:")
    print(f"   - Creados: {created_count}")
    print(f"   - Actualizados: {updated_count}")
    print(f"   - Total: {created_count + updated_count}")
    print(f"\n💡 Estos patrones tienen prioridad baja (1-2) y se usarán solo si no hay patrones específicos del proveedor.")

if __name__ == '__main__':
    create_generic_patterns()
