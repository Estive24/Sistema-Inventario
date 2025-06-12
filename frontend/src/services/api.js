import axios from 'axios';
import toast from 'react-hot-toast';

// Configuración base de la API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Crear instancia de axios
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    // Agregar token si existe
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para responses
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Manejar errores comunes
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Token inválido o expirado
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
          window.location.href = '/login';
          toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
          break;
          
        case 403:
          toast.error('No tienes permisos para realizar esta acción.');
          break;
          
        case 404:
          toast.error('Recurso no encontrado.');
          break;
          
        case 500:
          toast.error('Error interno del servidor. Intenta nuevamente.');
          break;
          
        default:
          // Mostrar mensaje de error específico si existe
          const errorMessage = data?.error || data?.detail || 'Error desconocido';
          toast.error(errorMessage);
      }
    } else if (error.request) {
      // Error de red
      toast.error('Error de conexión. Verifica tu conexión a internet.');
    } else {
      // Error de configuración
      toast.error('Error en la configuración de la solicitud.');
    }
    
    return Promise.reject(error);
  }
);

// Servicios específicos
export const authService = {
  login: (credentials) => api.post('/auth/login/', credentials),
  logout: () => api.post('/auth/logout/'),
  crearSuperUsuario: (userData) => api.post('/auth/crear-super-usuario/', userData),
  verificarToken: () => api.get('/auth/verificar-token/'),
};

export const usuariosService = {
  getUsuarios: (params) => api.get('/auth/usuarios/', { params }),
  getUsuario: (id) => api.get(`/auth/usuarios/${id}/`),
  crearUsuario: (userData) => api.post('/auth/usuarios/', userData),
  actualizarUsuario: (id, userData) => api.patch(`/auth/usuarios/${id}/`, userData),
  eliminarUsuario: (id) => api.delete(`/auth/usuarios/${id}/`),
};

export const repuestosService = {
  getRepuestos: (params) => api.get('/repuestos/', { params }),
  getRepuesto: (id) => api.get(`/repuestos/${id}/`),
  crearRepuesto: (repuestoData) => api.post('/repuestos/', repuestoData),
  actualizarRepuesto: (id, repuestoData) => api.patch(`/repuestos/${id}/`, repuestoData),
  eliminarRepuesto: (id) => api.delete(`/repuestos/${id}/`),
  getStockBajo: () => api.get('/repuestos/stock_bajo/'),
  getEstadisticas: () => api.get('/repuestos/estadisticas/'),
};

export const solicitudesService = {
  getSolicitudes: (params) => api.get('/solicitudes-externas/', { params }),
  getSolicitud: (id) => api.get(`/solicitudes-externas/${id}/`),
  crearSolicitud: (solicitudData) => api.post('/solicitudes-externas/', solicitudData),
  actualizarSolicitud: (id, solicitudData) => api.patch(`/solicitudes-externas/${id}/`, solicitudData),
  aprobarSolicitud: (id, data) => api.post(`/solicitudes-externas/${id}/aprobar/`, data),
  marcarComprada: (id, data) => api.post(`/solicitudes-externas/${id}/marcar_comprada/`, data),
};

export const ingresosService = {
  getIngresos: (params) => api.get('/ingresos-stock/', { params }),
  getIngreso: (id) => api.get(`/ingresos-stock/${id}/`),
  crearIngreso: (ingresoData) => api.post('/ingresos-stock/', ingresoData),
  getUltimosIngresos: (dias = 7) => api.get(`/ingresos-stock/ultimos_ingresos/?dias=${dias}`),
};

export const movimientosService = {
  getMovimientos: (params) => api.get('/movimientos-stock/', { params }),
  getMovimientosPorRepuesto: (repuestoId) => api.get(`/movimientos-stock/por_repuesto/?repuesto_id=${repuestoId}`),
};

export const notificacionesService = {
  getNotificaciones: (params) => api.get('/notificaciones/', { params }),
  marcarLeida: (id) => api.post(`/notificaciones/${id}/marcar_leida/`),
  marcarTodasLeidas: () => api.post('/notificaciones/marcar_todas_leidas/'),
  getNoLeidas: () => api.get('/notificaciones/no_leidas/'),
};

export const categoriasService = {
  getCategorias: () => api.get('/categorias/'),
  getCategoria: (id) => api.get(`/categorias/${id}/`),
  crearCategoria: (categoriaData) => api.post('/categorias/', categoriaData),
  actualizarCategoria: (id, categoriaData) => api.patch(`/categorias/${id}/`, categoriaData),
};

export const proveedoresService = {
  getProveedores: (params) => api.get('/proveedores/', { params }),
  getProveedor: (id) => api.get(`/proveedores/${id}/`),
  crearProveedor: (proveedorData) => api.post('/proveedores/', proveedorData),
  actualizarProveedor: (id, proveedorData) => api.patch(`/proveedores/${id}/`, proveedorData),
};

export const dashboardService = {
  getDashboard: () => api.get('/dashboard/'),
};

// Utilidades para manejo de archivos
export const uploadFile = async (file, endpoint) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return api.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Utilidad para descargar archivos
export const downloadFile = async (url, filename) => {
  try {
    const response = await api.get(url, {
      responseType: 'blob',
    });
    
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    return { success: true };
  } catch (error) {
    console.error('Error al descargar archivo:', error);
    return { success: false, error };
  }
};

// Utilidad para formatear URLs de medios
export const getMediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path}`;
};
setupService

export const setupService = {
  checkAdminExists: () => api.get('/setup/admin/'),
  createAdmin: (adminData) => api.post('/setup/admin/', adminData),
  getSystemStatus: () => api.get('/setup/status/'),
};

export default api;