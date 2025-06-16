import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';

const MovimientosTable = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    tipo_movimiento: '',
    repuesto: ''
  });

  useEffect(() => {
    loadMovimientos();
  }, [filters]);

  const loadMovimientos = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getMovimientos(filters);
      setMovimientos(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Error loading movimientos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

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

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <span>Cargando movimientos...</span>
      </div>
    );
  }

  return (
    <div className="movimientos-table-container">
      {/* Header con filtros */}
      <div className="table-header">
        <h2>📋 Historial de Movimientos</h2>
        <div className="filters-row">
          <div className="filter-group">
            <select
              value={filters.tipo_movimiento}
              onChange={(e) => handleFilterChange('tipo_movimiento', e.target.value)}
              className="filter-select"
            >
              <option value="">Todos los tipos</option>
              <option value="ENTRADA">Entrada</option>
              <option value="SALIDA_USO">Salida por Uso</option>
              <option value="SALIDA_SOLICITUD">Salida por Solicitud</option>
              <option value="AJUSTE_POSITIVO">Ajuste Positivo</option>
              <option value="AJUSTE_NEGATIVO">Ajuste Negativo</option>
              <option value="BAJA_POR_DANHO">Baja por Daño</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      {movimientos.length === 0 ? (
        <div className="empty-state">
          <h3>No hay movimientos</h3>
          <p>No se encontraron movimientos con los filtros aplicados.</p>
        </div>
      ) : (
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
                        {movimiento.tipo_movimiento.includes('SALIDA') || movimiento.tipo_movimiento.includes('NEGATIVO') || movimiento.tipo_movimiento.includes('BAJA') ? '-' : '+'}
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
    </div>
  );
};

export default MovimientosTable;
