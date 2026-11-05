const nodemailer = require('nodemailer');
const ENV = require('../config/env');

let transporter;

const mailConfigurado = () => Boolean(ENV.MAIL_HOST && ENV.MAIL_USER && ENV.MAIL_PASS);

function obtenerTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: ENV.MAIL_HOST,
      port: ENV.MAIL_PORT,
      secure: ENV.MAIL_SECURE,
      auth: { user: ENV.MAIL_USER, pass: ENV.MAIL_PASS },
    });
  }
  return transporter;
}

async function enviarMail(opciones) {
  if (!mailConfigurado()) return null;
  return obtenerTransporter().sendMail({ from: ENV.MAIL_FROM, ...opciones });
}

module.exports = { enviarMail, mailConfigurado };
