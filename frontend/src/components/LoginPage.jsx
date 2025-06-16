// src/components/LoginPage.jsx
import React, { useState } from 'react';
import './LoginPage.css';

const LoginPage = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar errores al escribir
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
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    }

    return newErrors;
  };

// 🔍 DEBUG: Agrega esto en tu LoginPage.jsx para verificar qué datos llegan

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setErrors({});

  try {
    const response = await fetch('/api/auth/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      const data = await response.json();
      
      // 🔍 DEBUG: Ver qué datos devuelve el servidor
      console.log('Datos de login completos:', data);
      console.log('Usuario completo:', data.user);
      console.log('is_superuser value:', data.user?.is_superuser);
      console.log('rol value:', data.user?.rol);
      
      // Guardar en localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      onLoginSuccess(data);
    } else {
      const errorData = await response.json();
      setErrors(errorData.errors || { general: errorData.error || 'Error de login' });
    }
  } catch (error) {
    console.error('Error de conexión:', error);
    setErrors({ general: 'Error de conexión. Intente nuevamente.' });
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Iniciar Sesión</h1>
          <p>Sistema de Gestión de Servicio Técnico</p>
        </div>

        {errors.general && (
          <div className="error-alert">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Nombre de Usuario</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              disabled={loading}
              className={errors.username ? 'error' : ''}
              autoComplete="username"
              placeholder="admin"
            />
            {errors.username && <span className="error-text">{errors.username}</span>}
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              className={errors.password ? 'error' : ''}
              autoComplete="current-password"
              placeholder="Ingrese su contraseña"
            />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="login-footer">
          <p>Usuario de prueba: <strong>admin</strong></p>
          <p>¿Problemas para acceder? Contacte al administrador del sistema.</p>
          <p>Desarrollado por IntelNat.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;