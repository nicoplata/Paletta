import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ScrollArriba from '../components/ScrollArriba';

const LayoutGeneral = () => (
  <>
    <a href="#contenido" className="saltar-contenido">Saltar al contenido</a>
    <ScrollArriba />
    <Header />
    <main id="contenido" className="layout-main" tabIndex={-1}>
      <Outlet />
    </main>
    <Footer />
  </>
);

export default LayoutGeneral;
