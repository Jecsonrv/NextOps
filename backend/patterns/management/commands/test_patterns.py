from django.core.management.base import BaseCommand
from patterns.models import ProviderPattern
from invoices.parsers.pdf_extractor import PDFExtractor
import io

class Command(BaseCommand):
    help = 'Tests the generic patterns against a PDF file'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='The path to the PDF file')

    def handle(self, *args, **options):
        file_path = options['file_path']
        
        try:
            with open(file_path, 'rb') as f:
                file_content = f.read()
            
            extractor = PDFExtractor()
            text = extractor._extract_text_pdfplumber(file_content)
            self.stdout.write(text)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error extracting text from PDF: {e}'))
            return

        patterns = ProviderPattern.objects.filter(provider__id=1)

        for pattern in patterns:
            self.stdout.write(self.style.SUCCESS(f'Testing pattern: {pattern.name}'))
            self.stdout.write(self.style.SUCCESS(f'Pattern: {pattern.pattern}'))
            try:
                results = pattern.test(text)
                if results['success'] and results['match_count'] > 0:
                    if pattern.name == 'Monto Total Genérico':
                        match = results['matches'][-1]
                        self.stdout.write(self.style.SUCCESS(f'  - Match: {match["text"]}'))
                    else:
                        for match in results['matches']:
                            self.stdout.write(self.style.SUCCESS(f'  - Match: {match["text"]}'))
                else:
                    self.stdout.write(self.style.WARNING('  - No match'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error testing pattern: {e}'))
