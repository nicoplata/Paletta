import React from 'react';
import '../../styles/LoadingSpinner.css';

const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <span>Cargando...</span>
  </div>
);

export default LoadingSpinner;
