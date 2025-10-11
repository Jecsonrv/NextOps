"""
Comando para cargar aliases iniciales de clientes.

Incluye casos de prueba para fuzzy matching:
- ALMACENES SIMAN (diferentes países y formatos)
- Otras variaciones comunes de nombres de clientes
"""

from django.core.management.base import BaseCommand
from client_aliases.models import ClientAlias
from catalogs.models import Provider


class Command(BaseCommand):
    help = 'Carga aliases iniciales de clientes para pruebas de fuzzy matching'
    
    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('🔄 Cargando aliases de clientes...'))
        
        # Obtener algunos proveedores para asociar
        providers = list(Provider.objects.filter(is_active=True)[:5])
        
        # Datos de prueba con casos como ALMACENES SIMAN
        test_aliases = [
            # Caso ALMACENES SIMAN - diferentes países
            {
                'original_name': 'ALMACENES SIMAN, S.A. DE C.V.',
                'country': 'SV',
                'notes': 'Cliente de El Salvador - entidad legal completa',
                'usage_count': 15
            },
            {
                'original_name': 'ALMACENES SIMAN, S.A.',
                'country': 'GT',
                'notes': 'Cliente de Guatemala - diferente entidad legal',
                'usage_count': 20
            },
            {
                'original_name': 'ALMACENES SIMAN SA',
                'country': 'NI',
                'notes': 'Cliente de Nicaragua - formato simplificado',
                'usage_count': 8
            },
            
            # Variaciones de formato (mismo cliente, diferentes formatos)
            {
                'original_name': 'almacenes siman s.a.',
                'country': 'GT',
                'notes': 'Mismo cliente GT pero en minúsculas (error de captura)',
                'usage_count': 3
            },
            {
                'original_name': 'ALMACENES  SIMAN S.A.',  # Doble espacio
                'country': 'GT',
                'notes': 'Mismo cliente GT con espacio extra',
                'usage_count': 2
            },
            
            # Otros ejemplos realistas
            {
                'original_name': 'CORPORACION MULTI INVERSIONES, S.A.',
                'country': 'GT',
                'notes': 'Corporación guatemalteca',
                'usage_count': 12
            },
            {
                'original_name': 'CORPORACION MULTI INVERSIONES S.A',
                'country': 'GT',
                'notes': 'Mismo cliente, sin punto final',
                'usage_count': 5
            },
            {
                'original_name': 'WALMART DE CENTROAMERICA, S.A.',
                'country': 'GT',
                'notes': 'Walmart Guatemala',
                'usage_count': 30
            },
            {
                'original_name': 'WALMART CENTROAMERICA SA',
                'country': 'GT',
                'notes': 'Variación sin "DE" y sin puntos',
                'usage_count': 10
            },
            {
                'original_name': 'WALMART DE CENTROAMERICA',
                'country': 'SV',
                'notes': 'Walmart El Salvador - diferente entidad',
                'usage_count': 25
            },
            
            # Casos de nombres similares pero diferentes clientes
            {
                'original_name': 'DISTRIBUIDORA LA FRAGUA, S.A.',
                'country': 'GT',
                'notes': 'Distribuidor guatemalteco',
                'usage_count': 8
            },
            {
                'original_name': 'DISTRIBUIDORA LA FRAGUA',
                'country': 'HN',
                'notes': 'Diferente distribuidor en Honduras',
                'usage_count': 6
            },
            
            # Nombres con caracteres especiales
            {
                'original_name': 'POLLO CAMPERO, S.A.',
                'country': 'GT',
                'notes': 'Cadena de restaurantes - matriz',
                'usage_count': 18
            },
            {
                'original_name': 'Pollo Campero S.A.',  # Diferente capitalización
                'country': 'GT',
                'notes': 'Mismo cliente con capitalización mixta',
                'usage_count': 4
            },
            {
                'original_name': 'POLLO CAMPERO',
                'country': 'SV',
                'notes': 'Franquicia en El Salvador',
                'usage_count': 10
            },
            
            # Nombres largos
            {
                'original_name': 'INVERSIONES Y DESARROLLOS TECNOLOGICOS DE CENTROAMERICA, SOCIEDAD ANONIMA',
                'country': 'GT',
                'notes': 'Nombre completo extendido',
                'usage_count': 3
            },
            {
                'original_name': 'INVERSIONES Y DESARROLLOS TECNOLOGICOS DE CENTROAMERICA S.A.',
                'country': 'GT',
                'notes': 'Mismo cliente, formato abreviado',
                'usage_count': 7
            },
            
            # Abreviaturas comunes
            {
                'original_name': 'DISTRIBUIDORA Y COMERCIALIZADORA DE PRODUCTOS ALIMENTICIOS S.A.',
                'country': 'GT',
                'notes': 'Distribuidor de alimentos',
                'usage_count': 9
            },
            {
                'original_name': 'DIST. Y COMERCIALIZADORA DE PROD. ALIMENTICIOS S.A.',
                'country': 'GT',
                'notes': 'Mismo cliente con abreviaturas',
                'usage_count': 2
            },
        ]
        
        created = 0
        skipped = 0
        
        for alias_data in test_aliases:
            # Asignar provider aleatoriamente si hay disponibles
            if providers:
                alias_data['provider'] = providers[created % len(providers)]
            
            # Verificar si ya existe (por normalized_name y country)
            normalized = ClientAlias.normalize_name(alias_data['original_name'])
            existing = ClientAlias.objects.filter(
                normalized_name=normalized,
                country=alias_data.get('country')
            ).first()
            
            if existing:
                self.stdout.write(
                    self.style.WARNING(
                        f'  ⚠️  Ya existe: {alias_data["original_name"]} ({alias_data.get("country", "N/A")})'
                    )
                )
                skipped += 1
                continue
            
            # Crear alias
            ClientAlias.objects.create(**alias_data)
            created += 1
            self.stdout.write(
                self.style.SUCCESS(
                    f'  ✅ Creado: {alias_data["original_name"]} ({alias_data.get("country", "N/A")})'
                )
            )
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write(self.style.SUCCESS(f'✅ Proceso completado:'))
        self.stdout.write(self.style.SUCCESS(f'   📦 Aliases creados: {created}'))
        self.stdout.write(self.style.SUCCESS(f'   ⏭️  Aliases omitidos (ya existían): {skipped}'))
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write('')
        self.stdout.write(
            self.style.WARNING('💡 Tip: Usa el endpoint /api/clients/client-aliases/suggest_all_matches/')
        )
        self.stdout.write(
            self.style.WARNING('   para generar sugerencias automáticas de similitud.')
        )
