from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categorias', views.CategoriaViewSet)
router.register(r'repuestos', views.RepuestoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
