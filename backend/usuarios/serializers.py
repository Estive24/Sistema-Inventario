from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import Usuario

class UsuarioSerializer(serializers.ModelSerializer):
    """Serializer completo del usuario para login y APIs"""
    
    # ✅ AGREGAR: Campo calculado para mostrar el rol en texto
    role_display = serializers.CharField(source='get_rol_display', read_only=True)
    
    # ✅ AGREGAR: Campo para mostrar los grupos del usuario
    groups = serializers.StringRelatedField(many=True, read_only=True)
    
    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_superuser', 'is_staff', 'is_active',  # ✅ INCLUIR campos críticos
            'rol', 'role_display', 'telefono', 'activo',
            'groups',  # ✅ INCLUIR grupos
            'date_joined', 'last_login'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'is_superuser', 'is_staff']

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, data):
        username = data.get('username')
        password = data.get('password')

        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                if not user.is_active:
                    raise serializers.ValidationError('La cuenta está desactivada.')
                data['user'] = user
                return data
            else:
                raise serializers.ValidationError('Credenciales incorrectas.')
        else:
            raise serializers.ValidationError('Debe proporcionar username y password.')