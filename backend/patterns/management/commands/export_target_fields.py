from django.core.management.base import BaseCommand
from patterns.models import TargetField
import json

class Command(BaseCommand):
    help = 'Exports TargetField data to a JSON file'

    def handle(self, *args, **options):
        target_fields = TargetField.objects.all()
        data = []
        for field in target_fields:
            data.append({
                'code': field.code,
                'name': field.name,
                'description': field.description,
                'data_type': field.data_type,
                'is_active': field.is_active,
                'priority': field.priority,
                'example_value': field.example_value,
            })
        
        with open('target_fields.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
            
        self.stdout.write(self.style.SUCCESS('Successfully exported TargetField data to target_fields.json'))
