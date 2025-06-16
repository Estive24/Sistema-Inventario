import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';

const DeleteRepuestoModal = ({ repuesto, onClose, onRepuestoDeleted }) => {
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [validationData, setValidationData] = useState(null);
  const [error, setError] = useState('');
  const [confirmText, setConfirmText] = useState('');

  // 🔥 NUEVO: Detectar si es Super Admin
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Texto de confirmación diferente según el rol
  const getExpectedConfirmText = () => {
    if (isSuperAdmin) {
      return `FORZAR ELIMINACIÓN ${repuesto.nombre.toUpperCase()}`;
    }
    return `ELIMINAR ${repuesto.nombre.toUpperCase()}`;
  };

  const expectedConfirmText = getExpectedConfirmText();

  useEffect(() => {
    // Verificar si es Super Admin
    setIsSuperAdmin(inventoryService.isSuperAdmin());
    validateDeletion();
  }, [repuesto.id]);

  const validateDeletion = async () => {
    setLoading(true);
    setError('');
    
    try {
      const validation = await inventoryService.validateDeleteRepuesto(repuesto.id);
      setValidationData(validation);
      console.log('🔍 Validación recibida:', validation);
    } catch (error) {
      console.error('❌ Error validando:', error);
      setError('Error validando eliminación: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText !== expectedConfirmText) {
      setError('Texto de confirmación incorrecto');
      return;
    }

    if (!isSuperAdmin && !validationData?.can_delete) {
      setError('El repuesto no puede ser eliminado en este momento');
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const result = await inventoryService.deleteRepuesto(repuesto.id);
      console.log('✅ Repuesto eliminado:', result);
      onRepuestoDeleted(repuesto, result);
    } catch (error) {
      console.error('❌ Error eliminando:', error);
      
      // Manejar diferentes tipos de error
      if (error.status === 400) {
        const errorData = error.data || {};
        if (errorData.validation_errors) {
          setError(`No se puede eliminar: ${errorData.validation_errors.join(', ')}`);
        } else {
          setError(errorData.error || 'Error de validación');
        }
      } else if (error.status === 403) {
        setError('No tienes permisos para eliminar este repuesto');
      } else {
        setError('Error eliminando repuesto: ' + error.message);
      }
    } finally {
      setDeleting(false);
    }
  };

  const canProceedWithDeletion = isSuperAdmin || (validationData?.can_delete && !loading);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{isSuperAdmin ? '🔥 Eliminación Forzada' : '🗑️ Eliminar Repuesto'}</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <div className="modal-form">
          {/* Advertencia específica para Super Admin */}
          {isSuperAdmin ? (
            <div className="error-alert" style={{
              background: '#7f1d1d',
              border: '2px solid #dc2626',
              color: 'white',
              marginBottom: '20px'
            }}>
              <strong>🔥 ELIMINACIÓN FORZADA DE SUPER ADMINISTRADOR</strong>
              <p style={{margin: '8px 0 0 0'}}>
                Como Super Administrador, puedes eliminar CUALQUIER repuesto SIN restricciones.
                Esta acción eliminará PERMANENTEMENTE el repuesto y TODO su historial.
              </p>
            </div>
          ) : (
            <div className="error-alert" style={{
              background: '#fef2f2',
              border: '2px solid #fca5a5',
              marginBottom: '20px'
            }}>
              <strong>⚠️ ACCIÓN IRREVERSIBLE</strong>
              <p style={{margin: '8px 0 0 0'}}>
                Esta acción eliminará permanentemente el repuesto y su historial, y no se puede deshacer.
              </p>
            </div>
          )}

          {/* Información del repuesto */}
          <div style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h4 style={{margin: '0 0 12px 0', color: '#374151'}}>
              📦 Repuesto a Eliminar
            </h4>
            <div style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '16px'
            }}>
              <div style={{fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '8px'}}>
                {repuesto.nombre}
              </div>
              <div style={{fontSize: '14px', color: '#6b7280', marginBottom: '8px'}}>
                {repuesto.marca && (
                  <span style={{
                    background: '#f3f4f6',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginRight: '8px'
                  }}>
                    {repuesto.marca}
                  </span>
                )}
                {repuesto.modelo && (
                  <span style={{
                    background: '#f3f4f6',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginRight: '8px'
                  }}>
                    {repuesto.modelo}
                  </span>
                )}
                {repuesto.codigo_barras && (
                  <span style={{
                    background: '#f3f4f6',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: 'monospace'
                  }}>
                    #{repuesto.codigo_barras}
                  </span>
                )}
              </div>
              <div style={{fontSize: '14px', color: '#6b7280'}}>
                Stock actual: <strong>{repuesto.stock_actual} {repuesto.unidad_medida}</strong>
              </div>
              <div style={{fontSize: '14px', color: '#6b7280'}}>
                Estado: <span style={{
                  color: repuesto.activo ? '#059669' : '#dc2626',
                  fontWeight: '500'
                }}>
                  {repuesto.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>

          {/* Estado de carga */}
          {loading && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '20px',
              background: '#f0f9ff',
              border: '1px solid #0ea5e9',
              borderRadius: '6px',
              marginBottom: '20px'
            }}>
              <div className="loading-spinner"></div>
              <span>Validando eliminación...</span>
            </div>
          )}

          {/* Resultados de validación */}
          {!loading && validationData && (
            <>
              {/* 🔥 INTERFAZ ESPECIAL PARA SUPER ADMIN */}
              {isSuperAdmin && validationData.user_role === 'SUPER_ADMIN' && validationData.impact_warning && (
                <div style={{marginBottom: '20px'}}>
                  <h4 style={{margin: '0 0 12px 0', color: '#dc2626'}}>
                    🔥 Impacto de Eliminación Forzada
                  </h4>
                  <div style={{
                    background: '#7f1d1d',
                    border: '1px solid #dc2626',
                    borderRadius: '8px',
                    padding: '16px',
                    color: 'white'
                  }}>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px'}}>
                      <div>
                        <strong>📦 Stock que se perderá:</strong><br/>
                        {validationData.impact_warning.stock_actual} {repuesto.unidad_medida}
                      </div>
                      <div>
                        <strong>📋 Movimientos a eliminar:</strong><br/>
                        {validationData.impact_warning.total_movimientos} total
                        {validationData.impact_warning.movimientos_recientes > 0 && (
                          <span style={{color: '#fca5a5'}}> ({validationData.impact_warning.movimientos_recientes} recientes)</span>
                        )}
                      </div>
                      <div>
                        <strong>🚨 Alertas a eliminar:</strong><br/>
                        {validationData.impact_warning.total_alertas} total
                        {validationData.impact_warning.alertas_pendientes > 0 && (
                          <span style={{color: '#fca5a5'}}> ({validationData.impact_warning.alertas_pendientes} pendientes)</span>
                        )}
                      </div>
                      <div>
                        <strong>⚡ Tipo de eliminación:</strong><br/>
                        <span style={{color: '#fde68a', fontWeight: 'bold'}}>FORZADA SIN VALIDACIONES</span>
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(255,255,255,0.1)',
                      padding: '8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      ⚠️ Esta eliminación saltará TODAS las validaciones de negocio y eliminará PERMANENTEMENTE 
                      todo el historial asociado al repuesto.
                    </div>
                  </div>
                </div>
              )}

              {/* 📋 INTERFAZ NORMAL PARA ENCARGADO DE BODEGA */}
              {!isSuperAdmin && (
                <>
                  {/* Errores de validación */}
                  {validationData.validation_errors && validationData.validation_errors.length > 0 && (
                    <div style={{marginBottom: '20px'}}>
                      <h4 style={{margin: '0 0 12px 0', color: '#dc2626'}}>
                        ❌ No se puede eliminar
                      </h4>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        {validationData.validation_errors.map((error, index) => (
                          <div key={index} style={{
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            borderRadius: '6px',
                            padding: '12px',
                            fontSize: '14px',
                            color: '#991b1b'
                          }}>
                            <strong>{error.type === 'stock_actual' ? '📦' : 
                                    error.type === 'movimientos_recientes' ? '📋' : 
                                    error.type === 'alertas_pendientes' ? '🚨' : '⚠️'} 
                            </strong> {error.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Advertencias */}
                  {validationData.warnings && validationData.warnings.length > 0 && (
                    <div style={{marginBottom: '20px'}}>
                      <h4 style={{margin: '0 0 12px 0', color: '#d97706'}}>
                        ⚠️ Advertencias
                      </h4>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        {validationData.warnings.map((warning, index) => (
                          <div key={index} style={{
                            background: '#fef3c7',
                            border: '1px solid #fcd34d',
                            borderRadius: '6px',
                            padding: '12px',
                            fontSize: '14px',
                            color: '#92400e'
                          }}>
                            <strong>📋</strong> {warning.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Campo de confirmación */}
              {canProceedWithDeletion && (
                <>
                  <div className="form-group">
                    <label style={{fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block'}}>
                      <strong>{isSuperAdmin ? 'Confirmación de Eliminación Forzada' : 'Confirmación Requerida'}</strong>
                    </label>
                    <p style={{
                      margin: '8px 0',
                      fontSize: '14px',
                      color: isSuperAdmin ? '#dc2626' : '#6b7280',
                      fontWeight: isSuperAdmin ? '500' : 'normal'
                    }}>
                      Para confirmar la {isSuperAdmin ? 'eliminación FORZADA' : 'eliminación'}, escribe exactamente: <br/>
                      <code style={{
                        background: isSuperAdmin ? '#7f1d1d' : '#f3f4f6',
                        color: isSuperAdmin ? '#fca5a5' : '#374151',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontWeight: '600'
                      }}>
                        {expectedConfirmText}
                      </code>
                    </p>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => {
                        setConfirmText(e.target.value);
                        setError('');
                      }}
                      placeholder="Escribe el texto de confirmación"
                      className={error ? 'error' : ''}
                      disabled={deleting}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `1px solid ${error ? '#ef4444' : (isSuperAdmin ? '#dc2626' : '#d1d5db')}`,
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        background: isSuperAdmin ? '#fef2f2' : 'white'
                      }}
                    />
                    {error && (
                      <span style={{
                        color: '#ef4444',
                        fontSize: '12px',
                        marginTop: '4px',
                        display: 'block'
                      }}>
                        {error}
                      </span>
                    )}
                  </div>

                  <div style={{marginTop: '8px', fontSize: '14px', fontWeight: '500'}}>
                    {confirmText === expectedConfirmText ? (
                      <div style={{color: '#059669'}}>
                        ✅ Confirmación correcta
                      </div>
                    ) : confirmText ? (
                      <div style={{color: '#dc2626'}}>
                        ❌ Texto de confirmación incorrecto
                      </div>
                    ) : null}
                  </div>
                </>
              )}

              {/* Mensaje de permisos insuficientes */}
              {validationData.permission_error && (
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #f59e0b',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  <div style={{fontSize: '24px', color: '#d97706'}}>🚫</div>
                  <div>
                    <strong style={{color: '#92400e', display: 'block', marginBottom: '4px'}}>
                      Sin permisos
                    </strong>
                    <p style={{margin: '0', color: '#92400e', fontSize: '14px'}}>
                      {validationData.permission_error}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="modal-actions">
            <button 
              type="button" 
              onClick={onClose} 
              className="cancel-button"
              disabled={deleting}
            >
              Cancelar
            </button>
            {canProceedWithDeletion && (
              <button 
                type="button"
                onClick={handleDelete}
                disabled={deleting || confirmText !== expectedConfirmText}
                className="submit-button"
                style={{
                  background: isSuperAdmin ? '#7f1d1d' : '#dc2626',
                  color: 'white'
                }}
              >
                {deleting ? 'Eliminando...' : (isSuperAdmin ? 'FORZAR ELIMINACIÓN' : 'Eliminar Repuesto')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteRepuestoModal;
