import React, { useState } from 'react';
import { inventoryService } from '../services/inventoryService';

const EditRepuestoModal = ({ repuesto, onClose, onRepuestoUpdated }) => {
  const [formData, setFormData] = useState({
    nombre: repuesto.nombre || '',
    descripcion: repuesto.descripcion || '',
    marca: repuesto.marca || '',
    modelo: repuesto.modelo || '',
    codigo_barras: repuesto.codigo_barras || '',
    unidad_medida: repuesto.unidad_medida || 'unidades',
    stock_minimo_seguridad: repuesto.stock_minimo_seguridad || 1,
    costo_unitario: repuesto.costo_unitario || '',
    activo: repuesto.activo !== false
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
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
      
      await inventoryService.updateRepuesto(repuesto.id, submitData);
      onRepuestoUpdated();
    } catch (error) {
      const errorData = JSON.parse(error.message || '{}');
      setErrors(errorData.errors || { general: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3>Editar Repuesto</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {errors.general && (
            <div className="error-alert">
              {errors.general}
            </div>
          )}

          {/* Información actual */}
          <div className="info-section">
            <h4>📊 Información Actual</h4>
            <div className="current-info">
              <div className="info-item">
                <label>Stock Actual:</label>
                <span className="info-value">{repuesto.stock_actual} {repuesto.unidad_medida}</span>
              </div>
              <div className="info-item">
                <label>Estado Stock:</label>
                <span className={`stock-badge ${repuesto.necesita_reposicion ? 'stock-low' : 'stock-ok'}`}>
                  {repuesto.necesita_reposicion ? 'Stock Bajo' : 'Stock OK'}
                </span>
              </div>
            </div>
          </div>

          {/* Formulario de edición - igual al de crear */}
          <div className="form-section">
            <h4>Información Básica</h4>
            
            <div className="form-group">
              <label>Nombre del Repuesto *</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className={errors.nombre ? 'error' : ''}
                required
              />
              {errors.nombre && <span className="error-text">{errors.nombre}</span>}
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                rows="3"
                className={errors.descripcion ? 'error' : ''}
              />
              {errors.descripcion && <span className="error-text">{errors.descripcion}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Marca</label>
                <input
                  type="text"
                  name="marca"
                  value={formData.marca}
                  onChange={handleChange}
                  className={errors.marca ? 'error' : ''}
                />
                {errors.marca && <span className="error-text">{errors.marca}</span>}
              </div>
              <div className="form-group">
                <label>Modelo</label>
                <input
                  type="text"
                  name="modelo"
                  value={formData.modelo}
                  onChange={handleChange}
                  className={errors.modelo ? 'error' : ''}
                />
                {errors.modelo && <span className="error-text">{errors.modelo}</span>}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Identificación</h4>
            
            <div className="form-group">
              <label>Código de Barras</label>
              <input
                type="text"
                name="codigo_barras"
                value={formData.codigo_barras}
                onChange={handleChange}
                className={errors.codigo_barras ? 'error' : ''}
              />
              {errors.codigo_barras && <span className="error-text">{errors.codigo_barras}</span>}
            </div>
          </div>

          <div className="form-section">
            <h4>Control de Inventario</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label>Unidad de Medida *</label>
                <select
                  name="unidad_medida"
                  value={formData.unidad_medida}
                  onChange={handleChange}
                  className={errors.unidad_medida ? 'error' : ''}
                >
                  <option value="unidades">Unidades</option>
                  <option value="metros">Metros</option>
                  <option value="kilos">Kilos</option>
                  <option value="litros">Litros</option>
                  <option value="cajas">Cajas</option>
                  <option value="paquetes">Paquetes</option>
                </select>
                {errors.unidad_medida && <span className="error-text">{errors.unidad_medida}</span>}
              </div>
              <div className="form-group">
                <label>Stock Mínimo de Seguridad *</label>
                <input
                  type="number"
                  name="stock_minimo_seguridad"
                  value={formData.stock_minimo_seguridad}
                  onChange={handleChange}
                  min="0"
                  className={errors.stock_minimo_seguridad ? 'error' : ''}
                  required
                />
                {errors.stock_minimo_seguridad && <span className="error-text">{errors.stock_minimo_seguridad}</span>}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Información Financiera</h4>
            
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

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                name="activo"
                checked={formData.activo}
                onChange={handleChange}
              />
              Repuesto activo (disponible para uso)
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="submit-button">
              {loading ? 'Actualizando...' : 'Actualizar Repuesto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRepuestoModal;
