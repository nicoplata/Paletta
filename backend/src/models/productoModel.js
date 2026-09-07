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
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    categoriaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Categorias',
        key: 'id',
      },
    },
    colegioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Colegios',
        key: 'id',
      },
    },
  }, {
    timestamps: true,
    tableName: 'Productos',
  });

  Producto.associate = (models) => {
    Producto.belongsTo(models.Categoria, {
      foreignKey: 'categoriaId',
      as: 'categoria',
    });

    Producto.belongsTo(models.Colegio, {
      foreignKey: 'colegioId',
      as: 'colegio',
    });

    Producto.hasMany(models.Imagen, {
      foreignKey: 'entidadId',
      constraints: false,
      scope: {
        tipoEntidad: 'producto',
      },
      as: 'imagenes',
    });
  };

  return Producto;
};
