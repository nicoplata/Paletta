import React, { createContext, useState } from 'react';

export const CarritoContext = createContext();
export const CartContext = CarritoContext; // Alias en inglés

export const CarritoProvider = ({ children }) => {
  const [carrito, setCarrito] = useState([]);
  const [colegioSeleccionado, setColegioSeleccionado] = useState(null);

  const agregarAlCarrito = (producto, cantidad = 1) => {
    setCarrito((prev) => {
      const existente = prev.find((item) => item.productoId === producto.id);
      if (existente) {
        return prev.map((item) =>
          item.productoId === producto.id
            ? {
                ...item,
                cantidad: item.cantidad + cantidad,
                subtotal: (item.cantidad + cantidad) * item.precio,
              }
            : item
        );
      } else {
        return [
          ...prev,
          {
            productoId: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad,
            imagen: producto.imagenes?.[0]?.url || '',
            subtotal: cantidad * producto.precio,
          },
        ];
      }
    });
  };

  const quitarDelCarrito = (productoId) => {
    setCarrito((prev) => prev.filter((item) => item.productoId !== productoId));
  };

  const vaciarCarrito = () => setCarrito([]);

  const total = carrito.reduce((acc, item) => acc + item.subtotal, 0);

  return (
    <CarritoContext.Provider
      value={{
        carrito,
        agregarAlCarrito,
        quitarDelCarrito,
        vaciarCarrito,
        total,
        colegioSeleccionado,
        setColegioSeleccionado,
      }}
    >
      {children}
    </CarritoContext.Provider>
  );
};

export const CartProvider = CarritoProvider; // Exportar también como CartProvider
