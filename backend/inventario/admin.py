from django.contrib import admin
from .models import Repuesto, MovimientoInventario, AlertaStock

@admin.register(Repuesto)
class RepuestoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'marca', 'modelo', 'stock_actual', 'stock_minimo_seguridad', 'necesita_reposicion', 'activo']
    list_filter = ['activo', 'marca', 'creado_en']
    search_fields = ['nombre', 'descripcion', 'codigo_barras']
    readonly_fields = ['creado_en', 'actualizado_en']
    
    def necesita_reposicion(self, obj):
        return obj.necesita_reposicion
    necesita_reposicion.boolean = True
    necesita_reposicion.short_description = 'Necesita reposición'

@admin.register(MovimientoInventario)
class MovimientoInventarioAdmin(admin.ModelAdmin):
    list_display = ['repuesto', 'tipo_movimiento', 'cantidad', 'stock_posterior', 'fecha_movimiento', 'registrado_por']
    list_filter = ['tipo_movimiento', 'fecha_movimiento']
    search_fields = ['repuesto__nombre', 'observaciones']
    readonly_fields = ['fecha_movimiento', 'stock_anterior', 'stock_posterior']

@admin.register(AlertaStock)
class AlertaStockAdmin(admin.ModelAdmin):
    list_display = ['repuesto', 'stock_actual', 'stock_minimo', 'estado', 'fecha_creacion']
    list_filter = ['estado', 'fecha_creacion']
    readonly_fields = ['fecha_creacion']