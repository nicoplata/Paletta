import React, { useState } from 'react';
import Header from '../Header';
import SelectorPrenda from './SelectorPrenda';
import EditorBuzo from './EditorBuzo';

const DisenadorPrendas = () => {
  const [prendaSeleccionada, setPrendaSeleccionada] = useState(null);

  const renderEditor = () => {
    switch (prendaSeleccionada) {
      case 'buzo':
        return <EditorBuzo />;
      case 'campera':
        return <div>Editor de campera aún no disponible</div>;
      default:
        return <SelectorPrenda onSeleccionar={setPrendaSeleccionada} />;
    }
  };

  return (
    <>
      
    <Header forceScrolled={true} />

      <section style={{ background: '#f7f7f7', minHeight: '100vh', padding: '10rem 0 3rem 0' }}>
        <div style={{
          maxWidth: 1100,
          margin: '0 auto',
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 2px 16px rgba(156,31,35,0.13)',
          padding: '2.5rem 2rem'
        }}>
          {renderEditor()}
        </div>
      </section>
    </>
  );
};

export default DisenadorPrendas;
