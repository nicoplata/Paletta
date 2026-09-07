import React, { useState } from 'react';
import axios from 'axios';

const Contact = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    mensaje: ''
  });
  const [status, setStatus] = useState({
    type: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      await axios.post('http://localhost:3000/api/contacto', formData);
      setStatus({
        type: 'success',
        message: '¡Gracias por tu mensaje! Te contactaremos pronto.'
      });
      setFormData({ nombre: '', email: '', mensaje: '' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.response?.data?.message || 'Hubo un error al enviar el mensaje. Por favor, intenta nuevamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ background: '#f7f7f7', padding: '3rem 0' }} id="contacto">
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '2.5rem', justifyContent: 'center', alignItems: 'flex-start' }}>
        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{
          flex: '1 1 320px',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(156,31,35,0.10)',
          padding: '2rem',
          minWidth: 300,
          minHeight: 400,
          fontFamily: 'opensans, Arial, sans-serif',
          color: '#9c1f23',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.2rem', fontWeight: 700, fontFamily: 'opensans, Arial, sans-serif', color: '#9c1f23', letterSpacing: '0.01em' }}>Contacto</h2>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="nombre" style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#9c1f23' }}>Nombre</label>
            <input 
              type="text" 
              id="nombre" 
              name="nombre" 
              value={formData.nombre}
              onChange={handleChange}
              required 
              minLength={2}
              maxLength={50}
              pattern="[A-Za-zÁ-ÿ\s]+"
              title="Solo se permiten letras y espacios"
              style={{ 
                width: '100%', 
                padding: 8, 
                borderRadius: 6, 
                border: '1px solid #bdbdbd', 
                fontFamily: 'opensans, Arial, sans-serif', 
                fontSize: '1rem', 
                color: '#222', 
                background: '#fff' 
              }} 
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#9c1f23' }}>Email</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              value={formData.email}
              onChange={handleChange}
              required 
              pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
              title="Por favor ingresa un email válido"
              style={{ 
                width: '100%', 
                padding: 8, 
                borderRadius: 6, 
                border: '1px solid #bdbdbd', 
                fontFamily: 'opensans, Arial, sans-serif', 
                fontSize: '1rem', 
                color: '#222', 
                background: '#fff' 
              }} 
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="mensaje" style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#9c1f23' }}>Mensaje</label>
            <textarea 
              id="mensaje" 
              name="mensaje" 
              value={formData.mensaje}
              onChange={handleChange}
              rows={5} 
              required 
              minLength={10}
              maxLength={500}
              style={{ 
                width: '100%', 
                padding: 8, 
                borderRadius: 6, 
                border: '1px solid #bdbdbd', 
                resize: 'vertical', 
                fontFamily: 'opensans, Arial, sans-serif', 
                fontSize: '1rem', 
                color: '#222', 
                background: '#fff' 
              }} />
          </div>
          {status.message && (
            <div 
              style={{ 
                padding: '0.75rem', 
                marginBottom: '1rem', 
                borderRadius: 6, 
                backgroundColor: status.type === 'success' ? '#e8f5e9' : '#ffebee',
                color: status.type === 'success' ? '#2e7d32' : '#c62828',
                fontSize: '0.9rem'
              }}
            >
              {status.message}
            </div>
          )}
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              background: loading ? '#cccccc' : '#9c1f23', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 6, 
              padding: '0.7rem 2.2rem', 
              fontWeight: 700, 
              fontSize: '1.1rem', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              marginTop: 8, 
              fontFamily: 'opensans, Arial, sans-serif', 
              letterSpacing: '0.01em', 
              boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
        {/* Mapa */}
        <div style={{
          flex: '1 1 320px',
          minWidth: 300,
          height: 400,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(156,31,35,0.10)',
          padding: 0,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'center',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}>
          <iframe
            title="Ubicación Paletta"
            src="https://www.google.com/maps?q=Velez+Sarsfield+4270,+Munro,+Buenos+Aires,+Argentina&z=15&output=embed"
            width="100%"
            height="100%"
            style={{ border: 0, borderRadius: 0, filter: 'grayscale(0.15) contrast(1.08)', display: 'block', width: '100%', height: '100%' }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>
    </section>
  );
};

export default Contact;
