const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Producto = sequelize.define('Producto', {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
    },
    precio: {
      // DECIMAL para dinero; Postgres lo devuelve como string, así que lo convertimos a número.
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      get() {
        const valor = this.getDataValue('precio');
        return valor === null || valor === undefined ? valor : Number(valor);
      },
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    categoriaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    colegioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    tableName: 'Productos',
  });

  Producto.associate = (models) => {
    Producto.belongsTo(models.Categoria, { foreignKey: 'categoriaId', as: 'categoria' });
    Producto.belongsTo(models.Colegio, { foreignKey: 'colegioId', as: 'colegio' });
    Producto.hasMany(models.Imagen, {
      foreignKey: 'entidadId',
      constraints: false,
      scope: { tipoEntidad: 'producto' },
      as: 'imagenes',
    });
  };

  return Producto;
};
