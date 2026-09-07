const BotonVolver = ({ onClick }) => (
  <div style={{ textAlign: 'center', margin: '2rem 0' }}>
    <button
      onClick={onClick}
      style={{
        background: '#9c1f23',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        padding: '0.7rem 2.2rem',
        fontWeight: 700,
        fontSize: '1.1rem',
        cursor: 'pointer',
        fontFamily: 'opensans, Arial, sans-serif',
        letterSpacing: '0.01em',
        boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)'
      }}
    >
      Volver al sitio
    </button>
  </div>
);

export default BotonVolver;