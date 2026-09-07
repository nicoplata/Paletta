// src/routes/RutaProtegida.jsx
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

const RutaProtegida = ({ children, rolRequerido }) => {
  const token = localStorage.getItem('token');
  const rol = localStorage.getItem('rol');

  useEffect(() => {
    console.log('Token:', token);
    console.log('Rol actual:', rol);
    console.log('Rol requerido:', rolRequerido);
  }, [token, rol, rolRequerido]);

  if (!token) {
    console.log('No hay token');
    return <Navigate to="/admin" replace />;
  }

  if (rolRequerido && rol !== rolRequerido) {
    console.log('Rol incorrecto');
    localStorage.clear(); // Limpiar storage si el rol no coincide
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default RutaProtegida;
