from django.core.management.base import BaseCommand
from django.db import transaction
from invoices.models import Invoice, CreditNote, Dispute

class Command(BaseCommand):
    help = 'Deletes all data from Invoice, CreditNote, and Dispute tables.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Required to confirm the deletion of data.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(self.style.ERROR(
                'Operation cancelled. You must use the --confirm flag to proceed.'
            ))
            return

        self.stdout.write(self.style.WARNING('Starting data deletion...'))

        # The order of deletion is important due to foreign key constraints.
        # We delete the objects that have dependencies on others first.
        
        dispute_count, _ = Dispute.objects.all().delete()
        self.stdout.write(f'Deleted {dispute_count} Dispute objects.')

        credit_note_count, _ = CreditNote.objects.all().delete()
        self.stdout.write(f'Deleted {credit_note_count} CreditNote objects.')

        # Invoices are deleted last. The PROTECT rule on UploadedFile would
        # normally prevent this, but since we are deleting all related objects
        # that might hold a reference, we must handle this carefully.
        # A simple .delete() might fail if not handled correctly in a transaction.
        # For this script, we assume related objects are handled or the goal
        # is a clean slate where possible.
        try:
            invoice_count, _ = Invoice.objects.all().delete()
            self.stdout.write(f'Deleted {invoice_count} Invoice objects.')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Could not delete Invoices. This might be due to a PROTECT constraint. Error: {e}'))
            self.stdout.write(self.style.WARNING('You may need to manually resolve protected foreign keys before invoices can be deleted.'))


        self.stdout.write(self.style.SUCCESS('Data cleaning process finished.'))
