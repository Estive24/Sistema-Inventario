import React, { useState } from 'react';
import { inventoryService } from '../services/inventoryService';

const CreateRepuestoModal = ({ onClose, onRepuestoCreated }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    marca: '',
    modelo: '',
    codigo_barras: '',
    unidad_medida: 'unidades',
    stock_minimo_seguridad: 1, // ✅ ARREGLO: Número, no string
    costo_unitario: '',
    activo: true
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = type === 'checkbox' ? checked : value;
    
    // ✅ ARREGLO: Convertir a número para campos numéricos
    if (name === 'stock_minimo_seguridad' && processedValue !== '') {
      processedValue = parseInt(processedValue, 10);
    }
    if (name === 'costo_unitario' && processedValue !== '') {
      processedValue = parseFloat(processedValue);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
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
      
      // ✅ ARREGLO: Manejar código de barras vacío
      if (!submitData.codigo_barras || submitData.codigo_barras.trim() === '') {
        delete submitData.codigo_barras; // Enviar undefined en lugar de string vacío
      }
      
      // ✅ ARREGLO: Manejar costo_unitario vacío
      if (!submitData.costo_unitario || submitData.costo_unitario === '') {
        delete submitData.costo_unitario;
      }
      
      // ✅ ARREGLO: Asegurar que stock_minimo_seguridad sea número
      if (typeof submitData.stock_minimo_seguridad === 'string') {
        submitData.stock_minimo_seguridad = parseInt(submitData.stock_minimo_seguridad, 10);
      }
      
      // ✅ DEBUG: Logging mejorado
      console.log('=== DEBUG CREAR REPUESTO ===');
      console.log('1. Datos originales:', formData);
      console.log('2. Datos procesados:', submitData);
      console.log('3. Tipos de datos:', {
        stock_minimo_seguridad: typeof submitData.stock_minimo_seguridad,
        costo_unitario: typeof submitData.costo_unitario,
        codigo_barras: typeof submitData.codigo_barras
      });
      console.log('4. Usuario actual:', JSON.parse(localStorage.getItem('user') || '{}'));
      console.log('===============================');
      
      await inventoryService.createRepuesto(submitData);
      console.log('✅ Repuesto creado exitosamente');
      onRepuestoCreated();
    } catch (error) {
      console.error('❌ Error completo:', error);
      console.error('❌ Error.message:', error.message);
      console.error('❌ Error.data:', error.data);
      
      // ✅ ARREGLO: Mejor manejo de errores
      let errorData = {};
      try {
        if (error.data) {
          errorData = error.data;
        } else {
          errorData = JSON.parse(error.message || '{}');
        }
      } catch (parseError) {
        errorData = { general: error.message || 'Error desconocido al crear repuesto' };
      }
      
      setErrors(errorData.errors || errorData || { general: errorData.general || error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3>Crear Nuevo Repuesto</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {errors.general && (
            <div className="error-alert">
              {errors.general}
            </div>
          )}

          {/* Información básica */}
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

          {/* Identificación */}
          <div className="form-section">
            <h4>Identificación</h4>
            
            <div className="form-group">
              <label>Código de Barras (Opcional)</label>
              <input
                type="text"
                name="codigo_barras"
                value={formData.codigo_barras}
                onChange={handleChange}
                className={errors.codigo_barras ? 'error' : ''}
                placeholder="Deja vacío si no tienes código de barras"
              />
              {errors.codigo_barras && <span className="error-text">{errors.codigo_barras}</span>}
              <small className="form-help">Si dejas este campo vacío, se puede agregar después</small>
            </div>
          </div>

          {/* Control de inventario */}
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

          {/* Información financiera */}
          <div className="form-section">
            <h4>Información Financiera (Opcional)</h4>
            
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

          {/* Estado */}
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
              {loading ? 'Creando...' : 'Crear Repuesto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRepuestoModal;