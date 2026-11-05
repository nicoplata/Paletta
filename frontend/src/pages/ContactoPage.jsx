import Contact from '../components/Contact';
import useSeo from '../hooks/useSeo';

const ContactoPage = () => {
  useSeo({
    titulo: 'Contacto',
    descripcion: 'Contactá a Paletta: Vélez Sarsfield 4270, Munro, Buenos Aires. Pedí presupuesto de uniformes escolares y ropa de egresados.',
    ruta: '/contacto',
  });
  return (
    <div className="pagina-contacto">
      <Contact titulo="h1" />
    </div>
  );
};

export default ContactoPage;
