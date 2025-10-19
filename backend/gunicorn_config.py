"""
Gunicorn configuration for NextOps.
Optimized for handling file uploads to Cloudinary.
"""
import multiprocessing
import os

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
backlog = 2048

# Worker processes
workers = int(os.getenv('GUNICORN_WORKERS', multiprocessing.cpu_count() * 2 + 1))
worker_class = 'sync'
worker_connections = 1000

# CRITICAL: Increased timeout for Cloudinary uploads
# Default is 30 seconds, we need more for large file uploads
timeout = int(os.getenv('GUNICORN_TIMEOUT', 300))  # 5 minutes
graceful_timeout = 30
keepalive = 5

# Logging
accesslog = '-'
errorlog = '-'
loglevel = os.getenv('LOG_LEVEL', 'info').lower()
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'nextops'

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (if needed)
# keyfile = None
# certfile = None

# Debugging
reload = os.getenv('DEBUG', 'False').lower() == 'true'
reload_engine = 'auto'

# Server hooks
def on_starting(server):
    """Called just before the master process is initialized."""
    server.log.info("Gunicorn starting with config:")
    server.log.info(f"  Workers: {workers}")
    server.log.info(f"  Timeout: {timeout}s")
    server.log.info(f"  Bind: {bind}")

def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    server.log.info("Reloading workers...")

def worker_int(worker):
    """Called just after a worker exited on SIGINT or SIGQUIT."""
    worker.log.info(f"Worker {worker.pid} received INT/QUIT signal")

def worker_abort(worker):
    """Called when a worker times out."""
    worker.log.warning(f"Worker {worker.pid} timeout (>{timeout}s)")
