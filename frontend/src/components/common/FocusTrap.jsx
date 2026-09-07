// Componente para manejar el foco del teclado en modales
import { useEffect, useRef } from 'react';

const FocusTrap = ({ children }) => {
  const trapRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const lastFocusableRef = useRef(null);

  useEffect(() => {
    const trapElement = trapRef.current;
    if (!trapElement) return;

    const focusableElements = trapElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    firstFocusableRef.current = focusableElements[0];
    lastFocusableRef.current = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusableRef.current) {
          e.preventDefault();
          lastFocusableRef.current?.focus();
        }
      } else {
        if (document.activeElement === lastFocusableRef.current) {
          e.preventDefault();
          firstFocusableRef.current?.focus();
        }
      }
    };

    trapElement.addEventListener('keydown', handleKeyDown);
    firstFocusableRef.current?.focus();

    return () => {
      trapElement.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={trapRef}>
      {children}
    </div>
  );
};

export default FocusTrap;
