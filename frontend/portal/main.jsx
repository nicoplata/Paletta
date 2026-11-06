import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '../src/styles/base.css';
import '../src/portal/portal.css';
import PortalApp from '../src/portal/PortalApp';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/mi-promo">
      <PortalApp />
    </BrowserRouter>
  </React.StrictMode>
);
