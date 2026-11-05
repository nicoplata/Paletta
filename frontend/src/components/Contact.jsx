import { useState } from 'react';
import { FaWhatsapp, FaPhoneAlt, FaMapMarkerAlt, FaRegClock } from 'react-icons/fa';
import api, { mensajeError } from '../lib/api';
import { CONTACTO, linkWhatsApp } from '../datosContacto';
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
        <div className="contacto-info">
          <p className="eyebrow">Contacto</p>
          <Titulo className="display">Hablemos.</Titulo>
          <p className="lead">Escribinos por WhatsApp, llamanos o acercate al local. También podés dejarnos tu consulta acá.</p>
          <ul className="contacto-items">
            <li>
              <a href={linkWhatsApp()} target="_blank" rel="noopener noreferrer">
                <FaWhatsapp aria-hidden="true" /><span><b>WhatsApp</b><span>{CONTACTO.telefono}</span></span>
              </a>
            </li>
            <li>
              <a href={`tel:${CONTACTO.telefonoLink}`}>
                <FaPhoneAlt aria-hidden="true" /><span><b>Llamanos</b><span>{CONTACTO.telefono}</span></span>
              </a>
            </li>
            <li>
              <a href={CONTACTO.mapa} target="_blank" rel="noopener noreferrer">
                <FaMapMarkerAlt aria-hidden="true" /><span><b>Local</b><span>{CONTACTO.direccion}</span></span>
              </a>
            </li>
            <li>
              <div>
                <FaRegClock aria-hidden="true" /><span><b>Horarios</b><span>{CONTACTO.horarios}</span></span>
              </div>
            </li>
          </ul>
        </div>

        <form className="contacto-form tarjeta" onSubmit={handleSubmit}>
          <h3>Dejanos tu consulta</h3>
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
          <input type="text" name="sitio" className="honeypot" value={formData.sitio} onChange={handleChange} tabIndex={-1} autoComplete="off" aria-hidden="true" />
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
            title={`Ubicación de Paletta: ${CONTACTO.direccion}`}
            src="https://www.google.com/maps?q=Av.+Velez+Sarsfield+4270,+Munro,+Buenos+Aires,+Argentina&z=15&output=embed"
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
