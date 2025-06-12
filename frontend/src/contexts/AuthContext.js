import React, { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../services/api';

// Estado inicial
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,
};

// Tipos de acciones
const actionTypes = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  SET_LOADING: 'SET_LOADING',
  UPDATE_USER: 'UPDATE_USER',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.LOGIN_START:
      return {
        ...state,
        isLoading: true,
      };
    
    case actionTypes.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    
    case actionTypes.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    
    case actionTypes.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    
    case actionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };
    
    case actionTypes.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    
    default:
      return state;
  }
};

// Contexto
const AuthContext = createContext();

// Hook personalizado para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// Proveedor del contexto
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Verificar token al cargar la aplicación
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // Configurar token en las cabeceras por defecto
          api.defaults.headers.common['Authorization'] = `Token ${token}`;
          
          // Verificar si el token es válido
          const response = await api.get('/auth/verificar-token/');
          
          dispatch({
            type: actionTypes.LOGIN_SUCCESS,
            payload: {
              user: response.data.user,
              token: token,
            },
          });
        } catch (error) {
          // Token inválido o expirado
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
          
          dispatch({
            type: actionTypes.LOGIN_FAILURE,
          });
        }
      } else {
        dispatch({
          type: actionTypes.SET_LOADING,
          payload: false,
        });
      }
    };

    checkAuth();
  }, []);

  // Función de login
  const login = async (credentials) => {
    try {
      dispatch({ type: actionTypes.LOGIN_START });
      
      const response = await api.post('/auth/login/', credentials);
      const { token, usuario } = response.data;
      
      // Guardar token en localStorage
      localStorage.setItem('token', token);
      
      // Configurar token en las cabeceras por defecto
      api.defaults.headers.common['Authorization'] = `Token ${token}`;
      
      dispatch({
        type: actionTypes.LOGIN_SUCCESS,
        payload: {
          user: usuario,
          token: token,
        },
      });
      
      return { success: true };
    } catch (error) {
      dispatch({ type: actionTypes.LOGIN_FAILURE });
      
      return {
        success: false,
        error: error.response?.data?.error || 'Error de conexión',
      };
    }
  };

  // Función de logout
  const logout = async () => {
    try {
      // Llamar al endpoint de logout si existe
      await api.post('/auth/logout/');
    } catch (error) {
      console.error('Error al hacer logout:', error);
    } finally {
      // Limpiar estado local
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      
      dispatch({ type: actionTypes.LOGOUT });
    }
  };

  // Función para crear super usuario
  const crearSuperUsuario = async (userData) => {
    try {
      dispatch({ type: actionTypes.LOGIN_START });
      
      const response = await api.post('/auth/crear-super-usuario/', userData);
      const { token, usuario } = response.data;
      
      // Guardar token en localStorage
      localStorage.setItem('token', token);
      
      // Configurar token en las cabeceras por defecto
      api.defaults.headers.common['Authorization'] = `Token ${token}`;
      
      dispatch({
        type: actionTypes.LOGIN_SUCCESS,
        payload: {
          user: usuario,
          token: token,
        },
      });
      
      return { success: true };
    } catch (error) {
      dispatch({ type: actionTypes.LOGIN_FAILURE });
      
      return {
        success: false,
        error: error.response?.data?.error || 'Error al crear super usuario',
      };
    }
  };

  // Función para actualizar datos del usuario
  const updateUser = (userData) => {
    dispatch({
      type: actionTypes.UPDATE_USER,
      payload: userData,
    });
  };

  // Verificar si el usuario tiene un rol específico
  const hasRole = (roles) => {
    if (!state.user) return false;
    
    if (Array.isArray(roles)) {
      return roles.includes(state.user.rol);
    }
    
    return state.user.rol === roles;
  };

  // Verificar si el usuario es supervisor o superior
  const isSupervisor = () => {
    return hasRole(['SUPER_ADMIN', 'SUPERVISOR_GENERAL', 'SUPERVISOR']);
  };

  // Verificar si el usuario es administrador
  const isAdmin = () => {
    return hasRole(['SUPER_ADMIN', 'SUPERVISOR_GENERAL']);
  };

  const value = {
    // Estado
    ...state,
    
    // Funciones
    login,
    logout,
    crearSuperUsuario,
    updateUser,
    hasRole,
    isSupervisor,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};