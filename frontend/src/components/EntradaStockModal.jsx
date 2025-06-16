import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';

const EntradaStockModal = ({ repuesto, onClose, onSuccess }) => {
  const [repuestos, setRepuestos] = useState([]);
  const [formData, setFormData] = useState({
    repuesto_id: repuesto?.id || '',
    cantidad: '',
    proveedor: '',
    numero_factura: '',
    costo_unitario: '',
    observaciones: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!repuesto) {
      loadRepuestos();
    }
  }, [repuesto]);

  const loadRepuestos = async () => {
    try {
      const data = await inventoryService.getRepuestos({ activo: 'true' });
      setRepuestos(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Error loading repuestos:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setErrors({});

  try {
    const submitData = { ...formData };
    if (!submitData.costo_unitario) {
      delete submitData.costo_unitario;
    }
    
    // ✅ DEBUG: Ver qué se está enviando
    console.log('=== DEBUG ENTRADA STOCK ===');
    console.log('Datos a enviar:', submitData);
    console.log('================================');
    
    const response = await inventoryService.entradaRepuestos(submitData);
    
    // ✅ DEBUG: Ver qué se recibe
    console.log('=== DEBUG RESPONSE ENTRADA ===');
    console.log('Response completa:', response);
    console.log('==================================');
    
    onSuccess();
  } catch (error) {
    // ✅ DEBUG MEJORADO: Ver el error completo
    console.error('=== ERROR COMPLETO ENTRADA STOCK ===');
    console.error('Error object:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // ✅ NUEVO: No intentar hacer JSON.parse aquí
    if (error.message && error.message.includes('<!DOCTYPE html>')) {
      console.error('❌ El servidor devolvió HTML en lugar de JSON');
      setErrors({ general: 'Error del servidor. Ver logs para más detalles.' });
    } else {
      // Intentar parsear solo si no es HTML
      try {
        const errorData = JSON.parse(error.message || '{}');
        setErrors(errorData.errors || { general: error.message });
      } catch (parseError) {
        console.error('❌ Error al parsear JSON:', parseError);
        setErrors({ general: 'Error de comunicación con el servidor' });
      }
    }
  } finally {
    setLoading(false);
  }
};
  const selectedRepuesto = repuesto || repuestos.find(r => r.id == formData.repuesto_id);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>📥 Entrada de Stock</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {errors.general && (
            <div className="error-alert">
              {errors.general}
            </div>
          )}

          {/* Información del repuesto */}
          {selectedRepuesto && (
            <div className="info-section">
              <h4>📦 Repuesto Seleccionado</h4>
              <div className="selected-repuesto">
                <div className="repuesto-details">
                  <div className="repuesto-name">{selectedRepuesto.nombre}</div>
                  <div className="repuesto-meta">
                    {selectedRepuesto.marca && <span>{selectedRepuesto.marca}</span>}
                    {selectedRepuesto.modelo && <span>{selectedRepuesto.modelo}</span>}
                  </div>
                  <div className="current-stock">
                    Stock actual: <strong>{selectedRepuesto.stock_actual} {selectedRepuesto.unidad_medida}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Selección de repuesto (si no viene predefinido) */}
          {!repuesto && (
            <div className="form-group">
              <label>Repuesto *</label>
              <select
                name="repuesto_id"
                value={formData.repuesto_id}
                onChange={handleChange}
                className={errors.repuesto_id ? 'error' : ''}
                required
              >
                <option value="">Seleccionar repuesto</option>
                {repuestos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre} - {item.marca} {item.modelo} (Stock: {item.stock_actual})
                  </option>
                ))}
              </select>
              {errors.repuesto_id && <span className="error-text">{errors.repuesto_id}</span>}
            </div>
          )}

          {/* Cantidad */}
          <div className="form-group">
            <label>Cantidad a Ingresar *</label>
            <input
              type="number"
              name="cantidad"
              value={formData.cantidad}
              onChange={handleChange}
              min="1"
              className={errors.cantidad ? 'error' : ''}
              required
              placeholder="Cantidad de unidades"
            />
            {errors.cantidad && <span className="error-text">{errors.cantidad}</span>}
            {selectedRepuesto && (
              <small className="form-help">
                Nuevo stock será: {selectedRepuesto.stock_actual + (parseInt(formData.cantidad) || 0)} {selectedRepuesto.unidad_medida}
              </small>
            )}
          </div>

          {/* Información de compra */}
          <div className="form-section">
            <h4>📋 Información de Compra</h4>
            
            <div className="form-group">
              <label>Proveedor</label>
              <input
                type="text"
                name="proveedor"
                value={formData.proveedor}
                onChange={handleChange}
                className={errors.proveedor ? 'error' : ''}
                placeholder="Nombre del proveedor"
              />
              {errors.proveedor && <span className="error-text">{errors.proveedor}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Número de Factura</label>
                <input
                  type="text"
                  name="numero_factura"
                  value={formData.numero_factura}
                  onChange={handleChange}
                  className={errors.numero_factura ? 'error' : ''}
                  placeholder="Ej: FAC-001234"
                />
                {errors.numero_factura && <span className="error-text">{errors.numero_factura}</span>}
              </div>
              <div className="form-group">
                <label>Costo Unitario</label>
                <input
                  type="number"
                  name="costo_unitario"
                  value={formData.costo_unitario}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className={errors.costo_unitario ? 'error' : ''}
                  placeholder="0.00"
                />
                {errors.costo_unitario && <span className="error-text">{errors.costo_unitario}</span>}
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div className="form-group">
            <label>Observaciones</label>
            <textarea
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              rows="3"
              className={errors.observaciones ? 'error' : ''}
              placeholder="Notas adicionales sobre esta entrada..."
            />
            {errors.observaciones && <span className="error-text">{errors.observaciones}</span>}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="submit-button">
              {loading ? 'Registrando...' : 'Registrar Entrada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntradaStockModal;
