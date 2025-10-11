from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProviderViewSet, CostTypeViewSet, CostCategoryViewSet

# Router para ViewSets
router = DefaultRouter()
router.register(r'providers', ProviderViewSet, basename='provider')
router.register(r'cost-types', CostTypeViewSet, basename='cost-type')
router.register(r'cost-categories', CostCategoryViewSet, basename='cost-category')

urlpatterns = [
    path('', include(router.urls)),
]
