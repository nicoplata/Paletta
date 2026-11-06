// Prueba el envío de mails con la configuración de .env y muestra el error exacto si falla.
// Uso (en backend/):  npm run mail:prueba            -> envía a CONTACT_TO
//                     npm run mail:prueba -- otra@direccion.com
const nodemailer = require('nodemailer');
const ENV = require('../src/config/env');

(async () => {
  const destino = process.argv[2] || ENV.CONTACT_TO;
  const faltan = ['MAIL_HOST', 'MAIL_USER', 'MAIL_PASS', 'CONTACT_TO'].filter((k) => !ENV[k] && !(k === 'CONTACT_TO' && destino));
  console.log('Configuración leída de backend/.env:');
  console.log(`  MAIL_HOST=${ENV.MAIL_HOST || '(vacío)'}  MAIL_PORT=${ENV.MAIL_PORT}  MAIL_SECURE=${ENV.MAIL_SECURE}`);
  console.log(`  MAIL_USER=${ENV.MAIL_USER || '(vacío)'}  MAIL_PASS=${ENV.MAIL_PASS ? '(cargada)' : '(vacía)'}`);
  console.log(`  MAIL_FROM=${ENV.MAIL_FROM || '(vacío)'}  CONTACT_TO=${ENV.CONTACT_TO || '(vacío)'}`);
  if (faltan.length) {
    console.error(`\n✖ Faltan variables: ${faltan.join(', ')}. Sin ellas el sitio no envía mails (los mensajes igual quedan en el panel).`);
    process.exit(1);
  }

  const t = nodemailer.createTransport({
    host: ENV.MAIL_HOST, port: ENV.MAIL_PORT, secure: ENV.MAIL_SECURE,
    auth: { user: ENV.MAIL_USER, pass: ENV.MAIL_PASS },
  });
  try {
    await t.verify();
    console.log('\n✔ Conexión y usuario SMTP correctos.');
    const info = await t.sendMail({
      from: ENV.MAIL_FROM,
      to: destino,
      subject: 'Prueba de correo de Paletta',
      text: 'Si te llegó este mail, el sitio ya puede enviar avisos de contacto, pedidos y recordatorios.',
    });
    console.log(`✔ Mail enviado a ${destino} (respuesta del servidor: ${info.response}).`);
    console.log('  Si no lo ves en unos minutos, revisá Spam y la sección Transactional → Logs de Brevo.');
  } catch (err) {
    console.error(`\n✖ Falló: ${err.message}`);
    if (/auth|535|Invalid login/i.test(err.message)) console.error('  → MAIL_USER tiene que ser el "Login" SMTP de Brevo y MAIL_PASS la clave SMTP (xsmtpsib-...).');
    if (/sender|not valid|unauthori[sz]ed/i.test(err.message)) console.error('  → El remitente de MAIL_FROM tiene que ser de un dominio autenticado en Brevo (Senders, Domains).');
    if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(err.message)) console.error('  → No hay conexión con el servidor SMTP: revisá MAIL_HOST/MAIL_PORT o el firewall de la VPS (puerto 587 saliente).');
    process.exit(1);
  }
})();
