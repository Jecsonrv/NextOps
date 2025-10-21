"""
Celery configuration for NextOps project.
"""
import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto.settings.dev')

app = Celery('nextops')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# MEMORY OPTIMIZATION: Worker configuration
app.conf.update(
    # Worker recycling (prevents memory leaks)
    worker_max_tasks_per_child=100,  # Recycle after 100 tasks
    worker_max_memory_per_child=200000,  # 200MB max per child (in KB)

    # Concurrency
    worker_concurrency=2,  # Max 2 workers (like Gunicorn)
    worker_prefetch_multiplier=1,  # Don't prefetch tasks

    # Time limits
    task_soft_time_limit=540,  # 9 minutes soft limit
    task_time_limit=600,  # 10 minutes hard limit

    # Memory optimization
    worker_lost_wait=10,
    broker_pool_limit=2,  # Reduce broker connections
    broker_heartbeat=None,  # Disable heartbeat
    broker_connection_timeout=30,

    # Result backend optimization
    result_expires=3600,  # 1 hour
    result_backend_transport_options={'master_name': 'mymaster'},

    # Task acks
    task_acks_late=True,  # Ack after task completes
    task_reject_on_worker_lost=True,  # Reject if worker dies
)


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task to test Celery is working."""
    print(f'Request: {self.request!r}')
