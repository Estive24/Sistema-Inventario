from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Count, F
from django.utils import timezone
from .models import Repuesto, MovimientoInventario, AlertaStock
from .serializers import (
    RepuestoSerializer, 
    MovimientoInventarioSerializer, 
    AlertaStockSerializer
)

class RepuestoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión completa de repuestos
    """
    queryset = Repuesto.objects.all()
    serializer_class = RepuestoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # ✅ ARREGLO: Remover 'necesita_reposicion' porque es una property, no un campo del modelo
    filterset_fields = ['activo', 'marca']
    
    search_fields = ['nombre', 'descripcion', 'marca', 'modelo', 'codigo_barras']
    ordering_fields = ['nombre', 'stock_actual', 'stock_minimo_seguridad', 'creado_en']
    ordering = ['nombre']

    def perform_create(self, serializer):
        """Asignar usuario creador al crear repuesto"""
        try:
            print(f"DEBUG perform_create: Usuario = {self.request.user}")
            print(f"DEBUG perform_create: Usuario ID = {self.request.user.id}")
            print(f"DEBUG perform_create: Datos del serializer = {serializer.validated_data}")
            
            # ✅ IMPORTANTE: Asignar el usuario creador
            repuesto = serializer.save(creado_por=self.request.user)
            
            print(f"DEBUG perform_create: Repuesto creado = {repuesto}")
            print(f"DEBUG perform_create: Repuesto ID = {repuesto.id}")
            
        except Exception as e:
            print(f"ERROR en perform_create: {e}")
            import traceback
            traceback.print_exc()
            raise

    def get_permissions(self):
        """
        Permisos específicos por acción:
        - Lectura: Todos los autenticados
        - Escritura: Solo Supervisor y Encargado de Bodega
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            user = self.request.user
            
            # ✅ ARREGLO: Verificar permisos correctamente
            print(f"DEBUG: Usuario {user.username}, is_superuser: {user.is_superuser}")
            if hasattr(user, 'rol'):
                print(f"DEBUG: rol: {user.rol}")
            print(f"DEBUG: grupos: {[g.name for g in user.groups.all()]}")
            
            if not (user.is_superuser or 
                   (hasattr(user, 'rol') and user.rol in ['SUPER_ADMIN', 'SUPERVISOR', 'ENCARGADO_BODEGA']) or
                   user.groups.filter(name__in=['Supervisor', 'Encargado de Bodega']).exists()):
                self.permission_denied(
                    self.request, 
                    message="Solo supervisores y encargados de bodega pueden modificar repuestos."
                )
        return super().get_permissions()

    def get_queryset(self):
        """
        Override para filtros personalizados que no se pueden hacer con filterset_fields
        """
        queryset = super().get_queryset()
        
        # ✅ NUEVO: Filtro personalizado para necesita_reposicion
        necesita_reposicion = self.request.query_params.get('necesita_reposicion')
        if necesita_reposicion is not None:
            if necesita_reposicion.lower() == 'true':
                # Filtrar repuestos que necesitan reposición (stock <= stock_minimo)
                queryset = queryset.filter(stock_actual__lte=F('stock_minimo_seguridad'))
            elif necesita_reposicion.lower() == 'false':
                # Filtrar repuestos que NO necesitan reposición (stock > stock_minimo)
                queryset = queryset.filter(stock_actual__gt=F('stock_minimo_seguridad'))
        
        return queryset

    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtener estadísticas generales del inventario"""
        queryset = self.get_queryset()
        
        try:
            # ✅ CORREGIR: Calcular estadísticas de manera segura
            total_repuestos = queryset.count()
            repuestos_activos = queryset.filter(activo=True).count()
            
            # Calcular alertas de stock bajo
            alertas_stock_bajo = queryset.filter(
                stock_actual__lte=F('stock_minimo_seguridad')
            ).count()
            
            # Calcular valor total del inventario de forma segura
            valor_total = 0
            for repuesto in queryset.filter(activo=True, costo_unitario__isnull=False):
                valor_total += (repuesto.costo_unitario or 0) * repuesto.stock_actual
            
            repuestos_sin_stock = queryset.filter(stock_actual=0).count()
            
            stats = {
                'total_repuestos': total_repuestos,
                'repuestos_activos': repuestos_activos,
                'alertas_stock_bajo': alertas_stock_bajo,
                'valor_total_inventario': float(valor_total),
                'repuestos_sin_stock': repuestos_sin_stock,
            }
            
            print(f"DEBUG: Estadísticas calculadas: {stats}")
            return Response(stats)
            
        except Exception as e:
            print(f"ERROR en estadísticas: {e}")
            import traceback
            traceback.print_exc()
            
            return Response({
                'total_repuestos': 0,
                'repuestos_activos': 0,
                'alertas_stock_bajo': 0,
                'valor_total_inventario': 0.0,
                'repuestos_sin_stock': 0,
            }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def stock_bajo(self, request):
        """Listar repuestos con stock bajo"""
        repuestos_bajo_stock = self.get_queryset().filter(
            stock_actual__lte=F('stock_minimo_seguridad'),
            activo=True
        )
        
        serializer = self.get_serializer(repuestos_bajo_stock, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def ajustar_stock(self, request, pk=None):
        """Endpoint para ajustes manuales de stock (requiere autorización)"""
        repuesto = self.get_object()
        cantidad = request.data.get('cantidad')
        tipo_ajuste = request.data.get('tipo_ajuste')
        observaciones = request.data.get('observaciones', '')
        
        if not cantidad or not tipo_ajuste:
            return Response(
                {'error': 'Cantidad y tipo de ajuste son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            cantidad = int(cantidad)
        except ValueError:
            return Response(
                {'error': 'La cantidad debe ser un número entero'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = request.user
        if not (user.is_superuser or 
               (hasattr(user, 'rol') and user.rol in ['SUPER_ADMIN', 'SUPERVISOR']) or
               user.groups.filter(name='Supervisor').exists()):
            return Response(
                {'error': 'Solo supervisores pueden autorizar ajustes'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        tipo_movimiento = f'AJUSTE_{tipo_ajuste}'
        MovimientoInventario.objects.create(
            repuesto=repuesto,
            tipo_movimiento=tipo_movimiento,
            cantidad=cantidad,
            registrado_por=request.user,
            autorizado_por=request.user,
            observaciones=observaciones
        )
        
        return Response({'message': 'Ajuste realizado exitosamente'})


class MovimientoInventarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de movimientos de inventario
    """
    queryset = MovimientoInventario.objects.all()
    serializer_class = MovimientoInventarioSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['repuesto', 'tipo_movimiento', 'registrado_por']
    ordering_fields = ['fecha_movimiento']
    ordering = ['-fecha_movimiento']

    def perform_create(self, serializer):
        """Asignar usuario registrador al crear movimiento"""
        serializer.save(registrado_por=self.request.user)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def entrada_repuestos(self, request):
        """Endpoint específico para registrar entrada de repuestos"""
        try:
            print(f"=== DEBUG ENTRADA REPUESTOS ===")
            print(f"Method: {request.method}")
            print(f"Usuario: {request.user}")
            print(f"Datos recibidos: {request.data}")
        
            repuesto_id = request.data.get('repuesto_id')
            cantidad = request.data.get('cantidad')
            proveedor = request.data.get('proveedor', '')
            numero_factura = request.data.get('numero_factura', '')
            costo_unitario = request.data.get('costo_unitario')
            observaciones = request.data.get('observaciones', '')

                    # Validaciones básicas
            if not repuesto_id:
                print("❌ Error: repuesto_id faltante")
                return Response(
                    {'error': 'repuesto_id es requerido'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not cantidad:
                print("❌ Error: cantidad faltante")
                return Response(
                    {'error': 'cantidad es requerida'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                repuesto = Repuesto.objects.get(id=repuesto_id)
                print(f"✅ Repuesto encontrado: {repuesto.nombre}")
            except Repuesto.DoesNotExist:
                print(f"❌ Repuesto con ID {repuesto_id} no encontrado")
                return Response(
                    {'error': 'Repuesto no encontrado'},
                    status=status.HTTP_404_NOT_FOUND
                )

            try:
                cantidad = int(cantidad)
                print(f"✅ Cantidad procesada: {cantidad}")
            except ValueError:
                print(f"❌ Cantidad inválida: {cantidad}")
                return Response(
                    {'error': 'Cantidad debe ser un número válido'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
            # Stock antes del movimiento
            stock_anterior = repuesto.stock_actual
            print(f"📊 Stock anterior: {stock_anterior}")
            
            # Crear movimiento de entrada
            print("🔄 Creando movimiento de inventario...")
            movimiento = MovimientoInventario.objects.create(
                repuesto=repuesto,
                tipo_movimiento='ENTRADA',
                cantidad=cantidad,
                registrado_por=request.user,
                proveedor=proveedor,
                numero_factura=numero_factura,
                costo_unitario=costo_unitario if costo_unitario else None,
                observaciones=observaciones
            )
            
            # Verificar que se creó correctamente
            repuesto.refresh_from_db()  # Actualizar desde la base de datos
            print(f"✅ Movimiento creado: ID {movimiento.id}")
            print(f"📊 Stock después: {repuesto.stock_actual}")
            print(f"=== FIN DEBUG ENTRADA REPUESTOS ===")
            
            # Devolver datos del movimiento
            serializer = self.get_serializer(movimiento)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"❌ ERROR INESPERADO en entrada_repuestos: {e}")
            import traceback
            traceback.print_exc()
            
            return Response(
                {'error': f'Error interno del servidor: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
class AlertaStockViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para consulta de alertas de stock (solo lectura)
    """
    queryset = AlertaStock.objects.all()
    serializer_class = AlertaStockSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['estado', 'repuesto']
    ordering = ['-fecha_creacion']

    @action(detail=True, methods=['post'])
    def marcar_resuelta(self, request, pk=None):
        """Marcar una alerta como resuelta"""
        alerta = self.get_object()
        observaciones = request.data.get('observaciones', '')
        
        alerta.estado = 'RESUELTA'
        alerta.fecha_resolucion = timezone.now()
        alerta.resuelta_por = request.user
        alerta.observaciones = observaciones
        alerta.save()
        
        return Response({'message': 'Alerta marcada como resuelta'})