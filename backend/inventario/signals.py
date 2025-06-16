from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import MovimientoInventario, AlertaStock
from django.utils import timezone

@receiver(post_save, sender=MovimientoInventario)
def verificar_stock_bajo(sender, instance, created, **kwargs):
    """
    Signal para verificar automáticamente si se necesita generar alerta de stock bajo
    """
    if created:  # Solo en movimientos nuevos
        repuesto = instance.repuesto
        
        # Verificar si el stock está por debajo del mínimo
        if repuesto.necesita_reposicion:
            # Verificar si ya existe una alerta pendiente para este repuesto hoy
            hoy = timezone.now().date()
            alerta_existente = AlertaStock.objects.filter(
                repuesto=repuesto,
                estado__in=['PENDIENTE', 'NOTIFICADA'],
                fecha_creacion__date=hoy
            ).exists()
            
            if not alerta_existente:
                # Crear nueva alerta
                AlertaStock.objects.create(
                    repuesto=repuesto,
                    stock_actual=repuesto.stock_actual,
                    stock_minimo=repuesto.stock_minimo_seguridad
                )
                
                # TODO: Aquí se pueden agregar notificaciones por email/WhatsApp
                print(f"🚨 ALERTA: Stock bajo para {repuesto.nombre} - Stock: {repuesto.stock_actual}")
