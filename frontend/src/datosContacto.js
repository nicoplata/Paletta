// Datos de contacto del local (mismos que egresados.paletta.com.ar → js/config.js).
export const CONTACTO = {
  whatsapp: '5491173574623',
  telefono: '(011) 7357-4623',
  telefonoLink: '+5491173574623',
  email: 'info@paletta.com.ar',
  direccion: 'Av. Vélez Sarsfield 4270, Munro, Vicente López, Buenos Aires',
  horarios: 'Lun a vie de 9 a 13 y de 16 a 19:30 · Sáb de 9 a 13',
  instagramUniformes: 'https://instagram.com/paletta.uniformes',
  instagramEgresados: 'https://www.instagram.com/paletta.egresados/',
  sitioEgresados: 'https://egresados.paletta.com.ar',
  mapa: 'https://www.google.com/maps/search/?api=1&query=Av.+V%C3%A9lez+Sarsfield+4270%2C+Munro%2C+Vicente+L%C3%B3pez%2C+Buenos+Aires',
};

export const linkWhatsApp = (texto = 'Hola Paletta! Quiero hacer una consulta.') =>
  `https://wa.me/${CONTACTO.whatsapp}?text=${encodeURIComponent(texto)}`;
