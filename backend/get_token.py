#!/usr/bin/env python
"""Script para probar el endpoint de API con autenticación."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token

User = get_user_model()

# Obtener o crear un usuario admin para testing
user, created = User.objects.get_or_create(
    username='admin',
    defaults={
        'email': 'admin@example.com',
        'is_staff': True,
        'is_superuser': True
    }
)

if created:
    user.set_password('admin')
    user.save()
    print(f'✅ Usuario admin creado')
else:
    print(f'✅ Usuario admin existe')

# Obtener o crear token
token, created = Token.objects.get_or_create(user=user)
print(f'🔑 Token: {token.key}')
print(f'\nPara probar el API:')
print(f'curl -H "Authorization: Token {token.key}" http://localhost:8000/api/ots/?search=ECMU9591600')
