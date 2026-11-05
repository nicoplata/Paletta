import Contact from '../components/Contact';
import useSeo from '../hooks/useSeo';

const ContactoPage = () => {
  useSeo({
    titulo: 'Contacto',
    descripcion: 'Contactá a Paletta: Av. Vélez Sarsfield 4270, Munro, Vicente López. WhatsApp (011) 7357-4623. Pedí presupuesto de uniformes escolares y ropa de egresados.',
    ruta: '/contacto',
  });
  return (
    <div className="pagina-contacto">
      <Contact titulo="h1" />
    </div>
  );
};

export default ContactoPage;
