from django.contrib.auth.models import AbstractUser
from django.db import models

class Usuario(AbstractUser):
    ROLES = [
        ('SUPER_ADMIN', 'Super Administrador'),
        ('SUPERVISOR_GENERAL', 'Supervisor General'),
        ('SUPERVISOR', 'Supervisor'),
        ('ENCARGADO_BODEGA', 'Encargado de Bodega'),
        ('TECNICO', 'Técnico'),
    ]
    
    rol = models.CharField(max_length=20, choices=ROLES, default='TECNICO')
    telefono = models.CharField(max_length=15, blank=True, null=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        return f"{self.username} - {self.get_rol_display()}"
