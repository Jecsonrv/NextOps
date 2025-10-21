#!/usr/bin/env python
"""
Memory Health Check Script
Run this to check current memory usage and identify potential issues.

Usage:
    python check_memory.py
    python manage.py shell < check_memory.py
"""
import os
import sys


def check_memory():
    """Check current memory usage and provide recommendations"""
    try:
        import psutil
    except ImportError:
        print("❌ psutil not installed. Run: pip install psutil")
        return

    process = psutil.Process()
    mem_info = process.memory_info()

    # Convert to MB
    rss_mb = mem_info.rss / 1024 / 1024
    vms_mb = mem_info.vms / 1024 / 1024

    print("=" * 60)
    print("🔍 NEXTOPS MEMORY HEALTH CHECK")
    print("=" * 60)
    print(f"\n📊 Memory Usage:")
    print(f"   RSS (Physical):  {rss_mb:>8.1f} MB")
    print(f"   VMS (Virtual):   {vms_mb:>8.1f} MB")

    # Get system memory
    sys_mem = psutil.virtual_memory()
    sys_total_mb = sys_mem.total / 1024 / 1024
    sys_available_mb = sys_mem.available / 1024 / 1024
    sys_percent = sys_mem.percent

    print(f"\n💻 System Memory:")
    print(f"   Total:           {sys_total_mb:>8.1f} MB")
    print(f"   Available:       {sys_available_mb:>8.1f} MB")
    print(f"   Used:            {sys_percent:>8.1f} %")

    # Recommendations
    print(f"\n💡 Status:")
    if rss_mb < 500:
        print("   ✅ EXCELLENT - Memory usage is optimal")
    elif rss_mb < 1000:
        print("   ✅ GOOD - Memory usage is acceptable")
    elif rss_mb < 1500:
        print("   ⚠️  WARNING - Memory usage is elevated")
    else:
        print("   🔴 CRITICAL - Memory usage is very high!")

    # Check for common issues
    print(f"\n🔧 Recommendations:")

    if rss_mb > 1000:
        print("   • Check Gunicorn worker count (should be 2 for Railway)")
        print("   • Verify worker recycling is enabled (max_requests=500)")
        print("   • Check for memory leaks in custom code")

    # Check environment variables
    print(f"\n⚙️  Configuration:")
    gunicorn_workers = os.getenv('GUNICORN_WORKERS', 'not set')
    worker_class = os.getenv('GUNICORN_WORKER_CLASS', 'not set')
    max_requests = os.getenv('GUNICORN_MAX_REQUESTS', 'not set')

    print(f"   GUNICORN_WORKERS:      {gunicorn_workers}")
    print(f"   GUNICORN_WORKER_CLASS: {worker_class}")
    print(f"   GUNICORN_MAX_REQUESTS: {max_requests}")

    if gunicorn_workers == 'not set' or int(gunicorn_workers) > 2:
        print("\n   ⚠️  WARNING: Set GUNICORN_WORKERS=2 in Railway")

    if worker_class != 'gevent':
        print("   ⚠️  WARNING: Set GUNICORN_WORKER_CLASS=gevent in Railway")

    if max_requests == 'not set':
        print("   ⚠️  WARNING: Set GUNICORN_MAX_REQUESTS=500 in Railway")

    # Check Django settings
    try:
        import django
        django.setup()
        from django.conf import settings

        print(f"\n🐍 Django Settings:")
        print(f"   DEBUG:                 {settings.DEBUG}")
        print(f"   DATABASES:             {len(settings.DATABASES)} configured")

        if hasattr(settings, 'CACHES'):
            print(f"   CACHES:                {len(settings.CACHES)} configured")

        # Check middleware count
        middleware_count = len(settings.MIDDLEWARE)
        print(f"   MIDDLEWARE:            {middleware_count} middlewares")

    except Exception as e:
        print(f"\n   ⚠️  Could not load Django settings: {e}")

    print("\n" + "=" * 60)
    print("✅ Health check complete!")
    print("=" * 60)


if __name__ == '__main__':
    check_memory()
