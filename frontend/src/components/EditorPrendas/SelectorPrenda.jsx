import React from 'react';

const SelectorPrenda = ({ onSeleccionar }) => {
  const prendas = [
    { id: 'buzo', nombre: 'Buzo' },
    { id: 'campera', nombre: 'Campera' }
  ];

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h2>Seleccioná el tipo de prenda</h2>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
        {prendas.map(prenda => (
          <button
            key={prenda.id}
            onClick={() => onSeleccionar(prenda.id)}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.2rem',
              borderRadius: 10,
              border: '2px solid #9c1f23',
              background: '#fff',
              color: '#9c1f23',
              cursor: 'pointer'
            }}
          >
            {prenda.nombre}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SelectorPrenda;
