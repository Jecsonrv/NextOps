# Ensure the Celery app is imported at Django startup so that
# @shared_task decorators (e.g. invoices/tasks.py) bind correctly.
# NOTE: In production (Railway) CELERY_TASK_ALWAYS_EAGER=True runs
# tasks synchronously — no broker required.
from workers.celery import app as celery_app

__all__ = ('celery_app',)
