from django.db import models
from django.core.validators import RegexValidator
from common.models import TimeStampedModel, SoftDeleteModel
import re


class TargetField(TimeStampedModel, SoftDeleteModel):
    """
    Modelo para definir campos objetivo que se pueden extraer de facturas.
    Ejemplos: número de factura, MBL, monto total, fecha emisión, etc.
    """
    
    # Tipos de datos esperados
    DATA_TYPE_CHOICES = [
        ('text', 'Texto'),
        ('number', 'Número'),
        ('decimal', 'Decimal'),
        ('date', 'Fecha'),
        ('boolean', 'Booleano'),
    ]
    
    # Campos básicos
    code = models.CharField(
        max_length=50,
        unique=True,
        help_text="Código único del campo (ej: 'invoice_number', 'mbl', 'total_amount')"
    )
    name = models.CharField(
        max_length=100,
        help_text="Nombre descriptivo del campo (ej: 'Número de Factura', 'MBL')"
    )
    description = models.TextField(
        blank=True,
        help_text="Descripción detallada del campo y su uso"
    )
    data_type = models.CharField(
        max_length=20,
        choices=DATA_TYPE_CHOICES,
        default='text',
        help_text="Tipo de dato esperado para este campo"
    )
    
    # Configuración
    is_active = models.BooleanField(
        default=True,
        help_text="Indica si el campo está activo y disponible"
    )
    priority = models.IntegerField(
        default=0,
        help_text="Prioridad del campo (mayor = más importante)"
    )
    
    # Ejemplos de uso
    example_value = models.CharField(
        max_length=255,
        blank=True,
        help_text="Ejemplo de valor para este campo"
    )
    
    class Meta:
        db_table = 'patterns_target_field'
        verbose_name = 'Campo Objetivo'
        verbose_name_plural = 'Campos Objetivo'
        ordering = ['-priority', 'name']
        indexes = [
            models.Index(fields=['is_active', 'priority']),
            models.Index(fields=['code']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class RegexPattern(TimeStampedModel, SoftDeleteModel):
    """
    Modelo para almacenar patrones de regex utilizados en normalización
    y validación de datos. Incluye estadísticas de uso.
    """
    
    # Categorías de patrones
    CATEGORY_CHOICES = [
        ('container', 'Número de Contenedor'),
        ('bl', 'Bill of Lading (BL/MBL/HBL)'),
        ('ot', 'Orden de Trabajo (OT)'),
        ('date', 'Fecha'),
        ('nit', 'NIT'),
        ('email', 'Email'),
        ('phone', 'Teléfono'),
        ('other', 'Otro'),
    ]
    
    # Campos básicos
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Nombre identificador del patrón"
    )
    description = models.TextField(
        help_text="Descripción de qué busca o valida este patrón"
    )
    pattern = models.TextField(
        help_text="Expresión regular (regex)"
    )
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='other',
        help_text="Categoría del patrón"
    )
    
    # Casos de prueba (JSON)
    # Estructura: [{"input": "texto", "expected": true/false, "description": "..."}]
    test_cases = models.JSONField(
        default=list,
        blank=True,
        help_text="Casos de prueba para validar el patrón"
    )
    
    # Estadísticas de uso (JSON)
    # Estructura: {
    #   "total_uses": 0,
    #   "successful_matches": 0,
    #   "failed_matches": 0,
    #   "last_used": "2025-10-04T10:00:00Z",
    #   "average_match_time_ms": 0.5
    # }
    usage_stats = models.JSONField(
        default=dict,
        blank=True,
        help_text="Estadísticas de uso del patrón"
    )
    
    # Estado
    is_active = models.BooleanField(
        default=True,
        help_text="Indica si el patrón está activo"
    )
    
    # Prioridad (para cuando hay múltiples patrones de la misma categoría)
    priority = models.IntegerField(
        default=0,
        help_text="Prioridad del patrón (mayor = más prioritario)"
    )
    
    class Meta:
        db_table = 'patterns_regexpattern'
        verbose_name = 'Patrón de Regex'
        verbose_name_plural = 'Patrones de Regex'
        ordering = ['-priority', 'category', 'name']
        indexes = [
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['priority', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"
    
    def clean(self):
        """
        Validar que el patrón sea una regex válida
        """
        from django.core.exceptions import ValidationError
        
        try:
            re.compile(self.pattern)
        except re.error as e:
            raise ValidationError({
                'pattern': f'Regex inválida: {str(e)}'
            })
    
    def save(self, *args, **kwargs):
        """
        Inicializar usage_stats si está vacío
        """
        if not self.usage_stats:
            self.usage_stats = {
                'total_uses': 0,
                'successful_matches': 0,
                'failed_matches': 0,
                'last_used': None,
                'average_match_time_ms': 0.0
            }
        
        self.full_clean()
        super().save(*args, **kwargs)
    
    def test(self, text):
        """
        Probar el patrón contra un texto
        
        Returns:
            dict: {
                'matches': bool,
                'matched_groups': list,
                'full_match': str or None
            }
        """
        try:
            compiled = re.compile(self.pattern)
            match = compiled.search(text)
            
            if match:
                return {
                    'matches': True,
                    'matched_groups': list(match.groups()),
                    'full_match': match.group(0)
                }
            else:
                return {
                    'matches': False,
                    'matched_groups': [],
                    'full_match': None
                }
        except Exception as e:
            return {
                'matches': False,
                'error': str(e),
                'matched_groups': [],
                'full_match': None
            }
    
    def run_test_cases(self):
        """
        Ejecutar todos los casos de prueba definidos
        
        Returns:
            dict: {
                'total': int,
                'passed': int,
                'failed': int,
                'results': list
            }
        """
        results = []
        passed = 0
        failed = 0
        
        for test_case in self.test_cases:
            input_text = test_case.get('input', '')
            expected = test_case.get('expected', True)
            description = test_case.get('description', '')
            
            result = self.test(input_text)
            actual_match = result['matches']
            
            test_passed = (actual_match == expected)
            
            if test_passed:
                passed += 1
            else:
                failed += 1
            
            results.append({
                'input': input_text,
                'expected': expected,
                'actual': actual_match,
                'passed': test_passed,
                'description': description,
                'full_match': result.get('full_match'),
                'groups': result.get('matched_groups', [])
            })
        
        return {
            'total': len(self.test_cases),
            'passed': passed,
            'failed': failed,
            'success_rate': (passed / len(self.test_cases) * 100) if self.test_cases else 0,
            'results': results
        }
    
    def increment_usage(self, matched=True, match_time_ms=0.0):
        """
        Incrementar contadores de uso
        """
        from django.utils import timezone
        
        stats = self.usage_stats
        stats['total_uses'] = stats.get('total_uses', 0) + 1
        
        if matched:
            stats['successful_matches'] = stats.get('successful_matches', 0) + 1
        else:
            stats['failed_matches'] = stats.get('failed_matches', 0) + 1
        
        stats['last_used'] = timezone.now().isoformat()
        
        # Calcular promedio de tiempo
        current_avg = stats.get('average_match_time_ms', 0.0)
        total = stats['total_uses']
        stats['average_match_time_ms'] = ((current_avg * (total - 1)) + match_time_ms) / total
        
        self.usage_stats = stats
        self.save(update_fields=['usage_stats'])


class ProviderPattern(TimeStampedModel, SoftDeleteModel):
    """
    Modelo para patrones regex específicos de proveedores.
    Permite identificar automáticamente el proveedor desde texto de facturas
    y extraer campos específicos.
    """
    
    # Relación con proveedor
    provider = models.ForeignKey(
        'catalogs.Provider',
        on_delete=models.CASCADE,
        related_name='regex_patterns',
        help_text="Proveedor al que pertenece este patrón"
    )
    
    # Campo objetivo a extraer
    target_field = models.ForeignKey(
        'TargetField',
        on_delete=models.CASCADE,
        related_name='provider_patterns',
        null=True,  # Temporal para migración
        blank=True,
        help_text="Campo objetivo que este patrón extrae"
    )
    
    # Campos básicos
    name = models.CharField(
        max_length=100,
        help_text="Nombre identificador del patrón (ej: 'MSC - Número de Factura')"
    )
    description = models.TextField(
        blank=True,
        help_text="Descripción de qué busca este patrón"
    )
    pattern = models.TextField(
        help_text="Expresión regular para extraer el campo"
    )
    
    # Casos de prueba
    test_cases = models.JSONField(
        default=list,
        blank=True,
        help_text="Casos de prueba: [{'input': 'texto', 'expected': true/false, 'description': '...'}]"
    )
    
    # Estadísticas
    usage_count = models.IntegerField(
        default=0,
        help_text="Número de veces que se ha usado este patrón"
    )
    success_count = models.IntegerField(
        default=0,
        help_text="Número de coincidencias exitosas"
    )
    last_used = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Última vez que se usó este patrón"
    )
    
    # Configuración
    is_active = models.BooleanField(
        default=True,
        help_text="Indica si el patrón está activo"
    )
    priority = models.IntegerField(
        default=0,
        help_text="Prioridad del patrón (mayor = más prioritario)"
    )
    case_sensitive = models.BooleanField(
        default=False,
        help_text="Si el patrón distingue mayúsculas/minúsculas"
    )
    
    class Meta:
        db_table = 'patterns_provider_pattern'
        verbose_name = 'Patrón de Proveedor'
        verbose_name_plural = 'Patrones de Proveedores'
        ordering = ['-priority', 'provider__nombre', 'name']
        indexes = [
            models.Index(fields=['provider', 'is_active']),
            models.Index(fields=['target_field', 'is_active']),
            models.Index(fields=['priority']),
        ]
        unique_together = [['provider', 'name']]
    
    def __str__(self):
        if self.target_field:
            return f"{self.provider.nombre} - {self.name} ({self.target_field.name})"
        return f"{self.provider.nombre} - {self.name}"
    
    def clean(self):
        """Validar que el patrón sea una regex válida"""
        from django.core.exceptions import ValidationError
        
        try:
            flags = 0 if self.case_sensitive else re.IGNORECASE
            re.compile(self.pattern, flags)
        except re.error as e:
            raise ValidationError({
                'pattern': f'Regex inválida: {str(e)}'
            })
    
    def save(self, *args, **kwargs):
        """Validar antes de guardar"""
        self.full_clean()
        super().save(*args, **kwargs)
    
    def test(self, text):
        """
        Probar el patrón contra un texto y devolver información detallada
        
        Returns:
            dict: {
                'success': bool,
                'matches': list of dict with match details,
                'match_count': int,
                'error': str or None
            }
        """
        print(f'Testing pattern: {self.name}')
        print(f'Pattern: {self.pattern}')
        try:
            flags = 0 if self.case_sensitive else re.IGNORECASE
            compiled = re.compile(self.pattern, flags)
            
            # Encontrar todos los matches
            all_matches = []
            for idx, match in enumerate(compiled.finditer(text)):
                # Priorizar grupo de captura sobre match completo
                # Si hay grupos de captura, usar el primero; sino, usar el match completo
                captured_text = match.group(2) if len(match.groups()) > 1 else match.group(1) if match.groups() else match.group(0)
                
                match_info = {
                    'text': captured_text,  # Texto capturado (grupo 1 o match completo)
                    'full_match': match.group(0),  # Match completo para referencia
                    'position': match.start(),
                    'end': match.end(),
                    'groups': {}
                }
                
                # Agregar grupos nombrados si existen
                if match.groupdict():
                    match_info['groups'] = match.groupdict()
                
                # Agregar grupos numerados si existen (excepto el grupo 0)
                elif len(match.groups()) > 0:
                    match_info['groups'] = {
                        f'group_{i+1}': g 
                        for i, g in enumerate(match.groups()) 
                        if g is not None
                    }
                
                all_matches.append(match_info)
            
            print(f'Matches: {all_matches}')
            return {
                'success': True,
                'matches': all_matches,
                'match_count': len(all_matches),
                'error': None
            }
        except re.error as e:
            print(f'Regex Error: {e}')
            return {
                'success': False,
                'matches': [],
                'match_count': 0,
                'error': f'Error de sintaxis en regex: {str(e)}'
            }
        except Exception as e:
            print(f'Error: {e}')
            return {
                'success': False,
                'matches': [],
                'match_count': 0,
                'error': f'Error al probar patrón: {str(e)}'
            }
    
    def run_test_cases(self):
        """
        Ejecutar todos los casos de prueba definidos
        
        Returns:
            dict: Resultados de las pruebas
        """
        results = []
        passed = 0
        failed = 0
        
        for test_case in self.test_cases:
            input_text = test_case.get('input', '')
            expected = test_case.get('expected', True)
            description = test_case.get('description', '')
            
            result = self.test(input_text)
            actual_match = result['matches']
            
            test_passed = (actual_match == expected)
            
            if test_passed:
                passed += 1
            else:
                failed += 1
            
            results.append({
                'input': input_text,
                'expected': expected,
                'actual': actual_match,
                'passed': test_passed,
                'description': description,
                'matched_text': result.get('matched_text'),
                'groups': result.get('groups', [])
            })
        
        return {
            'total': len(self.test_cases),
            'passed': passed,
            'failed': failed,
            'success_rate': (passed / len(self.test_cases) * 100) if self.test_cases else 0,
            'results': results
        }
    
    def increment_usage(self, matched=True):
        """Incrementar contadores de uso"""
        from django.utils import timezone
        
        self.usage_count += 1
        if matched:
            self.success_count += 1
        self.last_used = timezone.now()
        self.save(update_fields=['usage_count', 'success_count', 'last_used'])
