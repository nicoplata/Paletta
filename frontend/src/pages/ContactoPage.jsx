import Contact from '../components/Contact';
import useSeo from '../hooks/useSeo';

const ContactoPage = () => {
  useSeo({
    titulo: 'Contacto',
    descripcion: 'Contactá a Paletta: Av. Vélez Sarsfield 4270, Munro, Vicente López. WhatsApp (011) 6494-9021. Pedí presupuesto de uniformes escolares, institucionales y de empresa.',
    ruta: '/contacto',
  });
  return (
    <div className="pagina-contacto">
      <Contact titulo="h1" />
    </div>
  );
};

export default ContactoPage;
