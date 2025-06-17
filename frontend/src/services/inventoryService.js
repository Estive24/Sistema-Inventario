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

  // ========== MOVIMIENTOS - BÚSQUEDA AVANZADA ==========
  
  /**
   * Obtener movimientos con filtros avanzados y paginación
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise} Respuesta con movimientos y metadata
   */
  async getMovimientos(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      // Procesar todos los filtros posibles
      const validFilters = [
        'search', 'tipo_movimiento', 'repuesto', 'registrado_por',
        'fecha_desde', 'fecha_hasta', 'repuesto_nombre', 
        'registrado_por_username', 'proveedor', 'numero_factura',
        'numero_ot', 'page', 'page_size', 'ordering'
      ];
      
      Object.entries(filters).forEach(([key, value]) => {
        if (validFilters.includes(key) && value !== '' && value !== null && value !== undefined) {
          params.append(key, value);
        }
      });

      const queryString = params.toString();
      const endpoint = `/movimientos/${queryString ? `?${queryString}` : ''}`;
      
      console.log('📋 Obteniendo movimientos con endpoint:', endpoint);
      console.log('🔍 Filtros aplicados:', filters);
      
      const response = await this.request(endpoint);
      
      console.log('✅ Movimientos obtenidos:', {
        total: response.results ? response.results.length : response.length,
        pagination: response.count ? `${response.count} total` : 'Sin paginación'
      });
      
      return response;
    } catch (error) {
      console.error('❌ Error en getMovimientos:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de movimientos
   * @param {Object} filters - Filtros para las estadísticas
   * @returns {Promise} Estadísticas de movimientos
   */
  async getEstadisticasMovimientos(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          params.append(key, value);
        }
      });

      const queryString = params.toString();
      const endpoint = `/movimientos/estadisticas/${queryString ? `?${queryString}` : ''}`;
      
      console.log('📊 Obteniendo estadísticas de movimientos:', endpoint);
      return await this.request(endpoint);
    } catch (error) {
      console.error('❌ Error en getEstadisticasMovimientos:', error);
      throw error;
    }
  }

  /**
   * Exportar movimientos a Excel profesional (ÚNICA OPCIÓN)
   * @param {Object} filters - Filtros para la exportación
   * @returns {Promise} Resultado de la exportación
   */
  async exportarExcel(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          params.append(key, value);
        }
      });

      const queryString = params.toString();
      const endpoint = `/movimientos/exportar_excel/${queryString ? `?${queryString}` : ''}`;
      
      console.log('📊 Exportando a Excel:', endpoint);
      console.log('🔍 Filtros aplicados:', filters);
      
      const token = localStorage.getItem('token');
      const url = `${this.baseURL}${endpoint}`;
      
      console.log('🌐 URL completa:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Token ${token}`
        }
      });
      
      console.log('📡 Respuesta del servidor:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response body:', errorText);
        
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
          if (errorData.detail) {
            errorMessage += ` - ${errorData.detail}`;
          }
        } catch (parseError) {
          console.log('No se pudo parsear el error como JSON');
        }
        
        throw new Error(errorMessage);
      }
      
      // Verificar que recibimos un archivo Excel
      const contentType = response.headers.get('content-type');
      console.log('📄 Content-Type:', contentType);
      
      if (!contentType || !contentType.includes('spreadsheetml')) {
        console.warn('⚠️ Content-type inesperado para Excel:', contentType);
      }
      
      const blob = await response.blob();
      console.log('📦 Archivo Excel creado, tamaño:', blob.size, 'bytes');
      
      if (blob.size === 0) {
        throw new Error('El archivo Excel está vacío. Puede que no haya datos para exportar.');
      }
      
      // Verificar tamaño mínimo (Excel debe ser al menos 5KB)
      if (blob.size < 5000) {
        const text = await blob.text();
        console.log('📝 Contenido del archivo pequeño:', text.substring(0, 200));
        
        if (text.includes('error') || text.includes('Error')) {
          throw new Error(`Error generando Excel: ${text.substring(0, 100)}`);
        }
      }
      
      // Crear nombre descriptivo para el archivo
      const fechaHoy = new Date().toISOString().split('T')[0];
      const horaActual = new Date().toTimeString().split(':').slice(0, 2).join('-');
      const nombreArchivo = `Movimientos_Inventario_${fechaHoy}_${horaActual}.xlsx`;
      
      // Crear descarga
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = nombreArchivo;
      
      // Ejecutar descarga
      document.body.appendChild(link);
      link.style.display = 'none';
      link.click();
      
      // Limpiar recursos
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);
      
      console.log(`✅ Excel descargado: ${nombreArchivo}`);
      
      return { 
        success: true, 
        mensaje: 'Excel generado exitosamente',
        archivo: nombreArchivo,
        tamaño: blob.size,
        registros: this._estimateRecordsFromSize(blob.size)
      };
      
    } catch (error) {
      console.error('❌ Error en exportarExcel:', error);
      
      // Mejorar mensajes de error específicos
      if (error.message && error.message.includes('Failed to fetch')) {
        throw new Error('Error de conexión. Verifica tu conexión a internet.');
      }
      
      if (error.message && error.message.includes('406')) {
        throw new Error('Error de configuración del servidor. Contacta al administrador.');
      }
      
      throw error;
    }
  }

  /**
   * Estimar número de registros basado en el tamaño del archivo
   * @param {number} fileSize - Tamaño del archivo en bytes
   * @returns {number} Estimación de registros
   */
  _estimateRecordsFromSize(fileSize) {
    // Estimación aproximada: ~150 bytes por registro en Excel
    const avgBytesPerRecord = 150;
    const overhead = 10000; // Overhead del archivo Excel (headers, estilos, etc.)
    
    if (fileSize <= overhead) return 0;
    
    return Math.round((fileSize - overhead) / avgBytesPerRecord);
  }

  /**
   * Verificar si el usuario puede exportar movimientos
   * @returns {boolean} True si puede exportar
   */
  canUserExportMovimientos() {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return false;
      
      const user = JSON.parse(userData);
      
      // Solo Super Admin y Encargado de Bodega pueden exportar
      const isSuperUser = user.is_superuser === true || user.is_superuser === 'true';
      const isSuperAdmin = user.rol === 'SUPER_ADMIN' || user.role === 'SUPER_ADMIN';
      const isSupervisor = user.rol === 'SUPERVISOR' || user.role === 'SUPERVISOR';
      const isEncargadoBodega = user.rol === 'ENCARGADO_BODEGA' || user.role === 'ENCARGADO_BODEGA';
      
      const hasInventoryGroup = user.groups && Array.isArray(user.groups) && 
        user.groups.some(group => ['Supervisor', 'Encargado de Bodega'].includes(group));
      
      const hasPermission = isSuperUser || isSuperAdmin || isSupervisor || 
                           isEncargadoBodega || hasInventoryGroup;
      
      console.log('🔍 Verificando permisos para exportar Excel:', {
        user: user.username,
        hasPermission
      });
      
      return hasPermission;
    } catch (error) {
      console.error('❌ Error verificando permisos para exportar:', error);
      return false;
    }
  }
  
  /**
   * Obtener resumen de movimientos del usuario actual
   * @returns {Promise} Resumen personalizado del usuario
   */
  async getResumenUsuario() {
    try {
      console.log('👤 Obteniendo resumen de usuario...');
      return await this.request('/movimientos/resumen_usuario/');
    } catch (error) {
      console.error('❌ Error en getResumenUsuario:', error);
      throw error;
    }
  }

  /**
   * Buscar movimientos por texto libre
   * @param {string} searchTerm - Término de búsqueda
   * @param {Object} additionalFilters - Filtros adicionales
   * @returns {Promise} Resultados de búsqueda
   */
  async buscarMovimientos(searchTerm, additionalFilters = {}) {
    try {
      const filters = {
        search: searchTerm,
        page_size: 50, // Más resultados para búsquedas
        ...additionalFilters
      };
      
      console.log('🔍 Búsqueda de movimientos:', searchTerm);
      return await this.getMovimientos(filters);
    } catch (error) {
      console.error('❌ Error en buscarMovimientos:', error);
      throw error;
    }
  }

  /**
   * Obtener movimientos recientes
   * @param {number} dias - Días hacia atrás (por defecto 7)
   * @param {number} limit - Límite de resultados (por defecto 20)
   * @returns {Promise} Movimientos recientes
   */
  async getMovimientosRecientes(dias = 7, limit = 20) {
    try {
      const fechaDesde = new Date();
      fechaDesde.setDate(fechaDesde.getDate() - dias);
      
      const filters = {
        fecha_desde: fechaDesde.toISOString().split('T')[0],
        page_size: limit,
        ordering: '-fecha_movimiento'
      };
      
      console.log(`📅 Obteniendo movimientos de últimos ${dias} días`);
      return await this.getMovimientos(filters);
    } catch (error) {
      console.error('❌ Error en getMovimientosRecientes:', error);
      throw error;
    }
  }

  /**
   * Obtener movimientos por repuesto específico
   * @param {number} repuestoId - ID del repuesto
   * @param {Object} additionalFilters - Filtros adicionales
   * @returns {Promise} Movimientos del repuesto
   */
  async getMovimientosPorRepuesto(repuestoId, additionalFilters = {}) {
    try {
      const filters = {
        repuesto: repuestoId,
        ordering: '-fecha_movimiento',
        ...additionalFilters
      };
      
      console.log('📦 Obteniendo movimientos por repuesto:', repuestoId);
      return await this.getMovimientos(filters);
    } catch (error) {
      console.error('❌ Error en getMovimientosPorRepuesto:', error);
      throw error;
    }
  }

  /**
   * Obtener movimientos por usuario
   * @param {string} username - Nombre de usuario
   * @param {Object} additionalFilters - Filtros adicionales
   * @returns {Promise} Movimientos del usuario
   */
  async getMovimientosPorUsuario(username, additionalFilters = {}) {
    try {
      const filters = {
        registrado_por_username: username,
        ordering: '-fecha_movimiento',
        ...additionalFilters
      };
      
      console.log('👤 Obteniendo movimientos por usuario:', username);
      return await this.getMovimientos(filters);
    } catch (error) {
      console.error('❌ Error en getMovimientosPorUsuario:', error);
      throw error;
    }
  }

  /**
   * Obtener movimientos por tipo
   * @param {string} tipoMovimiento - Tipo de movimiento
   * @param {Object} additionalFilters - Filtros adicionales
   * @returns {Promise} Movimientos del tipo especificado
   */
  async getMovimientosPorTipo(tipoMovimiento, additionalFilters = {}) {
    try {
      const filters = {
        tipo_movimiento: tipoMovimiento,
        ordering: '-fecha_movimiento',
        ...additionalFilters
      };
      
      console.log('🔄 Obteniendo movimientos por tipo:', tipoMovimiento);
      return await this.getMovimientos(filters);
    } catch (error) {
      console.error('❌ Error en getMovimientosPorTipo:', error);
      throw error;
    }
  }

  /**
   * Verificar permisos para acceder a movimientos
   * @returns {boolean} True si el usuario puede acceder
   */
  canUserAccessMovimientos() {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return false;
      
      const user = JSON.parse(userData);
      
      // Verificar diferentes formas de permisos
      const isSuperUser = user.is_superuser === true || user.is_superuser === 'true';
      const isSuperAdmin = user.rol === 'SUPER_ADMIN' || user.role === 'SUPER_ADMIN';
      const isSupervisor = user.rol === 'SUPERVISOR' || user.role === 'SUPERVISOR';
      const isEncargadoBodega = user.rol === 'ENCARGADO_BODEGA' || user.role === 'ENCARGADO_BODEGA';
      
      // Verificar también grupos si están disponibles
      const hasInventoryGroup = user.groups && Array.isArray(user.groups) && 
        user.groups.some(group => ['Supervisor', 'Encargado de Bodega'].includes(group));
      
      const hasPermission = isSuperUser || isSuperAdmin || isSupervisor || 
                           isEncargadoBodega || hasInventoryGroup;
      
      console.log('🔍 Verificando permisos para movimientos:', {
        user: user.username,
        hasPermission,
        isSuperUser,
        isSuperAdmin,
        isSupervisor,
        isEncargadoBodega,
        hasInventoryGroup
      });
      
      return hasPermission;
    } catch (error) {
      console.error('❌ Error verificando permisos para movimientos:', error);
      return false;
    }
  }

  /**
   * Validar filtros de fecha
   * @param {string} fechaDesde - Fecha desde
   * @param {string} fechaHasta - Fecha hasta
   * @returns {Object} Resultado de validación
   */
  validarFiltrosFecha(fechaDesde, fechaHasta) {
    const resultado = {
      valido: true,
      errores: [],
      advertencias: []
    };

    if (fechaDesde && fechaHasta) {
      const desde = new Date(fechaDesde);
      const hasta = new Date(fechaHasta);
      
      if (desde > hasta) {
        resultado.valido = false;
        resultado.errores.push('La fecha "desde" no puede ser posterior a la fecha "hasta"');
      }
      
      const diferenciaDias = (hasta - desde) / (1000 * 60 * 60 * 24);
      if (diferenciaDias > 365) {
        resultado.advertencias.push('El rango de fechas es muy amplio (más de 1 año). Los resultados pueden tardar en cargarse.');
      }
    }

    if (fechaDesde) {
      const desde = new Date(fechaDesde);
      const hoy = new Date();
      if (desde > hoy) {
        resultado.valido = false;
        resultado.errores.push('La fecha "desde" no puede ser futura');
      }
    }

    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      const hoy = new Date();
      if (hasta > hoy) {
        resultado.advertencias.push('La fecha "hasta" es futura. Solo se mostrarán movimientos hasta hoy.');
      }
    }

    return resultado;
  }

  /**
   * Construir filtros rápidos predefinidos
   * @returns {Object} Filtros predefinidos
   */
  getFiltrosRapidos() {
    const hoy = new Date();
    const ayer = new Date(hoy.getTime() - 24 * 60 * 60 * 1000);
    const hace7dias = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
    const hace30dias = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return {
      hoy: {
        nombre: 'Hoy',
        filtros: {
          fecha_desde: hoy.toISOString().split('T')[0],
          fecha_hasta: hoy.toISOString().split('T')[0]
        }
      },
      ayer: {
        nombre: 'Ayer',
        filtros: {
          fecha_desde: ayer.toISOString().split('T')[0],
          fecha_hasta: ayer.toISOString().split('T')[0]
        }
      },
      ultimaSemana: {
        nombre: 'Última semana',
        filtros: {
          fecha_desde: hace7dias.toISOString().split('T')[0]
        }
      },
      ultimoMes: {
        nombre: 'Último mes',
        filtros: {
          fecha_desde: hace30dias.toISOString().split('T')[0]
        }
      },
      soloEntradas: {
        nombre: 'Solo entradas',
        filtros: {
          tipo_movimiento: 'ENTRADA'
        }
      },
      soloSalidas: {
        nombre: 'Solo salidas',
        filtros: {
          tipo_movimiento: 'SALIDA_USO'
        }
      },
      soloAjustes: {
        nombre: 'Solo ajustes',
        filtros: {
          tipos_movimiento: ['AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO']
        }
      }
    };
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