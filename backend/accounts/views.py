"""
Views for the accounts app, handling user management and authentication.
"""
from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import User
from .serializers import (
    UserListSerializer, AdminUserSerializer, ChangePasswordSerializer, UserProfileUpdateSerializer
)
from common.permissions import IsAdmin

class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for administrative management of users.

    Provides full CRUD functionality for users, accessible only by admins.
    Also includes endpoints for users to manage their own profile (`/me`)
    and change their password.
    """
    queryset = User.objects.all().order_by('-created_at')
    
    # Configuracion de Filtros y Búsqueda
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['username', 'full_name', 'email']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return UserListSerializer
        return AdminUserSerializer

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        - 'me' and 'change_password' actions are available to any authenticated user.
        - All other actions are restricted to admins.
        """
        if self.action in ['me', 'change_password']:
            self.permission_classes = [IsAuthenticated]
        else:
            self.permission_classes = [IsAdmin]
        return super().get_permissions()

    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        """
        Retrieve or update the current authenticated user's profile.
        """
        user = request.user
        if request.method == 'GET':
            serializer = UserListSerializer(user)
            return Response(serializer.data)
        
        elif request.method == 'PATCH':
            serializer = UserProfileUpdateSerializer(
                user, 
                data=request.data, 
                context={'request': request},
                partial=True
            )
            if serializer.is_valid():
                serializer.save()
                return Response(UserListSerializer(user).data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='me/change-password')
    def change_password(self, request):
        """
        Endpoint for the authenticated user to change their own password.
        """
        user = request.user
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({"status": "password set"}, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)