import Header from '../components/Header';
import Footer from '../components/Footer';
import { Outlet } from 'react-router-dom';
import '../styles/LayoutGeneral.module.css'; // Importamos los estilos

const LayoutGeneral = () => {
  return (
    <>
      <Header />
      <main className="layout-main">
        <Outlet />
      </main>
      <Footer />
    </>
  );
};

export default LayoutGeneral;
