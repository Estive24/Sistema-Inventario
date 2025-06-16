import React, { useState } from 'react';
import { inventoryService } from '../services/inventoryService';

const AjusteStockModal = ({ repuesto, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    tipo_ajuste: 'POSITIVO',
    cantidad: '',
    observaciones: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

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
      await inventoryService.ajustarStock(repuesto.id, formData);
      onSuccess();
    } catch (error) {
      const errorData = JSON.parse(error.message || '{}');
      setErrors(errorData.errors || { general: error.message });
    } finally {
      setLoading(false);
    }
  };

  const calcularNuevoStock = () => {
    const cantidad = parseInt(formData.cantidad) || 0;
    if (formData.tipo_ajuste === 'POSITIVO') {
      return repuesto.stock_actual + cantidad;
    } else {
      return Math.max(0, repuesto.stock_actual - cantidad);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>⚖️ Ajuste de Stock</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {errors.general && (
            <div className="error-alert">
              {errors.general}
            </div>
          )}

          {/* Advertencia de autorización */}
          <div className="warning-section">
            <div className="warning-alert">
              <strong>⚠️ Acción que requiere autorización de supervisor</strong>
              <p>Los ajustes de stock modifican directamente el inventario y requieren permisos especiales.</p>
            </div>
          </div>

          {/* Información del repuesto */}
          <div className="info-section">
            <h4>📦 Repuesto a Ajustar</h4>
            <div className="selected-repuesto">
              <div className="repuesto-details">
                <div className="repuesto-name">{repuesto.nombre}</div>
                <div className="repuesto-meta">
                  {repuesto.marca && <span>{repuesto.marca}</span>}
                  {repuesto.modelo && <span>{repuesto.modelo}</span>}
                </div>
                <div className="current-stock">
                  Stock actual: <strong>{repuesto.stock_actual} {repuesto.unidad_medida}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Tipo de ajuste */}
          <div className="form-group">
            <label>Tipo de Ajuste *</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="tipo_ajuste"
                  value="POSITIVO"
                  checked={formData.tipo_ajuste === 'POSITIVO'}
                  onChange={handleChange}
                />
                <span className="radio-label positive">➕ Ajuste Positivo (Agregar stock)</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="tipo_ajuste"
                  value="NEGATIVO"
                  checked={formData.tipo_ajuste === 'NEGATIVO'}
                  onChange={handleChange}
                />
                <span className="radio-label negative">➖ Ajuste Negativo (Reducir stock)</span>
              </label>
            </div>
          </div>

          {/* Cantidad */}
          <div className="form-group">
            <label>Cantidad a {formData.tipo_ajuste === 'POSITIVO' ? 'Agregar' : 'Reducir'} *</label>
            <input
              type="number"
              name="cantidad"
              value={formData.cantidad}
              onChange={handleChange}
              min="1"
              max={formData.tipo_ajuste === 'NEGATIVO' ? repuesto.stock_actual : undefined}
              className={errors.cantidad ? 'error' : ''}
              required
              placeholder="Cantidad"
            />
            {errors.cantidad && <span className="error-text">{errors.cantidad}</span>}
            {formData.cantidad && (
              <div className="stock-preview">
                <strong>Nuevo stock será: {calcularNuevoStock()} {repuesto.unidad_medida}</strong>
              </div>
            )}
          </div>

          {/* Motivo obligatorio */}
          <div className="form-group">
            <label>Motivo del Ajuste *</label>
            <textarea
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              rows="3"
              className={errors.observaciones ? 'error' : ''}
              required
              placeholder="Explica detalladamente el motivo de este ajuste (ej: diferencia en conteo físico, repuestos dañados, etc.)"
            />
            {errors.observaciones && <span className="error-text">{errors.observaciones}</span>}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="submit-button warning">
              {loading ? 'Procesando...' : 'Realizar Ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AjusteStockModal;