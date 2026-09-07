import React from 'react';
import logoWhite from '../assets/img/palettaWhite.png';

const Footer = () => (
  <footer style={{
    background: '#9c1f23',
    color: '#fff',
    padding: '2rem 0',
    marginTop: '3rem',
    fontFamily: 'opensans, Arial, sans-serif',
    fontWeight: 400,
    fontSize: '1.05rem',
    letterSpacing: '0.01em',
  }}>
    <div style={{
      maxWidth: 900,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 32,
      flexWrap: 'wrap',
    }}>
      {/* Branding */}
      <div style={{ minWidth: 180, marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <img
          src={logoWhite}
          alt="Logo Paletta"
          style={{ height: 54, marginBottom: 8, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }}
        />
      </div>
      {/* Links */}
      <nav style={{ minWidth: 180, marginBottom: 12 }}>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
          <li><a href="#productos" style={{ color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '1.05rem', letterSpacing: '0.01em', transition: 'color 0.2s' }}>Productos</a></li>
          <li><a href="#colegios" style={{ color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '1.05rem', letterSpacing: '0.01em', transition: 'color 0.2s' }}>Colegios</a></li>
          <li><a href="#egresados" style={{ color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '1.05rem', letterSpacing: '0.01em', transition: 'color 0.2s' }}>Egresados</a></li>
          <li><a href="#contacto" style={{ color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '1.05rem', letterSpacing: '0.01em', transition: 'color 0.2s' }}>Contacto</a></li>
        </ul>
      </nav>
      {/* Contacto */}
      <div id="contacto" style={{ minWidth: 220, marginBottom: 12, fontSize: '0.98rem', opacity: 0.85 }}>
        <div><strong>Contacto:</strong></div>
        <div><a href="mailto:info@paletta.com.ar" style={{ color: '#fff', textDecoration: 'underline', fontWeight: 500 }}>info@paletta.com.ar</a></div>
        <div><a href="tel:+541147777777" style={{ color: '#fff', textDecoration: 'underline', fontWeight: 500 }}>+54 11 4777-7777</a></div>
        <div style={{ opacity: 0.8 }}>Vélez Sarsfield 4270, Munro, Buenos Aires</div>
      </div>
    </div>
  </footer>
);

export default Footer;
