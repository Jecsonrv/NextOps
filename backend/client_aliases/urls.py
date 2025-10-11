"""
URLs para el módulo de aliases de clientes.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClientAliasViewSet, SimilarityMatchViewSet

router = DefaultRouter()
router.register(r'client-aliases', ClientAliasViewSet, basename='client-alias')
router.register(r'similarity-matches', SimilarityMatchViewSet, basename='similarity-match')

urlpatterns = [
    path('', include(router.urls)),
]
