"""
User model and authentication configuration for NextOps.
"""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from common.models import TimeStampedModel


class UserRole(models.TextChoices):
    """User role choices."""
    ADMIN = 'admin', 'Administrador'
    JEFE_OPERACIONES = 'jefe_operaciones', 'Jefe de Operaciones'
    FINANZAS = 'finanzas', 'Finanzas'
    OPERATIVO = 'operativo', 'Operativo'


class UserManager(BaseUserManager):
    """Custom manager for User model."""

    def create_user(self, username, email, password=None, **extra_fields):
        """Create and save a regular user."""
        if not email:
            raise ValueError('Users must have an email address')
        if not username:
            raise ValueError('Users must have a username')

        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        """Create and save a superuser."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', UserRole.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(username, email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    """
    Custom User model for NextOps.
    
    Uses email and username for authentication, with role-based access control.
    """
    username = models.CharField(max_length=150, unique=True, db_index=True)
    email = models.EmailField(max_length=254, unique=True, db_index=True)
    full_name = models.CharField(max_length=255, blank=True)
    role = models.CharField(
        max_length=32,
        choices=UserRole.choices,
        default=UserRole.OPERATIVO
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    class Meta:
        db_table = 'accounts_user'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['username']),
            models.Index(fields=['email']),
            models.Index(fields=['role']),
        ]

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    def get_full_name(self):
        """Return the full name or username."""
        return self.full_name or self.username

    def get_short_name(self):
        """Return the username."""
        return self.username

    @property
    def is_admin(self):
        """Check if user is admin."""
        return self.role == UserRole.ADMIN

    @property
    def is_jefe_operaciones(self):
        """Check if user is jefe de operaciones."""
        return self.role == UserRole.JEFE_OPERACIONES

    @property
    def is_finanzas(self):
        """Check if user is from finanzas."""
        return self.role == UserRole.FINANZAS

    @property
    def is_operativo(self):
        """Check if user is operativo."""
        return self.role == UserRole.OPERATIVO
