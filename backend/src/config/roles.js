const ROLES = {
  ADMIN: 'admin',
  USUARIO: 'usuario',
};

const PERMISOS = {
  [ROLES.ADMIN]: [
    'ver_productos',
    'crear_productos',
    'editar_productos',
    'eliminar_productos',
    'ver_categorias',
    'crear_categorias',
    'editar_categorias',
    'eliminar_categorias',
    'ver_colegios',
    'crear_colegios',
    'editar_colegios',
    'eliminar_colegios',
    'ver_pedidos',
    'gestionar_pedidos',
    'ver_reportes',
    'descargar_reportes',
    'ver_usuarios',
    'crear_usuarios',
    'editar_usuarios',
    'eliminar_usuarios',
    'gestionar_perfiles',
    'subir_imagenes',
    'ver_imagenes',
    'eliminar_imagenes',

  ],
  [ROLES.USUARIO]: [
    'ver_productos',
    'crear_productos',
    'editar_productos',
    'eliminar_productos',
    'ver_categorias',
    'crear_categorias',
    'editar_categorias',
    'eliminar_categorias',
    'ver_colegios',
    'crear_colegios',
    'editar_colegios',
    'eliminar_colegios',
    'ver_pedidos',
    'gestionar_pedidos',
    'ver_reportes',
    'descargar_reportes',
    'subir_imagenes',
    'ver_imagenes',
    'eliminar_imagenes',

  ],
};

module.exports = {
  ROLES,
  PERMISOS,
};
