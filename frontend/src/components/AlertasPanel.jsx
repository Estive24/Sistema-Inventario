import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';

const AlertasPanel = ({ onAlertaResuelta }) => {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingAlerta, setResolvingAlerta] = useState(null);
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    loadAlertas();
  }, []);

  const loadAlertas = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getAlertas();
      setAlertas(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Error loading alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolverAlerta = async (alertaId) => {
    try {
      await inventoryService.marcarAlertaResuelta(alertaId, observaciones);
      setResolvingAlerta(null);
      setObservaciones('');
      loadAlertas();
      onAlertaResuelta && onAlertaResuelta();
    } catch (error) {
      console.error('Error resolviendo alerta:', error);
    }
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

  const getAlertaClass = (estado) => {
    const classes = {
      'PENDIENTE': 'alerta-pendiente',
      'NOTIFICADA': 'alerta-notificada',
      'RESUELTA': 'alerta-resuelta',
      'IGNORADA': 'alerta-ignorada'
    };
    return classes[estado] || 'alerta-pendiente';
  };

  const alertasPendientes = alertas.filter(a => a.estado === 'PENDIENTE');
  const alertasOtras = alertas.filter(a => a.estado !== 'PENDIENTE');

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <span>Cargando alertas...</span>
      </div>
    );
  }

  return (
    <div className="alertas-panel-container">
      <div className="alertas-header">
        <h2>🚨 Centro de Alertas de Stock</h2>
        <p>Gestión de alertas automáticas de stock bajo</p>
      </div>

      {/* Alertas pendientes */}
      <div className="alertas-section">
        <h3>⚠️ Alertas Pendientes ({alertasPendientes.length})</h3>
        
        {alertasPendientes.length === 0 ? (
          <div className="no-alertas">
            <div className="no-alertas-icon">✅</div>
            <h4>¡No hay alertas pendientes!</h4>
            <p>Todos los repuestos tienen stock suficiente.</p>
          </div>
        ) : (
          <div className="alertas-grid">
            {alertasPendientes.map((alerta) => (
              <div key={alerta.id} className={`alerta-card ${getAlertaClass(alerta.estado)}`}>
                <div className="alerta-header">
                  <div className="alerta-icon">⚠️</div>
                  <div className="alerta-info">
                    <h4>{alerta.repuesto_nombre}</h4>
                    <p className="alerta-fecha">{formatDate(alerta.fecha_creacion)}</p>
                  </div>
                  <div className="alerta-estado">
                    <span className={`estado-badge ${getAlertaClass(alerta.estado)}`}>
                      {alerta.estado_display}
                    </span>
                  </div>
                </div>
                
                <div className="alerta-details">
                  <div className="stock-info">
                    <div className="stock-item">
                      <label>Stock Actual:</label>
                      <span className="stock-value critical">{alerta.stock_actual}</span>
                    </div>
                    <div className="stock-item">
                      <label>Stock Mínimo:</label>
                      <span className="stock-value">{alerta.stock_minimo}</span>
                    </div>
                    <div className="stock-item">
                      <label>Diferencia:</label>
                      <span className="stock-value negative">
                        -{alerta.stock_minimo - alerta.stock_actual}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="alerta-actions">
                  {resolvingAlerta === alerta.id ? (
                    <div className="resolver-form">
                      <textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Observaciones sobre la resolución (opcional)"
                        rows="2"
                      />
                      <div className="form-actions">
                        <button
                          onClick={() => handleResolverAlerta(alerta.id)}
                          className="resolver-btn"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => {
                            setResolvingAlerta(null);
                            setObservaciones('');
                          }}
                          className="cancelar-btn"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResolvingAlerta(alerta.id)}
                      className="marcar-resuelta-btn"
                    >
                      Marcar como Resuelta
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de alertas */}
      {alertasOtras.length > 0 && (
        <div className="alertas-section">
          <h3>📋 Historial de Alertas</h3>
          <div className="alertas-historial">
            {alertasOtras.map((alerta) => (
              <div key={alerta.id} className={`alerta-historial-item ${getAlertaClass(alerta.estado)}`}>
                <div className="historial-info">
                  <div className="historial-repuesto">{alerta.repuesto_nombre}</div>
                  <div className="historial-fecha">{formatDate(alerta.fecha_creacion)}</div>
                </div>
                <div className="historial-estado">
                  <span className={`estado-badge ${getAlertaClass(alerta.estado)}`}>
                    {alerta.estado_display}
                  </span>
                </div>
                {alerta.fecha_resolucion && (
                  <div className="historial-resolucion">
                    Resuelta: {formatDate(alerta.fecha_resolucion)}
                    {alerta.resuelta_por_username && (
                      <span> por {alerta.resuelta_por_username}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertasPanel;
