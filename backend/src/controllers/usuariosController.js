const { User } = require('../models');
const { AppError } = require('../utils/errorHandler');

const contarAdmins = () => User.count({ where: { rol: 'administrador' } });

exports.obtenerUsuarios = async (req, res) => {
  const usuarios = await User.findAll({ order: [['nombre', 'ASC']] });
  res.json(usuarios);
};

exports.obtenerUsuarioPorId = async (req, res) => {
  const usuario = await User.findByPk(req.params.id);
  if (!usuario) throw new AppError('Usuario no encontrado', 404);
  res.json(usuario);
};

exports.crearUsuario = async (req, res) => {
  const usuario = await User.create(req.body);
  res.status(201).json(usuario);
};

exports.actualizarUsuario = async (req, res) => {
  const usuario = await User.findByPk(req.params.id);
  if (!usuario) throw new AppError('Usuario no encontrado', 404);

  const datos = { ...req.body };
  if (!datos.password) delete datos.password;

  if (usuario.rol === 'administrador' && datos.rol && datos.rol !== 'administrador') {
    if (usuario.id === req.usuario.id) throw new AppError('No podés quitarte el rol de administrador', 400);
    if ((await contarAdmins()) <= 1) throw new AppError('Debe quedar al menos un administrador', 400);
  }

  await usuario.update(datos);
  res.json(usuario);
};

exports.eliminarUsuario = async (req, res) => {
  const usuario = await User.findByPk(req.params.id);
  if (!usuario) throw new AppError('Usuario no encontrado', 404);
  if (usuario.id === req.usuario.id) throw new AppError('No podés eliminar tu propio usuario', 400);
  if (usuario.rol === 'administrador' && (await contarAdmins()) <= 1) {
    throw new AppError('Debe quedar al menos un administrador', 400);
  }
  await usuario.destroy();
  res.json({ mensaje: 'Usuario eliminado' });
};
