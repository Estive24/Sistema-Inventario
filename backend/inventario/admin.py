from django.contrib import admin
from .models import Categoria, Repuesto

@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'activa')
    search_fields = ('nombre',)
    list_filter = ('activa',)

@admin.register(Repuesto)
class RepuestoAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nombre', 'categoria', 'stock_actual', 'stock_minimo', 'activo')
    search_fields = ('codigo', 'nombre')
    list_filter = ('categoria', 'activo')