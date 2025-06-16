class InventoryService {
  constructor() {
    // Apuntar al backend de Django en puerto 8000
    this.baseURL = 'http://localhost:8000/api/inventario';
  }

  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    };

    if (token && !options.skipAuth) {
      config.headers['Authorization'] = `Token ${token}`;
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log('🌐 Petición a:', url);
      console.log('📋 Headers:', config.headers);
      
      const response = await fetch(url, config);
      
      console.log('📊 Response status:', response.status);
      console.log('📄 Response ok:', response.ok);
      
      // MEJORA: Verificar que la respuesta sea exitosa antes de procesar
      if (!response.ok) {
        console.error('❌ Response no exitosa:', response.status, response.statusText);
        
        let errorText;
        try {
          errorText = await response.text();
          console.error('❌ Error response body:', errorText.substring(0, 200));
        } catch (textError) {
          console.error('❌ No se pudo leer el error del servidor');
          errorText = `Error HTTP ${response.status}`;
        }
        
        // Intentar parsear como JSON para errores estructurados
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (jsonError) {
          // Si no es JSON, crear estructura de error
          errorData = { 
            error: `Error HTTP ${response.status}: ${response.statusText}`,
            detail: errorText.substring(0, 100)
          };
        }
        
        const error = new Error(errorData.detail || errorData.error || `Error HTTP ${response.status}`);
        error.data = errorData;
        error.status = response.status;
        throw error;
      }

      // MEJORA: Procesar respuesta exitosa
      let responseText;
      try {
        responseText = await response.text();
        console.log('✅ Response recibida, tamaño:', responseText.length);
      } catch (textError) {
        console.error('❌ Error leyendo response:', textError);
        throw new Error('Error leyendo respuesta del servidor');
      }

      // MEJORA: Parsear JSON de manera segura
      if (!responseText.trim()) {
        console.log('ℹ️ Respuesta vacía del servidor');
        return {};
      }

      try {
        const responseData = JSON.parse(responseText);
        console.log('✅ JSON parseado exitosamente:', Object.keys(responseData));
        return responseData;
      } catch (jsonError) {
        console.error('❌ Error parseando JSON:', jsonError);
        console.error('❌ Response text:', responseText.substring(0, 500));
        throw new Error('La respuesta del servidor no es JSON válido');
      }
      
    } catch (fetchError) {
      console.error('❌ Error en fetch:', fetchError.name, fetchError.message);
      
      // Re-throw con mensaje más claro
      if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
        throw new Error('Error de conexión: No se pudo conectar al servidor');
      }
      
      throw fetchError;
    }
  }

  // ========== REPUESTOS ==========
  async getRepuestos(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          params.append(key, value);
        }
      });

      const queryString = params.toString();
      const endpoint = `/repuestos/${queryString ? `?${queryString}` : ''}`;
      
      console.log('🔍 Obteniendo repuestos con endpoint:', endpoint);
      return await this.request(endpoint);
    } catch (error) {
      console.error('❌ Error en getRepuestos:', error);
      throw error;
    }
  }

  async createRepuesto(data) {
    try {
      console.log('➕ Creando repuesto:', data);
      return await this.request('/repuestos/', {
        method: 'POST',
        body: data
      });
    } catch (error) {
      console.error('❌ Error en createRepuesto:', error);
      throw error;
    }
  }

  async updateRepuesto(id, data) {
    try {
      console.log('✏️ Actualizando repuesto ID:', id, data);
      return await this.request(`/repuestos/${id}/`, {
        method: 'PUT',
        body: data
      });
    } catch (error) {
      console.error('❌ Error en updateRepuesto:', error);
      throw error;
    }
  }

  // ========== ELIMINACIÓN DE REPUESTOS ==========
  async validateDeleteRepuesto(id) {
    try {
      console.log('🔍 Validando eliminación de repuesto ID:', id);
      const result = await this.request(`/repuestos/${id}/validate_delete/`);
      console.log('✅ Validación completada:', result);
      return result;
    } catch (error) {
      console.error('❌ Error validando eliminación:', error);
      throw error;
    }
  }


  async deleteRepuesto(id) {
    try {
      console.log('🗑️ Eliminando repuesto ID:', id);
      const result = await this.request(`/repuestos/${id}/`, {
        method: 'DELETE'
      });
      console.log('✅ Repuesto eliminado:', result);
      return result;
    } catch (error) {
      console.error('❌ Error eliminando repuesto:', error);
      throw error;
    }
  }

// Método helper para verificar permisos de eliminación
  canUserDeleteRepuestos() {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return false;
      
      const user = JSON.parse(userData);
      
      // Verificar diferentes formas de permisos
      const isSuperUser = user.is_superuser === true || user.is_superuser === 'true';
      const isSuperAdmin = user.rol === 'SUPER_ADMIN' || user.role === 'SUPER_ADMIN';
      const isEncargadoBodega = user.rol === 'ENCARGADO_BODEGA' || user.role === 'ENCARGADO_BODEGA';
      
      // Verificar también grupos si están disponibles
      const hasDeleteGroup = user.groups && Array.isArray(user.groups) && 
        user.groups.some(group => ['Encargado de Bodega'].includes(group));
      
      console.log('🔍 Verificando permisos de eliminación:', {
        user: user.username,
        isSuperUser,
        isSuperAdmin,
        isEncargadoBodega,
        hasDeleteGroup,
        result: isSuperUser || isSuperAdmin || isEncargadoBodega || hasDeleteGroup
      });
      
      return isSuperUser || isSuperAdmin || isEncargadoBodega || hasDeleteGroup;
    } catch (error) {
      console.error('❌ Error verificando permisos:', error);
      return false;
    }
  }

  // 🔥 NUEVO: Método para verificar si es Super Administrador
  isSuperAdmin() {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return false;
      
      const user = JSON.parse(userData);
      
      const isSuperUser = user.is_superuser === true || user.is_superuser === 'true';
      const isSuperAdmin = user.rol === 'SUPER_ADMIN' || user.role === 'SUPER_ADMIN';
      
      console.log('🔥 Verificando Super Admin:', {
        user: user.username,
        isSuperUser,
        isSuperAdmin,
        result: isSuperUser || isSuperAdmin
      });
      
      return isSuperUser || isSuperAdmin;
    } catch (error) {
      console.error('❌ Error verificando Super Admin:', error);
      return false;
    }
  }


  async getEstadisticas() {
    try {
      console.log('📊 Obteniendo estadísticas...');
      const result = await this.request('/repuestos/estadisticas/');
      console.log('✅ Estadísticas obtenidas:', result);
      return result;
    } catch (error) {
      console.error('❌ Error en getEstadisticas:', error);
      // IMPORTANTE: Re-lanzar el error para que sea manejado en el componente
      throw error;
    }
  }

  async getStockBajo() {
    try {
      console.log('⚠️ Obteniendo stock bajo...');
      return await this.request('/repuestos/stock_bajo/');
    } catch (error) {
      console.error('❌ Error en getStockBajo:', error);
      throw error;
    }
  }

  async ajustarStock(id, data) {
    try {
      console.log('⚖️ Ajustando stock para repuesto ID:', id, data);
      return await this.request(`/repuestos/${id}/ajustar_stock/`, {
        method: 'POST',
        body: data
      });
    } catch (error) {
      console.error('❌ Error en ajustarStock:', error);
      throw error;
    }
  }

  // ========== MOVIMIENTOS ==========
  async getMovimientos(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          params.append(key, value);
        }
      });

      const queryString = params.toString();
      const endpoint = `/movimientos/${queryString ? `?${queryString}` : ''}`;
      
      console.log('📋 Obteniendo movimientos con endpoint:', endpoint);
      return await this.request(endpoint);
    } catch (error) {
      console.error('❌ Error en getMovimientos:', error);
      throw error;
    }
  }

  async entradaRepuestos(data) {
    try {
      console.log('📥 Registrando entrada de repuestos:', data);
      return await this.request('/movimientos/entrada_repuestos/', {
        method: 'POST',
        body: data
      });
    } catch (error) {
      console.error('❌ Error en entradaRepuestos:', error);
      throw error;
    }
  }

  // ========== ALERTAS ==========
  async getAlertas(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          params.append(key, value);
        }
      });

      const queryString = params.toString();
      const endpoint = `/alertas/${queryString ? `?${queryString}` : ''}`;
      
      console.log('🚨 Obteniendo alertas con endpoint:', endpoint);
      return await this.request(endpoint);
    } catch (error) {
      console.error('❌ Error en getAlertas:', error);
      throw error;
    }
  }

  async marcarAlertaResuelta(id, observaciones = '') {
    try {
      console.log('✅ Marcando alerta resuelta ID:', id);
      return await this.request(`/alertas/${id}/marcar_resuelta/`, {
        method: 'POST',
        body: { observaciones }
      });
    } catch (error) {
      console.error('❌ Error en marcarAlertaResuelta:', error);
      throw error;
    }
  }
}

export const inventoryService = new InventoryService();