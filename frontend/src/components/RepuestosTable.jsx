import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';

const RepuestosTable = ({ 
  onCreateNew, 
  onEdit, 
  onEntradaStock, 
  onAjusteStock, 
  onDelete // ✅ NUEVO: Agregar prop para manejar eliminación
}) => {
  const [repuestos, setRepuestos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    activo: '',
    necesita_reposicion: ''
  });

  // ✅ NUEVO: Verificar permisos de eliminación
  const [canDelete, setCanDelete] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false); // 🔥 NUEVO

  useEffect(() => {
    loadRepuestos();
    
    // ✅ NUEVO: Verificar permisos al montar el componente
    setCanDelete(inventoryService.canUserDeleteRepuestos());
    setIsSuperAdmin(inventoryService.isSuperAdmin()); // 🔥 NUEVO
  }, [filters]);

  const loadRepuestos = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getRepuestos(filters);
      setRepuestos(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Error loading repuestos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getStockStatusClass = (repuesto) => {
    if (repuesto.stock_actual === 0) return 'stock-zero';
    if (repuesto.necesita_reposicion) return 'stock-low';
    return 'stock-ok';
  };

  const getStockStatusText = (repuesto) => {
    if (repuesto.stock_actual === 0) return 'Sin Stock';
    if (repuesto.necesita_reposicion) return 'Stock Bajo';
    return 'Stock OK';
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(value);
  };

  // ✅ NUEVO: Función para manejar eliminación
  const handleDeleteRepuesto = (repuesto) => {
    if (!canDelete) {
      alert('No tienes permisos para eliminar repuestos');
      return;
    }
    onDelete(repuesto);
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <span>Cargando repuestos...</span>
      </div>
    );
  }

  return (
    <div className="repuestos-table-container">
      {/* Header con filtros */}
      <div className="table-header">
        <div className="filters-row">
          <div className="search-group">
            <input
              type="text"
              placeholder="Buscar por nombre, marca, código..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-group">
            <select
              value={filters.activo}
              onChange={(e) => handleFilterChange('activo', e.target.value)}
              className="filter-select"
            >
              <option value="">Todos los estados</option>
              <option value="true">Solo activos</option>
              <option value="false">Solo inactivos</option>
            </select>
          </div>
          <div className="filter-group">
            <select
              value={filters.necesita_reposicion}
              onChange={(e) => handleFilterChange('necesita_reposicion', e.target.value)}
              className="filter-select"
            >
              <option value="">Todos los stocks</option>
              <option value="true">Solo stock bajo</option>
              <option value="false">Stock normal</option>
            </select>
          </div>
        </div>
        
        <div className="table-actions">
          <button onClick={onCreateNew} className="action-button create-button">
            + Nuevo Repuesto
          </button>
        </div>
      </div>

      {/* Tabla */}
      {repuestos.length === 0 ? (
        <div className="empty-state">
          <h3>No hay repuestos</h3>
          <p>No se encontraron repuestos con los filtros aplicados.</p>
          <button onClick={onCreateNew} className="create-first-button">
            Crear primer repuesto
          </button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="repuestos-table">
            <thead>
              <tr>
                <th>Repuesto</th>
                <th>Stock</th>
                <th>Estado Stock</th>
                <th>Valor</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {repuestos.map((repuesto) => (
                <tr key={repuesto.id}>
                  <td>
                    <div className="repuesto-info">
                      <div className="repuesto-name">{repuesto.nombre}</div>
                      <div className="repuesto-meta">
                        {repuesto.marca && <span>{repuesto.marca}</span>}
                        {repuesto.modelo && <span>{repuesto.modelo}</span>}
                        {repuesto.codigo_barras && <span>#{repuesto.codigo_barras}</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="stock-info">
                      <div className="stock-actual">{repuesto.stock_actual} {repuesto.unidad_medida}</div>
                      <div className="stock-minimo">Mín: {repuesto.stock_minimo_seguridad}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`stock-badge ${getStockStatusClass(repuesto)}`}>
                      {getStockStatusText(repuesto)}
                    </span>
                  </td>
                  <td>
                    <div className="valor-info">
                      <div className="valor-unitario">{formatCurrency(repuesto.costo_unitario)}</div>
                      <div className="valor-total">{formatCurrency(repuesto.valor_total_stock)}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${repuesto.activo ? 'active' : 'inactive'}`}>
                      {repuesto.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => onEdit(repuesto)}
                        className="action-btn edit-btn"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onEntradaStock(repuesto)}
                        className="action-btn entrada-btn"
                        title="Entrada de Stock"
                      >
                        📥
                      </button>
                      <button
                        onClick={() => onAjusteStock(repuesto)}
                        className="action-btn ajuste-btn"
                        title="Ajuste de Stock"
                      >
                        ⚖️
                      </button>
                      {/* ✅ NUEVO: Botón de eliminar */}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteRepuesto(repuesto)}
                          className={`action-btn delete-btn ${isSuperAdmin ? 'super-admin-delete' : ''}`}
                          title={isSuperAdmin ? "🔥 Eliminación Forzada (Super Admin)" : "Eliminar Repuesto"}
                        >
                          {isSuperAdmin ? '🔥' : '🗑️'}
                        </button>
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

export default RepuestosTable;