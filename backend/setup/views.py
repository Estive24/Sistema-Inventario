from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import Group
from django.db import transaction
from django.core.paginator import Paginator
import re
User = get_user_model()
# Roles predefinidos del sistema
SYSTEM_ROLES = {
    'SUPER_ADMIN': 'Super Administrador',
    'SUPERVISOR': 'Supervisor',
    'ENCARGADO_BODEGA': 'Encargado de Bodega',
    'TECNICO': 'Técnico'
}

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])  # Permite acceso sin autenticación
def admin_setup(request):
    """
    GET: Verifica si existe un super-administrador
    POST: Crea el primer super-administrador del sistema
    """
    
    if request.method == 'GET':
        # Verificar si ya existe un super-administrador
        super_admin_exists = User.objects.filter(is_superuser=True).exists()
        
        return Response({
            'super_admin_exists': super_admin_exists,
            'message': 'Super-administrador ya configurado' if super_admin_exists else 'Configuración inicial requerida'
        })
    
    elif request.method == 'POST':
        # Verificar nuevamente que no exista un super-administrador
        if User.objects.filter(is_superuser=True).exists():
            return Response({
                'error': 'Ya existe un super-administrador configurado'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validar datos requeridos
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')
        email = request.data.get('email', '').strip()
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        
        # Validaciones
        errors = {}
        
        if not username:
            errors['username'] = 'El nombre de usuario es requerido'
        elif len(username) < 3:
            errors['username'] = 'El nombre de usuario debe tener al menos 3 caracteres'
        elif User.objects.filter(username=username).exists():
            errors['username'] = 'Este nombre de usuario ya existe'
        
        if not password:
            errors['password'] = 'La contraseña es requerida'
        elif len(password) < 8:
            errors['password'] = 'La contraseña debe tener al menos 8 caracteres'
        
        if email and not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
            errors['email'] = 'Formato de email inválido'
        
        if errors:
            return Response({
                'errors': errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                # Crear el super-administrador
                user = User.objects.create(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    password=make_password(password),
                    is_staff=True,
                    is_superuser=True,
                    is_active=True
                )
                
                # Crear grupos predefinidos si no existen
                supervisor_group, created = Group.objects.get_or_create(name='Supervisor')
                bodega_group, created = Group.objects.get_or_create(name='Encargado de Bodega')
                tecnico_group, created = Group.objects.get_or_create(name='Técnico')
                
                return Response({
                    'success': True,
                    'message': 'Super-administrador creado exitosamente',
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name
                    }
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response({
                'error': f'Error al crear el super-administrador: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def system_status(request):
    """
    Endpoint para verificar el estado general del sistema
    """
    total_users = User.objects.count()
    super_admins = User.objects.filter(is_superuser=True).count()
    
    return Response({
        'system_initialized': super_admins > 0,
        'total_users': total_users,
        'super_admins': super_admins,
        'groups_created': Group.objects.count()
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    """
    Lista todos los usuarios del sistema (solo para super admin y supervisores)
    """
    # Verificar permisos
    if not (request.user.is_superuser or request.user.groups.filter(name='Supervisor').exists()):
        return Response({
            'error': 'No tienes permisos para ver esta información'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Obtener parámetros de paginación
    page = request.GET.get('page', 1)
    page_size = request.GET.get('page_size', 10)
    search = request.GET.get('search', '')
    role_filter = request.GET.get('role', '')
    
    # Filtrar usuarios
    users = User.objects.all().order_by('-date_joined')
    
    if search:
        users = users.filter(
            username__icontains=search
        ) | users.filter(
            first_name__icontains=search
        ) | users.filter(
            last_name__icontains=search
        ) | users.filter(
            email__icontains=search
        )
    
    if role_filter:
        if role_filter == 'SUPER_ADMIN':
            users = users.filter(is_superuser=True)
        else:
            users = users.filter(groups__name=SYSTEM_ROLES.get(role_filter))
    
    # Paginar
    paginator = Paginator(users, page_size)
    page_obj = paginator.get_page(page)
    
    # Serializar datos
    users_data = []
    for user in page_obj:
        # Determinar rol principal
        role = 'SUPER_ADMIN' if user.is_superuser else 'USER'
        role_display = 'Super Administrador' if user.is_superuser else 'Usuario'
        
        if not user.is_superuser:
            user_groups = user.groups.all()
            if user_groups:
                group = user_groups.first()
                for key, value in SYSTEM_ROLES.items():
                    if value == group.name:
                        role = key
                        role_display = value
                        break
        
        users_data.append({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_active': user.is_active,
            'is_superuser': user.is_superuser,
            'role': role,
            'role_display': role_display,
            'date_joined': user.date_joined.isoformat(),
            'last_login': user.last_login.isoformat() if user.last_login else None,
        })
    
    return Response({
        'users': users_data,
        'pagination': {
            'current_page': page_obj.number,
            'total_pages': paginator.num_pages,
            'total_users': paginator.count,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
        }
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_user(request):
    """
    Crear un nuevo usuario (solo para super admin y supervisores)
    """
    # Verificar permisos
    if not (request.user.is_superuser or request.user.groups.filter(name='Supervisor').exists()):
        return Response({
            'error': 'No tienes permisos para crear usuarios'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Validar datos requeridos
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')
    email = request.data.get('email', '').strip()
    first_name = request.data.get('first_name', '').strip()
    last_name = request.data.get('last_name', '').strip()
    role = request.data.get('role', '')
    is_active = request.data.get('is_active', True)
    
    # Validaciones
    errors = {}
    
    if not username:
        errors['username'] = 'El nombre de usuario es requerido'
    elif len(username) < 3:
        errors['username'] = 'El nombre de usuario debe tener al menos 3 caracteres'
    elif User.objects.filter(username=username).exists():
        errors['username'] = 'Este nombre de usuario ya existe'
    
    if not password:
        errors['password'] = 'La contraseña es requerida'
    elif len(password) < 8:
        errors['password'] = 'La contraseña debe tener al menos 8 caracteres'
    
    if not role or role not in SYSTEM_ROLES:
        errors['role'] = 'Debe seleccionar un rol válido'
    
    if email and User.objects.filter(email=email).exists():
        errors['email'] = 'Este email ya está en uso'
    
    if errors:
        return Response({
            'errors': errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        with transaction.atomic():
            # Crear usuario
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_active=is_active
            )
            
            # Asignar rol
            if role == 'SUPER_ADMIN':
                user.is_superuser = True
                user.is_staff = True
                user.rol = 'SUPER_ADMIN' 
                user.save()
                print(f"✅ Usuario {username} creado como SUPER_ADMIN")
            else:
                # Limpiar grupos existentes
                user.groups.clear()
                
                # Obtener nombre del grupo desde SYSTEM_ROLES
                group_name = SYSTEM_ROLES.get(role)
                print(f"🔍 Buscando grupo: {group_name} para rol: {role}")
                
                if group_name:
                    group, created = Group.objects.get_or_create(name=group_name)
                    user.groups.add(group)
                    print(f"✅ Usuario {username} asignado al grupo: {group_name}")
                    user.rol = role 
                    user.save()
                else:
                    print(f"❌ Rol no encontrado: {role}")
            
            return Response({
                'success': True,
                'message': 'Usuario creado exitosamente',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'role': role,
                    'groups': [g.name for g in user.groups.all()]  # 🔍 Para debug
                }
            }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        return Response({
            'error': f'Error al crear el usuario: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_user(request, user_id):
    """
    Actualizar un usuario existente
    """
    # Verificar permisos
    if not (request.user.is_superuser or request.user.groups.filter(name='Supervisor').exists()):
        return Response({
            'error': 'No tienes permisos para editar usuarios'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({
            'error': 'Usuario no encontrado'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Prevenir que se edite el último super admin
    if user.is_superuser and User.objects.filter(is_superuser=True).count() == 1:
        if request.data.get('role') != 'SUPER_ADMIN':
            return Response({
                'error': 'No se puede cambiar el rol del último super administrador'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    # Actualizar campos
    username = request.data.get('username', user.username).strip()
    email = request.data.get('email', user.email).strip()
    first_name = request.data.get('first_name', user.first_name).strip()
    last_name = request.data.get('last_name', user.last_name).strip()
    role = request.data.get('role', '')
    is_active = request.data.get('is_active', user.is_active)
    new_password = request.data.get('new_password', '')
    
    # Validaciones
    errors = {}
    
    if username != user.username and User.objects.filter(username=username).exists():
        errors['username'] = 'Este nombre de usuario ya existe'
    
    if email != user.email and User.objects.filter(email=email).exists():
        errors['email'] = 'Este email ya está en uso'
    
    if role and role not in SYSTEM_ROLES:
        errors['role'] = 'Rol inválido'
    
    if new_password and len(new_password) < 8:
        errors['new_password'] = 'La nueva contraseña debe tener al menos 8 caracteres'
    
    if errors:
        return Response({
            'errors': errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        with transaction.atomic():
            # Actualizar campos básicos
            user.username = username
            user.email = email
            user.first_name = first_name
            user.last_name = last_name
            user.is_active = is_active
            
            # Cambiar contraseña si se proporciona
            if new_password:
                user.set_password(new_password)
            
            # Actualizar rol si se proporciona
            if role:
                # Limpiar grupos actuales
                user.groups.clear()
                user.is_superuser = False
                user.is_staff = False
                user.rol = role 
                
                if role == 'SUPER_ADMIN':
                    user.is_superuser = True
                    user.is_staff = True
                else:
                    group_name = SYSTEM_ROLES.get(role)
                    if group_name: # Asegúrate de que el nombre del grupo se encontró
                        group, created = Group.objects.get_or_create(name=group_name)
                        user.groups.add(group)
                    else:
                        # Opcional: imprimir una advertencia si se recibe un rol no válido
                        print(f"Advertencia: Rol '{role}' no válido o no encontrado en SYSTEM_ROLES para la actualización del usuario.")
                
            user.save() # Esto guardará todos los cambios, incluyendo el campo 'rol'
            
            return Response({
                'success': True,
                'message': 'Usuario actualizado exitosamente'
            })
            
    except Exception as e:
        return Response({
            'error': f'Error al actualizar el usuario: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_system_roles(request):
    """
    Obtener lista de roles del sistema
    """
    roles = []
    for key, value in SYSTEM_ROLES.items():
        roles.append({
            'key': key,
            'name': value,
            'description': get_role_description(key)
        })
    
    return Response({
        'roles': roles
    })

def get_role_description(role_key):
    """
    Obtener descripción de cada rol
    """
    descriptions = {
        'SUPER_ADMIN': 'Acceso completo al sistema. Puede gestionar usuarios, configuración y todas las funcionalidades.',
        'SUPERVISOR': 'Puede gestionar órdenes de trabajo, inventario, reportes y crear usuarios (excepto super admins).',
        'ENCARGADO_BODEGA': 'Gestiona inventario, repuestos, solicitudes y movimientos de stock.',
        'TECNICO': 'Accede a órdenes de trabajo asignadas, registra servicios y utiliza la aplicación móvil.'
    }
    return descriptions.get(role_key, 'Rol del sistema')

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Endpoint de login que devuelve un token de autenticación
    """
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({
            'error': 'Username y password son requeridos'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Autenticar usuario
    user = authenticate(username=username, password=password)
    
    if user is not None:
        if user.is_active:
            # Crear o obtener token
            token, created = Token.objects.get_or_create(user=user)
            
            # Determinar rol del usuario
            role = 'SUPER_ADMIN' if user.is_superuser else 'USER'
            role_display = 'Super Administrador' if user.is_superuser else 'Usuario'
            
            if not user.is_superuser:
                user_groups = user.groups.all()
                print(f"🔍 Usuario: {user.username}")
                print(f"📋 Grupos: {[g.name for g in user_groups]}")
    
                if user_groups:
                    group = user_groups.first()
                    print(f"🎯 Primer grupo: {group.name}")
        
                    for key, value in SYSTEM_ROLES.items():
                        print(f"🔄 Comparando: '{value}' == '{group.name}' -> {value == group.name}")
                        if value == group.name:
                            role = key
                            role_display = value
                            print(f"✅ Rol asignado: {role} ({role_display})")
                            break
                    else:
                        print(f"❌ Sin grupos asignados")
            
            return Response({
                'token': token.key,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_superuser': user.is_superuser,
                    'is_staff': user.is_staff,
                    'role': role,
                    'role_display': role_display,
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Cuenta desactivada'
            }, status=status.HTTP_401_UNAUTHORIZED)
    else:
        return Response({
            'error': 'Credenciales incorrectas'
        }, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Endpoint de logout que elimina el token
    """
    try:
        # Eliminar el token del usuario actual
        request.user.auth_token.delete()
        return Response({
            'message': 'Logout exitoso'
        }, status=status.HTTP_200_OK)
    except:
        return Response({
            'message': 'Logout exitoso'
        }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verify_token(request):
    """
    Endpoint para verificar si un token es válido
    """
    # Determinar rol del usuario
    role = 'SUPER_ADMIN' if request.user.is_superuser else 'USER'
    role_display = 'Super Administrador' if request.user.is_superuser else 'Usuario'
    
    if not request.user.is_superuser:
        user_groups = request.user.groups.all()
        if user_groups:
            group = user_groups.first()
            for key, value in SYSTEM_ROLES.items():
                if value == group.name:
                    role = key
                    role_display = value
                    break
    
    return Response({
        'user': {
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'first_name': request.user.first_name,
            'last_name': request.user.last_name,
            'is_superuser': request.user.is_superuser,
            'is_staff': request.user.is_staff,
            'role': role,
            'role_display': role_display,
        }
    }, status=status.HTTP_200_OK)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_user(request, user_id):
    """
    Eliminar usuario - Solo para super admin con validaciones de seguridad
    """
    requesting_user = request.user
    
    # ✅ VERIFICACIÓN 1: Solo super administradores
    if not requesting_user.is_superuser:
        return Response(
            {'error': 'Solo los super administradores pueden eliminar usuarios'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {'error': 'Usuario no encontrado'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # ✅ VERIFICACIÓN 2: No auto-eliminación
    if requesting_user.id == target_user.id:
        return Response(
            {'error': 'No puedes eliminar tu propia cuenta'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # ✅ VERIFICACIÓN 3: Proteger último super admin
    if target_user.is_superuser:
        super_admin_count = User.objects.filter(is_superuser=True).count()
        if super_admin_count <= 1:
            return Response(
                {'error': 'No se puede eliminar el último super administrador del sistema'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    try:
        username = target_user.username
        
        # ✅ ELIMINACIÓN SEGURA: Usar transacción
        with transaction.atomic():
            # Eliminar token de autenticación si existe
            try:
                target_user.auth_token.delete()
            except:
                pass  # No hay token o ya fue eliminado
            
            # Eliminar usuario
            target_user.delete()
        
        return Response({
            'message': f'Usuario "{username}" eliminado exitosamente',
            'deleted_user_id': user_id
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error eliminando usuario: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
