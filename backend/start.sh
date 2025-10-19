#!/usr/bin/env sh
set -e

python manage.py migrate
python manage.py collectstatic --noinput

# Use gunicorn with custom config (includes 5min timeout for Cloudinary uploads)
exec gunicorn proyecto.wsgi:application --config gunicorn_config.py
