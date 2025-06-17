import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import { useDebounce } from '../hooks/useDebounce';

const MovimientosTable = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [repuestos, setRepuestos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  
  // Estados de búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    tipo_movimiento: '',
    repuesto: '',
    registrado_por: '',
    fecha_desde: '',
    fecha_hasta: '',
    page: 1,
    page_size: 20
  });

  // Estados de UI
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [canViewMovimientos, setCanViewMovimientos] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Aplicar debounce al término de búsqueda
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Verificar permisos al montar
  useEffect(() => {
    checkPermissions();
  }, []);

  // Cargar datos cuando cambien los filtros
  useEffect(() => {
    if (canViewMovimientos) {
      loadMovimientos();
    }
  }, [filters, canViewMovimientos]);

  // Actualizar filtros cuando cambie el término de búsqueda
  useEffect(() => {
    setFilters(prev => ({ 
      ...prev, 
      search: debouncedSearchTerm,
      page: 1 
    }));
  }, [debouncedSearchTerm]);

  // Cargar datos iniciales
  useEffect(() => {
    if (canViewMovimientos) {
      loadRepuestos();
      loadUsuarios();
    }
  }, [canViewMovimientos]);

  const checkPermissions = () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        setCanViewMovimientos(false);
        return;
      }
      
      const user = JSON.parse(userData);
      setCurrentUser(user);
      
      // Verificar permisos: Super Admin, Supervisor o Encargado de Bodega
      const isSuperUser = user.is_superuser === true || user.is_superuser === 'true';
      const isSuperAdmin = user.rol === 'SUPER_ADMIN' || user.role === 'SUPER_ADMIN';
      const isSupervisor = user.rol === 'SUPERVISOR' || user.role === 'SUPERVISOR';
      const isEncargadoBodega = user.rol === 'ENCARGADO_BODEGA' || user.role === 'ENCARGADO_BODEGA';
      
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
      
      setCanViewMovimientos(hasPermission);
    } catch (error) {
      console.error('❌ Error verificando permisos:', error);
      setCanViewMovimientos(false);
    }
  };

  const loadMovimientos = async () => {
    setLoading(true);
    try {
      console.log('📋 Cargando movimientos con filtros:', filters);
      const data = await inventoryService.getMovimientos(filters);
      
      if (Array.isArray(data)) {
        setMovimientos(data);
        setPagination({});
      } else if (data.results) {
        setMovimientos(data.results);
        setPagination({
          current_page: data.current_page || 1,
          total_pages: data.total_pages || 1,
          total_count: data.count || 0,
          has_next: data.next ? true : false,
          has_previous: data.previous ? true : false
        });
      }
      
      console.log('✅ Movimientos cargados:', data);
    } catch (error) {
      console.error('❌ Error cargando movimientos:', error);
      setMovimientos([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRepuestos = async () => {
    try {
      const data = await inventoryService.getRepuestos({ activo: 'true' });
      setRepuestos(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('❌ Error cargando repuestos:', error);
    }
  };

  const loadUsuarios = async () => {
    try {
      // Esta función podría necesitarse implementar en el backend
      setUsuarios([]);
    } catch (error) {
      console.error('❌ Error cargando usuarios:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ 
      ...prev, 
      [key]: value,
      page: 1
    }));
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      search: '',
      tipo_movimiento: '',
      repuesto: '',
      registrado_por: '',
      fecha_desde: '',
      fecha_hasta: '',
      page: 1,
      page_size: 20
    });
  };

  // FUNCIÓN ÚNICA DE EXPORTACIÓN EXCEL
  const exportarExcel = async () => {
    try {
      console.log('📊 Iniciando exportación a Excel...');
      
      // Verificar permisos
      if (!inventoryService.canUserExportMovimientos()) {
        window.alert('❌ No tienes permisos para exportar movimientos. Contacta al administrador.');
        return;
      }
      
      setIsExporting(true);
      
      // Preparar filtros actuales (sin paginación)
      const exportFilters = { ...filters };
      delete exportFilters.page;
      delete exportFilters.page_size;
      
      console.log('📋 Filtros aplicados para exportación:', exportFilters);
      
      // Mostrar información previa
      const totalRegistros = movimientos.length;
      const mensaje = totalRegistros > 0 ? 
        `Se exportarán aproximadamente ${totalRegistros} movimientos con los filtros aplicados.\n\n¿Continuar?` :
        'Se exportarán todos los movimientos disponibles.\n\n¿Continuar?';
      
      if (!window.confirm(`📊 Exportación a Excel\n\n${mensaje}`)) {
        return;
      }
      
      const result = await inventoryService.exportarExcel(exportFilters);
      
      console.log('✅ Excel generado exitosamente:', result);
      
      // Mostrar mensaje de éxito detallado
      const mensajeExito = `✅ Excel generado exitosamente!\n\n` +
        `📁 Archivo: ${result.archivo}\n` +
        `📊 Registros: ~${result.registros || 'N/A'}\n` +
        `💾 Tamaño: ${(result.tamaño / 1024).toFixed(1)} KB\n\n` +
        `El archivo incluye:\n` +
        `• Datos completos con formato profesional\n` +
        `• Hoja de resumen ejecutivo\n` +
        `• Filtros automáticos habilitados`;
      
      window.alert(mensajeExito);
      
    } catch (error) {
      console.error('❌ Error en exportación Excel:', error);
      
      let errorMessage = 'Error desconocido en la exportación de Excel';
      
      if (error.message && error.message.includes('15,000')) {
        errorMessage = 'Demasiados registros para exportar.\n\nUsa filtros de fecha o tipo para reducir los resultados.\nMáximo permitido: 15,000 registros.';
      } else if (error.message && error.message.includes('No hay datos')) {
        errorMessage = 'No hay movimientos para exportar.\n\nVerifica que los filtros aplicados devuelvan resultados.';
      } else if (error.message && error.message.includes('403')) {
        errorMessage = 'No tienes permisos para exportar movimientos.\n\nContacta al administrador del sistema.';
      } else if (error.message && error.message.includes('500')) {
        errorMessage = 'Error interno del servidor.\n\nIntenta de nuevo en unos momentos o contacta al administrador.';
      } else if (error.message && error.message.includes('conexión')) {
        errorMessage = 'Error de conexión.\n\nVerifica tu conexión a internet e intenta nuevamente.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      window.alert(`❌ Error en exportación:\n\n${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Funciones de formateo
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getMovimientoIcon = (tipo) => {
    const icons = {
      'ENTRADA': '📥',
      'SALIDA_USO': '📤',
      'SALIDA_SOLICITUD': '📋',
      'AJUSTE_POSITIVO': '➕',
      'AJUSTE_NEGATIVO': '➖',
      'BAJA_POR_DANHO': '🗑️',
      'COMPRA_EXTERNA_USO_DIRECTO': '🛒',
      'DEVOLUCION': '↩️'
    };
    return icons[tipo] || '📄';
  };

  const getMovimientoClass = (tipo) => {
    if (tipo.includes('ENTRADA') || tipo.includes('POSITIVO') || tipo === 'DEVOLUCION') {
      return 'movimiento-entrada';
    }
    if (tipo.includes('SALIDA') || tipo.includes('NEGATIVO') || tipo.includes('BAJA')) {
      return 'movimiento-salida';
    }
    return 'movimiento-neutral';
  };

  // Verificar si el usuario no tiene permisos
  if (!canViewMovimientos) {
    return (
      <div className="access-denied" style={{
        background: 'white',
        borderRadius: '8px',
        padding: '60px 20px',
        textAlign: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{fontSize: '48px', marginBottom: '20px'}}>🚫</div>
        <h3 style={{margin: '0 0 12px 0', color: '#dc2626'}}>
          Acceso Denegado
        </h3>
        <p style={{margin: '0', color: '#6b7280'}}>
          No tienes permisos para ver los movimientos de inventario.
          <br />
          Contacta al administrador si necesitas acceso.
        </p>
      </div>
    );
  }

  return (
    <div className="movimientos-table-container">
      {/* Header con búsqueda principal */}
      <div className="table-header">
        <div className="header-title-section">
          <h2>📋 Historial de Movimientos</h2>
          <p>Registro completo de entradas, salidas y ajustes de inventario</p>
        </div>
        
        {/* Búsqueda principal */}
        <div className="main-search-section">
          <div className="search-input-group">
            <div className="search-icon">🔍</div>
            <input
              type="text"
              placeholder="Buscar por repuesto, observaciones, proveedor, factura..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="main-search-input"
            />
            {searchTerm && (
              <button
                onClick={() => handleSearchChange('')}
                className="clear-search-btn"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Indicador de búsqueda */}
          {searchTerm !== debouncedSearchTerm && (
            <div className="search-indicator">
              <div className="loading-spinner small"></div>
              <span>Buscando...</span>
            </div>
          )}
        </div>

        {/* Controles de filtros */}
        <div className="filter-controls">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`filter-toggle-btn ${showAdvancedFilters ? 'active' : ''}`}
          >
            🎛️ Filtros Avanzados
            <span className="toggle-icon">{showAdvancedFilters ? '▼' : '▶'}</span>
          </button>
          
          <button
            onClick={clearFilters}
            className="clear-filters-btn"
            disabled={!searchTerm && !filters.tipo_movimiento && !filters.repuesto}
          >
            🗑️ Limpiar Filtros
          </button>
          
          <button
            onClick={exportarExcel}
            className={`export-excel-btn ${isExporting ? 'exporting' : ''}`}
            disabled={isExporting}
            title={isExporting ? 'Generando archivo Excel...' : 'Exportar a Excel profesional con formato corporativo'}
          >
            {isExporting ? (
              <>
                <span className="loading-spinner"></span>
                Generando Excel...
              </>
            ) : (
              <>
                📊 Exportar Excel
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filtros avanzados */}
      {showAdvancedFilters && (
        <div className="advanced-filters">
          <div className="filters-grid">
            {/* Filtro por tipo de movimiento */}
            <div className="filter-group">
              <label>Tipo de Movimiento</label>
              <select
                value={filters.tipo_movimiento}
                onChange={(e) => handleFilterChange('tipo_movimiento', e.target.value)}
                className="filter-select"
              >
                <option value="">Todos los tipos</option>
                <option value="ENTRADA">📥 Entrada</option>
                <option value="SALIDA_USO">📤 Salida por Uso</option>
                <option value="SALIDA_SOLICITUD">📋 Salida por Solicitud</option>
                <option value="AJUSTE_POSITIVO">➕ Ajuste Positivo</option>
                <option value="AJUSTE_NEGATIVO">➖ Ajuste Negativo</option>
                <option value="BAJA_POR_DANHO">🗑️ Baja por Daño</option>
                <option value="COMPRA_EXTERNA_USO_DIRECTO">🛒 Compra Externa</option>
                <option value="DEVOLUCION">↩️ Devolución</option>
              </select>
            </div>

            {/* Filtro por repuesto */}
            <div className="filter-group">
              <label>Repuesto Específico</label>
              <select
                value={filters.repuesto}
                onChange={(e) => handleFilterChange('repuesto', e.target.value)}
                className="filter-select"
              >
                <option value="">Todos los repuestos</option>
                {repuestos.map((repuesto) => (
                  <option key={repuesto.id} value={repuesto.id}>
                    {repuesto.nombre} - {repuesto.marca} {repuesto.modelo}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtros de fecha */}
            <div className="filter-group">
              <label>Fecha Desde</label>
              <input
                type="date"
                value={filters.fecha_desde}
                onChange={(e) => handleFilterChange('fecha_desde', e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>Fecha Hasta</label>
              <input
                type="date"
                value={filters.fecha_hasta}
                onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)}
                className="filter-input"
              />
            </div>

            {/* Filtro por página */}
            <div className="filter-group">
              <label>Resultados por página</label>
              <select
                value={filters.page_size}
                onChange={(e) => handleFilterChange('page_size', parseInt(e.target.value))}
                className="filter-select"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Filtros rápidos */}
          <div className="quick-filters">
            <h4>Filtros Rápidos:</h4>
            <div className="quick-filter-buttons">
              <button
                onClick={() => handleFilterChange('fecha_desde', new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0])}
                className="quick-filter-btn"
              >
                📅 Última semana
              </button>
              <button
                onClick={() => handleFilterChange('fecha_desde', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0])}
                className="quick-filter-btn"
              >
                📅 Último mes
              </button>
              <button
                onClick={() => {
                  handleFilterChange('tipo_movimiento', 'ENTRADA');
                }}
                className="quick-filter-btn"
              >
                📥 Solo Entradas
              </button>
              <button
                onClick={() => {
                  handleFilterChange('tipo_movimiento', 'SALIDA_USO');
                }}
                className="quick-filter-btn"
              >
                📤 Solo Salidas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resultados y estadísticas */}
      <div className="results-summary">
        {!loading && (
          <div className="results-info">
            <span className="results-count">
              {pagination.total_count ? 
                `${pagination.total_count} movimientos encontrados` : 
                `${movimientos.length} movimientos`
              }
            </span>
            {filters.search && (
              <span className="search-term">
                Búsqueda: "<strong>{filters.search}</strong>"
              </span>
            )}
            {(filters.tipo_movimiento || filters.repuesto || filters.fecha_desde) && (
              <span className="active-filters">
                (Filtros activos)
              </span>
            )}
            {movimientos.length > 0 && (
              <span className="export-info">
                📊 Listos para exportar a Excel profesional
              </span>
            )}
          </div>
        )}
      </div>

      {/* Estado de carga */}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>Cargando movimientos...</span>
        </div>
      )}

      {/* Estado vacío */}
      {!loading && movimientos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No hay movimientos</h3>
          <p>
            {filters.search || filters.tipo_movimiento ? 
              'No se encontraron movimientos con los filtros aplicados.' :
              'Aún no hay movimientos registrados en el sistema.'
            }
          </p>
          {(filters.search || filters.tipo_movimiento) && (
            <button onClick={clearFilters} className="clear-filters-btn">
              Limpiar filtros y ver todos
            </button>
          )}
          {!filters.search && !filters.tipo_movimiento && (
            <div className="empty-state-info">
              <p><small>💡 Cuando haya movimientos, podrás exportarlos a Excel con formato profesional</small></p>
            </div>
          )}
        </div>
      ) : !loading && (
        <div className="table-wrapper">
          <table className="movimientos-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Repuesto</th>
                <th>Cantidad</th>
                <th>Stock</th>
                <th>Usuario</th>
                <th>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((movimiento) => (
                <tr key={movimiento.id} className={getMovimientoClass(movimiento.tipo_movimiento)}>
                  <td>
                    <div className="fecha-cell">
                      {formatDate(movimiento.fecha_movimiento)}
                    </div>
                  </td>
                  <td>
                    <div className="tipo-cell">
                      <span className="tipo-icon">{getMovimientoIcon(movimiento.tipo_movimiento)}</span>
                      <span className="tipo-text">{movimiento.tipo_movimiento_display}</span>
                    </div>
                  </td>
                  <td>
                    <div className="repuesto-cell">
                      <div className="repuesto-name">{movimiento.repuesto_nombre}</div>
                    </div>
                  </td>
                  <td>
                    <div className="cantidad-cell">
                      <span className={`cantidad ${getMovimientoClass(movimiento.tipo_movimiento)}`}>
                        {movimiento.tipo_movimiento.includes('SALIDA') || 
                         movimiento.tipo_movimiento.includes('NEGATIVO') || 
                         movimiento.tipo_movimiento.includes('BAJA') ? '-' : '+'}
                        {movimiento.cantidad}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="stock-cell">
                      <div className="stock-change">
                        {movimiento.stock_anterior} → {movimiento.stock_posterior}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="usuario-cell">
                      <div className="usuario-name">{movimiento.registrado_por_username}</div>
                      {movimiento.autorizado_por_username && (
                        <div className="autorizado-por">
                          Autorizado: {movimiento.autorizado_por_username}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="detalles-cell">
                      {movimiento.proveedor && (
                        <div className="detalle-item">
                          <strong>Proveedor:</strong> {movimiento.proveedor}
                        </div>
                      )}
                      {movimiento.numero_factura && (
                        <div className="detalle-item">
                          <strong>Factura:</strong> {movimiento.numero_factura}
                        </div>
                      )}
                      {movimiento.numero_ot && (
                        <div className="detalle-item">
                          <strong>OT:</strong> {movimiento.numero_ot}
                        </div>
                      )}
                      {movimiento.valor_total_movimiento && (
                        <div className="detalle-item">
                          <strong>Valor:</strong> {formatCurrency(movimiento.valor_total_movimiento)}
                        </div>
                      )}
                      {movimiento.observaciones && (
                        <div className="detalle-item observaciones">
                          {movimiento.observaciones}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {!loading && pagination.total_pages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            Página {pagination.current_page} de {pagination.total_pages}
            {pagination.total_count && (
              <span> ({pagination.total_count} movimientos en total)</span>
            )}
          </div>
          <div className="pagination-controls">
            <button
              onClick={() => handlePageChange(pagination.current_page - 1)}
              disabled={!pagination.has_previous}
              className="pagination-btn"
            >
              ⬅ Anterior
            </button>
            <span className="page-indicator">
              {pagination.current_page} / {pagination.total_pages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.current_page + 1)}
              disabled={!pagination.has_next}
              className="pagination-btn"
            >
              Siguiente ➡
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovimientosTable;