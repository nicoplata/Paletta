const { User } = require('../models');

const usuariosController = {
  obtenerUsuarios: async (req, res) => {
    try {
      console.log('Buscando usuarios...');
      const usuarios = await User.findAll({
        attributes: ['id', 'nombre', 'email', 'rol']
      });
      console.log('Usuarios encontrados:', usuarios.length);
      res.json(usuarios);
    } catch (error) {
      console.error('Error detallado:', error);
      res.status(500).json({ 
        error: 'Error al obtener usuarios',
        details: error.message 
      });
    }
  },

  obtenerUsuarioPorId: async (req, res) => {
    try {
      const usuario = await User.findByPk(req.params.id);
      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      res.json(usuario);
    } catch (error) {
      console.error('Error al obtener usuario por ID:', error);
      res.status(500).json({ error: 'Error al obtener usuario' });
    }
  },

  crearUsuario: async (req, res) => {
    try {
      const usuario = await User.create(req.body);
      res.status(201).json(usuario);
    } catch (error) {
      console.error('Error al crear usuario:', error);
      res.status(500).json({ error: 'Error al crear usuario' });
    }
  },

  actualizarUsuario: async (req, res) => {
    try {
      const { nombre, email, rol } = req.body;
      const usuario = await User.findByPk(req.params.id);
      
      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      await usuario.update({ nombre, email, rol });
      res.json(usuario);
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  },

  eliminarUsuario: async (req, res) => {
    try {
      const { id } = req.params;
      const usuario = await User.findByPk(id);
      
      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      await usuario.destroy();
      res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      res.status(500).json({ error: 'Error al eliminar usuario' });
    }
  }
};

module.exports = usuariosController;
module.exports = usuariosController;
