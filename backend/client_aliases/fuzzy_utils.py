"""
Utilidades mejoradas para fuzzy matching de nombres de clientes.

Este módulo implementa un algoritmo de similitud multi-capa que:
1. Detecta y compara sufijos legales completos (S.A. DE C.V., LTDA, etc.)
2. Identifica si son razones sociales diferentes vs errores de captura
3. Filtra stop words inteligentemente
4. Combina múltiples métricas de similitud con pesos
5. Valida palabras clave comunes
"""

from fuzzywuzzy import fuzz
import re


# Sufijos legales COMPLETOS (en orden de especificidad - más largo primero)
LEGAL_SUFFIXES_COMPLETE = [
    'S.A. DE C.V.', 'SA DE CV', 'S.A DE C.V', 'S.A.,DE C.V.',
    'LTDA. DE C.V.', 'LTDA DE CV', 'LIMITADA DE C.V.',
    'S.R.L. DE C.V.', 'SRL DE CV',
    'S.A.', 'SA', 'S.A', 'S.A.,', 'S.A,',
    'C.V.', 'CV', 'C.V', 'C.V.,', 'C.V,',
    'LTDA', 'LTDA.', 'LIMITADA',
    'S.R.L.', 'SRL', 'S.R.L',
    'S.C.', 'SC',
    'INC', 'INC.', 'INCORPORATED',
    'CORP', 'CORP.', 'CORPORATION',
    'LLC', 'L.L.C.', 'L.L.C',
    'LTD', 'LTD.', 'LIMITED',
]

# Tipos societarios (S.A., LTDA, etc.) - se permiten variaciones entre estos
SOCIETY_TYPES = ['S.A.', 'SA', 'LTDA', 'LTDA.', 'LIMITADA', 'S.R.L.', 'SRL', 'S.C.', 'SC']

# Stop words para filtrado (solo conectores y símbolos)
STOP_WORDS = {
    'DE', 'Y', 'E', 'DEL', 'LA', 'EL', 'LOS', 'LAS',
    '&', 'AND', 'EN',
    ',', '.', '-', '_', '/', '\\',
}


def extract_legal_suffix(name):
    """
    Extrae el sufijo legal completo de un nombre comercial.

    Args:
        name (str): Nombre comercial

    Returns:
        tuple: (nombre_sin_sufijo, sufijo_encontrado, tipo_sufijo)
               tipo_sufijo puede ser: 'complete_cv', 'simple', 'none'
    """
    if not name:
        return name, None, 'none'

    normalized = name.upper().strip()

    # Normalizar puntuación para mejor detección
    normalized_search = normalized.replace(',', ' ').replace('.', ' ')
    normalized_search = ' '.join(normalized_search.split())  # Eliminar espacios múltiples

    # Buscar sufijos en orden de especificidad (más largo primero)
    for suffix in LEGAL_SUFFIXES_COMPLETE:
        suffix_normalized = suffix.replace(',', ' ').replace('.', ' ')
        suffix_normalized = ' '.join(suffix_normalized.split())

        # Verificar si termina con este sufijo
        if normalized_search.endswith(suffix_normalized):
            # Extraer la parte del negocio
            business_part = normalized_search[:-len(suffix_normalized)].strip()

            # Determinar tipo de sufijo
            if 'DE C' in suffix or 'DE CV' in suffix_normalized:
                suffix_type = 'complete_cv'  # S.A. DE C.V., LTDA. DE C.V., etc.
            else:
                suffix_type = 'simple'  # S.A., LTDA., etc.

            return business_part, suffix, suffix_type

    return normalized, None, 'none'


def normalize_society_type(suffix):
    """
    Normaliza tipos societarios a su forma canónica.
    S.A., SA → S.A.
    LTDA, LTDA. → LTDA

    Args:
        suffix (str): Sufijo legal

    Returns:
        str: Tipo societario normalizado
    """
    if not suffix:
        return None

    suffix_clean = suffix.upper().replace('.', '').replace(',', '').strip()

    if 'SA' in suffix_clean:
        return 'S.A.'
    elif 'LTDA' in suffix_clean or 'LIMITADA' in suffix_clean:
        return 'LTDA'
    elif 'SRL' in suffix_clean:
        return 'S.R.L.'
    elif 'SC' in suffix_clean:
        return 'S.C.'

    return suffix


def get_significant_tokens(name):
    """
    Extrae tokens significativos de un nombre, removiendo stop words.

    Args:
        name (str): Nombre a tokenizar

    Returns:
        list: Lista de tokens significativos en UPPERCASE
    """
    if not name:
        return []

    # Normalizar: uppercase, remover puntuación extra
    normalized = name.upper().strip()

    # Reemplazar puntuación por espacios para tokenizar mejor
    for char in [',', '.', '-', '_', '/', '\\', '&']:
        normalized = normalized.replace(char, ' ')

    # Tokenizar por espacios
    tokens = normalized.split()

    # Filtrar stop words y tokens muy cortos (< 3 caracteres)
    significant = [
        token for token in tokens
        if token not in STOP_WORDS and len(token) >= 3
    ]

    return significant


def has_common_keywords(tokens1, tokens2, min_common=1):
    """
    Verifica si dos listas de tokens tienen palabras clave en común.

    Args:
        tokens1 (list): Primera lista de tokens
        tokens2 (list): Segunda lista de tokens
        min_common (int): Mínimo de palabras comunes requeridas

    Returns:
        bool: True si tienen al menos min_common palabras en común
    """
    if not tokens1 or not tokens2:
        return False

    # Convertir a sets para intersección
    set1 = set(tokens1)
    set2 = set(tokens2)

    common = set1 & set2
    return len(common) >= min_common


def calculate_smart_similarity(name1, name2):
    """
    Calcula similitud inteligente entre dos nombres usando múltiples capas.

    Algoritmo mejorado:
    1. Extrae sufijos legales y detecta razones sociales diferentes
    2. Compara partes de negocio sin sufijos
    3. Detecta errores de captura (S.A. vs LTDA con mismo nombre base)
    4. Valida palabras clave comunes
    5. Combina múltiples métricas de fuzzy matching

    Args:
        name1 (str): Primer nombre
        name2 (str): Segundo nombre

    Returns:
        dict: {
            'score': float (0-100),
            'confidence': str ('high'|'medium'|'low'),
            'details': {
                'business_part1': str,
                'business_part2': str,
                'suffix1': str,
                'suffix2': str,
                'suffix_type1': str,
                'suffix_type2': str,
                'suffix_mismatch': bool,
                'society_type_only_diff': bool,
                'has_common_keywords': bool,
                'penalties_applied': list
            }
        }
    """
    # Normalizar nombres
    n1 = name1.strip() if name1 else ''
    n2 = name2.strip() if name2 else ''

    if not n1 or not n2:
        return {
            'score': 0.0,
            'confidence': 'very_low',
            'details': {'reason': 'Empty names'}
        }

    # Paso 1: Extraer sufijos legales
    business1, suffix1, suffix_type1 = extract_legal_suffix(n1)
    business2, suffix2, suffix_type2 = extract_legal_suffix(n2)

    penalties = []
    suffix_mismatch = False
    society_type_only_diff = False

    # Paso 2: Comparar sufijos para detectar razones sociales diferentes
    if suffix_type1 != suffix_type2:
        # CASO CRÍTICO: Diferentes tipos de sufijo
        # Ej: "ALMACENES SIMAN, S.A. DE C.V." vs "ALMACENES SIMAN, S.A."
        if suffix_type1 == 'complete_cv' and suffix_type2 == 'simple':
            # Uno tiene "DE C.V." completo, otro solo tipo simple → DIFERENTES
            penalties.append('suffix_type_mismatch_cv_vs_simple')
            suffix_mismatch = True
        elif suffix_type1 == 'simple' and suffix_type2 == 'complete_cv':
            # Inverso del caso anterior
            penalties.append('suffix_type_mismatch_simple_vs_cv')
            suffix_mismatch = True
        elif suffix_type1 == 'none' or suffix_type2 == 'none':
            # Uno no tiene sufijo → puede ser diferente
            penalties.append('suffix_missing_one_side')

    elif suffix_type1 == 'complete_cv' and suffix_type2 == 'complete_cv':
        # Ambos tienen sufijos completos (ej: S.A. DE C.V. vs LTDA. DE C.V.)
        # Verificar si solo difiere el tipo societario
        society1 = normalize_society_type(suffix1)
        society2 = normalize_society_type(suffix2)

        if society1 != society2:
            # Tipos societarios diferentes (S.A. vs LTDA)
            # Esto puede ser un ERROR DE CAPTURA si el nombre base es igual
            society_type_only_diff = True
            penalties.append('society_type_diff_possible_typo')

    # Paso 3: Extraer tokens significativos de las partes de negocio
    tokens1 = get_significant_tokens(business1)
    tokens2 = get_significant_tokens(business2)

    if not tokens1 or not tokens2:
        return {
            'score': 0.0,
            'confidence': 'very_low',
            'details': {
                'business_part1': business1,
                'business_part2': business2,
                'reason': 'No significant tokens in business name'
            }
        }

    # Paso 4: Validaciones de similitud
    has_keywords = has_common_keywords(tokens1, tokens2, min_common=1)

    # Reconstruir nombres de negocio sin stop words
    clean_b1 = ' '.join(tokens1)
    clean_b2 = ' '.join(tokens2)

    # Calcular métricas de fuzzy matching
    token_sort = fuzz.token_sort_ratio(clean_b1, clean_b2)
    partial = fuzz.partial_ratio(clean_b1, clean_b2)
    exact = fuzz.ratio(clean_b1, clean_b2)

    # Combinar métricas con pesos
    base_score = (token_sort * 0.5) + (partial * 0.3) + (exact * 0.2)

    # Paso 5: Aplicar penalizaciones y ajustes

    # Penalización 1: Sufijos incompatibles
    if suffix_mismatch:
        # Razones sociales DIFERENTES (uno tiene DE C.V., otro no)
        base_score *= 0.3  # Penalizar un 70% - ALERTA de que son diferentes
        penalties.append('different_legal_entities')

    # Penalización 2: Sin palabras clave comunes
    if not has_keywords:
        base_score *= 0.5
        penalties.append('no_common_keywords')

    # Ajuste positivo: Solo difiere tipo societario con nombre base igual
    if society_type_only_diff and token_sort >= 90:
        # Probablemente error de captura (S.A. vs LTDA pero mismo nombre)
        # Mantener score alto si el nombre base es muy similar
        base_score = max(base_score, 85.0)  # Garantizar al menos 85%
        penalties.append('society_type_variation_detected')

    # Penalización 3: Longitud muy diferente
    len1 = len(clean_b1)
    len2 = len(clean_b2)
    length_ratio = min(len1, len2) / max(len1, len2) if max(len1, len2) > 0 else 0

    if length_ratio < 0.4:
        base_score *= 0.6
        penalties.append('length_mismatch')

    # Determinar nivel de confianza
    if base_score >= 95:
        confidence = 'high'
    elif base_score >= 85:
        confidence = 'medium'
    elif base_score >= 75:
        confidence = 'low'
    else:
        confidence = 'very_low'

    return {
        'score': round(base_score, 2),
        'confidence': confidence,
        'details': {
            'business_part1': business1,
            'business_part2': business2,
            'suffix1': suffix1,
            'suffix2': suffix2,
            'suffix_type1': suffix_type1,
            'suffix_type2': suffix_type2,
            'suffix_mismatch': suffix_mismatch,
            'society_type_only_diff': society_type_only_diff,
            'tokens1': tokens1,
            'tokens2': tokens2,
            'has_common_keywords': has_keywords,
            'length_ratio': round(length_ratio, 2),
            'token_sort': token_sort,
            'partial': partial,
            'exact': exact,
            'penalties_applied': penalties
        }
    }


def get_match_recommendation(score, confidence):
    """
    Obtiene recomendación de acción basada en score y confianza.

    Args:
        score (float): Score de similitud (0-100)
        confidence (str): Nivel de confianza

    Returns:
        dict: {
            'action': str ('auto_merge'|'suggest'|'review'|'skip'),
            'message': str
        }
    """
    if score >= 95 and confidence == 'high':
        return {
            'action': 'auto_merge',
            'message': 'Alta similitud - Se recomienda fusión automática'
        }
    elif score >= 85:
        return {
            'action': 'suggest',
            'message': 'Similitud media-alta - Sugerir al usuario'
        }
    elif score >= 75:
        return {
            'action': 'review',
            'message': 'Similitud baja-media - Requiere revisión manual'
        }
    else:
        return {
            'action': 'skip',
            'message': 'Similitud muy baja - No sugerir'
        }
