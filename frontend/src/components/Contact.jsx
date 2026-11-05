import { useState } from 'react';
import api, { mensajeError } from '../lib/api';
import { DATOS_CONTACTO } from './Footer';
import '../styles/Secciones.css';

const VACIO = { nombre: '', email: '', mensaje: '', sitio: '' }; // "sitio" es un honeypot anti-spam

const Contact = ({ titulo: Titulo = 'h2' }) => {
  const [formData, setFormData] = useState(VACIO);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      await api.post('/contacto', formData);
      setStatus({ type: 'success', message: '¡Gracias por tu mensaje! Te contactaremos pronto.' });
      setFormData(VACIO);
    } catch (error) {
      setStatus({ type: 'error', message: mensajeError(error, 'Hubo un error al enviar el mensaje. Por favor, intentá nuevamente.') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="contacto" id="contacto">
      <div className="contacto-grilla">
        <form className="contacto-form" onSubmit={handleSubmit}>
          <Titulo>Contacto</Titulo>
          <p className="contacto-datos">
            Escribinos o llamanos al <a href={`tel:${DATOS_CONTACTO.telefonoLink}`}>{DATOS_CONTACTO.telefono}</a>.
          </p>
          <label className="campo" htmlFor="nombre">
            Nombre
            <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required minLength={2} maxLength={100} autoComplete="name" />
          </label>
          <label className="campo" htmlFor="email">
            Email
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required autoComplete="email" />
          </label>
          <label className="campo" htmlFor="mensaje">
            Mensaje
            <textarea id="mensaje" name="mensaje" value={formData.mensaje} onChange={handleChange} rows={5} required minLength={10} maxLength={2000} />
          </label>
          <input
            type="text"
            name="sitio"
            className="honeypot"
            value={formData.sitio}
            onChange={handleChange}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />
          {status.message && (
            <div role={status.type === 'error' ? 'alert' : 'status'} className={`aviso ${status.type === 'error' ? 'error' : 'exito'}`}>
              {status.message}
            </div>
          )}
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
        <div className="contacto-mapa">
          <iframe
            title={`Ubicación de Paletta: ${DATOS_CONTACTO.direccion}`}
            src="https://www.google.com/maps?q=Velez+Sarsfield+4270,+Munro,+Buenos+Aires,+Argentina&z=15&output=embed"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  );
};

export default Contact;
