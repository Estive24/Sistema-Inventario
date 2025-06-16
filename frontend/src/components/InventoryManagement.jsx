import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import InventoryDashboard from './InventoryDashboard';
import RepuestosTable from './RepuestosTable';
import MovimientosTable from './MovimientosTable';
import AlertasPanel from './AlertasPanel';
import CreateRepuestoModal from './CreateRepuestoModal';
import EditRepuestoModal from './EditRepuestoModal';
import EntradaStockModal from './EntradaStockModal';
import AjusteStockModal from './AjusteStockModal';
import './InventoryManagement.css';

const InventoryManagement = ({ onBack }) => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);

  // Estados para modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRepuesto, setEditingRepuesto] = useState(null);
  const [showEntradaModal, setShowEntradaModal] = useState(false);
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [selectedRepuesto, setSelectedRepuesto] = useState(null);

  // Estados para datos - INICIALIZAR CON VALORES VACÍOS PERO DEFINIDOS
  const [estadisticas, setEstadisticas] = useState({
    total_repuestos: 0,
    repuestos_activos: 0,
    alertas_stock_bajo: 0,
    valor_total_inventario: 0,
    repuestos_sin_stock: 0
  });
  const [alertasCount, setAlertasCount] = useState(0);

  useEffect(() => {
    console.log('=== INVENTORY MANAGEMENT MOUNTED ===');
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    console.log('=== INICIANDO CARGA DE DATOS ===');
    setLoading(true);
    
    try {
      console.log('🔄 Solicitando estadísticas y alertas...');
      
      // MEJORADO: Cargar datos por separado para mejor debugging
      let statsResponse = null;
      let alertasResponse = null;
      
      // Cargar estadísticas
      try {
        console.log('📊 Cargando estadísticas...');
        statsResponse = await inventoryService.getEstadisticas();
        console.log('✅ Estadísticas cargadas:', statsResponse);
      } catch (statsError) {
        console.error('❌ Error cargando estadísticas:', statsError);
        showNotification('Error cargando estadísticas: ' + statsError.message, 'error');
      }
      
      // Cargar alertas
      try {
        console.log('🚨 Cargando alertas...');
        alertasResponse = await inventoryService.getAlertas({ estado: 'PENDIENTE' });
        console.log('✅ Alertas cargadas:', alertasResponse);
      } catch (alertasError) {
        console.error('❌ Error cargando alertas:', alertasError);
        showNotification('Error cargando alertas: ' + alertasError.message, 'error');
      }
      
      // MEJORADO: Actualizar estados solo si tenemos datos válidos
      if (statsResponse && typeof statsResponse === 'object') {
        console.log('📊 Actualizando estadísticas en estado...');
        
        const newStats = {
          total_repuestos: Number(statsResponse.total_repuestos) || 0,
          repuestos_activos: Number(statsResponse.repuestos_activos) || 0,
          alertas_stock_bajo: Number(statsResponse.alertas_stock_bajo) || 0,
          valor_total_inventario: Number(statsResponse.valor_total_inventario) || 0,
          repuestos_sin_stock: Number(statsResponse.repuestos_sin_stock) || 0
        };
        
        console.log('📊 Nuevas estadísticas:', newStats);
        setEstadisticas(newStats);
        console.log('✅ Estado de estadísticas actualizado');
      } else {
        console.warn('⚠️ No se recibieron estadísticas válidas del backend');
        console.log('📄 Datos recibidos:', statsResponse);
      }
      
      if (alertasResponse && Array.isArray(alertasResponse)) {
        const alertasCount = alertasResponse.length;
        console.log('🚨 Actualizando contador de alertas:', alertasCount);
        setAlertasCount(alertasCount);
      } else if (alertasResponse && typeof alertasResponse === 'object' && alertasResponse.results) {
        // Si viene paginado
        const alertasCount = Array.isArray(alertasResponse.results) ? alertasResponse.results.length : 0;
        console.log('🚨 Actualizando contador de alertas (paginado):', alertasCount);
        setAlertasCount(alertasCount);
      } else {
        console.warn('⚠️ No se recibieron alertas válidas del backend');
        console.log('📄 Datos de alertas recibidos:', alertasResponse);
        setAlertasCount(0);
      }
      
      console.log('✅ Carga de datos completada exitosamente');
      
    } catch (error) {
      console.error('❌ Error general cargando datos del dashboard:', error);
      showNotification('Error general cargando datos: ' + error.message, 'error');
      
      // En caso de error general, mantener valores por defecto
      setEstadisticas({
        total_repuestos: 0,
        repuestos_activos: 0,
        alertas_stock_bajo: 0,
        valor_total_inventario: 0,
        repuestos_sin_stock: 0
      });
      setAlertasCount(0);
    } finally {
      setLoading(false);
      console.log('🏁 Carga de datos finalizada');
    }
  };

  const showNotification = (message, type = 'success') => {
    console.log(`[NOTIFICATION ${type.toUpperCase()}]:`, message);
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleRepuestoCreated = () => {
    setShowCreateModal(false);
    showNotification('Repuesto creado exitosamente');
    loadDashboardData();
  };

  const handleRepuestoUpdated = () => {
    setEditingRepuesto(null);
    showNotification('Repuesto actualizado exitosamente');
    loadDashboardData();
  };

  const handleEntradaSuccess = () => {
    setShowEntradaModal(false);
    showNotification('Entrada de stock registrada exitosamente');
    loadDashboardData();
  };

  const handleAjusteSuccess = () => {
    setShowAjusteModal(false);
    setSelectedRepuesto(null);
    showNotification('Ajuste de stock realizado exitosamente');
    loadDashboardData();
  };

  // OPCIONAL: Función de debug manual (mantener para emergencias)
  const handleDebugData = async () => {
    console.log('=== DEBUG MANUAL INICIADO ===');
    console.log('Estado actual de estadísticas:', estadisticas);
    console.log('Estado actual de alertasCount:', alertasCount);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('No hay token de autenticación', 'error');
        return;
      }

      const response = await fetch('http://localhost:8000/api/inventario/repuestos/estadisticas/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Fetch directo exitoso:', data);
      
      // Actualizar estado directamente
      const newStats = {
        total_repuestos: Number(data.total_repuestos) || 0,
        repuestos_activos: Number(data.repuestos_activos) || 0,
        alertas_stock_bajo: Number(data.alertas_stock_bajo) || 0,
        valor_total_inventario: Number(data.valor_total_inventario) || 0,
        repuestos_sin_stock: Number(data.repuestos_sin_stock) || 0
      };
      
      setEstadisticas(newStats);
      console.log('✅ Estado actualizado via debug');
      showNotification('Debug completado - datos actualizados', 'success');
    } catch (error) {
      console.error('❌ Error en debug fetch:', error);
      showNotification('Error en debug: ' + error.message, 'error');
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <InventoryDashboard 
            estadisticas={estadisticas}
            alertasCount={alertasCount}
            onViewChange={setCurrentView}
          />
        );
      case 'repuestos':
        return (
          <RepuestosTable 
            onCreateNew={() => setShowCreateModal(true)}
            onEdit={setEditingRepuesto}
            onEntradaStock={(repuesto) => {
              setSelectedRepuesto(repuesto);
              setShowEntradaModal(true);
            }}
            onAjusteStock={(repuesto) => {
              setSelectedRepuesto(repuesto);
              setShowAjusteModal(true);
            }}
          />
        );
      case 'movimientos':
        return <MovimientosTable />;
      case 'alertas':
        return <AlertasPanel onAlertaResuelta={loadDashboardData} />;
      default:
        return (
          <InventoryDashboard 
            estadisticas={estadisticas} 
            alertasCount={alertasCount}
            onViewChange={setCurrentView}
          />
        );
    }
  };

  return (
    <div className="inventory-management-container">
      {/* Header */}
      <div className="inventory-header">
        <div className="header-content">
          <button onClick={onBack} className="back-button">
            ← Volver al Dashboard
          </button>
          <div className="header-info">
            <h1>Gestión de Inventario</h1>
            <p>Control de repuestos y stock</p>
            
            {/* Debug info en desarrollo */}
            {process.env.NODE_ENV === 'development' && (
              <small style={{display: 'block', color: '#6b7280', fontSize: '11px'}}>
                Debug: {estadisticas.total_repuestos} repuestos | {alertasCount} alertas | 
                Loading: {loading ? 'Sí' : 'No'}
              </small>
            )}
          </div>
          <div className="header-actions">
            <button
              onClick={() => setShowCreateModal(true)}
              className="action-button create-button"
            >
              + Nuevo Repuesto
            </button>
            <button
              onClick={() => setShowEntradaModal(true)}
              className="action-button entrada-button"
            >
              📥 Entrada Stock
            </button>
            <button
              onClick={loadDashboardData}
              className="action-button refresh-button"
              disabled={loading}
            >
              {loading ? '⏳' : '🔄'} Actualizar
            </button>
            
            {/* Botón de debug en desarrollo */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={handleDebugData}
                className="action-button debug-button"
                style={{background: '#7c3aed', color: 'white'}}
              >
                🔧 Debug
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="inventory-nav">
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
        >
          📊 Dashboard
        </button>
        <button
          onClick={() => setCurrentView('repuestos')}
          className={`nav-button ${currentView === 'repuestos' ? 'active' : ''}`}
        >
          📦 Repuestos ({estadisticas.total_repuestos})
        </button>
        <button
          onClick={() => setCurrentView('movimientos')}
          className={`nav-button ${currentView === 'movimientos' ? 'active' : ''}`}
        >
          📋 Movimientos
        </button>
        <button
          onClick={() => setCurrentView('alertas')}
          className={`nav-button ${currentView === 'alertas' ? 'active' : ''}`}
        >
          🚨 Alertas {alertasCount > 0 && <span className="alert-badge">{alertasCount}</span>}
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
          <button 
            className="notification-close"
            onClick={() => setNotification(null)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              opacity: 0.7,
              marginLeft: '10px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="loading-indicator" style={{
          background: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '6px',
          padding: '12px',
          margin: '20px',
          textAlign: 'center',
          color: '#0c4a6e'
        }}>
          🔄 Cargando datos del inventario...
        </div>
      )}

      {/* Main Content */}
      <div className="inventory-content">
        {renderCurrentView()}
      </div>

      {/* Modales */}
      {showCreateModal && (
        <CreateRepuestoModal
          onClose={() => setShowCreateModal(false)}
          onRepuestoCreated={handleRepuestoCreated}
        />
      )}

      {editingRepuesto && (
        <EditRepuestoModal
          repuesto={editingRepuesto}
          onClose={() => setEditingRepuesto(null)}
          onRepuestoUpdated={handleRepuestoUpdated}
        />
      )}

      {showEntradaModal && (
        <EntradaStockModal
          repuesto={selectedRepuesto}
          onClose={() => {
            setShowEntradaModal(false);
            setSelectedRepuesto(null);
          }}
          onSuccess={handleEntradaSuccess}
        />
      )}

      {showAjusteModal && selectedRepuesto && (
        <AjusteStockModal
          repuesto={selectedRepuesto}
          onClose={() => {
            setShowAjusteModal(false);
            setSelectedRepuesto(null);
          }}
          onSuccess={handleAjusteSuccess}
        />
      )}
    </div>
  );
};

export default InventoryManagement;