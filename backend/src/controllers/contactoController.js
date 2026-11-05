const { MensajeContacto } = require('../models');
const { enviarMail, mailConfigurado } = require('../services/mail');
const { AppError } = require('../utils/errorHandler');
const ENV = require('../config/env');

const escapar = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

exports.recibirMensaje = async (req, res) => {
  const { sitio, ...datos } = req.body;

  // Honeypot: respondemos OK sin guardar nada para no darle pistas al bot.
  if (sitio) return res.status(201).json({ mensaje: 'Mensaje recibido' });

  const mensaje = await MensajeContacto.create(datos);

  if (mailConfigurado() && ENV.CONTACT_TO) {
    enviarMail({
      to: ENV.CONTACT_TO,
      replyTo: datos.email,
      subject: `Nuevo mensaje de contacto - ${datos.nombre}`,
      text: `Nombre: ${datos.nombre}\nEmail: ${datos.email}\nTeléfono: ${datos.telefono || '-'}\n\n${datos.mensaje}`,
      html: `<p><strong>Nombre:</strong> ${escapar(datos.nombre)}<br><strong>Email:</strong> ${escapar(datos.email)}<br><strong>Teléfono:</strong> ${escapar(datos.telefono || '-')}</p><p>${escapar(datos.mensaje).replace(/\n/g, '<br>')}</p>`,
    }).catch((err) => console.error('No se pudo enviar el mail de contacto:', err.message));
  }

  res.status(201).json({ mensaje: 'Mensaje recibido', id: mensaje.id });
};

exports.listarMensajes = async (req, res) => {
  const mensajes = await MensajeContacto.findAll({ order: [['createdAt', 'DESC']], limit: 500 });
  res.json(mensajes);
};

exports.marcarLeido = async (req, res) => {
  const mensaje = await MensajeContacto.findByPk(req.params.id);
  if (!mensaje) throw new AppError('Mensaje no encontrado', 404);
  await mensaje.update({ leido: req.body.leido !== false });
  res.json(mensaje);
};

exports.eliminarMensaje = async (req, res) => {
  const mensaje = await MensajeContacto.findByPk(req.params.id);
  if (!mensaje) throw new AppError('Mensaje no encontrado', 404);
  await mensaje.destroy();
  res.json({ mensaje: 'Mensaje eliminado' });
};
