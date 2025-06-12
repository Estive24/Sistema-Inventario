import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Inventory2,
  RequestPage,
  TrendingUp,
  People,
  Notifications,
  Assessment,
  AccountCircle,
  Logout,
  Settings,
} from '@mui/icons-material';

import { useAuth } from '../contexts/AuthContext';
import { useQuery } from 'react-query';
import { notificacionesService } from '../services/api';

const DRAWER_WIDTH = 280;

const Layout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  // Obtener notificaciones no leídas
  const { data: notificacionesNoLeidas } = useQuery(
    'notificaciones-no-leidas',
    () => notificacionesService.getNoLeidas(),
    {
      refetchInterval: 30000, // Actualizar cada 30 segundos
    }
  );

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseProfileMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleCloseProfileMenu();
    await logout();
    navigate('/login');
  };

  // Configuración del menú de navegación
  const menuItems = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
      roles: ['SUPER_ADMIN', 'SUPERVISOR_GENERAL', 'SUPERVISOR', 'ENCARGADO_BODEGA', 'TECNICO'],
    },
    {
      text: 'Gestión de Usuarios',
      icon: <People />,
      path: '/usuarios',
      roles: ['SUPER_ADMIN', 'SUPERVISOR_GENERAL'],
    },
    {
      text: 'Repuestos',
      icon: <Inventory2 />,
      path: '/repuestos',
      roles: ['SUPER_ADMIN', 'SUPERVISOR_GENERAL', 'SUPERVISOR'],
    },
    {
      text: 'Solicitudes Externas',
      icon: <RequestPage />,
      path: '/solicitudes',
      roles: ['SUPER_ADMIN', 'SUPERVISOR_GENERAL', 'SUPERVISOR'],
    },
    {
      text: 'Ingresos de Stock',
      icon: <TrendingUp />,
      path: '/ingresos',
      roles: ['SUPER_ADMIN', 'SUPERVISOR_GENERAL', 'SUPERVISOR', 'ENCARGADO_BODEGA'],
    },
    {
      text: 'Notificaciones',
      icon: <Notifications />,
      path: '/notificaciones',
      roles: ['SUPER_ADMIN', 'SUPERVISOR_GENERAL', 'SUPERVISOR', 'ENCARGADO_BODEGA', 'TECNICO'],
    },
    {
      text: 'Reportes',
      icon: <Assessment />,
      path: '/reportes',
      roles: ['SUPER_ADMIN', 'SUPERVISOR_GENERAL', 'SUPERVISOR'],
    },
  ];

  // Filtrar elementos del menú según el rol del usuario
  const availableMenuItems = menuItems.filter(item =>
    hasRole(item.roles)
  );

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          Sistema Inventario
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {availableMenuItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) {
                    setMobileOpen(false);
                  }
                }}
                sx={{
                  backgroundColor: isActive ? theme.palette.primary.light : 'transparent',
                  color: isActive ? theme.palette.primary.contrastText : 'inherit',
                  '&:hover': {
                    backgroundColor: isActive 
                      ? theme.palette.primary.main 
                      : theme.palette.action.hover,
                  },
                  mx: 1,
                  my: 0.5,
                  borderRadius: 1,
                }}
              >
                <ListItemIcon sx={{ 
                  color: isActive ? theme.palette.primary.contrastText : 'inherit' 
                }}>
                  {item.text === 'Notificaciones' ? (
                    <Badge 
                      badgeContent={notificacionesNoLeidas?.data?.count || 0} 
                      color="error"
                    >
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          backgroundColor: '#fff',
          color: '#000',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {/* Título dinámico basado en la ruta actual */}
            {menuItems.find(item => item.path === location.pathname)?.text || 'Dashboard'}
          </Typography>

          {/* Información del usuario */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.first_name} {user?.last_name}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                display: { xs: 'none', sm: 'block' },
                color: theme.palette.text.secondary 
              }}
            >
              {user?.rol?.replace('_', ' ')}
            </Typography>
            
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleProfileMenu}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
              </Avatar>
            </IconButton>
          </Box>

          {/* Menú del perfil */}
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleCloseProfileMenu}
          >
            <MenuItem onClick={handleCloseProfileMenu}>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              <ListItemText>Perfil</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleCloseProfileMenu}>
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              <ListItemText>Configuración</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              <ListItemText>Cerrar Sesión</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Drawer de navegación */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Mejor rendimiento en móviles
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              borderRight: '1px solid rgba(0, 0, 0, 0.12)',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Contenido principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;