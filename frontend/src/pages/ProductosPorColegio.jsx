import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const ProductosPorColegio = () => {
  const { id } = useParams(); // ID del colegio desde la URL
  const [productos, setProductos] = useState([]);
  const [colegio, setColegio] = useState(null);

  useEffect(() => {
    // Obtener datos del colegio
    fetch(`http://localhost:3000/api/colegios/${id}`)
      .then((res) => res.json())
      .then((data) => setColegio(data))
      .catch((err) => console.error('Error al cargar colegio:', err));

    // Obtener productos relacionados al colegio
    fetch(`http://localhost:3000/api/colegios/${id}/productos`)
      .then((res) => res.json())
      .then((data) => setProductos(data))
      .catch((err) => console.error('Error al cargar productos:', err));
  }, [id]);

  return (
    <div className="productos-por-colegio">
      <h2>Productos para {colegio?.nombre}</h2>
      <div className="grid-productos">
        {productos.map((producto) => (
          <div key={producto.id} className="tarjeta-producto">
            <img src={producto.imagen} alt={producto.nombre} />
            <h3>{producto.nombre}</h3>
            <p>{producto.descripcion}</p>
            <p><strong>${producto.precio}</strong></p>
            <button>Agregar al carrito</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductosPorColegio;

