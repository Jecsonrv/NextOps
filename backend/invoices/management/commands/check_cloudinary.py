"""
Comando para verificar la configuración de Cloudinary
"""
from django.core.management.base import BaseCommand
from django.conf import settings
import cloudinary


class Command(BaseCommand):
    help = 'Verifica la configuración de Cloudinary'

    def handle(self, *args, **options):
        self.stdout.write("\n" + "="*60)
        self.stdout.write("DIAGNÓSTICO DE CLOUDINARY")
        self.stdout.write("="*60 + "\n")

        # 1. Verificar variables de entorno
        self.stdout.write(self.style.WARNING("1. Variables de entorno:"))
        self.stdout.write(f"   USE_CLOUDINARY: {getattr(settings, 'USE_CLOUDINARY', 'NOT SET')}")
        self.stdout.write(f"   CLOUDINARY_CLOUD_NAME: {'SET' if settings.CLOUDINARY_STORAGE.get('CLOUD_NAME') else 'NOT SET'}")
        self.stdout.write(f"   CLOUDINARY_API_KEY: {'SET' if settings.CLOUDINARY_STORAGE.get('API_KEY') else 'NOT SET'}")
        self.stdout.write(f"   CLOUDINARY_API_SECRET: {'SET' if settings.CLOUDINARY_STORAGE.get('API_SECRET') else 'NOT SET'}")

        # 2. Verificar DEFAULT_FILE_STORAGE
        self.stdout.write(f"\n{self.style.WARNING('2. Storage backend:')}")
        storage_backend = getattr(settings, 'DEFAULT_FILE_STORAGE', 'django.core.files.storage.FileSystemStorage')
        self.stdout.write(f"   DEFAULT_FILE_STORAGE: {storage_backend}")

        if 'cloudinary' in storage_backend.lower():
            self.stdout.write(self.style.SUCCESS("   ✓ Cloudinary está configurado como storage backend"))
        else:
            self.stdout.write(self.style.ERROR("   ✗ NO está usando Cloudinary (está usando FileSystemStorage)"))

        # 3. Verificar configuración de Cloudinary
        self.stdout.write(f"\n{self.style.WARNING('3. Configuración de Cloudinary:')}")
        try:
            config = cloudinary.config()
            self.stdout.write(f"   cloud_name: {config.cloud_name or 'NOT SET'}")
            self.stdout.write(f"   api_key: {'SET' if config.api_key else 'NOT SET'}")
            self.stdout.write(f"   api_secret: {'SET' if config.api_secret else 'NOT SET'}")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"   Error al obtener config: {e}"))

        # 4. Test de conexión
        self.stdout.write(f"\n{self.style.WARNING('4. Test de conexión:')}")
        try:
            from cloudinary import api
            # Intentar obtener info de la cuenta
            result = api.ping()
            self.stdout.write(self.style.SUCCESS(f"   ✓ Conexión exitosa: {result}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"   ✗ Error de conexión: {e}"))

        # 5. Verificar archivos existentes
        self.stdout.write(f"\n{self.style.WARNING('5. Archivos en base de datos:')}")
        from invoices.models import Invoice
        total_invoices = Invoice.objects.filter(uploaded_file__isnull=False, deleted_at__isnull=True).count()
        self.stdout.write(f"   Total facturas con archivo: {total_invoices}")

        if total_invoices > 0:
            sample = Invoice.objects.filter(uploaded_file__isnull=False, deleted_at__isnull=True).first()
            self.stdout.write(f"   Ejemplo - ID: {sample.id}")
            self.stdout.write(f"   Ejemplo - uploaded_file ID: {sample.uploaded_file.id}")
            self.stdout.write(f"   Ejemplo - file_path: {sample.uploaded_file.file_path if hasattr(sample.uploaded_file, 'file_path') else 'N/A'}")

        self.stdout.write("\n" + "="*60 + "\n")
