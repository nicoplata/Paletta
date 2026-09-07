import React, { useState } from 'react';
import BuzoInteractivo from './BuzoInteractivo';

const EditorBuzo = () => {
  const [texto, setTexto] = useState('Mi diseño');
  const [colores, setColores] = useState({
    cuerpo: '#9c1f23',
    manga_izquierda: '#9c1f23',
    manga_derecha: '#9c1f23',
    capucha: '#9c1f23',
    bolsillo_izquierdo: '#999999',
    bolsillo_derecho: '#999999'
  });

  const limpiar = () => {
    setTexto('Mi diseño');
    setColores({
      cuerpo: '#9c1f23',
      manga_izquierda: '#9c1f23',
      manga_derecha: '#9c1f23',
      capucha: '#9c1f23',
      bolsillo_izquierdo: '#999999',
      bolsillo_derecho: '#999999'
    });
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, justifyContent: 'center' }}>
      {/* Vista previa */}
      <div style={{
        minWidth: 320,
        maxWidth: 340,
        textAlign: 'center',
        background: '#f3f3f3',
        borderRadius: 14,
        boxShadow: '0 2px 8px rgba(156,31,35,0.07)',
        padding: '2.2rem 1.2rem',
        position: 'relative'
      }}>
        <BuzoInteractivo colores={colores} />
        <div style={{
          position: 'absolute',
          top: 120,
          left: 0,
          width: '100%',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          <span style={{
            color: '#fff',
            fontWeight: 700,
            fontSize: 28,
            textShadow: '0 2px 8px #222',
            letterSpacing: '0.01em',
            background: 'rgba(0,0,0,0.18)',
            borderRadius: 6,
            padding: '0.2em 0.7em'
          }}>{texto}</span>
        </div>
      </div>

      {/* Controles */}
      <div style={{ minWidth: 260, flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#9c1f23' }}>Editor de Buzo</h2>

        {Object.keys(colores).map(parte => (
          <div key={parte}>
            <label style={{ fontWeight: 600, color: '#9c1f23' }}>{parte}:</label>
            <input
              type="color"
              value={colores[parte]}
              onChange={e => setColores({ ...colores, [parte]: e.target.value })}
              style={{
                marginLeft: 8,
                width: 48,
                height: 38,
                border: 'none',
                background: 'none',
                verticalAlign: 'middle'
              }}
            />
          </div>
        ))}

        <div>
          <label style={{ fontWeight: 600, color: '#9c1f23' }}>Texto:</label>
          <input
            type="text"
            value={texto}
            maxLength={18}
            onChange={e => setTexto(e.target.value)}
            style={{
              fontSize: '1.1rem',
              padding: 8,
              borderRadius: 7,
              border: '1px solid #bdbdbd',
              width: 180,
              marginLeft: 8
            }}
          />
        </div>

        <button
          onClick={limpiar}
          style={{
            background: '#fff',
            color: '#9c1f23',
            border: '2px solid #9c1f23',
            borderRadius: 7,
            padding: '0.6rem 1.6rem',
            fontWeight: 700,
            fontSize: '1.05rem',
            cursor: 'pointer',
            fontFamily: 'opensans, Arial, sans-serif',
            letterSpacing: '0.01em',
            boxShadow: '0 2px 8px 0 rgba(0,0,0,0.07)'
          }}
        >
          Limpiar
        </button>
      </div>
    </div>
  );
};

export default EditorBuzo;
