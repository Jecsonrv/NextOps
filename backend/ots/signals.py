"""
Signals for the OTs module.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import OT
from client_aliases.models import ClientAlias

@receiver(post_save, sender=OT)
def update_client_usage_count_on_save(sender, instance, created, **kwargs):
    """
    Update the usage_count of the client when an OT is saved.
    """
    if created:
        if instance.cliente:
            instance.cliente.usage_count = OT.objects.filter(cliente=instance.cliente, deleted_at__isnull=True).count()
            instance.cliente.save(update_fields=['usage_count', 'updated_at'])
    else:
        # If the client has changed, update both the old and the new client
        try:
            old_instance = OT.objects.get(pk=instance.pk)
            if old_instance.cliente != instance.cliente:
                if old_instance.cliente:
                    old_instance.cliente.usage_count = OT.objects.filter(cliente=old_instance.cliente, deleted_at__isnull=True).count()
                    old_instance.cliente.save(update_fields=['usage_count', 'updated_at'])
                if instance.cliente:
                    instance.cliente.usage_count = OT.objects.filter(cliente=instance.cliente, deleted_at__isnull=True).count()
                    instance.cliente.save(update_fields=['usage_count', 'updated_at'])
        except OT.DoesNotExist:
            # This can happen if the instance is being created
            pass

@receiver(post_delete, sender=OT)
def update_client_usage_count_on_delete(sender, instance, **kwargs):
    """
    Update the usage_count of the client when an OT is deleted.
    """
    if instance.cliente:
        instance.cliente.usage_count = OT.objects.filter(cliente=instance.cliente, deleted_at__isnull=True).count()
        instance.cliente.save(update_fields=['usage_count', 'updated_at'])
