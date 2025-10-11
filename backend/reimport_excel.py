#!/usr/bin/env python
"""
Script para re-importar Excel y actualizar fechas de Express Release y Contra Entrega
Uso: python reimport_excel.py <ruta_del_archivo.xlsx>
"""
import sys
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from ots.services.excel_processor import ExcelProcessor

def main():
    if len(sys.argv) < 2:
        print("❌ Error: Debes proporcionar la ruta del archivo Excel")
        print("Uso: python reimport_excel.py <ruta_del_archivo.xlsx>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(f"❌ Error: El archivo '{file_path}' no existe")
        sys.exit(1)
    
    print("=" * 60)
    print("🔄 RE-IMPORTANDO EXCEL CON CORRECCIÓN DE FECHAS")
    print("=" * 60)
    print(f"📄 Archivo: {file_path}")
    print()
    
    try:
        processor = ExcelProcessor()
        result = processor.process_file(file_path)
        
        print("✅ IMPORTACIÓN COMPLETADA")
        print("=" * 60)
        print(f"✨ Creadas:      {result['created']}")
        print(f"🔄 Actualizadas: {result['updated']}")
        print(f"⏭️  Omitidas:     {result['skipped']}")
        print(f"❌ Errores:      {result['errors']}")
        print("=" * 60)
        
        if result['updated'] > 0:
            print()
            print("🎉 Las fechas de Express Release y Contra Entrega")
            print("   ahora deberían aparecer en la interfaz!")
            print()
            print("👉 Verifica en: http://localhost:5173/ots")
        
        # Verificar si hay errores (puede ser lista o número)
        error_count = len(result['errors']) if isinstance(result['errors'], list) else result['errors']
        if error_count > 0:
            print()
            print("⚠️  Hubo algunos errores. Revisa los logs para más detalles.")
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
