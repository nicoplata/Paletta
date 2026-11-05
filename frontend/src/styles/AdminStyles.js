import { createGlobalStyle } from 'styled-components';

// Estilos globales del panel: misma tipografía local que el sitio (sin fuentes externas).
export const AdminGlobalStyles = createGlobalStyle`
  body {
    font-family: var(--fuente);
    background: #eef1f6;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 700;
  }
`;
