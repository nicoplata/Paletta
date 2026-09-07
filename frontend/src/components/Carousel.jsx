import '../styles/style.css';
import { useState, useEffect, useRef } from 'react';

const slides = [
  {
    bgImage: '/img/paletta_2.jpg',
    title: 'Bienvenido a Paletta',
    desc: 'Indumentaria deportiva y urbana para egresados, colegios y empresas. Calidad, diseño y comodidad en cada prenda.',
    cta: 'Ver productos',
    ctaLink: '#productos',
  },
  {
    bgColor: '#9c1f23',
    title: 'Personalizá tu conjunto',
    desc: 'Elegí colores, estampas y detalles únicos para tu grupo o empresa.',
    cta: 'Personalizar',
    ctaLink: '#personalizar',
  },
  {
    bgColor: '#9c1f23',
    title: 'Calidad garantizada',
    desc: 'Materiales premium y confección nacional. ¡Conocé más sobre nosotros!',
    cta: 'Sobre Paletta',
    ctaLink: '#nosotros',
  },
];

const Carousel = (props) => {
  const [current, setCurrent] = useState(0);
  const timeoutRef = useRef(null);

  // Auto-slide
  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearTimeout(timeoutRef.current);
  }, [current]);

  const goTo = (idx) => setCurrent(idx);
  const prev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  const next = () => setCurrent((prev) => (prev + 1) % slides.length);

  return (
    <div className="carouselContainer" style={{ position: 'relative', overflow: 'hidden', minHeight: '60vh' }}>
      {slides.map((slide, idx) => (
        <div
          key={idx}
          className="carousel-slide"
          style={{
            background: slide.bgImage
              ? `url('${slide.bgImage}') center/cover no-repeat #2a3a5c`
              : slide.bgColor || '#222',
            opacity: idx === current ? 1 : 0,
            zIndex: idx === current ? 2 : 1,
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transition: 'opacity 0.7s cubic-bezier(.4,0,.2,1)',
          }}
        >
          {idx === current && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3,
                color: '#fff',
                background: idx === 0
                  ? `radial-gradient(ellipse at center, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.18) 60%, rgba(0,0,0,0.55) 100%), linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.10) 60%, rgba(0,0,0,0.01) 100%)`
                  : 'linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.10) 60%, rgba(0,0,0,0.03) 100%)',
                textShadow: '0 2px 8px rgba(0,0,0,0.25)'
              }}
            >
              <h1 style={{ fontFamily: 'opensans, Arial, sans-serif', fontWeight: 700, fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center', letterSpacing: '0.01em' }}>{slide.title}</h1>
              <p style={{ fontSize: '1.25rem', maxWidth: 540, textAlign: 'center', marginBottom: '2rem', fontWeight: 400 }}>{slide.desc}</p>
              {slide.cta === 'Personalizar' ? (
                <button
                  onClick={props.onPersonalizar}
                  style={{
                    background: 'rgba(255,255,255,0.92)',
                    color: '#222',
                    borderRadius: '24px',
                    padding: '0.9rem 2.2rem',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    textDecoration: 'none',
                    boxShadow: '0 2px 12px 0 rgba(0,0,0,0.10)',
                    transition: 'background 0.2s',
                    marginBottom: '1.5rem',
                    display: 'inline-block',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {slide.cta}
                </button>
              ) : (
                <a href={slide.ctaLink} style={{
                  background: 'rgba(255,255,255,0.92)',
                  color: '#222',
                  borderRadius: '24px',
                  padding: '0.9rem 2.2rem',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  textDecoration: 'none',
                  boxShadow: '0 2px 12px 0 rgba(0,0,0,0.10)',
                  transition: 'background 0.2s',
                  marginBottom: '1.5rem',
                  display: 'inline-block',
                }}>{slide.cta}</a>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Flechas */}
      <button onClick={prev} aria-label="Anterior" style={{ position: 'absolute', top: '50%', left: 24, transform: 'translateY(-50%)', zIndex: 10, background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', fontSize: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&#8592;</button>
      <button onClick={next} aria-label="Siguiente" style={{ position: 'absolute', top: '50%', right: 24, transform: 'translateY(-50%)', zIndex: 10, background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', fontSize: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&#8594;</button>

      {/* Bullets */}
      <div style={{ position: 'absolute', bottom: 32, left: 0, width: '100%', display: 'flex', justifyContent: 'center', gap: 12, zIndex: 10 }}>
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goTo(idx)}
            aria-label={`Ir al slide ${idx + 1}`}
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: 'none',
              background: idx === current ? '#fff' : 'rgba(255,255,255,0.5)',
              boxShadow: idx === current ? '0 0 0 2px #222' : 'none',
              cursor: 'pointer',
              transition: 'background 0.2s',
              outline: 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default Carousel;