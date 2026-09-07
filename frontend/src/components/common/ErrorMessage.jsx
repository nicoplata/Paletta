import React from 'react';
import '../../styles/ErrorMessage.css';

const ErrorMessage = ({ message }) => (
  <div className="error-message">
    <div className="error-icon">⚠️</div>
    <p>{message}</p>
    <button onClick={() => window.location.reload()}>Reintentar</button>
  </div>
);

export default ErrorMessage;
