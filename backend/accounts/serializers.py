"""
Serializers for accounts app.
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, UserRole


class UserListSerializer(serializers.ModelSerializer):
    """Serializer for listing users (read-only)."""
    
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'role', 'role_display',
            'is_active', 'is_staff', 'created_at', 'updated_at'
        ]


class AdminUserSerializer(serializers.ModelSerializer):
    """Serializer for admin management of users (CRUD)."""
    
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password], allow_blank=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'role', 'role_display',
            'is_active', 'is_staff', 'password', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        """Create a new user, hashing the password."""
        password = validated_data.pop('password', None)
        user = User.objects.create_user(**validated_data, password=password)
        return user

    def update(self, instance, validated_data):
        """Update a user, optionally changing the password."""
        password = validated_data.pop('password', None)
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Set new password if provided
        if password:
            instance.set_password(password)
            
        instance.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change."""
    
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        """Validate that new passwords match."""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                "new_password": "Las contraseñas no coinciden."
            })
        return attrs

    def validate_old_password(self, value):
        """Validate that old password is correct."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("La contraseña actual es incorrecta.")
        return value


class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile information (full_name, email).
    Requires current password for verification.
    """
    current_password = serializers.CharField(required=True, write_only=True)

    class Meta:
        model = User
        fields = ['full_name', 'email', 'current_password']

    def validate_current_password(self, value):
        """
        Validate that the provided password is correct for the current user.
        """
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("La contraseña actual es incorrecta.")
        return value

    def update(self, instance, validated_data):
        """
        Update user profile after password validation.
        """
        instance.full_name = validated_data.get('full_name', instance.full_name)
        instance.email = validated_data.get('email', instance.email)
        instance.save()
        return instance
