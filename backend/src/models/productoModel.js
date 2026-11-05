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
    Producto.hasMany(models.Variante, { foreignKey: 'productoId', as: 'variantes' });
    Producto.hasMany(models.Imagen, {
      foreignKey: 'entidadId',
      constraints: false,
      scope: { tipoEntidad: 'producto' },
      as: 'imagenes',
    });
  };

  // Expone "stock" como la suma de las variantes activas (cuando vienen incluidas).
  Producto.prototype.toJSON = function () {
    const valores = { ...this.get({ plain: true }) };
    if (Array.isArray(valores.variantes)) {
      valores.stock = valores.variantes.filter((v) => v.activo).reduce((acc, v) => acc + v.stock, 0);
    }
    return valores;
  };

  return Producto;
};
