import React, { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import DeleteUserModal from './DeleteUserModal'; // ✅ IMPORTAR el modal de eliminación
import './UserManagement.css';

const UserManagement = ({ onBack }) => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [filters, setFilters] = useState({
    page: 1,
    page_size: 10,
    search: '',
    role: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null); // ✅ NUEVO estado para modal de eliminación
  const [notification, setNotification] = useState(null);

  // ✅ AGREGAR estado del usuario actual
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadUsers();
    loadRoles();
    loadCurrentUser(); // ✅ CARGAR usuario actual
  }, [filters]);

  // ✅ NUEVA función para cargar usuario actual
  const loadCurrentUser = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await userService.getUsers(filters);
      setUsers(response.users);
      setPagination(response.pagination);
    } catch (error) {
      showNotification('Error al cargar usuarios: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await userService.getSystemRoles();
      setRoles(response.roles);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleUserCreated = () => {
    setShowCreateModal(false);
    loadUsers();
    showNotification('Usuario creado exitosamente');
  };

  const handleUserUpdated = () => {
    setEditingUser(null);
    loadUsers();
    showNotification('Usuario actualizado exitosamente');
  };

  // ✅ NUEVA función para manejar eliminación exitosa
  const handleUserDeleted = (deletedUser) => {
    setUserToDelete(null);
    loadUsers();
    showNotification(`Usuario "${deletedUser.username}" eliminado exitosamente`);
  };

  // ✅ NUEVA función para verificar si se puede eliminar un usuario
  const canDeleteUser = (user) => {
    // No puede eliminar su propia cuenta
    if (currentUser && currentUser.id === user.id) {
      return false;
    }
    
    // Si es super admin, verificar que no sea el último
    if (user.is_superuser) {
      const superAdminCount = users.filter(u => u.is_superuser).length;
      return superAdminCount > 1;
    }
    
    return true;
  };

  // ✅ NUEVA función para verificar si el usuario actual es super admin
  const isSuperAdmin = () => {
    return currentUser && currentUser.is_superuser;
  };

  const getRoleBadgeClass = (roleKey) => {
    const classes = {
      'SUPER_ADMIN': 'role-badge role-super-admin',
      'SUPERVISOR': 'role-badge role-supervisor',
      'ENCARGADO_BODEGA': 'role-badge role-bodega',
      'TECNICO': 'role-badge role-tecnico'
    };
    return classes[roleKey] || 'role-badge role-default';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="user-management-container">
      {/* Header */}
      <div className="user-management-header">
        <div className="header-content">
          <button onClick={onBack} className="back-button">
            ← Volver al Dashboard
          </button>
          <div className="header-info">
            <h1>Gestión de Usuarios</h1>
            <p>Administra usuarios y permisos del sistema</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="create-user-button"
            disabled={!isSuperAdmin()} // ✅ Solo super admin puede crear
          >
            + Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Filters */}
      <div className="filters-container">
        <div className="filters-row">
          <div className="search-group">
            <label>Buscar usuarios</label>
            <input
              type="text"
              placeholder="Buscar por nombre, usuario o email..."
              value={filters.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              disabled={loading}
            />
          </div>
          <div className="page-size-group">
            <label>Por página</label>
            <select
              value={filters.page_size}
              onChange={(e) => handleFilterChange({ page_size: parseInt(e.target.value) })}
              disabled={loading}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="role-filters">
          <label>Filtrar por rol</label>
          <div className="role-buttons">
            <button
              onClick={() => handleFilterChange({ role: '' })}
              className={`role-filter-btn ${filters.role === '' ? 'active' : ''}`}
              disabled={loading}
            >
              Todos
            </button>
            {roles.map((role) => (
              <button
                key={role.key}
                onClick={() => handleFilterChange({ role: role.key })}
                className={`role-filter-btn ${filters.role === role.key ? 'active' : ''}`}
                disabled={loading}
                title={role.description}
              >
                {role.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Cargando usuarios...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <h3>No hay usuarios</h3>
            <p>No se encontraron usuarios con los filtros aplicados.</p>
          </div>
        ) : (
          <>
            <table className="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Último acceso</th>
                  <th>Registrado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-info">
                        <div className="user-avatar">
                          {(user.first_name || user.username).charAt(0).toUpperCase()}
                        </div>
                        <div className="user-details">
                          <div className="user-name">
                            {user.first_name || user.last_name 
                              ? `${user.first_name} ${user.last_name}`.trim()
                              : user.username
                            }
                            {/* ✅ Indicador de usuario actual */}
                            {currentUser && user.id === currentUser.id && (
                              <span style={{
                                background: '#2563eb',
                                color: 'white',
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                marginLeft: '8px'
                              }}>
                                (Tú)
                              </span>
                            )}
                          </div>
                          <div className="user-meta">
                            @{user.username}
                            {user.email && ` • ${user.email}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={getRoleBadgeClass(user.role)}>
                        {user.role_display}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="date-cell">
                      {formatDate(user.last_login)}
                    </td>
                    <td className="date-cell">
                      {formatDate(user.date_joined)}
                    </td>
                    <td>
                      <div style={{display: 'flex', gap: '8px'}}>
                        <button
                          onClick={() => setEditingUser(user)}
                          className="edit-button"
                          disabled={!isSuperAdmin()}
                          title="Editar usuario"
                        >
                          ✏️
                        </button>
                        
                        {/* ✅ BOTÓN DE ELIMINAR - Solo para super admin */}
                        {isSuperAdmin() && (
                          <button
                            onClick={() => setUserToDelete(user)}
                            disabled={!canDeleteUser(user)}
                            title={
                              !canDeleteUser(user) 
                                ? (user.id === currentUser?.id 
                                    ? 'No puedes eliminar tu propia cuenta' 
                                    : 'No se puede eliminar el último super administrador')
                                : 'Eliminar usuario'
                            }
                            style={{
                              padding: '6px 8px',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: canDeleteUser(user) ? 'pointer' : 'not-allowed',
                              fontSize: '14px',
                              background: canDeleteUser(user) ? '#fee2e2' : '#f3f4f6',
                              color: canDeleteUser(user) ? '#dc2626' : '#9ca3af',
                              opacity: canDeleteUser(user) ? 1 : 0.5,
                              transition: 'all 0.2s'
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="pagination">
                <div className="pagination-info">
                  Mostrando {((pagination.current_page - 1) * filters.page_size) + 1} a{' '}
                  {Math.min(pagination.current_page * filters.page_size, pagination.total_users)} de{' '}
                  {pagination.total_users} usuarios
                </div>
                <div className="pagination-controls">
                  <button
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={!pagination.has_previous}
                    className="pagination-btn"
                  >
                    Anterior
                  </button>
                  <span className="page-info">
                    Página {pagination.current_page} de {pagination.total_pages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={!pagination.has_next}
                    className="pagination-btn"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateUserModal
          roles={roles}
          onClose={() => setShowCreateModal(false)}
          onUserCreated={handleUserCreated}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          roles={roles}
          onClose={() => setEditingUser(null)}
          onUserUpdated={handleUserUpdated}
        />
      )}

      {/* ✅ NUEVO MODAL - Modal de eliminación */}
      {userToDelete && (
        <DeleteUserModal
          user={userToDelete}
          onClose={() => setUserToDelete(null)}
          onUserDeleted={handleUserDeleted}
        />
      )}
    </div>
  );
};

// ✅ Mantener tus modales existentes (CreateUserModal y EditUserModal)
// Aquí puedes mantener tu código existente para estos modales

// Create User Modal Component (mantener tu implementación existente)
const CreateUserModal = ({ roles, onClose, onUserCreated }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    role: '',
    is_active: true
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
      await userService.createUser(formData);
      onUserCreated();
    } catch (error) {
      const errorData = JSON.parse(error.message || '{}');
      setErrors(errorData.errors || { general: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Crear Nuevo Usuario</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {errors.general && (
            <div className="error-alert">
              {errors.general}
            </div>
          )}

          <div className="form-group">
            <label>Usuario *</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={errors.username ? 'error' : ''}
              required
            />
            {errors.username && <span className="error-text">{errors.username}</span>}
          </div>

          <div className="form-group">
            <label>Contraseña *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'error' : ''}
              required
            />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Apellido</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Rol *</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={errors.role ? 'error' : ''}
              required
            >
              <option value="">Seleccionar rol</option>
              {roles.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.name}
                </option>
              ))}
            </select>
            {errors.role && <span className="error-text">{errors.role}</span>}
          </div>

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
              Usuario activo
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="submit-button">
              {loading ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit User Modal Component (mantener tu implementación existente)
const EditUserModal = ({ user, roles, onClose, onUserUpdated }) => {
  const [formData, setFormData] = useState({
    username: user.username,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    is_active: user.is_active,
    new_password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);

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
      const updateData = { ...formData };
      if (!showPasswordField || !updateData.new_password) {
        delete updateData.new_password;
      }
      
      await userService.updateUser(user.id, updateData);
      onUserUpdated();
    } catch (error) {
      const errorData = JSON.parse(error.message || '{}');
      setErrors(errorData.errors || { general: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Editar Usuario</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {errors.general && (
            <div className="error-alert">
              {errors.general}
            </div>
          )}

          <div className="form-group">
            <label>Usuario</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={errors.username ? 'error' : ''}
            />
            {errors.username && <span className="error-text">{errors.username}</span>}
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Apellido</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Rol</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={errors.role ? 'error' : ''}
            >
              {roles.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.name}
                </option>
              ))}
            </select>
            {errors.role && <span className="error-text">{errors.role}</span>}
          </div>

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
              Usuario activo
            </label>
          </div>

          <div className="form-group">
            <div className="password-header">
              <label>Cambiar contraseña</label>
              <button
                type="button"
                onClick={() => setShowPasswordField(!showPasswordField)}
                className="password-toggle"
              >
                {showPasswordField ? 'Cancelar' : 'Cambiar'}
              </button>
            </div>
            {showPasswordField && (
              <input
                type="password"
                name="new_password"
                value={formData.new_password}
                onChange={handleChange}
                placeholder="Nueva contraseña"
                className={errors.new_password ? 'error' : ''}
              />
            )}
            {errors.new_password && <span className="error-text">{errors.new_password}</span>}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="submit-button">
              {loading ? 'Actualizando...' : 'Actualizar Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;