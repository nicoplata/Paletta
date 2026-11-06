// Backoffice de egresados: promos, prendas, alumnos (cargados por sus familias), prendas elegidas,
// cuotas y configuración general (cuenta para transferencias de egresados).
const timestamps = (S) => ({
  createdAt: { type: S.DATE, allowNull: false },
  updatedAt: { type: S.DATE, allowNull: false },
});

module.exports = {
  async up(qi, S) {
    await qi.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      const dinero = (extra = {}) => ({ type: S.DECIMAL(12, 2), ...extra });

      await qi.createTable('Configuraciones', {
        clave: { type: S.STRING(60), primaryKey: true },
        valor: { type: S.JSONB, allowNull: false, defaultValue: {} },
        ...timestamps(S),
      }, t);

      await qi.createTable('EgrPromos', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        slug: { type: S.STRING(24), allowNull: false, unique: true },
        colegio: { type: S.STRING, allowNull: false },
        curso: { type: S.STRING(60), allowNull: false },
        anio: { type: S.INTEGER, allowNull: false },
        planes: { type: S.JSONB, allowNull: false, defaultValue: [1, 3, 6] },
        descuentoContado: { type: S.DECIMAL(5, 2), allowNull: false, defaultValue: 10 },
        recargoTipo: { type: S.ENUM('porcentaje', 'monto') },
        recargoValor: dinero(),
        primerVencimiento: { type: S.DATEONLY, allowNull: false },
        fechaCierre: { type: S.DATEONLY },
        estadoProduccion: {
          type: S.ENUM('pendiente', 'en_produccion', 'listo', 'entregado'),
          allowNull: false,
          defaultValue: 'pendiente',
        },
        disenoAprobadoEl: { type: S.DATE },
        fechaEntrega: { type: S.DATEONLY },
        notas: { type: S.TEXT },
        activo: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(S),
      }, t);

      await qi.createTable('EgrPrendas', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        promoId: { type: S.INTEGER, allowNull: false, references: { model: 'EgrPromos', key: 'id' }, onDelete: 'CASCADE' },
        nombre: { type: S.STRING, allowNull: false },
        descripcion: { type: S.STRING(500) },
        precio: dinero({ allowNull: false }),
        talles: { type: S.JSONB, allowNull: false, defaultValue: [] },
        conBordado: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
        orden: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
        activo: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(S),
      }, t);
      await qi.addIndex('EgrPrendas', ['promoId'], t);

      await qi.createTable('EgrAlumnos', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        promoId: { type: S.INTEGER, allowNull: false, references: { model: 'EgrPromos', key: 'id' }, onDelete: 'CASCADE' },
        numero: { type: S.INTEGER, allowNull: false },
        nombre: { type: S.STRING(120), allowNull: false },
        dni: { type: S.STRING(8) },
        responsableNombre: { type: S.STRING(120) },
        responsableEmail: { type: S.STRING },
        responsableTelefono: { type: S.STRING(30) },
        plan: { type: S.INTEGER },
        ajuste: dinero({ allowNull: false, defaultValue: 0 }),
        ajusteMotivo: { type: S.STRING },
        agregadoPorFamilia: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
        ultimoIngreso: { type: S.DATE },
        ...timestamps(S),
      }, t);
      await qi.addIndex('EgrAlumnos', ['promoId', 'numero'], { unique: true, ...t });
      await qi.addIndex('EgrAlumnos', ['promoId', 'dni'], { unique: true, where: { dni: { [S.Op.ne]: null } }, ...t });
      await qi.addIndex('EgrAlumnos', ['dni'], t);

      await qi.createTable('EgrSelecciones', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        alumnoId: { type: S.INTEGER, allowNull: false, references: { model: 'EgrAlumnos', key: 'id' }, onDelete: 'CASCADE' },
        prendaId: { type: S.INTEGER, allowNull: false, references: { model: 'EgrPrendas', key: 'id' }, onDelete: 'RESTRICT' },
        talle: { type: S.STRING(12), allowNull: false },
        bordado: { type: S.STRING(24) },
        cantidad: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        precioUnitario: dinero({ allowNull: false }),
        ...timestamps(S),
      }, t);
      await qi.addIndex('EgrSelecciones', ['alumnoId'], t);
      await qi.sequelize.query('ALTER TABLE "EgrSelecciones" ADD CONSTRAINT "egr_sel_cantidad" CHECK ("cantidad" BETWEEN 1 AND 10);', t);

      await qi.createTable('EgrCuotas', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        alumnoId: { type: S.INTEGER, allowNull: false, references: { model: 'EgrAlumnos', key: 'id' }, onDelete: 'CASCADE' },
        numero: { type: S.INTEGER, allowNull: false },
        importe: dinero({ allowNull: false }),
        vencimiento: { type: S.DATEONLY, allowNull: false },
        estado: { type: S.ENUM('pendiente', 'pagada'), allowNull: false, defaultValue: 'pendiente' },
        pagadaEl: { type: S.DATEONLY },
        medio: { type: S.ENUM('efectivo', 'transferencia') },
        recargo: dinero({ allowNull: false, defaultValue: 0 }),
        nota: { type: S.STRING },
        ...timestamps(S),
      }, t);
      await qi.addIndex('EgrCuotas', ['alumnoId', 'numero'], { unique: true, ...t });
    });
  },

  async down(qi) {
    await qi.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      for (const tabla of ['EgrCuotas', 'EgrSelecciones', 'EgrAlumnos', 'EgrPrendas', 'EgrPromos', 'Configuraciones']) {
        await qi.dropTable(tabla, t);
      }
      for (const tipo of ['enum_EgrPromos_recargoTipo', 'enum_EgrPromos_estadoProduccion', 'enum_EgrCuotas_estado', 'enum_EgrCuotas_medio']) {
        await qi.sequelize.query(`DROP TYPE IF EXISTS "${tipo}";`, t);
      }
    });
  },
};
