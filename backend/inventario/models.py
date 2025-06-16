from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from decimal import Decimal

User = get_user_model()

class Repuesto(models.Model):
    """
    Modelo para el catálogo de repuestos e insumos
    """
    # Información básica
    nombre = models.CharField(
        max_length=200, 
        help_text="Nombre descriptivo del repuesto"
    )
    descripcion = models.TextField(
        blank=True, 
        help_text="Descripción detallada del repuesto"
    )
    marca = models.CharField(
        max_length=100, 
        blank=True, 
        help_text="Marca del repuesto"
    )
    modelo = models.CharField(
        max_length=100, 
        blank=True, 
        help_text="Modelo específico"
    )
    
    # Identificación única
    codigo_barras = models.CharField(max_length=100, unique=True, null=True, blank=True)
    
    # Control de inventario
    unidad_medida = models.CharField(
        max_length=20,
        default='unidades',
        help_text="Unidad de medida (ej: unidades, metros, kilos)"
    )
    stock_actual = models.PositiveIntegerField(
        default=0,
        help_text="Cantidad actual disponible en bodega"
    )
    stock_minimo_seguridad = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(0)],
        help_text="Nivel mínimo antes de generar alerta"
    )
    
    # Información financiera (opcional para MVP)
    costo_unitario = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        blank=True, 
        null=True,
        help_text="Costo unitario promedio"
    )
    
    # Metadatos
    activo = models.BooleanField(
        default=True,
        help_text="Si el repuesto está disponible para uso"
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    creado_por = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='repuestos_creados'
    )

    class Meta:
        verbose_name = "Repuesto"
        verbose_name_plural = "Repuestos"
        ordering = ['nombre']
        indexes = [
            models.Index(fields=['nombre']),
            models.Index(fields=['codigo_barras']),
            models.Index(fields=['stock_actual']),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.marca} {self.modelo})".strip()

    @property
    def necesita_reposicion(self):
        """Verifica si el stock está por debajo del mínimo"""
        return self.stock_actual <= self.stock_minimo_seguridad

    @property
    def valor_total_stock(self):
        """Calcula el valor total del stock actual"""
        if self.costo_unitario:
            return self.stock_actual * self.costo_unitario
        return Decimal('0.00')

    def puede_usar_cantidad(self, cantidad):
        """Verifica si hay suficiente stock para usar cierta cantidad"""
        return self.stock_actual >= cantidad


class MovimientoInventario(models.Model):
    """
    Registro de todos los movimientos de entrada y salida de repuestos
    """
    
    TIPOS_MOVIMIENTO = [
        ('ENTRADA', 'Entrada de Stock'),
        ('SALIDA_USO', 'Salida por Uso en OT'),
        ('SALIDA_SOLICITUD', 'Salida por Solicitud'),
        ('AJUSTE_POSITIVO', 'Ajuste Positivo'),
        ('AJUSTE_NEGATIVO', 'Ajuste Negativo'),
        ('BAJA_POR_DANHO', 'Baja por Daño/Defecto'),
        ('COMPRA_EXTERNA_USO_DIRECTO', 'Compra Externa para Uso Directo'),
        ('DEVOLUCION', 'Devolución a Stock'),
    ]

    # Relaciones
    repuesto = models.ForeignKey(
        Repuesto, 
        on_delete=models.CASCADE, 
        related_name='movimientos'
    )
    
    # Información del movimiento
    tipo_movimiento = models.CharField(
        max_length=30, 
        choices=TIPOS_MOVIMIENTO
    )
    cantidad = models.IntegerField(
        validators=[MinValueValidator(1)],
        help_text="Cantidad de repuestos en el movimiento"
    )
    
    # Tracking de stock
    stock_anterior = models.PositiveIntegerField(
        help_text="Stock antes del movimiento"
    )
    stock_posterior = models.PositiveIntegerField(
        help_text="Stock después del movimiento"
    )
    
    # Información financiera
    costo_unitario = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        blank=True, 
        null=True,
        help_text="Costo unitario en este movimiento"
    )
    
    # Metadatos del movimiento
    fecha_movimiento = models.DateTimeField(auto_now_add=True)
    registrado_por = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='movimientos_registrados'
    )
    autorizado_por = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='movimientos_autorizados',
        help_text="Supervisor que autorizó ajustes o bajas"
    )
    
    # Información adicional
    observaciones = models.TextField(
        blank=True, 
        help_text="Motivo del movimiento, notas adicionales"
    )
    proveedor = models.CharField(
        max_length=200, 
        blank=True,
        help_text="Proveedor en caso de entrada"
    )
    numero_factura = models.CharField(
        max_length=100, 
        blank=True,
        help_text="Número de factura de compra"
    )
    
    # Para compras externas directas
    numero_ot = models.CharField(
        max_length=50, 
        blank=True,
        help_text="Número de OT para compras externas directas"
    )

    class Meta:
        verbose_name = "Movimiento de Inventario"
        verbose_name_plural = "Movimientos de Inventario"
        ordering = ['-fecha_movimiento']
        indexes = [
            models.Index(fields=['repuesto', '-fecha_movimiento']),
            models.Index(fields=['tipo_movimiento']),
            models.Index(fields=['registrado_por']),
        ]

    def __str__(self):
        return f"{self.get_tipo_movimiento_display()} - {self.repuesto.nombre} ({self.cantidad})"

    @property
    def valor_total_movimiento(self):
        """Calcula el valor total del movimiento"""
        if self.costo_unitario:
            return self.cantidad * self.costo_unitario
        return Decimal('0.00')

    def save(self, *args, **kwargs):
        """
        Override save para actualizar stock automáticamente
        """
        if not self.pk:  # Solo en creación, no en edición
            # Guardar stock anterior
            self.stock_anterior = self.repuesto.stock_actual
            
            # Calcular nuevo stock según tipo de movimiento
            if self.tipo_movimiento in ['ENTRADA', 'AJUSTE_POSITIVO', 'DEVOLUCION']:
                nuevo_stock = self.repuesto.stock_actual + self.cantidad
            elif self.tipo_movimiento in ['SALIDA_USO', 'SALIDA_SOLICITUD', 'AJUSTE_NEGATIVO', 'BAJA_POR_DANHO']:
                nuevo_stock = max(0, self.repuesto.stock_actual - self.cantidad)
            else:  # COMPRA_EXTERNA_USO_DIRECTO no afecta stock
                nuevo_stock = self.repuesto.stock_actual
            
            # Actualizar stock en el repuesto
            self.stock_posterior = nuevo_stock
            self.repuesto.stock_actual = nuevo_stock
            self.repuesto.save()
            
        super().save(*args, **kwargs)


class AlertaStock(models.Model):
    """
    Registro de alertas de stock bajo generadas automáticamente
    """
    
    ESTADOS_ALERTA = [
        ('PENDIENTE', 'Pendiente'),
        ('NOTIFICADA', 'Notificada'),
        ('RESUELTA', 'Resuelta'),
        ('IGNORADA', 'Ignorada'),
    ]

    repuesto = models.ForeignKey(
        Repuesto, 
        on_delete=models.CASCADE, 
        related_name='alertas'
    )
    stock_actual = models.PositiveIntegerField(
        help_text="Stock al momento de generar la alerta"
    )
    stock_minimo = models.PositiveIntegerField(
        help_text="Stock mínimo configurado al momento de la alerta"
    )
    estado = models.CharField(
        max_length=20, 
        choices=ESTADOS_ALERTA, 
        default='PENDIENTE'
    )
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_notificacion = models.DateTimeField(blank=True, null=True)
    fecha_resolucion = models.DateTimeField(blank=True, null=True)
    
    resuelta_por = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    observaciones = models.TextField(blank=True)

    class Meta:
        verbose_name = "Alerta de Stock"
        verbose_name_plural = "Alertas de Stock"
        ordering = ['-fecha_creacion']
        unique_together = ['repuesto', 'fecha_creacion']

    def __str__(self):
        return f"Alerta: {self.repuesto.nombre} - Stock: {self.stock_actual}"