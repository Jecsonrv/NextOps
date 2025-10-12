"""
Script de prueba para verificar URLs de invoices
Ejecutar con: python manage.py shell < invoices/test_urls.py
"""
from django.urls import get_resolver

print("\n" + "="*60)
print("VERIFICACIÓN DE URLs DE INVOICES")
print("="*60 + "\n")

resolver = get_resolver()

# Buscar todas las URLs que contengan 'invoices'
print("URLs registradas con 'invoices':")
for pattern in resolver.url_patterns:
    if 'invoices' in str(pattern.pattern):
        print(f"  ✓ {pattern.pattern}")
        # Si es un include, mostrar las sub-rutas
        if hasattr(pattern, 'url_patterns'):
            for sub_pattern in pattern.url_patterns:
                print(f"    → {sub_pattern.pattern}")

print("\n" + "="*60)
print("URLs ESPERADAS:")
print("="*60)
print("  • /api/invoices/")
print("  • /api/invoices/disputes/")
print("  • /api/invoices/disputes/create/")
print("  • /api/invoices/credit-notes/")
print("\n")
