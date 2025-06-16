from rest_framework import serializers
from .models import Repuesto, MovimientoInventario, AlertaStock

class RepuestoSerializer(serializers.ModelSerializer):
    # Campos calculados
    necesita_reposicion = serializers.ReadOnlyField()
    valor_total_stock = serializers.ReadOnlyField()
    creado_por_username = serializers.CharField(source='creado_por.username', read_only=True)
    
    class Meta:
        model = Repuesto
        fields = [
            'id', 'nombre', 'descripcion', 'marca', 'modelo',
            'codigo_barras', 'unidad_medida', 'stock_actual', 
            'stock_minimo_seguridad', 'costo_unitario', 'activo',
            'necesita_reposicion', 'valor_total_stock',
            'creado_en', 'actualizado_en', 'creado_por_username'
        ]
        read_only_fields = ['stock_actual', 'creado_en', 'actualizado_en']

    def validate_codigo_barras(self, value):
        """Validar codigo_barras y manejar strings vacíos"""
        # ✅ ARREGLO: Convertir string vacío a None
        if not value or value.strip() == '':
            return None
            
        # Validar unicidad solo si hay un valor real
        existing = Repuesto.objects.filter(codigo_barras=value.strip())
        if self.instance:
            existing = existing.exclude(id=self.instance.id)
            
        if existing.exists():
            raise serializers.ValidationError("Ya existe un repuesto con este código de barras.")
            
        return value.strip()

    def validate_stock_minimo_seguridad(self, value):
        """Validar que el stock mínimo sea positivo"""
        if value < 0:
            raise serializers.ValidationError("El stock mínimo no puede ser negativo.")
        return value

    def validate(self, data):
        """Validaciones adicionales"""
        # ✅ DEBUG: Imprimir datos recibidos
        print(f"DEBUG RepuestoSerializer.validate: datos recibidos = {data}")
        
        # Asegurar que los campos numéricos sean del tipo correcto
        if 'stock_minimo_seguridad' in data:
            try:
                data['stock_minimo_seguridad'] = int(data['stock_minimo_seguridad'])
            except (ValueError, TypeError):
                raise serializers.ValidationError({
                    'stock_minimo_seguridad': 'Debe ser un número entero válido.'
                })
        
        if 'costo_unitario' in data and data['costo_unitario'] is not None:
            try:
                data['costo_unitario'] = float(data['costo_unitario'])
            except (ValueError, TypeError):
                raise serializers.ValidationError({
                    'costo_unitario': 'Debe ser un número decimal válido.'
                })
        
        print(f"DEBUG RepuestoSerializer.validate: datos procesados = {data}")
        return data

class MovimientoInventarioSerializer(serializers.ModelSerializer):
    repuesto_nombre = serializers.CharField(source='repuesto.nombre', read_only=True)
    tipo_movimiento_display = serializers.CharField(source='get_tipo_movimiento_display', read_only=True)
    registrado_por_username = serializers.CharField(source='registrado_por.username', read_only=True)
    autorizado_por_username = serializers.CharField(source='autorizado_por.username', read_only=True)
    # Comentamos este campo calculado por ahora
    # valor_total_movimiento = serializers.ReadOnlyField()

    class Meta:
        model = MovimientoInventario
        fields = [
            'id', 'repuesto', 'tipo_movimiento', 'repuesto_nombre',
            'cantidad', 'stock_anterior', 'stock_posterior', 'costo_unitario',
            'fecha_movimiento', 'observaciones', 'proveedor', 'numero_factura',
            'numero_ot', 'tipo_movimiento_display',
            'autorizado_por_username', 'registrado_por_username', 
        ]
        read_only_fields = ['stock_anterior', 'stock_posterior', 'fecha_movimiento', 'tipo_movimiento_display']

    def validate(self, data):
        """Validaciones básicas del movimiento"""
        # Comentamos las validaciones complejas por ahora
        return data


class AlertaStockSerializer(serializers.ModelSerializer):
    repuesto_nombre = serializers.CharField(source='repuesto.nombre', read_only=True) # O un SerializerMethodField
    class Meta:
        model = AlertaStock
        fields = '__all__'