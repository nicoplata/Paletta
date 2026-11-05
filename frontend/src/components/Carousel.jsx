import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Secciones.css';

const SLIDES = [
  {
    principal: true,
    titulo: 'Bienvenido a Paletta',
    texto: 'Indumentaria deportiva y urbana para egresados, colegios y empresas. Calidad, diseño y comodidad en cada prenda.',
    cta: 'Ver productos',
    link: '/productos',
  },
  {
    titulo: 'Personalizá tu conjunto',
    texto: 'Elegí colores, estampas y detalles únicos para tu grupo o empresa.',
    cta: 'Egresados',
    link: '/egresados',
  },
  {
    titulo: 'Calidad garantizada',
    texto: 'Materiales premium y confección nacional. ¡Conocé más sobre nosotros!',
    cta: 'Contactanos',
    link: '/contacto',
  },
];

const INTERVALO = 6000;

const Carousel = () => {
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado) return undefined;
    const t = setTimeout(() => setActual((i) => (i + 1) % SLIDES.length), INTERVALO);
    return () => clearTimeout(t);
  }, [actual, pausado]);

  const ir = (i) => setActual((i + SLIDES.length) % SLIDES.length);

  return (
    <section
      className="hero"
      aria-roledescription="carrusel"
      aria-label="Destacados"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      {SLIDES.map((s, i) => (
        <div
          key={s.titulo}
          className={`hero-slide${s.principal ? ' con-imagen' : ''}${i === actual ? ' activo' : ''}`}
          aria-hidden={i !== actual}
          aria-roledescription="slide"
          aria-label={`${i + 1} de ${SLIDES.length}`}
        >
          <div className="hero-contenido">
            {i === 0 ? <h1>{s.titulo}</h1> : <h2>{s.titulo}</h2>}
            <p>{s.texto}</p>
            <Link to={s.link} className="btn btn-claro" tabIndex={i === actual ? 0 : -1}>{s.cta}</Link>
          </div>
        </div>
      ))}

      <button type="button" className="hero-flecha izquierda" onClick={() => ir(actual - 1)} aria-label="Anterior">&#8592;</button>
      <button type="button" className="hero-flecha derecha" onClick={() => ir(actual + 1)} aria-label="Siguiente">&#8594;</button>

      <div className="hero-puntos">
        {SLIDES.map((s, i) => (
          <button key={s.titulo} type="button" onClick={() => ir(i)} aria-label={`Ir al destacado ${i + 1}`} aria-current={i === actual} />
        ))}
      </div>
    </section>
  );
};

export default Carousel;
