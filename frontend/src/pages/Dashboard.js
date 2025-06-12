import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Skeleton,
} from '@mui/material';
import {
  Inventory2,
  Warning,
  RequestPage,
  TrendingUp,
  AttachMoney,
  Notifications,
  ArrowForward,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { dashboardService, ingresosService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isSupervisor } = useAuth();

  // Obtener datos del dashboard
  const { data: dashboardData, isLoading: loadingDashboard } = useQuery(
    'dashboard',
    () => dashboardService.getDashboard(),
    {
      refetchInterval: 60000, // Actualizar cada minuto
    }
  );

  // Obtener últimos ingresos
  const { data: ultimosIngresos, isLoading: loadingIngresos } = useQuery(
    'ultimos-ingresos',
    () => ingresosService.getUltimosIngresos(7),
    {
      enabled: isSupervisor(),
    }
  );

  const stats = dashboardData?.data?.estadisticas || {};
  const repuestosCriticos = dashboardData?.data?.repuestos_criticos || [];

  // Tarjetas de estadísticas
  const StatCard = ({ title, value, icon, color, subtitle, onClick }) => (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { boxShadow: 4 } : {},
        transition: 'box-shadow 0.3s',
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: color, mr: 2 }}>
            {icon}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" component="div" fontWeight="bold">
              {loadingDashboard ? <Skeleton width={60} /> : value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Bienvenida */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          ¡Bienvenido, {user?.first_name}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Panel de control del sistema de inventario - {format(new Date(), 'EEEE, d MMMM yyyy', { locale: es })}
        </Typography>
      </Box>

      {/* Estadísticas principales */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total de Repuestos"
            value={stats.total_repuestos || 0}
            icon={<Inventory2 />}
            color="primary.main"
            onClick={() => navigate('/repuestos')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Stock Bajo"
            value={stats.stock_bajo || 0}
            icon={<Warning />}
            color="warning.main"
            subtitle="Requieren atención"
            onClick={() => navigate('/repuestos?stock_bajo=true')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Solicitudes Pendientes"
            value={stats.solicitudes_pendientes || 0}
            icon={<RequestPage />}
            color="info.main"
            onClick={() => navigate('/solicitudes?estado=PENDIENTE')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Ingresos (7 días)"
            value={stats.ultimos_ingresos || 0}
            icon={<TrendingUp />}
            color="success.main"
            onClick={() => navigate('/ingresos')}
          />
        </Grid>
      </Grid>

      {/* Valor del inventario */}
      {isSupervisor() && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                    <AttachMoney />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      ${(stats.valor_total_inventario || 0).toLocaleString('es-CL')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Valor Total del Inventario
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                    <Notifications />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      {stats.notificaciones_no_leidas || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Notificaciones sin Leer
                    </Typography>
                  </Box>
                </Box>
                {stats.notificaciones_no_leidas > 0 && (
                  <Button
                    size="small"
                    onClick={() => navigate('/notificaciones')}
                    endIcon={<ArrowForward />}
                  >
                    Ver notificaciones
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Alertas de stock bajo */}
      {stats.stock_bajo > 0 && (
        <Alert 
          severity="warning" 
          sx={{ mb: 4 }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={() => navigate('/repuestos?stock_bajo=true')}
            >
              Ver Repuestos
            </Button>
          }
        >
          <Typography variant="subtitle2" gutterBottom>
            ⚠️ Atención: {stats.stock_bajo} repuesto{stats.stock_bajo > 1 ? 's' : ''} con stock bajo
          </Typography>
          <Typography variant="body2">
            Algunos repuestos están por debajo del umbral mínimo y requieren reabastecimiento urgente.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Repuestos críticos */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                  Repuestos con Stock Crítico
                </Typography>
                <Button
                  size="small"
                  onClick={() => navigate('/repuestos?stock_bajo=true')}
                  endIcon={<ArrowForward />}
                >
                  Ver todos
                </Button>
              </Box>
              
              {loadingDashboard ? (
                <Box>
                  {[1, 2, 3].map((item) => (
                    <Box key={item} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Skeleton variant="rectangular" width={40} height={40} sx={{ mr: 2 }} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="text" width="40%" />
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : repuestosCriticos.length > 0 ? (
                <List>
                  {repuestosCriticos.slice(0, 5).map((repuesto) => (
                    <ListItem key={repuesto.id} divider>
                      <ListItemIcon>
                        <Warning color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2">
                              {repuesto.nombre}
                            </Typography>
                            <Chip
                              size="small"
                              label={`${repuesto.stock_actual} unidades`}
                              color="warning"
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Código: {repuesto.codigo_interno}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Mínimo: {repuesto.stock_minimo} | Ubicación: {repuesto.ubicacion_bodega || 'No especificada'}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    ✅ No hay repuestos con stock crítico
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Últimos ingresos */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                  Últimos Ingresos
                </Typography>
                <Button
                  size="small"
                  onClick={() => navigate('/ingresos')}
                  endIcon={<ArrowForward />}
                >
                  Ver todos
                </Button>
              </Box>
              
              {loadingIngresos ? (
                <Box>
                  {[1, 2, 3].map((item) => (
                    <Box key={item} sx={{ mb: 2 }}>
                      <Skeleton variant="text" width="80%" />
                      <Skeleton variant="text" width="60%" />
                    </Box>
                  ))}
                </Box>
              ) : ultimosIngresos?.data?.length > 0 ? (
                <List dense>
                  {ultimosIngresos.data.slice(0, 5).map((ingreso) => (
                    <ListItem key={ingreso.id} divider>
                      <ListItemIcon>
                        <TrendingUp color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2">
                            {ingreso.repuesto_nombre}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              +{ingreso.cantidad} unidades
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {format(new Date(ingreso.fecha_ingreso), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No hay ingresos recientes
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Accesos rápidos para supervisores */}
      {isSupervisor() && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Accesos Rápidos
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<RequestPage />}
                onClick={() => navigate('/solicitudes/nueva')}
                sx={{ py: 2 }}
              >
                Nueva Solicitud Externa
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<TrendingUp />}
                onClick={() => navigate('/ingresos/nuevo')}
                sx={{ py: 2 }}
              >
                Registrar Ingreso
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Inventory2 />}
                onClick={() => navigate('/repuestos/nuevo')}
                sx={{ py: 2 }}
              >
                Agregar Repuesto
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Warning />}
                onClick={() => navigate('/repuestos?stock_bajo=true')}
                sx={{ py: 2 }}
              >
                Revisar Stock Bajo
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;