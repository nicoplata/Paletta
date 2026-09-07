const { Producto, Categoria, Imagen, Colegio } = require('../models');

// 🔓 Ruta pública para obtener todos los productos con imágenes, categoría y colegio
exports.getProductosPublicos = async (req, res) => {
  try {
    const productos = await Producto.findAll({
      include: [
        { model: Categoria },
        { model: Colegio },
        {
          model: Imagen,
          as: 'imagenes',
        },
      ],
    });
    res.json(productos);
  } catch (error) {
    console.error('Error al obtener productos públicos:', error);
    res.status(500).json({ error: 'Error al obtener productos públicos' });
  }
};

// 🔓 Ruta pública para obtener un producto por ID con imágenes, categoría y colegio
exports.getProductoPublicoById = async (req, res) => {
  const { id } = req.params;
  try {
    const producto = await Producto.findByPk(id, {
      include: [
        { model: Categoria },
        { model: Colegio },
        {
          model: Imagen,
          as: 'imagenes',
        },
      ],
    });

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(producto);
  } catch (error) {
    console.error('Error al obtener producto público por ID:', error);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
};

// 🔐 Obtener todos los productos con su categoría y colegio (usuarios y administradores)
exports.getProductos = async (req, res) => {
  try {
    const productos = await Producto.findAll({
      include: [
        { model: Categoria },
        { model: Colegio },
      ],
    });
    res.json(productos);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

// 🔐 Obtener un producto por ID (usuarios y administradores)
exports.getProductoById = async (req, res) => {
  const { id } = req.params;
  try {
    const producto = await Producto.findByPk(id, {
      include: [
        { model: Categoria },
        { model: Colegio },
        { model: Imagen, as: 'imagenes' },
      ],
    });
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(producto);
  } catch (error) {
    console.error('Error al obtener el producto:', error);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
};

// Crear un nuevo producto
exports.createProducto = async (req, res) => {
  const { nombre, descripcion, precio, stock, categoriaId, colegioId } = req.body;
  try {
    const nuevoProducto = await Producto.create({
      nombre,
      descripcion,
      precio,
      stock,
      categoriaId,
      colegioId,
    });
    res.status(201).json(nuevoProducto);
  } catch (error) {
    console.error('Error al crear el producto:', error);
    res.status(500).json({ error: 'Error al crear el producto' });
  }
};

// Actualizar un producto existente
exports.updateProducto = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, stock, categoriaId, colegioId } = req.body;
  try {
    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    producto.nombre = nombre;
    producto.descripcion = descripcion;
    producto.precio = precio;
    producto.stock = stock;
    producto.categoriaId = categoriaId;
    producto.colegioId = colegioId;
    await producto.save();
    res.json(producto);
  } catch (error) {
    console.error('Error al actualizar el producto:', error);
    res.status(500).json({ error: 'Error al actualizar el producto' });
  }
};

// Eliminar un producto
exports.deleteProducto = async (req, res) => {
  const { id } = req.params;
  try {
    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    await producto.destroy();
    res.json({ mensaje: 'Producto eliminado' });
  } catch (error) {
    console.error('Error al eliminar el producto:', error);
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
};
