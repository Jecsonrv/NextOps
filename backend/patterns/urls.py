from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegexPatternViewSet, ProviderPatternViewSet, TargetFieldViewSet

# Router para ViewSets
router = DefaultRouter()
router.register(r'regex-patterns', RegexPatternViewSet, basename='regexpattern')
router.register(r'provider-patterns', ProviderPatternViewSet, basename='providerpattern')
router.register(r'target-fields', TargetFieldViewSet, basename='targetfield')

urlpatterns = [
    path('', include(router.urls)),
]
