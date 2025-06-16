# backend/setup/urls.py 
from django.urls import path
from . import views

app_name = 'setup'

urlpatterns = [
    # URLs de configuración inicial
    path('admin/', views.admin_setup, name='admin_setup'),
    path('status/', views.system_status, name='system_status'),
    
    # URLs de autenticación
    path('auth/login/', views.login_view, name='login'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/verify/', views.verify_token, name='verify_token'),
    
    # URLs de gestión de usuarios
    path('users/', views.list_users, name='list_users'),
    path('users/create/', views.create_user, name='create_user'),
    path('users/<int:user_id>/update/', views.update_user, name='update_user'),
    path('users/<int:user_id>/delete/', views.delete_user, name='delete_user'), 
    path('users/roles/', views.get_system_roles, name='get_system_roles'),
]