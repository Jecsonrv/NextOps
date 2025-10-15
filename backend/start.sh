#!/usr/bin/env sh
set -e

python manage.py migrate
python manage.py collectstatic --noinput

PORT=${PORT:-8000}
exec gunicorn proyecto.wsgi:application --bind 0.0.0.0:${PORT} --workers 3
