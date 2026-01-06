#!/usr/bin/env python3
"""
Script de prueba simple para validar la extracción de contenedores
sin necesidad de Django.
"""
import re


def extract_contenedores(value):
    """
    Extraer y normalizar números de contenedor.

    Usa búsqueda de patrones directa para detectar contenedores con formato:
    4 letras mayúsculas + 7 dígitos (ej: ABCD1234567)

    Esto funciona independientemente de los separadores (comas, espacios, saltos de línea, etc.)
    """
    if not value:
        return []

    # Normalizar el texto: convertir a mayúsculas
    value_upper = value.upper()

    # Buscar TODOS los patrones de contenedor (4 letras + 7 números)
    # usando regex directamente en el texto completo.
    # El patrón usa negative lookbehind (?<![A-Z0-9]) y lookahead (?![A-Z0-9])
    # para asegurar que el contenedor no sea parte de una cadena más larga
    pattern = r'(?<![A-Z0-9])[A-Z]{4}\d{7}(?![A-Z0-9])'
    matches = re.findall(pattern, value_upper)

    # Eliminar duplicados manteniendo el orden
    contenedores = []
    for container in matches:
        if container not in contenedores:
            contenedores.append(container)

    return contenedores


def test_extract_contenedores():
    """Ejecutar todos los casos de prueba."""
    print("🧪 Iniciando pruebas de extracción de contenedores...\n")

    tests_passed = 0
    tests_failed = 0

    # Test 1: Comas
    print("Test 1: Contenedores separados por comas")
    result = extract_contenedores('ABCD1234567, EFGH8901234, IJKL5678901')
    expected = ['ABCD1234567', 'EFGH8901234', 'IJKL5678901']
    if result == expected:
        print("✅ PASÓ")
        tests_passed += 1
    else:
        print(f"❌ FALLÓ - Esperado: {expected}, Obtenido: {result}")
        tests_failed += 1

    # Test 2: Saltos de línea
    print("\nTest 2: Contenedores separados por saltos de línea")
    result = extract_contenedores('ABCD1234567\nEFGH8901234\nIJKL5678901')
    expected = ['ABCD1234567', 'EFGH8901234', 'IJKL5678901']
    if result == expected:
        print("✅ PASÓ")
        tests_passed += 1
    else:
        print(f"❌ FALLÓ - Esperado: {expected}, Obtenido: {result}")
        tests_failed += 1

    # Test 3: Espacios múltiples
    print("\nTest 3: Contenedores separados por espacios múltiples")
    result = extract_contenedores('ABCD1234567  EFGH8901234   IJKL5678901')
    expected = ['ABCD1234567', 'EFGH8901234', 'IJKL5678901']
    if result == expected:
        print("✅ PASÓ")
        tests_passed += 1
    else:
        print(f"❌ FALLÓ - Esperado: {expected}, Obtenido: {result}")
        tests_failed += 1

    # Test 4: Separadores mixtos
    print("\nTest 4: Contenedores con separadores mixtos (comas, newlines, espacios)")
    result = extract_contenedores('ABCD1234567, EFGH8901234\nIJKL5678901  MNOP2345678;QRST6789012')
    expected = ['ABCD1234567', 'EFGH8901234', 'IJKL5678901', 'MNOP2345678', 'QRST6789012']
    if result == expected:
        print("✅ PASÓ")
        tests_passed += 1
    else:
        print(f"❌ FALLÓ - Esperado: {expected}, Obtenido: {result}")
        tests_failed += 1

    # Test 5: Carriage return
    print("\nTest 5: Contenedores separados por \\r\\n")
    result = extract_contenedores('ABCD1234567\r\nEFGH8901234\r\nIJKL5678901')
    expected = ['ABCD1234567', 'EFGH8901234', 'IJKL5678901']
    if result == expected:
        print("✅ PASÓ")
        tests_passed += 1
    else:
        print(f"❌ FALLÓ - Esperado: {expected}, Obtenido: {result}")
        tests_failed += 1

    # Test 6: Minúsculas
    print("\nTest 6: Contenedores en minúsculas")
    result = extract_contenedores('abcd1234567, efgh8901234')
    expected = ['ABCD1234567', 'EFGH8901234']
    if result == expected:
        print("✅ PASÓ")
        tests_passed += 1
    else:
        print(f"❌ FALLÓ - Esperado: {expected}, Obtenido: {result}")
        tests_failed += 1

    # Test 7: Duplicados
    print("\nTest 7: Remover duplicados")
    result = extract_contenedores('ABCD1234567, ABCD1234567, EFGH8901234, ABCD1234567')
    expected = ['ABCD1234567', 'EFGH8901234']
    if result == expected:
        print("✅ PASÓ")
        tests_passed += 1
    else:
        print(f"❌ FALLÓ - Esperado: {expected}, Obtenido: {result}")
        tests_failed += 1

    # Test 8: Formatos inválidos
    print("\nTest 8: Ignorar formatos inválidos")
    result = extract_contenedores('ABCD1234567, ABC123, TOOLONGCONTAINER123456789, EFGH8901234')
    expected = ['ABCD1234567', 'EFGH8901234']
    if result == expected:
        print("✅ PASÓ")
        tests_passed += 1
    else:
        print(f"❌ FALLÓ - Esperado: {expected}, Obtenido: {result}")
        tests_failed += 1

    # Test 9: Texto extra
    print("\nTest 9: Extracción con texto extra alrededor")
    result = extract_contenedores('Contenedor: ABCD1234567 (confirmado), EFGH8901234 - en tránsito')
    expected = ['ABCD1234567', 'EFGH8901234']
    if result == expected:
        print("✅ PASÓ")
        tests_passed += 1
    else:
        print(f"❌ FALLÓ - Esperado: {expected}, Obtenido: {result}")
        tests_failed += 1

    # Test 10: Validar que NO se extraen contenedores pegados (caso edge poco realista)
    print("\nTest 10: Contenedores pegados SIN separador (caso edge - no se extraen)")
    result = extract_contenedores('ABCD1234567EFGH8901234')
    expected = []  # No se deben extraer porque están pegados
    if result == expected:
        print("✅ PASÓ - Correctamente no se extraen contenedores pegados sin separador")
        tests_passed += 1
    else:
        print(f"❌ FALLÓ - Esperado: {expected}, Obtenido: {result}")
        tests_failed += 1

    # Test 11: Un solo espacio es suficiente separador
    print("\nTest 11: Contenedores separados por un solo espacio")
    result = extract_contenedores('ABCD1234567 EFGH8901234')
    expected = ['ABCD1234567', 'EFGH8901234']
    if result == expected:
        print("✅ PASÓ")
        tests_passed += 1
    else:
        print(f"❌ FALLÓ - Esperado: {expected}, Obtenido: {result}")
        tests_failed += 1

    # Resumen
    print("\n" + "="*60)
    print(f"📊 RESUMEN DE PRUEBAS:")
    print(f"   ✅ Pasadas: {tests_passed}")
    print(f"   ❌ Falladas: {tests_failed}")
    print(f"   Total: {tests_passed + tests_failed}")
    print("="*60)

    if tests_failed == 0:
        print("\n🎉 ¡Todas las pruebas pasaron exitosamente!")
        return 0
    else:
        print(f"\n⚠️  {tests_failed} prueba(s) fallaron")
        return 1


if __name__ == "__main__":
    exit(test_extract_contenedores())
