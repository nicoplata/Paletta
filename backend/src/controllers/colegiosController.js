const { Colegio, Producto, Imagen } = require('../models');

// Obtener todos los colegios con sus productos e imágenes asociadas
exports.getColegios = async (req, res) => {
  try {
    const colegios = await Colegio.findAll({
      include: [
        { model: Producto },
        {
          model: Imagen,
          as: 'imagenes', // 👈 alias obligatorio
          where: { tipoEntidad: 'colegio' },
          required: false // permite que se incluyan colegios sin imagen
        }
      ]
    });
    res.json(colegios);
  } catch (error) {
    console.error('Error al obtener colegios:', error);
    res.status(500).json({ error: 'Error al obtener colegios' });
  }
};

// Obtener un colegio por ID
exports.getColegioById = async (req, res) => {
  const { id } = req.params;
  try {
    const colegio = await Colegio.findByPk(id, {
      include: [
        { model: Producto },
        {
          model: Imagen,
          as: 'imagenes', // 👈 alias obligatorio
          where: { tipoEntidad: 'colegio' },
          required: false
        }
      ]
    });
    if (!colegio) {
      return res.status(404).json({ error: 'Colegio no encontrado' });
    }
    res.json(colegio);
  } catch (error) {
    console.error('Error al obtener el colegio:', error);
    res.status(500).json({ error: 'Error al obtener el colegio' });
  }
};

// Crear un nuevo colegio
exports.createColegio = async (req, res) => {
  const { nombre, ciudad } = req.body;
  try {
    const nuevoColegio = await Colegio.create({ nombre, ciudad });
    res.status(201).json(nuevoColegio);
  } catch (error) {
    console.error('Error al crear el colegio:', error);
    res.status(500).json({ error: 'Error al crear el colegio' });
  }
};

// Actualizar un colegio existente
exports.updateColegio = async (req, res) => {
  const { id } = req.params;
  const { nombre, ciudad } = req.body;
  try {
    const colegio = await Colegio.findByPk(id);
    if (!colegio) {
      return res.status(404).json({ error: 'Colegio no encontrado' });
    }
    colegio.nombre = nombre;
    colegio.ciudad = ciudad;
    await colegio.save();
    res.json(colegio);
  } catch (error) {
    console.error('Error al actualizar el colegio:', error);
    res.status(500).json({ error: 'Error al actualizar el colegio' });
  }
};

// Eliminar un colegio
exports.deleteColegio = async (req, res) => {
  const { id } = req.params;
  try {
    const colegio = await Colegio.findByPk(id);
    if (!colegio) {
      return res.status(404).json({ error: 'Colegio no encontrado' });
    }
    await colegio.destroy();
    res.json({ mensaje: 'Colegio eliminado' });
  } catch (error) {
    console.error('Error al eliminar el colegio:', error);
    res.status(500).json({ error: 'Error al eliminar el colegio' });
  }
};

// Obtener productos asociados a un colegio específico
exports.getProductosPorColegio = async (req, res) => {
  const { id } = req.params;

  try {
    const colegio = await Colegio.findByPk(id, {
      include: [{ model: Producto }]
    });

    if (!colegio) {
      return res.status(404).json({ error: 'Colegio no encontrado' });
    }

    res.json(colegio.Productos);
  } catch (error) {
    console.error('Error al obtener productos por colegio:', error);
    res.status(500).json({ error: 'Error al obtener productos por colegio' });
  }
};
