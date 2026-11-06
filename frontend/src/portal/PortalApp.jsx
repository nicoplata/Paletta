import { useState } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import Ingreso from './Ingreso';
import PanelFamilia from './PanelFamilia';
import TableroComision from './TableroComision';
import Inicio from './Inicio';
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

const PortalApp = () => (
  <Routes>
    <Route index element={<Inicio />} />
    <Route path="/curso/:codigo" element={<TableroComision />} />
    <Route path="/comision" element={<TableroComision />} />
    <Route path="/comision/:token" element={<TableroComision />} />
    <Route path="/:slug" element={<Promo />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default PortalApp;
