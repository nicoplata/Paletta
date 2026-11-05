import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export const CarritoContext = createContext(null);

const STORAGE_KEY = 'paletta_carrito_v1';
const MAX_POR_ITEM = 50;

const leerGuardado = () => {
  try {
    const datos = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(datos) ? datos.filter((it) => it && it.varianteId && it.cantidad > 0) : [];
  } catch {
    return [];
  }
};

const limitar = (cantidad, stock) => Math.max(0, Math.min(cantidad, stock ?? MAX_POR_ITEM, MAX_POR_ITEM));

// Función pura: ajusta los ítems del carrito a los productos actuales del catálogo.
export function reconciliar(items, productos) {
  const variantes = new Map();
  productos.forEach((p) => (p.variantes || []).forEach((v) => variantes.set(v.id, { producto: p, variante: v })));
  const cambios = [];
  const siguientes = [];
  for (const it of items) {
    const actual = variantes.get(it.varianteId);
    if (!actual || actual.variante.stock <= 0) {
      cambios.push(`"${it.nombre}" (talle ${it.talle}) ya no está disponible y se quitó del carrito.`);
      continue;
    }
    const { producto, variante } = actual;
    const cantidad = limitar(it.cantidad, variante.stock);
    if (cantidad < it.cantidad) cambios.push(`"${it.nombre}" (talle ${it.talle}): solo quedan ${variante.stock}.`);
    if (producto.precio !== it.precio) cambios.push(`"${it.nombre}" cambió de precio.`);
    const actualizado = { ...it, nombre: producto.nombre, precio: producto.precio, stock: variante.stock, cantidad };
    siguientes.push(actualizado);
  }
  return { items: siguientes, cambios };
}

export const CarritoProvider = ({ children }) => {
  const [items, setItems] = useState(leerGuardado);
  const [colegioSeleccionado, setColegioSeleccionado] = useState(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // almacenamiento no disponible (modo privado): el carrito vive solo en memoria
    }
  }, [items]);

  // Agrega una variante (talle) de un producto. Devuelve la cantidad realmente agregada
  // (puede ser menor si no hay stock suficiente).
  const agregar = useCallback((producto, variante, cantidad = 1) => {
    const prev = itemsRef.current;
    const existente = prev.find((it) => it.varianteId === variante.id);
    const actual = existente?.cantidad || 0;
    const nueva = limitar(actual + cantidad, variante.stock);
    const agregada = nueva - actual;
    if (agregada <= 0) return 0;
    const datos = {
      varianteId: variante.id,
      productoId: producto.id,
      nombre: producto.nombre,
      colegio: producto.colegio?.nombre || null,
      talle: variante.talle,
      precio: producto.precio,
      imagen: producto.imagenes?.[0]?.url || null,
      stock: variante.stock,
      cantidad: nueva,
    };
    const siguientes = existente ? prev.map((it) => (it.varianteId === variante.id ? datos : it)) : [...prev, datos];
    itemsRef.current = siguientes;
    setItems(siguientes);
    return agregada;
  }, []);

  const actualizarCantidad = useCallback((varianteId, cantidad) => {
    setItems((prev) =>
      prev
        .map((it) => (it.varianteId === varianteId ? { ...it, cantidad: limitar(cantidad, it.stock) } : it))
        .filter((it) => it.cantidad > 0)
    );
  }, []);

  const quitar = useCallback((varianteId) => {
    setItems((prev) => prev.filter((it) => it.varianteId !== varianteId));
  }, []);

  const vaciar = useCallback(() => setItems([]), []);

  // Sincroniza el carrito con el catálogo actual (precios, stock, disponibilidad).
  // Devuelve los avisos para mostrarle al usuario.
  const sincronizar = useCallback((productos) => {
    const { items: siguientes, cambios } = reconciliar(itemsRef.current, productos);
    itemsRef.current = siguientes;
    setItems(siguientes);
    return cambios;
  }, []);

  const valor = useMemo(() => ({
    items,
    agregar,
    actualizarCantidad,
    quitar,
    vaciar,
    sincronizar,
    cantidadTotal: items.reduce((acc, it) => acc + it.cantidad, 0),
    subtotal: Math.round(items.reduce((acc, it) => acc + it.precio * it.cantidad, 0) * 100) / 100,
    colegioSeleccionado,
    setColegioSeleccionado,
  }), [items, agregar, actualizarCantidad, quitar, vaciar, sincronizar, colegioSeleccionado]);

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
};

export const useCarrito = () => {
  const ctx = useContext(CarritoContext);
  if (!ctx) throw new Error('useCarrito debe usarse dentro de un CarritoProvider');
  return ctx;
};
