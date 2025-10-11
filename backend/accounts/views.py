"""
Views for accounts app.
"""
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import User
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    LoginSerializer
)
from common.permissions import IsAdmin


@extend_schema_view(
    list=extend_schema(description="List all users"),
    retrieve=extend_schema(description="Get user details"),
    create=extend_schema(description="Create a new user"),
    update=extend_schema(description="Update user"),
    partial_update=extend_schema(description="Partially update user"),
    destroy=extend_schema(description="Delete user"),
)
class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users.
    Only admins can create, update, or delete users.
    """
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    @extend_schema(
        request=ChangePasswordSerializer,
        responses={200: {"description": "Password changed successfully"}}
    )
    @action(detail=True, methods=['post'])
    def change_password(self, request, pk=None):
        """Change user password (admin only)."""
        user = self.get_object()
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'message': 'Contraseña actualizada exitosamente.'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(TokenObtainPairView):
    """
    Custom login view that returns user info along with tokens.
    """
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    @extend_schema(
        request=LoginSerializer,
        responses={
            200: {
                "description": "Login successful",
                "content": {
                    "application/json": {
                        "example": {
                            "access": "eyJ0eXAi...",
                            "refresh": "eyJ0eXAi...",
                            "user": {
                                "id": 1,
                                "username": "admin",
                                "email": "admin@example.com",
                                "full_name": "Admin User",
                                "role": "admin",
                                "role_display": "Administrador"
                            }
                        }
                    }
                }
            }
        }
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        
        user = authenticate(username=username, password=password)
        
        if user is None:
            return Response(
                {'detail': 'Credenciales inválidas.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.is_active:
            return Response(
                {'detail': 'Usuario inactivo.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        # Serialize user data
        user_data = UserSerializer(user).data
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': user_data
        })


class MeView(generics.RetrieveUpdateAPIView):
    """
    View for getting and updating current user profile.
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    @extend_schema(
        description="Get current user profile",
        responses={200: UserSerializer}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        description="Update current user profile",
        request=UserUpdateSerializer,
        responses={200: UserSerializer}
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


class ChangeMyPasswordView(generics.GenericAPIView):
    """
    View for changing current user's password.
    """
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    @extend_schema(
        description="Change current user's password",
        request=ChangePasswordSerializer,
        responses={200: {"description": "Password changed successfully"}}
    )
    def post(self, request):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'message': 'Contraseña actualizada exitosamente.'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
