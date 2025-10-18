"""
ViewSet para gestión de aliases de clientes.

Incluye:
- CRUD de aliases
- Búsqueda de similares con fuzzy matching (SOLO sugerencias, NO fusiona automáticamente)
- Aprobación/rechazo de fusiones (requiere permisos de admin)
- Verificación manual de aliases
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count
from django.utils import timezone
from fuzzywuzzy import fuzz
from .models import ClientAlias, SimilarityMatch
from .serializers import (
    ClientAliasListSerializer,
    ClientAliasSerializer,
    SimilarityMatchSerializer,
    FindSimilarSerializer,
    MergeApprovalSerializer,
    MergeRejectionSerializer,
)
from common.permissions import IsAdmin, IsJefeOperaciones
from .fuzzy_utils import calculate_smart_similarity, get_match_recommendation


class ClientAliasViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de aliases de clientes.
    
    Permisos:
    - GET: Autenticado
    - POST/PUT/PATCH: Admin o Jefe de Operaciones
    - DELETE: Solo Admin
    """
    
    queryset = ClientAlias.objects.filter(deleted_at__isnull=True)
    permission_classes = [IsAuthenticated]
    filterset_fields = ['is_verified', 'provider']
    search_fields = ['original_name', 'normalized_name']
    ordering_fields = ['usage_count', 'created_at', 'normalized_name']
    ordering = ['-usage_count', 'normalized_name']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ClientAliasListSerializer
        return ClientAliasSerializer
    
    def get_permissions(self):
        """Define permisos según la acción"""
        if self.action in ['destroy']:
            return [IsAdmin()]
        elif self.action in ['create', 'update', 'partial_update', 'approve_merge', 'reject_merge', 'verify', 'suggest_all_matches']:
            # Admin o Jefe de Operaciones (IsJefeOperaciones ya incluye admin)
            return [IsJefeOperaciones()]
        return super().get_permissions()
    
    def get_queryset(self):
        """Filtros adicionales"""
        queryset = super().get_queryset()
        
        # Filtrar por aliases fusionados o no fusionados
        merged = self.request.query_params.get('merged')
        if merged == 'true':
            queryset = queryset.filter(merged_into__isnull=False)
        elif merged == 'false':
            queryset = queryset.filter(merged_into__isnull=True)
        
        # Filtrar por verificados
        verified = self.request.query_params.get('verified')
        if verified == 'true':
            queryset = queryset.filter(is_verified=True)
        elif verified == 'false':
            queryset = queryset.filter(is_verified=False)
        
        return queryset
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def find_similar(self, request):
        """
        Busca aliases similares a un nombre dado usando fuzzy matching.
        
        NO fusiona nada automáticamente, solo retorna sugerencias.
        
        Body:
        {
            "name": "ALMACENES SIMAN SA",
            "threshold": 80.0,
            "limit": 10
        }
        """
        serializer = FindSimilarSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        name = serializer.validated_data['name']
        threshold = serializer.validated_data['threshold']
        limit = serializer.validated_data['limit']

        # Normalizar el nombre de búsqueda
        normalized = ClientAlias.normalize_name(name)

        # Obtener todos los aliases activos
        queryset = self.get_queryset().filter(merged_into__isnull=True)
        
        # Calcular similitud para cada alias usando algoritmo mejorado
        results = []
        for alias in queryset:
            # Usar algoritmo inteligente multi-capa
            similarity_result = calculate_smart_similarity(name, alias.original_name)
            score = similarity_result['score']

            if score >= threshold:
                # Obtener recomendación de acción
                recommendation = get_match_recommendation(score, similarity_result['confidence'])

                results.append({
                    'alias': ClientAliasListSerializer(alias).data,
                    'similarity_score': score,
                    'match_type': self._get_match_type(score),
                    'confidence': similarity_result['confidence'],
                    'recommended_action': recommendation['action'],
                    'match_details': similarity_result['details']
                })
        
        # Ordenar por score descendente
        results.sort(key=lambda x: x['similarity_score'], reverse=True)
        
        return Response({
            'query': name,
            'normalized_query': normalized,
            'threshold': threshold,
            'total_matches': len(results),
            'matches': results[:limit]
        })
    
    def _get_match_type(self, score):
        """Clasifica el tipo de match según el score"""
        if score >= 95:
            return 'exact'
        elif score >= 85:
            return 'high'
        elif score >= 75:
            return 'medium'
        else:
            return 'low'
    
    @action(detail=False, methods=['post'], permission_classes=[IsJefeOperaciones])
    def approve_merge(self, request):
        """
        Aprueba la fusión de dos aliases.
        
        El source_alias se fusiona hacia el target_alias.
        Esto significa que source_alias apuntará a target_alias y dejará de usarse.
        
        Body:
        {
            "source_alias_id": 123,  // Este desaparecerá
            "target_alias_id": 456,  // Este será el principal
            "notes": "Son el mismo cliente de Guatemala"
        }
        """
        serializer = MergeApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        source = serializer.validated_data['source_alias']
        target = serializer.validated_data['target_alias']
        notes = serializer.validated_data.get('notes', '')
        
        # Buscar si existe una sugerencia pendiente y marcarla ANTES de fusionar
        suggestion_updated = False
        try:
            suggestion = SimilarityMatch.objects.get(
                Q(alias_1_id=source.id, alias_2_id=target.id) | Q(alias_1_id=target.id, alias_2_id=source.id),
                status='pending'
            )
            suggestion.status = 'approved'
            suggestion.reviewed_by = request.user
            suggestion.reviewed_at = timezone.now()
            suggestion.review_notes = notes
            suggestion.save()
            suggestion_updated = True
        except SimilarityMatch.DoesNotExist:
            pass
        
        # Realizar la fusión DESPUÉS de actualizar la sugerencia
        source.merged_into = target
        source.save()
        
        # Transferir el contador de uso
        target.usage_count += source.usage_count
        target.save()
        
        # Si no había sugerencia previa, crear una registrando la decisión manual
        # (se crea sin pasar por validación usando update_fields vacíos)
        if not suggestion_updated:
            # Guardar usando raw SQL para evitar validaciones
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO similarity_matches 
                    (alias_1_id, alias_2_id, similarity_score, detection_method, status, reviewed_by_id, reviewed_at, review_notes, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                """, [source.id, target.id, 100.0, 'manual', 'approved', request.user.id, timezone.now(), notes])
        
        return Response({
            'message': 'Fusión aprobada exitosamente',
            'merged_from': ClientAliasListSerializer(source).data,
            'merged_into': ClientAliasListSerializer(target).data,
            'new_usage_count': target.usage_count
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], permission_classes=[IsJefeOperaciones])
    def reject_merge(self, request):
        """
        Rechaza una sugerencia de fusión.
        
        Marca que dos aliases NO son el mismo cliente (ej: diferentes países).
        Esto evita sugerencias futuras.
        
        Body:
        {
            "alias_1_id": 123,
            "alias_2_id": 456,
            "notes": "Son de diferentes países: El Salvador vs Nicaragua"
        }
        """
        serializer = MergeRejectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        alias_1 = serializer.validated_data['alias_1']
        alias_2 = serializer.validated_data['alias_2']
        notes = serializer.validated_data.get('notes', '')
        
        # Buscar sugerencia existente
        try:
            suggestion = SimilarityMatch.objects.get(
                Q(alias_1_id=alias_1.id, alias_2_id=alias_2.id) | Q(alias_1_id=alias_2.id, alias_2_id=alias_1.id),
                status='pending'
            )
            suggestion.status = 'rejected'
            suggestion.reviewed_by = request.user
            suggestion.reviewed_at = timezone.now()
            suggestion.review_notes = notes
            suggestion.save()
            
            created = False
        except SimilarityMatch.DoesNotExist:
            # Crear un rechazo explícito para evitar sugerencias futuras
            # Usar create directo sin validación para permitir rechazar incluso si ya están fusionados
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO similarity_matches
                    (alias_1_id, alias_2_id, similarity_score, detection_method, status, reviewed_by_id, reviewed_at, review_notes, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                """, [
                    alias_1.id,
                    alias_2.id,
                    0.0,
                    'manual',
                    'rejected',
                    request.user.id,
                    timezone.now(),
                    notes or 'Sin razón'
                ])
            created = True
        
        return Response({
            'message': 'Fusión rechazada exitosamente',
            'created': created,
            'alias_1': ClientAliasListSerializer(alias_1).data,
            'alias_2': ClientAliasListSerializer(alias_2).data,
            'reason': notes
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], permission_classes=[IsJefeOperaciones])
    def verify(self, request, pk=None):
        """
        Marca un alias como verificado manualmente por un administrador.
        
        Esto indica que se revisó y confirmó que el alias es correcto/único.
        """
        alias = self.get_object()
        
        if alias.is_verified:
            return Response({
                'message': 'Este alias ya estaba verificado',
                'verified_by': alias.verified_by.get_full_name() if alias.verified_by else None,
                'verified_at': alias.verified_at
            }, status=status.HTTP_200_OK)
        
        alias.is_verified = True
        alias.verified_by = request.user
        alias.verified_at = timezone.now()
        alias.save()
        
        return Response({
            'message': 'Alias verificado exitosamente',
            'alias': ClientAliasSerializer(alias).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], permission_classes=[IsJefeOperaciones])
    def suggest_all_matches(self, request):
        """
        Genera sugerencias de similitud para TODOS los aliases sin fusionar.

        Útil para hacer una revisión inicial masiva.
        Solo genera sugerencias, NO fusiona nada.

        Query params:
        - threshold: umbral mínimo (default: 85)
        - limit_per_alias: máximo de sugerencias por alias (default: 5)
        """
        threshold = float(request.query_params.get('threshold', 85.0))
        limit_per_alias = int(request.query_params.get('limit_per_alias', 5))

        # PASO 1: Limpiar sugerencias obsoletas (falsos positivos del algoritmo anterior)
        obsolete_removed = self._clean_obsolete_suggestions(threshold, request.user)

        # PASO 2: Obtener aliases sin fusionar y activos
        aliases = self.get_queryset().filter(
            merged_into__isnull=True,
            deleted_at__isnull=True
        ).order_by('id')

        suggestions_created = 0
        suggestions_skipped = 0

        # Comparar cada alias con los siguientes
        aliases_list = list(aliases)
        for i, alias_1 in enumerate(aliases_list):
            suggestions_for_this = 0

            for alias_2 in aliases_list[i+1:]:
                if suggestions_for_this >= limit_per_alias:
                    break

                # Verificar si ya existe una sugerencia (aprobada o rechazada)
                # Usar IDs explícitamente para evitar problemas con ForeignKey lookups
                existing = SimilarityMatch.objects.filter(
                    Q(alias_1_id=alias_1.id, alias_2_id=alias_2.id) |
                    Q(alias_1_id=alias_2.id, alias_2_id=alias_1.id)
                ).exists()

                if existing:
                    suggestions_skipped += 1
                    continue

                # Calcular similitud usando algoritmo inteligente
                similarity_result = calculate_smart_similarity(
                    alias_1.original_name,
                    alias_2.original_name
                )
                score = similarity_result['score']

                if score >= threshold:
                    SimilarityMatch.objects.create(
                        alias_1=alias_1,
                        alias_2=alias_2,
                        similarity_score=score,
                        detection_method='batch_smart_fuzzy'
                    )
                    suggestions_created += 1
                    suggestions_for_this += 1

        return Response({
            'message': 'Proceso de sugerencias completado',
            'total_aliases_analyzed': len(aliases_list),
            'suggestions_created': suggestions_created,
            'suggestions_skipped': suggestions_skipped,
            'obsolete_removed': obsolete_removed,
            'threshold_used': threshold
        }, status=status.HTTP_200_OK)

    def _clean_obsolete_suggestions(self, current_threshold, user):
        """
        Limpia sugerencias obsoletas que ya no cumplen con el nuevo algoritmo.

        Esto elimina:
        1. Falsos positivos antiguos cuando mejoramos el algoritmo de fuzzy matching
        2. Sugerencias donde alguno de los aliases ya está fusionado

        Args:
            current_threshold: Umbral mínimo de similitud
            user: Usuario que ejecuta la operación

        Returns:
            int: Cantidad de sugerencias eliminadas/rechazadas
        """
        obsolete_count = 0

        # PASO 1: Rechazar sugerencias donde algún alias ya está fusionado
        merged_suggestions = SimilarityMatch.objects.filter(
            status='pending'
        ).filter(
            Q(alias_1__merged_into__isnull=False) | Q(alias_2__merged_into__isnull=False)
        )

        for match in merged_suggestions:
            match.status = 'rejected'
            match.review_notes = 'Auto-rechazado: uno o ambos clientes ya fueron fusionados/normalizados'
            match.reviewed_by = user
            match.reviewed_at = timezone.now()
            match.save(update_fields=['status', 'review_notes', 'reviewed_by', 'reviewed_at'])
            obsolete_count += 1

        # PASO 2: Obtener sugerencias pendientes con aliases activos y NO fusionados
        pending_matches = SimilarityMatch.objects.filter(
            status='pending',
            alias_1__deleted_at__isnull=True,
            alias_2__deleted_at__isnull=True,
            alias_1__merged_into__isnull=True,
            alias_2__merged_into__isnull=True
        ).select_related('alias_1', 'alias_2')

        for match in pending_matches:
            # Recalcular similitud con el algoritmo mejorado actual
            similarity_result = calculate_smart_similarity(
                match.alias_1.original_name,
                match.alias_2.original_name
            )

            new_score = similarity_result['score']

            # Si el nuevo score está por debajo del umbral, rechazar la sugerencia
            if new_score < current_threshold:
                match.status = 'rejected'
                match.review_notes = (
                    f'Auto-rechazado: el algoritmo mejorado calculó {new_score:.1f}% '
                    f'(umbral: {current_threshold}%). Penalizaciones: {similarity_result["details"].get("penalties_applied", [])}'
                )
                match.reviewed_by = user
                match.reviewed_at = timezone.now()
                match.save(update_fields=['status', 'review_notes', 'reviewed_by', 'reviewed_at'])
                obsolete_count += 1

        return obsolete_count
    
    @action(detail=False, methods=['post'], permission_classes=[IsJefeOperaciones])
    def apply_normalization(self, request):
        """
        Aplica normalización masiva de un alias en todas las OTs.
        
        Actualiza todas las OTs que usan source_alias para que apunten a target_alias.
        También fusiona automáticamente los aliases.
        
        Body:
        {
            "source_alias_id": 123,  // Alias actual en OTs
            "target_alias_id": 456,  // Alias correcto
            "notes": "Normalización masiva aprobada"
        }
        
        Response:
        {
            "message": "...",
            "ots_updated": 25,
            "source_alias": {...},
            "target_alias": {...}
        }
        """
        from ots.models import OT
        
        serializer = MergeApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        source = serializer.validated_data['source_alias']
        target = serializer.validated_data['target_alias']
        notes = serializer.validated_data.get('notes', '')
        custom_target_name = serializer.validated_data.get('custom_target_name')
        
        # Contar OTs afectadas ANTES de actualizar
        ots_count = OT.objects.filter(cliente=source, deleted_at__isnull=True).count()
        
        # Actualizar todas las OTs que usan source para que usen target
        ots_updated = OT.objects.filter(
            cliente=source,
            deleted_at__isnull=True
        ).update(cliente=target)
        
        # Buscar y actualizar sugerencia si existe
        suggestion_updated = False
        try:
            suggestion = SimilarityMatch.objects.get(
                Q(alias_1_id=source.id, alias_2_id=target.id) | Q(alias_1_id=target.id, alias_2_id=source.id),
                status='pending'
            )
            suggestion.status = 'approved'
            suggestion.reviewed_by = request.user
            suggestion.reviewed_at = timezone.now()
            suggestion.save()
            suggestion_updated = True
        except SimilarityMatch.DoesNotExist:
            pass
        
        # Fusionar los aliases DESPUÉS de actualizar OTs
        source.merged_into = target
        source.save()
        
        # Transferir contador de uso
        target.usage_count += source.usage_count

        applied_custom_name = None
        if custom_target_name:
            custom_target_name = custom_target_name.strip()
            if custom_target_name:
                target.original_name = custom_target_name
                target.normalized_name = ClientAlias.normalize_name(custom_target_name)
                applied_custom_name = custom_target_name

        target.save()

        final_note_text = notes.strip() if notes else "Sin notas"
        if applied_custom_name:
            final_note_text = f"{final_note_text} | Nombre final: {target.original_name}".strip()
        review_note_value = f"{final_note_text} (Normalización masiva: {ots_updated} OTs)"

        if suggestion_updated:
            suggestion.review_notes = review_note_value
            suggestion.save(update_fields=['review_notes'])
        
        # Crear registro manual si no había sugerencia
        if not suggestion_updated:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO similarity_matches 
                    (alias_1_id, alias_2_id, similarity_score, detection_method, status, reviewed_by_id, reviewed_at, review_notes, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                """, [
                    source.id,
                    target.id,
                    100.0,
                    'manual_normalization',
                    'approved',
                    request.user.id,
                    timezone.now(),
                    review_note_value,
                ])
        
        return Response({
            'message': f'Normalización aplicada exitosamente a {ots_updated} OTs',
            'ots_updated': ots_updated,
            'source_alias': ClientAliasListSerializer(source).data,
            'target_alias': ClientAliasListSerializer(target).data,
            'new_usage_count': target.usage_count,
            'final_target_name': target.original_name,
            'custom_name_applied': bool(applied_custom_name),
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def count_ots(self, request, pk=None):
        """
        Cuenta cuántas OTs usan este alias.
        
        Útil para ver el impacto antes de normalizar.
        """
        from ots.models import OT
        
        alias = self.get_object()
        
        ots_count = OT.objects.filter(
            cliente=alias,
            deleted_at__isnull=True
        ).count()
        
        return Response({
            'alias_id': alias.id,
            'alias_name': alias.original_name,
            'ots_count': ots_count,
            'usage_count': alias.usage_count,
            'is_merged': alias.merged_into is not None,
            'merged_into': ClientAliasListSerializer(alias.merged_into).data if alias.merged_into else None
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def stats(self, request):
        """
        Estadísticas REALES de clientes/aliases.
        
        Devuelve datos precisos de la BD:
        - Total de aliases activos
        - Clientes verificados
        - Aliases fusionados
        - Sugerencias pendientes de SimilarityMatch
        - Top 10 clientes por uso
        """
        from django.db.models import Count, Q
        
        # Aliases activos (no eliminados, no fusionados)
        active_aliases = self.get_queryset().filter(merged_into__isnull=True)
        
        # Contadores básicos
        total_aliases = active_aliases.count()
        verified_count = active_aliases.filter(is_verified=True).count()
        merged_count = self.get_queryset().filter(merged_into__isnull=False).count()
        
        # Sugerencias de normalización
        pending_matches = SimilarityMatch.objects.filter(status='pending').count()
        approved_matches = SimilarityMatch.objects.filter(status='approved').count()
        rejected_matches = SimilarityMatch.objects.filter(status='rejected').count()
        
        # Top 10 clientes por uso real
        top_clients = list(
            active_aliases
            .order_by('-usage_count')[:10]
            .values('id', 'original_name', 'usage_count')
        )
        
        return Response({
            'total_aliases': total_aliases,
            'verified_count': verified_count,
            'merged_count': merged_count,
            'pending_matches': pending_matches,
            'approved_matches': approved_matches,
            'rejected_matches': rejected_matches,
            'top_clients': top_clients,
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], permission_classes=[IsJefeOperaciones])
    def generate_short_names(self, request):
        """
        Regenera los short_names para todos los aliases o para IDs específicos.
        
        Body (opcional):
        {
            "alias_ids": [1, 2, 3],  // Si se omite, procesa todos
            "force": true  // Si es true, regenera incluso si ya tienen short_name
        }
        
        Returns:
        {
            "generated": 150,
            "skipped": 10,
            "errors": [],
            "sample": [...]
        }
        """
        alias_ids = request.data.get('alias_ids', [])
        force = request.data.get('force', False)
        
        # Determinar qué aliases procesar
        if alias_ids:
            queryset = ClientAlias.objects.filter(id__in=alias_ids, deleted_at__isnull=True)
        else:
            queryset = ClientAlias.objects.filter(deleted_at__isnull=True)
        
        # Si no es forzado, solo procesar los que no tienen short_name
        if not force:
            queryset = queryset.filter(Q(short_name__isnull=True) | Q(short_name=''))
        
        generated = 0
        skipped = 0
        errors = []
        sample = []
        
        for alias in queryset:
            try:
                old_short_name = alias.short_name
                # Forzar regeneración limpiando el campo
                if force:
                    alias.short_name = None
                alias.save()  # El save() llamará a generate_short_name()
                
                generated += 1
                if len(sample) < 10:
                    sample.append({
                        'id': alias.id,
                        'original_name': alias.original_name,
                        'old_short_name': old_short_name,
                        'new_short_name': alias.short_name,
                    })
            except Exception as e:
                skipped += 1
                errors.append({
                    'alias_id': alias.id,
                    'original_name': alias.original_name,
                    'error': str(e)
                })
        
        return Response({
            'message': f'Generación completada: {generated} aliases procesados',
            'generated': generated,
            'skipped': skipped,
            'errors': errors,
            'sample': sample,
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], permission_classes=[IsJefeOperaciones])
    def regenerate_short_name(self, request, pk=None):
        """
        Regenera el short_name de un alias específico.

        Útil cuando el usuario no está satisfecho con el alias autogenerado
        y quiere que el sistema intente generar uno nuevo antes de personalizarlo.
        """
        alias = self.get_object()

        old_short_name = alias.short_name

        try:
            # Limpiar y forzar regeneración
            alias.short_name = None
            alias.save()

            return Response({
                'message': 'Short name regenerado exitosamente',
                'alias_id': alias.id,
                'original_name': alias.original_name,
                'old_short_name': old_short_name,
                'new_short_name': alias.short_name,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'error': f'Error al regenerar short name: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsJefeOperaciones])
    def rename_client(self, request, pk=None):
        """
        Renombra un cliente directamente y actualiza todas las OTs que lo usan.

        Esta función permite cambiar el nombre de un cliente sin necesidad de fusionarlo
        con otro alias. Es útil para corregir ortografía o estandarizar formatos.

        Body:
        {
            "new_name": "NUEVO NOMBRE, S.A. DE C.V.",
            "notes": "Razón del cambio"
        }

        Response:
        {
            "message": "...",
            "old_name": "...",
            "new_name": "...",
            "ots_count": 25,
            "alias": {...}
        }
        """
        from ots.models import OT

        alias = self.get_object()

        # Validar campos requeridos
        new_name = request.data.get('new_name', '').strip()
        notes = request.data.get('notes', '').strip() or ''

        if not new_name:
            return Response({
                'error': 'El nuevo nombre es requerido'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar que el nuevo nombre sea diferente
        if new_name.upper() == alias.original_name.upper():
            return Response({
                'error': 'El nuevo nombre es igual al actual'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Verificar si ya existe un alias con ese nombre
        normalized_new = ClientAlias.normalize_name(new_name)
        existing_with_name = ClientAlias.objects.filter(
            normalized_name=normalized_new,
            deleted_at__isnull=True
        ).exclude(pk=alias.pk).first()

        if existing_with_name:
            return Response({
                'error': f'Ya existe un cliente con el nombre "{existing_with_name.original_name}". '
                        f'Si deseas fusionarlos, usa la función de normalización en su lugar.',
                'existing_alias_id': existing_with_name.id
            }, status=status.HTTP_400_BAD_REQUEST)

        # Guardar nombre anterior para auditoría
        old_name = alias.original_name

        # Contar OTs afectadas
        ots_count = OT.objects.filter(cliente=alias, deleted_at__isnull=True).count()

        # Actualizar el alias
        alias.original_name = new_name
        alias.normalized_name = normalized_new
        alias.save()

        # Registrar en historial (crear un registro manual en SimilarityMatch para auditoría)
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO similarity_matches
                (alias_1_id, alias_2_id, similarity_score, detection_method, status, reviewed_by_id, reviewed_at, review_notes, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, [
                alias.id,
                alias.id,  # Mismo alias, indica renombrado
                100.0,
                'manual_rename',
                'approved',
                request.user.id,
                timezone.now(),
                f"Renombrado de '{old_name}' a '{new_name}'. Motivo: {notes}. OTs afectadas: {ots_count}"
            ])

        return Response({
            'message': f'Cliente renombrado exitosamente. {ots_count} OTs actualizadas.',
            'old_name': old_name,
            'new_name': new_name,
            'ots_count': ots_count,
            'alias': ClientAliasSerializer(alias).data
        }, status=status.HTTP_200_OK)


class SimilarityMatchViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para ver y gestionar sugerencias de similitud.
    
    Solo lectura para usuarios normales.
    Los admin pueden aprobar/rechazar desde ClientAliasViewSet.
    """
    
    queryset = SimilarityMatch.objects.all()
    serializer_class = SimilarityMatchSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'detection_method']
    ordering_fields = ['similarity_score', 'created_at']
    ordering = ['-similarity_score', '-created_at']
    
    def get_queryset(self):
        """Filtros adicionales"""
        queryset = super().get_queryset()
        
        # Filtrar por score mínimo
        min_score = self.request.query_params.get('min_score')
        if min_score:
            queryset = queryset.filter(similarity_score__gte=float(min_score))
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def pending_review(self, request):
        """Retorna solo sugerencias pendientes de revisión, ordenadas por score"""
        pending = self.get_queryset().filter(status='pending').order_by('-similarity_score')
        
        page = self.paginate_queryset(pending)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(pending, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Estadísticas de sugerencias"""
        stats = {
            'total': self.get_queryset().count(),
            'pending': self.get_queryset().filter(status='pending').count(),
            'approved': self.get_queryset().filter(status='approved').count(),
            'rejected': self.get_queryset().filter(status='rejected').count(),
            'ignored': self.get_queryset().filter(status='ignored').count(),
            'by_detection_method': list(
                self.get_queryset()
                .values('detection_method')
                .annotate(count=Count('id'))
                .order_by('-count')
            )
        }
        
        return Response(stats)
