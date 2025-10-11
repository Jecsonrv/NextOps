#!/usr/bin/env python
"""Script para simular exactamente lo que hace el ViewSet."""
import os
import django
import re

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto.settings')
django.setup()

from ots.models import OT
from django.db.models import Q

# Simular la búsqueda exacta que hace el ViewSet
search_query = 'ECMU9591600'
search_value = search_query.strip()

if search_value:
    normalized_value = search_value
    normalized_upper = search_value.upper()

    # Preparar candidatos para búsqueda de contenedores
    container_candidates = {normalized_upper}
    if normalized_value != normalized_upper:
        container_candidates.add(normalized_value)

    sanitized_container = re.sub(r"[^A-Z0-9]", "", normalized_upper)
    if sanitized_container:
        container_candidates.add(sanitized_container)

    normalized_client_term = ' '.join(normalized_upper.split()).rstrip('.,;')

    print(f'🔍 Búsqueda: {search_value}')
    print(f'📝 Candidatos de contenedor: {container_candidates}')
    print(f'👤 Término cliente normalizado: {normalized_client_term}')

    container_filter = Q()
    for candidate in container_candidates:
        # Búsqueda de contenedores (exacta y parcial)
        container_filter |= Q(contenedores__contains=[candidate])
        container_filter |= Q(contenedores__icontains=candidate)

    if not container_filter.children:
        container_filter = Q(pk__isnull=True)

    # House BLs
    house_candidates = {normalized_upper}
    if normalized_value != normalized_upper:
        house_candidates.add(normalized_value)

    house_filter = None
    for candidate in house_candidates:
        condition = (
            Q(house_bls__contains=[candidate]) |
            Q(house_bls__icontains=candidate)
        )
        house_filter = condition if house_filter is None else house_filter | condition

    if house_filter is None:
        house_filter = Q(pk__isnull=True)

    client_normalized_filter = (
        Q(cliente__normalized_name__icontains=normalized_client_term)
        if normalized_client_term
        else Q(pk__isnull=True)
    )

    # Aplicar el mismo filtro que el ViewSet
    queryset = OT.objects.filter(
        Q(numero_ot__icontains=normalized_value) |
        Q(master_bl__icontains=normalized_value) |
        Q(notas__icontains=normalized_value) |
        Q(cliente__original_name__icontains=normalized_value) |
        client_normalized_filter |
        Q(proveedor__nombre__icontains=normalized_value) |
        Q(operativo__icontains=normalized_value) |
        Q(barco__icontains=normalized_value) |
        container_filter |
        house_filter
    )

    print(f'\n📊 Resultados: {queryset.count()} OTs encontradas')
    
    if queryset.count() > 0:
        for ot in queryset[:5]:
            print(f'   - {ot.numero_ot}: Cliente={ot.cliente.original_name if ot.cliente else "N/A"}, Contenedores={ot.contenedores}')
    else:
        print('   ❌ No se encontraron resultados')
        
        # Probar búsquedas individuales para debug
        print('\n🔎 Probando búsquedas individuales:')
        print(f'   - Por contenedor exacto: {OT.objects.filter(contenedores__contains=[normalized_upper]).count()}')
        print(f'   - Por contenedor parcial: {OT.objects.filter(contenedores__icontains=normalized_upper).count()}')
        print(f'   - Por número OT: {OT.objects.filter(numero_ot__icontains=normalized_value).count()}')
        print(f'   - Por MBL: {OT.objects.filter(master_bl__icontains=normalized_value).count()}')
