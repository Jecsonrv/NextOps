"""
ProvisionManager - Servicio para gestionar jerarquía de provisiones.

Jerarquía (de mayor a menor prioridad):
1. MANUAL: Usuario ingresó manualmente, locked=True, máxima prioridad
2. CSV: Cargado desde CSV de provisiones, locked=True, alta prioridad  
3. EXCEL: Extraído del Excel de OTs, locked=False, baja prioridad

Reglas:
- MANUAL nunca puede ser sobreescrito por CSV o EXCEL
- CSV nunca puede ser sobreescrito por EXCEL
- EXCEL puede ser sobreescrito por cualquiera
- Unlock manual permite cambiar de MANUAL/CSV a permiso de sobrescritura
"""

from datetime import date
from typing import Optional, Dict, Any
from decimal import Decimal
from django.utils import timezone


class ProvisionSource:
    """Enum para fuentes de provisión"""
    MANUAL = 'MANUAL'
    CSV = 'CSV'
    EXCEL = 'EXCEL'
    
    CHOICES = [
        (MANUAL, 'Manual'),
        (CSV, 'CSV'),
        (EXCEL, 'Excel'),
    ]
    
    PRIORITY = {
        MANUAL: 3,  # Máxima prioridad
        CSV: 2,     # Alta prioridad
        EXCEL: 1,   # Baja prioridad
    }


class ProvisionManager:
    """Gestor de jerarquía de provisiones"""
    
    @staticmethod
    def can_update_provision(
        ot,
        new_source: str,
        force: bool = False
    ) -> tuple[bool, Optional[str]]:
        """
        Verificar si una provisión puede ser actualizada.
        
        Args:
            ot: Instancia de OT
            new_source: Nueva fuente (MANUAL, CSV, EXCEL)
            force: Forzar actualización (solo para unlock manual)
            
        Returns:
            Tupla (puede_actualizar, razón_si_no)
        """
        # Si no tiene provisión previa, siempre permitir
        if not hasattr(ot, 'provision_source') or not ot.provision_source:
            return True, None
        
        current_source = ot.provision_source
        current_locked = getattr(ot, 'provision_locked', False)
        
        # Si force=True, permitir (solo admin)
        if force:
            return True, None
        
        # Si está locked, solo puede actualizar fuente de mayor o igual prioridad
        if current_locked:
            current_priority = ProvisionSource.PRIORITY.get(current_source, 0)
            new_priority = ProvisionSource.PRIORITY.get(new_source, 0)
            
            if new_priority <= current_priority:
                return False, f'La provisión está bloqueada (fuente: {current_source}). Solo puede actualizar manualmente o con unlock.'
        
        # Si no está locked, verificar prioridades
        current_priority = ProvisionSource.PRIORITY.get(current_source, 0)
        new_priority = ProvisionSource.PRIORITY.get(new_source, 0)
        
        if new_priority < current_priority:
            return False, f'La fuente {new_source} tiene menor prioridad que {current_source}'
        
        return True, None
    
    @staticmethod
    def set_provision(
        ot,
        provision_date: date,
        provision_items: list,
        source: str,
        updated_by: str,
        force: bool = False
    ) -> tuple[bool, Optional[str]]:
        """
        Establecer provisión en una OT respetando jerarquía.
        
        Args:
            ot: Instancia de OT
            provision_date: Fecha de provisión
            provision_items: Lista de items [{concepto, monto, categoria}]
            source: Fuente (MANUAL, CSV, EXCEL)
            updated_by: Usuario que realiza el cambio
            force: Forzar actualización
            
        Returns:
            Tupla (éxito, mensaje_error_si_no)
        """
        # Verificar si puede actualizar
        can_update, reason = ProvisionManager.can_update_provision(ot, source, force)
        
        if not can_update:
            return False, reason
        
        # Calcular total
        total = sum(Decimal(str(item.get('monto', 0))) for item in provision_items)
        
        # Actualizar provisión
        ot.provision_hierarchy = {
            'total': float(total),
            'items': provision_items
        }
        
        # Actualizar metadatos
        if not hasattr(ot, 'provision_date'):
            # Si el modelo OT no tiene estos campos, agregarlos dinámicamente
            # (asumiendo que se agregarán al modelo en migración futura)
            pass
        else:
            ot.provision_date = provision_date
            ot.provision_source = source
            ot.provision_locked = source in [ProvisionSource.MANUAL, ProvisionSource.CSV]
            ot.provision_updated_by = updated_by
        
        ot.save()
        
        return True, None
    
    @staticmethod
    def unlock_provision(ot, updated_by: str) -> tuple[bool, Optional[str]]:
        """
        Desbloquear provisión para permitir sobrescritura.
        
        Args:
            ot: Instancia de OT
            updated_by: Usuario que desbloquea
            
        Returns:
            Tupla (éxito, mensaje)
        """
        if not hasattr(ot, 'provision_locked'):
            return False, 'El modelo OT no soporta bloqueo de provisiones'
        
        if not ot.provision_locked:
            return False, 'La provisión ya está desbloqueada'
        
        ot.provision_locked = False
        ot.provision_updated_by = updated_by
        ot.save()
        
        return True, 'Provisión desbloqueada exitosamente'
    
    @staticmethod
    def get_provision_status(ot) -> Dict[str, Any]:
        """
        Obtener estado actual de la provisión.
        
        Args:
            ot: Instancia de OT
            
        Returns:
            Diccionario con información de estado
        """
        if not hasattr(ot, 'provision_source'):
            return {
                'has_provision': bool(ot.provision_hierarchy and ot.provision_hierarchy.get('total', 0) > 0),
                'source': None,
                'locked': False,
                'can_update_from_excel': True,
                'can_update_from_csv': True,
                'updated_by': None,
                'date': None
            }
        
        source = ot.provision_source
        locked = getattr(ot, 'provision_locked', False)
        
        return {
            'has_provision': bool(ot.provision_hierarchy and ot.provision_hierarchy.get('total', 0) > 0),
            'source': source,
            'locked': locked,
            'can_update_from_excel': not locked or source == ProvisionSource.EXCEL,
            'can_update_from_csv': not locked or source in [ProvisionSource.CSV, ProvisionSource.EXCEL],
            'priority': ProvisionSource.PRIORITY.get(source, 0),
            'updated_by': getattr(ot, 'provision_updated_by', None),
            'date': getattr(ot, 'provision_date', None)
        }
