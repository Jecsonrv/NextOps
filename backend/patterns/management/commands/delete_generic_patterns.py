from django.core.management.base import BaseCommand
from patterns.models import ProviderPattern

class Command(BaseCommand):
    help = 'Deletes generic patterns for invoice recognition'

    def handle(self, *args, **options):
        ProviderPattern.objects.filter(provider__id=1).delete()
        self.stdout.write(self.style.SUCCESS('Successfully deleted generic patterns.'))
