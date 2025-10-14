"""
Celery Beat schedule configuration.
Defines periodic tasks for NextOps.
"""
from celery.schedules import crontab

# Celery Beat Schedule
# This will be loaded by Celery Beat to schedule periodic tasks
CELERY_BEAT_SCHEDULE = {
    # Process DTE mailbox every 15 minutes
    # 'process-dte-mailbox': {
    #     'task': 'automation.tasks.process_dte_mailbox',
    #     'schedule': crontab(minute='*/15'),  # Every 15 minutes
    #     'options': {
    #         'expires': 600,  # Task expires after 10 minutes
    #     }
    # },
    
    # Daily invoice alerts at 8:00 AM
    'daily-invoice-alerts': {
        'task': 'automation.tasks.send_daily_invoice_alerts',
        'schedule': crontab(hour=8, minute=0),  # 8:00 AM daily
        'options': {
            'expires': 3600,  # Task expires after 1 hour
        }
    },
    
    # Daily accounting export at 6:00 PM
    'daily-accounting-export': {
        'task': 'invoices.tasks.export_for_accounting',
        'schedule': crontab(hour=18, minute=0),  # 6:00 PM daily
        'options': {
            'expires': 3600,
        }
    },
    
    # Weekly accounting export on Mondays at 8:00 AM
    'weekly-accounting-export': {
        'task': 'invoices.tasks.export_for_accounting',
        'schedule': crontab(hour=8, minute=0, day_of_week=1),  # Monday 8:00 AM
        'options': {
            'expires': 3600,
        }
    },
    
    # Health check for workers every 5 minutes
    'worker-health-check': {
        'task': 'automation.tasks.worker_health_check',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
        'options': {
            'expires': 240,
        }
    },
    
    # Check invoice payment due dates daily at 7:00 AM
    'check-invoice-due-dates': {
        'task': 'invoices.tasks.check_invoice_due_dates',
        'schedule': crontab(hour=7, minute=0),  # 7:00 AM daily
        'options': {
            'expires': 3600,
        }
    },
}

# Celery Beat will use this schedule
celery_beat_schedule = CELERY_BEAT_SCHEDULE
