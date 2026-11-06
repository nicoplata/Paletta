import { useState } from 'react';
import { Route, Routes, useParams } from 'react-router-dom';
import Ingreso from './Ingreso';
import PanelFamilia from './PanelFamilia';
import { EGRESADOS, guardarToken, leerToken } from './utils';
import logo from '../assets/img/isotipo.png';

export const Marca = ({ children }) => (
  <header className="pf-hdr">
    <a className="pf-logo" href={EGRESADOS.sitio} aria-label="Paletta Egresados">
      <img src={logo} alt="" width="34" height="27" />
      Paletta<span>Egresados</span>
    </a>
    {children}
  </header>
);

const Promo = () => {
  const { slug } = useParams();
  const [token, setToken] = useState(() => leerToken(slug));
  const cambiarToken = (t) => {
    guardarToken(slug, t);
    setToken(t);
  };
  return token
    ? <PanelFamilia token={token} onSalir={() => cambiarToken(null)} />
    : <Ingreso slug={slug} onIngreso={cambiarToken} />;
};

const SinLink = () => (
  <>
    <Marca />
    <main className="pf-main pf-angosto">
      <h1 className="pf-titulo">Mi promo</h1>
      <p className="lead">Para entrar necesitás el link de tu promo. Pedíselo a la comisión del curso o escribinos.</p>
      <a className="btn" href={EGRESADOS.sitio}>Ir a Paletta Egresados</a>
    </main>
  </>
);

const PortalApp = () => (
  <Routes>
    <Route path="/:slug" element={<Promo />} />
    <Route path="*" element={<SinLink />} />
  </Routes>
);

export default PortalApp;
