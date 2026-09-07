import React from 'react';
import { useA11y } from '../hooks/useA11y';

const SkipLink = () => {
  return (
    <a
      href="#main-content"
      className="skip-link"
      style={{
        position: 'absolute',
        top: '-40px',
        left: 0,
        padding: '8px',
        backgroundColor: '#9c1f23',
        color: 'white',
        zIndex: 100,
        transform: 'translateY(-100%)',
        transition: 'transform 0.3s',
        ':focus': {
          transform: 'translateY(0)',
        }
      }}
    >
      Saltar al contenido principal
    </a>
  );
};

export default SkipLink;
