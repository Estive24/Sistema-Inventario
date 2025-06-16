import React, { useState, useEffect } from 'react';
import './App.css';
import LoginPage from './components/LoginPage';
import UserManagement from './components/UserManagement';
import InventoryManagement from './components/InventoryManagement';

function BasicAdminSetup() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    first_name: '',
    last_name: ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido';
    } else if (formData.username.length < 3) {
      newErrors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (formData.email && !/^[^@]+@[^@]+\.[^@]+$/.test(formData.email)) {
      newErrors.email = 'Formato de email inválido';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/setup/admin/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const data = await response.json();
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ general: data.error || 'Error al crear el administrador' });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setErrors({ general: 'Error de conexión. Intente nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="success-container">
        <div className="success-card">
          <h1>¡Éxito!</h1>
          <p>Super-administrador creado exitosamente.</p>
          <p>Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-container">
      <div className="setup-card">
        <div className="setup-header">
          <h1>Configuración Inicial</h1>
          <p>Cree el primer administrador del sistema</p>
        </div>

        {errors.general && (
          <div className="error-alert">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="setup-form">
          <div className="form-group">
            <label>Nombre de Usuario *</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              disabled={loading}
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
              disabled={loading}
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
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Apellido</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Contraseña *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              className={errors.password ? 'error' : ''}
            />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label>Confirmar Contraseña *</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              className={errors.confirmPassword ? 'error' : ''}
            />
            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="submit-button"
          >
            {loading ? 'Creando...' : 'Crear Administrador'}
          </button>
        </form>
      </div>
    </div>
  );
}

// COMPONENTE DASHBOARD MEJORADO CON GESTIÓN DE USUARIOS E INVENTARIO
function Dashboard() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'users', 'inventory'

  useEffect(() => {
    // Obtener datos del usuario del localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    // Limpiar localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Recargar página para mostrar login
    window.location.reload();
  };

  const canManageUsers = () => {
    if (!user) return false;
  
    // ✅ Verificar diferentes formas de superuser
  const isSuperUser = user.is_superuser === true || user.is_superuser === 'true';
  const isSuperAdmin = user.rol === 'SUPER_ADMIN' || user.role === 'SUPER_ADMIN';
  
    console.log('DEBUG canManageUsers:', {
      user: user.username,
      is_superuser: user.is_superuser,
      rol: user.rol,
      isSuperUser,
      isSuperAdmin,
      result: isSuperUser || isSuperAdmin
    });
  
     return isSuperUser || isSuperAdmin;
  };


const canManageInventory = () => {
  if (!user) return false;
  
  // ✅ Verificar diferentes formas de permisos
  const isSuperUser = user.is_superuser === true || user.is_superuser === 'true';
  const isSuperAdmin = user.rol === 'SUPER_ADMIN' || user.role === 'SUPER_ADMIN';
  const isSupervisor = user.rol === 'SUPERVISOR' || user.role === 'SUPERVISOR';
  const isEncargadoBodega = user.rol === 'ENCARGADO_BODEGA' || user.role === 'ENCARGADO_BODEGA';
  
  // Verificar también grupos si están disponibles
  const hasInventoryGroup = user.groups && Array.isArray(user.groups) && 
    user.groups.some(group => ['Supervisor', 'Encargado de Bodega'].includes(group));
  
  console.log('DEBUG canManageInventory:', {
    user: user.username,
    is_superuser: user.is_superuser,
    rol: user.rol,
    groups: user.groups,
    isSuperUser,
    isSuperAdmin,
    isSupervisor,
    isEncargadoBodega,
    hasInventoryGroup,
    result: isSuperUser || isSuperAdmin || isSupervisor || isEncargadoBodega || hasInventoryGroup
  });
  
  return isSuperUser || isSuperAdmin || isSupervisor || isEncargadoBodega || hasInventoryGroup;
};

// ✅ AGREGAR: Función para debug de usuario
  const debugUser = () => {
  const userData = localStorage.getItem('user');
  if (userData) {
    const parsedUser = JSON.parse(userData);
    console.log('=== DEBUG USUARIO COMPLETO ===');
    console.log('Raw localStorage user:', userData);
    console.log('Parsed user:', parsedUser);
    console.log('is_superuser type:', typeof parsedUser.is_superuser);
    console.log('is_superuser value:', parsedUser.is_superuser);
    console.log('rol:', parsedUser.rol);
    console.log('groups:', parsedUser.groups);
    console.log('=============================');
  }
  };

// ✅ Llamar debug al cargar
  useEffect(() => {
  const userData = localStorage.getItem('user');
  if (userData) {
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    debugUser(); // ✅ Agregar esta línea
  }
  }, []);
  // Si estamos en vista de gestión de usuarios
  if (currentView === 'users') {
    return (
      <UserManagement 
        onBack={() => setCurrentView('dashboard')}
      />
    );
  }

  // Si estamos en vista de gestión de inventario
  if (currentView === 'inventory') {
    return (
      <InventoryManagement 
        onBack={() => setCurrentView('dashboard')}
      />
    );
  }

  // Vista del dashboard principal
  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <h1>🎉 ¡Bienvenido al Sistema!</h1>
        {user && (
          <div className="user-info">
            <p>Hola, <strong>{user.first_name || user.username}</strong></p>
            <p>Email: {user.email}</p>
            <p>Rol: {user.role_display || (user.is_superuser ? 'Super Administrador' : 'Usuario')}</p>
          </div>
        )}
        
        {/* ACCIONES DE GESTIÓN */}
        <div className="dashboard-actions">
          {canManageUsers() && (
            <button 
              onClick={() => setCurrentView('users')} 
              className="action-button users-button"
            >
              👥 Gestionar Usuarios
            </button>
          )}
          
          {canManageInventory() && (
            <button 
              onClick={() => setCurrentView('inventory')} 
              className="action-button inventory-button"
            >
              📦 Gestión de Inventario
            </button>
          )}
          
          <button className="action-button reports-button" disabled>
            📊 Reportes
            <span className="coming-soon">(Próximamente)</span>
          </button>
          
          <button onClick={handleLogout} className="logout-button">
            🚪 Cerrar Sesión
          </button>
        </div>
        
        <div className="dashboard-info">
          <h3>Estado del Sistema:</h3>
          <ul>
            <li>✅ Configuración inicial completa</li>
            <li>✅ Super-administrador configurado</li>
            <li>✅ Sistema de autenticación activo</li>
            <li>✅ Login funcional</li>
            <li>✅ Gestión de usuarios implementada</li>
            <li>✅ Gestión de inventario implementada</li>
            <li>🔄 Próximo: Módulo de reportes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [systemState, setSystemState] = useState({
    initialized: null,
    loading: true
  });

  const [userState, setUserState] = useState({
    isAuthenticated: false,
    loading: true
  });

  useEffect(() => {
    checkSystemStatus();
    checkAuthStatus();
  }, []);

  const checkSystemStatus = async () => {
    try {
      const response = await fetch('/api/setup/admin/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSystemState({
          initialized: data.super_admin_exists,
          loading: false
        });
      } else {
        setSystemState({
          initialized: false,
          loading: false
        });
      }
    } catch (error) {
      console.error('Error verificando estado del sistema:', error);
      setSystemState({
        initialized: false,
        loading: false
      });
    }
  };

  const checkAuthStatus = () => {
    const token = localStorage.getItem('token');
    setUserState({
      isAuthenticated: !!token,
      loading: false
    });
  };

  const handleLoginSuccess = (loginData) => {
    console.log('Login exitoso:', loginData);
    setUserState({
      isAuthenticated: true,
      loading: false
    });
  };

  if (systemState.loading || userState.loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Verificando estado del sistema...</p>
      </div>
    );
  }

  // Si el sistema no está inicializado, mostrar setup
  if (!systemState.initialized) {
    return <BasicAdminSetup />;
  }

  // Si el sistema está inicializado pero el usuario no está autenticado, mostrar login
  if (systemState.initialized && !userState.isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Si todo está bien, mostrar dashboard
  return <Dashboard />;
}

export default App;