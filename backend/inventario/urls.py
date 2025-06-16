from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'inventario'

router = DefaultRouter()
router.register(r'repuestos', views.RepuestoViewSet)
router.register(r'movimientos', views.MovimientoInventarioViewSet)
router.register(r'alertas', views.AlertaStockViewSet)

# ✅ VERIFICAR: Imprimir las URLs registradas para debug
print("=== DEBUG URLs INVENTARIO ===")
for pattern in router.urls:
    print(f"URL: {pattern.pattern}")
print("=============================")

urlpatterns = [
    path('', include(router.urls)),
]