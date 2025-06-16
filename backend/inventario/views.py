from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from datetime import timedelta
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


    def destroy(self, request, *args, **kwargs):
        """
        Eliminar repuesto con lógica especial para Super Administrador
        """
        repuesto = self.get_object()
        user = request.user
        
        # ✅ VERIFICACIÓN DE PERMISOS
        is_super_admin = (user.is_superuser or 
                         (hasattr(user, 'rol') and user.rol == 'SUPER_ADMIN'))
        is_encargado_bodega = (user.groups.filter(name='Encargado de Bodega').exists() or
                              (hasattr(user, 'rol') and user.rol == 'ENCARGADO_BODEGA'))
        
        if not (is_super_admin or is_encargado_bodega):
            return Response(
                {'error': 'Solo super administradores y encargados de bodega pueden eliminar repuestos'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 🔥 LÓGICA ESPECIAL: Super Admin puede eliminar SIN validaciones
        if is_super_admin:
            try:
                with transaction.atomic():
                    repuesto_info = {
                        'id': repuesto.id,
                        'nombre': repuesto.nombre,
                        'marca': repuesto.marca,
                        'modelo': repuesto.modelo,
                        'stock_actual': repuesto.stock_actual,
                        'movimientos_count': MovimientoInventario.objects.filter(repuesto=repuesto).count(),
                        'alertas_count': AlertaStock.objects.filter(repuesto=repuesto).count()
                    }
                    
                    # Eliminar TODAS las alertas relacionadas
                    AlertaStock.objects.filter(repuesto=repuesto).delete()
                    
                    # Eliminar TODOS los movimientos relacionados
                    MovimientoInventario.objects.filter(repuesto=repuesto).delete()
                    
                    # Eliminar el repuesto
                    repuesto.delete()
                    
                    # Log especial para Super Admin
                    print(f"🔥 ELIMINACIÓN FORZADA POR SUPER ADMIN: {repuesto_info['nombre']} (ID: {repuesto_info['id']})")
                    print(f"   Stock eliminado: {repuesto_info['stock_actual']}")
                    print(f"   Movimientos eliminados: {repuesto_info['movimientos_count']}")
                    print(f"   Alertas eliminadas: {repuesto_info['alertas_count']}")
                    print(f"   Usuario: {user.username}")
                    
                    return Response({
                        'message': f'Repuesto "{repuesto_info["nombre"]}" eliminado FORZADAMENTE por Super Administrador',
                        'deleted_repuesto': repuesto_info,
                        'forced_deletion': True,
                        'deleted_items': {
                            'movimientos': repuesto_info['movimientos_count'],
                            'alertas': repuesto_info['alertas_count'],
                            'stock_perdido': repuesto_info['stock_actual']
                        }
                    }, status=status.HTTP_200_OK)
                    
            except Exception as e:
                print(f"❌ ERROR en eliminación forzada: {e}")
                return Response({
                    'error': f'Error interno en eliminación forzada: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # 📋 VALIDACIONES NORMALES para Encargado de Bodega
        validation_errors = []
        
        # 1. Verificar stock actual
        if repuesto.stock_actual > 0:
            validation_errors.append(f'No se puede eliminar: el repuesto tiene stock actual de {repuesto.stock_actual} {repuesto.unidad_medida}')
        
        # 2. Verificar movimientos recientes (últimos 30 días)
        fecha_limite = timezone.now() - timedelta(days=30)
        movimientos_recientes = MovimientoInventario.objects.filter(
            repuesto=repuesto,
            fecha_movimiento__gte=fecha_limite
        ).count()
        
        if movimientos_recientes > 0:
            validation_errors.append(f'No se puede eliminar: el repuesto tiene {movimientos_recientes} movimientos en los últimos 30 días')
        
        # 3. Verificar alertas pendientes
        alertas_pendientes = AlertaStock.objects.filter(
            repuesto=repuesto,
            estado__in=['PENDIENTE', 'NOTIFICADA']
        ).count()
        
        if alertas_pendientes > 0:
            validation_errors.append(f'No se puede eliminar: el repuesto tiene {alertas_pendientes} alertas pendientes')
        
        # Si hay errores de validación para Encargado de Bodega
        if validation_errors:
            return Response({
                'error': 'No se puede eliminar el repuesto',
                'validation_errors': validation_errors,
                'can_delete': False,
                'user_role': 'ENCARGADO_BODEGA'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # ✅ ELIMINAR NORMAL para Encargado de Bodega (con validaciones pasadas)
        try:
            with transaction.atomic():
                repuesto_info = {
                    'id': repuesto.id,
                    'nombre': repuesto.nombre,
                    'marca': repuesto.marca,
                    'modelo': repuesto.modelo
                }
                
                # Solo eliminar alertas resueltas
                AlertaStock.objects.filter(repuesto=repuesto, estado='RESUELTA').delete()
                
                # Eliminar el repuesto
                repuesto.delete()
                
                # Log normal
                print(f"✅ ELIMINACIÓN NORMAL: {repuesto_info['nombre']} (ID: {repuesto_info['id']}) por: {user.username}")
                
                return Response({
                    'message': f'Repuesto "{repuesto_info["nombre"]}" eliminado exitosamente',
                    'deleted_repuesto': repuesto_info,
                    'forced_deletion': False
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            print(f"❌ ERROR eliminando repuesto: {e}")
            return Response({
                'error': f'Error interno eliminando repuesto: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def validate_delete(self, request, pk=None):
        """
        Validar eliminación con lógica especial para Super Administrador
        """
        repuesto = self.get_object()
        user = request.user
        
        # Identificar tipo de usuario
        is_super_admin = (user.is_superuser or 
                         (hasattr(user, 'rol') and user.rol == 'SUPER_ADMIN'))
        is_encargado_bodega = (user.groups.filter(name='Encargado de Bodega').exists() or
                              (hasattr(user, 'rol') and user.rol == 'ENCARGADO_BODEGA'))
        
        if not (is_super_admin or is_encargado_bodega):
            return Response({
                'can_delete': False,
                'permission_error': 'Sin permisos para eliminar repuestos',
                'user_role': 'NO_PERMISSION'
            })
        
        # 🔥 SUPER ADMIN: Puede eliminar TODO siempre
        if is_super_admin:
            # Calcular información de impacto
            total_movimientos = MovimientoInventario.objects.filter(repuesto=repuesto).count()
            total_alertas = AlertaStock.objects.filter(repuesto=repuesto).count()
            alertas_pendientes = AlertaStock.objects.filter(
                repuesto=repuesto,
                estado__in=['PENDIENTE', 'NOTIFICADA']
            ).count()
            
            # Movimientos recientes
            fecha_limite = timezone.now() - timedelta(days=30)
            movimientos_recientes = MovimientoInventario.objects.filter(
                repuesto=repuesto,
                fecha_movimiento__gte=fecha_limite
            ).count()
            
            return Response({
                'can_delete': True,
                'user_role': 'SUPER_ADMIN',
                'forced_deletion': True,
                'impact_warning': {
                    'stock_actual': repuesto.stock_actual,
                    'total_movimientos': total_movimientos,
                    'movimientos_recientes': movimientos_recientes,
                    'total_alertas': total_alertas,
                    'alertas_pendientes': alertas_pendientes
                },
                'repuesto_info': {
                    'id': repuesto.id,
                    'nombre': repuesto.nombre,
                    'marca': repuesto.marca,
                    'modelo': repuesto.modelo,
                    'stock_actual': repuesto.stock_actual,
                    'unidad_medida': repuesto.unidad_medida,
                    'activo': repuesto.activo
                }
            })
        
        # 📋 ENCARGADO DE BODEGA: Validaciones normales
        validation_errors = []
        warnings = []
        
        # Stock actual
        if repuesto.stock_actual > 0:
            validation_errors.append({
                'type': 'stock_actual',
                'message': f'Tiene stock actual de {repuesto.stock_actual} {repuesto.unidad_medida}'
            })
        
        # Movimientos recientes
        fecha_limite = timezone.now() - timedelta(days=30)
        movimientos_recientes = MovimientoInventario.objects.filter(
            repuesto=repuesto,
            fecha_movimiento__gte=fecha_limite
        ).count()
        
        if movimientos_recientes > 0:
            validation_errors.append({
                'type': 'movimientos_recientes',
                'message': f'Tiene {movimientos_recientes} movimientos en los últimos 30 días'
            })
        
        # Total de movimientos (para información)
        total_movimientos = MovimientoInventario.objects.filter(repuesto=repuesto).count()
        if total_movimientos > 0:
            warnings.append({
                'type': 'historial_movimientos',
                'message': f'Se eliminarán {total_movimientos} movimientos históricos'
            })
        
        # Alertas pendientes
        alertas_pendientes = AlertaStock.objects.filter(
            repuesto=repuesto,
            estado__in=['PENDIENTE', 'NOTIFICADA']
        ).count()
        
        if alertas_pendientes > 0:
            validation_errors.append({
                'type': 'alertas_pendientes',
                'message': f'Tiene {alertas_pendientes} alertas pendientes'
            })
        
        # Alertas históricas
        alertas_historicas = AlertaStock.objects.filter(repuesto=repuesto).count()
        if alertas_historicas > 0:
            warnings.append({
                'type': 'historial_alertas',
                'message': f'Se eliminarán {alertas_historicas} alertas históricas'
            })
        
        can_delete = len(validation_errors) == 0
        
        return Response({
            'can_delete': can_delete,
            'user_role': 'ENCARGADO_BODEGA',
            'forced_deletion': False,
            'validation_errors': validation_errors,
            'warnings': warnings,
            'repuesto_info': {
                'id': repuesto.id,
                'nombre': repuesto.nombre,
                'marca': repuesto.marca,
                'modelo': repuesto.modelo,
                'stock_actual': repuesto.stock_actual,
                'unidad_medida': repuesto.unidad_medida,
                'activo': repuesto.activo
            }
        })

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