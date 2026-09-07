import React from 'react';
import { useNavigate } from 'react-router-dom';

const Egresados = () => {
  const navigate = useNavigate();

  return (
    <section
      id="egresados"
      style={{
        background: '#9c1f23',
        color: '#fff',
        padding: '3rem 0',
        fontFamily: 'opensans, Arial, sans-serif',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 1.5rem' }}>
        <h2
          style={{
            fontSize: '2.1rem',
            fontWeight: 700,
            marginBottom: '1.2rem',
            letterSpacing: '0.01em',
          }}
        >
          Egresados
        </h2>
        <p
          style={{
            fontSize: '1.15rem',
            maxWidth: 600,
            margin: '0 auto',
            opacity: 0.95,
          }}
        >
          Descubrí nuestra línea especial para egresados: buzos, camperas y conjuntos personalizados con la mejor calidad y diseño. ¡Hacé que tu grupo se destaque y lleve un recuerdo inolvidable!
        </p>

        {/* Botón "Ir al diseñador" */}
        <button
          onClick={() => navigate('/diseñador')}
          style={{
            marginTop: 32,
            background: '#fff',
            color: '#9c1f23',
            fontWeight: 700,
            fontSize: '1.08rem',
            padding: '0.75rem 2.2rem',
            borderRadius: 28,
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'none',
            boxShadow: '0 2px 12px 0 rgba(0,0,0,0.08)',
            letterSpacing: '0.01em',
            transition: 'background 0.2s, color 0.2s',
          }}
          onMouseOver={(e) => {
            e.target.style.background = '#f5f5f5';
          }}
          onMouseOut={(e) => {
            e.target.style.background = '#fff';
          }}
        >
          Ir al diseñador
        </button>

        {/* Botón "Contactanos" */}
        <a
          href="#contacto"
          style={{
            display: 'inline-block',
            marginTop: 24,
            background: '#fff',
            color: '#9c1f23',
            fontWeight: 700,
            fontSize: '1.08rem',
            padding: '0.75rem 2.2rem',
            borderRadius: 28,
            textDecoration: 'none',
            boxShadow: '0 2px 12px 0 rgba(0,0,0,0.08)',
            letterSpacing: '0.01em',
            transition: 'background 0.2s, color 0.2s',
            marginLeft: 12
          }}
          onMouseOver={(e) => {
            e.target.style.background = '#f5f5f5';
          }}
          onMouseOut={(e) => {
            e.target.style.background = '#fff';
          }}
        >
          Contactanos
        </a>
      </div>
    </section>
  );
};

export default Egresados;
