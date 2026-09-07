import React, { createContext, useContext, useReducer } from 'react';
import axios from 'axios';

// Estado inicial
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null
};

// Acciones
const ACTIONS = {
  AUTH_START: 'AUTH_START',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_FAILURE: 'AUTH_FAILURE',
  LOGOUT: 'LOGOUT'
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.AUTH_START:
      return {
        ...state,
        loading: true,
        error: null
      };
    case ACTIONS.AUTH_SUCCESS:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
        error: null
      };
    case ACTIONS.AUTH_FAILURE:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };
    case ACTIONS.LOGOUT:
      return initialState;
    default:
      return state;
  }
};

// Contexto
export const AuthContext = createContext(null);

// Provider
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = async (email, password) => {
    dispatch({ type: ACTIONS.AUTH_START });
    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        email,
        password
      });
      localStorage.setItem('token', response.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      dispatch({ type: ACTIONS.AUTH_SUCCESS, payload: response.data.user });
      return response.data;
    } catch (error) {
      dispatch({
        type: ACTIONS.AUTH_FAILURE,
        payload: error.response?.data?.message || 'Error al iniciar sesión'
      });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    dispatch({ type: ACTIONS.LOGOUT });
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    dispatch({ type: ACTIONS.AUTH_START });
    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await axios.get('http://localhost:3000/api/auth/verify');
      dispatch({ type: ACTIONS.AUTH_SUCCESS, payload: response.data.user });
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      dispatch({ type: ACTIONS.AUTH_FAILURE, payload: error.message });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
