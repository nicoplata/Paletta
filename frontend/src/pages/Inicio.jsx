import Carousel from '../components/Carousel';
import SelectorColegiosHome from '../components/SelectorColegiosHome';
import ProductListHome from '../components/ProductListHome';
import Egresados from '../components/Egresados';
import Contact from '../components/Contact';
import useSeo from '../hooks/useSeo';

const Inicio = () => {
  useSeo({ ruta: '/' });
  return (
    <>
      <Carousel />
      <SelectorColegiosHome />
      <ProductListHome />
      <Egresados />
      <Contact />
    </>
  );
};

export default Inicio;
