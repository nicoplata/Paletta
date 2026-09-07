import React from 'react';

const BuzoInteractivo = ({ colores }) => (
  <svg width="400" height="500" viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#333" floodOpacity="0.3" />
      </filter>
    </defs>

    <g id="cuerpo" filter="url(#shadow)">
      <path d="M100,150 Q90,200 100,400 L300,400 Q310,200 300,150 Z" fill={colores.cuerpo} stroke="#444" strokeWidth="2" />
      <line x1="200" y1="150" x2="200" y2="400" stroke="#222" strokeWidth="3" strokeDasharray="4,2" />
    </g>

    <g id="manga_izquierda" filter="url(#shadow)">
      <path d="M100,160 Q60,180 50,300 Q60,360 100,380 Z" fill={colores.manga_izquierda} stroke="#444" strokeWidth="2" />
    </g>

    <g id="manga_derecha" filter="url(#shadow)">
      <path d="M300,160 Q340,180 350,300 Q340,360 300,380 Z" fill={colores.manga_derecha} stroke="#444" strokeWidth="2" />
    </g>

    <g id="capucha" filter="url(#shadow)">
      <path d="M100,150 Q200,40 300,150 Q250,100 200,100 Q150,100 100,150 Z" fill={colores.capucha} stroke="#444" strokeWidth="2" />
    </g>

    <g id="bolsillo_izquierdo" filter="url(#shadow)">
      <path d="M130,310 Q125,330 130,350 Q150,355 170,350 Q175,330 170,310 Z" fill={colores.bolsillo_izquierdo} stroke="#333" strokeWidth="1.5" />
    </g>

    <g id="bolsillo_derecho" filter="url(#shadow)">
      <path d="M230,310 Q225,330 230,350 Q250,355 270,350 Q275,330 270,310 Z" fill={colores.bolsillo_derecho} stroke="#333" strokeWidth="1.5" />
    </g>
  </svg>
);

export default BuzoInteractivo;
