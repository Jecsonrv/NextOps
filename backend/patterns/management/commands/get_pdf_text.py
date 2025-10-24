from django.core.management.base import BaseCommand
from invoices.parsers.pdf_extractor import PDFExtractor
import io

class Command(BaseCommand):
    help = 'Extracts the text from a PDF file'

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
