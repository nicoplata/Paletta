const { Imagen } = require('../models');
const path = require('path');
const fs = require('fs');

exports.subirImagen = async (req, res) => {
  const { tipoEntidad, entidadId, descripcion } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ninguna imagen' });
  }

  try {
    const nuevaImagen = await Imagen.create({
      url: `/uploads/${req.file.filename}`,
      descripcion,
      tipoEntidad,
      entidadId,
    });

    res.status(201).json(nuevaImagen);
  } catch (error) {
    console.error('Error al subir imagen:', error);
    res.status(500).json({ error: 'Error al subir imagen' });
  }
};

exports.getImagenesPorProducto = async (req, res) => {
  const { productoId } = req.params;

  try {
    const imagenes = await Imagen.findAll({ where: { entidadId: productoId, tipoEntidad: 'producto' } });
    res.json(imagenes);
  } catch (error) {
    console.error('Error al obtener imágenes:', error);
    res.status(500).json({ error: 'Error al obtener imágenes' });
  }
};

exports.eliminarImagen = async (req, res) => {
  const { imagenId } = req.params;
  
  try {
    const imagen = await Imagen.findByPk(imagenId);
    
    if (!imagen) {
      return res.status(404).json({
        success: false,
        error: 'Imagen no encontrada'
      });
    }

    const filePath = path.join(__dirname, '../../public', imagen.url);
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileError) {
      console.error('Error al eliminar archivo:', fileError);
    }

    await imagen.destroy();

    return res.json({
      success: true,
      message: 'Imagen eliminada correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al eliminar la imagen'
    });
  }
};