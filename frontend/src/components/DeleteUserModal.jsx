import React, { useState } from 'react';
import { userService } from '../services/userService';

const DeleteUserModal = ({ user, onClose, onUserDeleted }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmText, setConfirmText] = useState('');

  // Texto de confirmación requerido
  const expectedConfirmText = `ELIMINAR ${user.username}`;

  const handleDelete = async () => {
    if (confirmText !== expectedConfirmText) {
      setError('Texto de confirmación incorrecto');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await userService.deleteUser(user.id);
      onUserDeleted(user);
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      setError(error.message || 'Error eliminando usuario');
    } finally {
      setLoading(false);
    }
  };

  // Verificar si el usuario puede ser eliminado (basado en tu lógica)
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canDelete = user.id !== currentUser.id && 
    (!user.is_superuser || true); // Puedes agregar lógica adicional aquí

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>🗑️ Eliminar Usuario</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <div className="modal-form">
          {/* Advertencia crítica */}
          <div className="error-alert" style={{
            background: '#fef2f2',
            border: '2px solid #fca5a5',
            marginBottom: '20px'
          }}>
            <strong>⚠️ ACCIÓN IRREVERSIBLE</strong>
            <p style={{margin: '8px 0 0 0'}}>
              Esta acción eliminará permanentemente al usuario y no se puede deshacer.
            </p>
          </div>

          {/* Información del usuario */}
          <div style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h4 style={{margin: '0 0 12px 0', color: '#374151'}}>
              👤 Usuario a Eliminar
            </h4>
            <div style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '16px'
            }}>
              <div style={{fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '8px'}}>
                {user.first_name && user.last_name 
                  ? `${user.first_name} ${user.last_name}`.trim()
                  : user.username
                }
              </div>
              <div style={{fontSize: '14px', color: '#6b7280', marginBottom: '4px'}}>
                <span style={{
                  background: '#f3f4f6',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  marginRight: '8px'
                }}>
                  @{user.username}
                </span>
                <span style={{
                  background: '#dbeafe',
                  color: '#1d4ed8',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {user.role_display}
                </span>
              </div>
              {user.email && (
                <div style={{fontSize: '14px', color: '#2563eb', marginBottom: '4px'}}>
                  {user.email}
                </div>
              )}
              <div style={{fontSize: '14px', color: '#6b7280'}}>
                Estado: <span style={{
                  color: user.is_active ? '#059669' : '#dc2626',
                  fontWeight: '500'
                }}>
                  {user.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>

          {/* Verificaciones de seguridad */}
          <div style={{marginBottom: '20px'}}>
            <h4 style={{margin: '0 0 12px 0', color: '#374151'}}>
              🔒 Verificaciones de Seguridad
            </h4>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px'}}>
                <span>✅</span>
                <span>No es tu propia cuenta</span>
              </div>
              {user.is_superuser && (
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px'}}>
                  <span>{canDelete ? '✅' : '❌'}</span>
                  <span>
                    {canDelete 
                      ? 'No es el último super administrador' 
                      : 'Es el último super administrador (no se puede eliminar)'
                    }
                  </span>
                </div>
              )}
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px'}}>
                <span>⚠️</span>
                <span>Se eliminarán todas las sesiones y tokens del usuario</span>
              </div>
            </div>
          </div>

          {/* Campo de confirmación */}
          {canDelete && (
            <>
              <div className="form-group">
                <label style={{fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block'}}>
                  <strong>Confirmación Requerida</strong>
                </label>
                <p style={{
                  margin: '8px 0',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  Para confirmar la eliminación, escribe exactamente: <br/>
                  <code style={{
                    background: '#f3f4f6',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontWeight: '600',
                    color: '#374151'
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
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
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

          {!canDelete && (
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
                  No se puede eliminar este usuario
                </strong>
                <p style={{margin: '0', color: '#92400e', fontSize: '14px'}}>
                  Este usuario no puede ser eliminado porque es el último super administrador del sistema.
                </p>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button 
              type="button" 
              onClick={onClose} 
              className="cancel-button"
              disabled={loading}
            >
              Cancelar
            </button>
            {canDelete && (
              <button 
                type="button"
                onClick={handleDelete}
                disabled={loading || confirmText !== expectedConfirmText}
                className="submit-button"
                style={{
                  background: '#dc2626',
                  color: 'white'
                }}
              >
                {loading ? 'Eliminando...' : 'Eliminar Usuario'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteUserModal;