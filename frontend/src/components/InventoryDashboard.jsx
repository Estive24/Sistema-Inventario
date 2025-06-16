import React from 'react';

const InventoryDashboard = ({ estadisticas, alertasCount, onViewChange }) => {
  // Debug: Mostrar qué datos están llegando
  console.log('=== INVENTORY DASHBOARD DEBUG ===');
  console.log('estadisticas recibidas:', estadisticas);
  console.log('alertasCount:', alertasCount);
  console.log('tipo de estadisticas:', typeof estadisticas);
  console.log('================================');

  const formatCurrency = (value) => {
    if (!value || isNaN(value)) return '$0';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Asegurar que estadisticas sea un objeto válido
  const stats = estadisticas || {};
  
  // Extraer valores con defaults seguros
  const totalRepuestos = stats.total_repuestos || 0;
  const repuestosActivos = stats.repuestos_activos || 0;
  const alertasStockBajo = stats.alertas_stock_bajo || 0;
  const valorTotalInventario = stats.valor_total_inventario || 0;
  const repuestosSinStock = stats.repuestos_sin_stock || 0;

  // Debug de valores extraídos
  console.log('Valores extraídos:', {
    totalRepuestos,
    repuestosActivos,
    alertasStockBajo,
    valorTotalInventario,
    repuestosSinStock
  });

  const statsCards = [
    {
      title: 'Total Repuestos',
      value: totalRepuestos,
      icon: '📦',
      color: 'blue',
      clickAction: () => onViewChange('repuestos')
    },
    {
      title: 'Repuestos Activos',
      value: repuestosActivos,
      icon: '✅',
      color: 'green'
    },
    {
      title: 'Stock Bajo',
      value: alertasStockBajo,
      icon: '⚠️',
      color: alertasStockBajo > 0 ? 'red' : 'orange',
      clickAction: () => onViewChange('alertas')
    },
    {
      title: 'Sin Stock',
      value: repuestosSinStock,
      icon: '🚫',
      color: 'red'
    },
    {
      title: 'Valor Total Inventario',
      value: formatCurrency(valorTotalInventario),
      icon: '💰',
      color: 'purple',
      isLarge: true
    }
  ];

  return (
    <div className="inventory-dashboard">
      <div className="dashboard-welcome">
        <h2>📊 Dashboard de Inventario</h2>
        <p>Resumen del estado actual de repuestos y stock</p>
        
        {/* Debug info - Solo en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #0ea5e9',
            borderRadius: '6px',
            padding: '8px',
            fontSize: '12px',
            marginTop: '8px'
          }}>
            <strong>🔧 Debug:</strong> Datos recibidos correctamente - 
            {totalRepuestos} repuestos encontrados
          </div>
        )}
      </div>

      {/* Cards de estadísticas */}
      <div className="stats-grid">
        {statsCards.map((card, index) => (
          <div 
            key={index}
            className={`stat-card ${card.color} ${card.isLarge ? 'large' : ''} ${card.clickAction ? 'clickable' : ''}`}
            onClick={card.clickAction}
          >
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-content">
              <div className="stat-value">{card.value}</div>
              <div className="stat-title">{card.title}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas rápidas */}
      {alertasStockBajo > 0 && (
        <div className="quick-alerts">
          <div className="alert-header">
            <h3>🚨 Alertas Pendientes</h3>
            <button 
              onClick={() => onViewChange('alertas')}
              className="view-all-button"
            >
              Ver todas
            </button>
          </div>
          <div className="alert-summary">
            <p>Tienes <strong>{alertasStockBajo}</strong> alertas de stock bajo pendientes</p>
          </div>
        </div>
      )}

      {/* Acciones rápidas */}
      <div className="quick-actions">
        <h3>Acciones Rápidas</h3>
        <div className="actions-grid">
          <button 
            onClick={() => onViewChange('repuestos')}
            className="quick-action-btn blue"
          >
            <span className="action-icon">📦</span>
            <span>Gestionar Repuestos</span>
          </button>
          <button 
            onClick={() => onViewChange('movimientos')}
            className="quick-action-btn green"
          >
            <span className="action-icon">📋</span>
            <span>Ver Movimientos</span>
          </button>
          <button 
            onClick={() => onViewChange('alertas')}
            className="quick-action-btn orange"
          >
            <span className="action-icon">⚠️</span>
            <span>Revisar Alertas</span>
          </button>
        </div>
      </div>

      {/* Información adicional cuando hay datos */}
      {totalRepuestos > 0 && (
        <div className="inventory-summary">
          <h4>📋 Resumen del Inventario</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Cobertura de Stock:</span>
              <span className="summary-value">
                {Math.round((repuestosActivos - alertasStockBajo) / repuestosActivos * 100)}%
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Valor Promedio por Repuesto:</span>
              <span className="summary-value">
                {formatCurrency(valorTotalInventario / repuestosActivos)}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Estado General:</span>
              <span className={`summary-value ${alertasStockBajo === 0 ? 'good' : 'warning'}`}>
                {alertasStockBajo === 0 ? 'Excelente' : 'Requiere Atención'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryDashboard;