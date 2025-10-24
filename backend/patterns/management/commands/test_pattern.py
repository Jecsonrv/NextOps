from django.core.management.base import BaseCommand
from invoices.parsers.pdf_extractor import PDFExtractor
import io
import re

class Command(BaseCommand):
    help = 'Tests a regex pattern against a PDF file'

    def add_arguments(self, parser):
        parser.add_argument('pattern', type=str, help='The regex pattern to test')
        parser.add_argument('file_path', type=str, help='The path to the PDF file')

    def handle(self, *args, **options):
        pattern = options['pattern']
        file_path = options['file_path']
        
        try:
            with open(file_path, 'rb') as f:
                file_content = f.read()
            
            extractor = PDFExtractor()
            text = extractor._extract_text_pdfplumber(file_content)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error extracting text from PDF: {e}'))
            return

        try:
            compiled = re.compile(pattern, re.IGNORECASE)
            matches = compiled.finditer(text)
            for match in matches:
                self.stdout.write(self.style.SUCCESS(f'  - Match: {match.group(0)}'))
        except re.error as e:
            self.stdout.write(self.style.ERROR(f'Regex Error: {e}'))
