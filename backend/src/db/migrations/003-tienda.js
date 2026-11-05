// Fase 2 (tienda): variantes por talle con stock propio, pedidos e ítems.
// El stock existente de cada producto pasa a una variante "Único".
const timestamps = (S) => ({
  createdAt: { type: S.DATE, allowNull: false },
  updatedAt: { type: S.DATE, allowNull: false },
});

module.exports = {
  async up(qi, S) {
    await qi.sequelize.transaction(async (transaction) => {
      const t = { transaction };

      await qi.createTable('Variantes', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        productoId: {
          type: S.INTEGER, allowNull: false,
          references: { model: 'Productos', key: 'id' }, onDelete: 'CASCADE',
        },
        talle: { type: S.STRING(30), allowNull: false },
        stock: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
        orden: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
        activo: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(S),
      }, t);
      await qi.sequelize.query(
        'ALTER TABLE "Variantes" ADD CONSTRAINT "variantes_stock_no_negativo" CHECK ("stock" >= 0);', t
      );
      await qi.addIndex('Variantes', ['productoId', 'talle'], { unique: true, name: 'variantes_producto_talle', ...t });

      await qi.sequelize.query(
        `INSERT INTO "Variantes" ("productoId", "talle", "stock", "orden", "activo", "createdAt", "updatedAt")
         SELECT "id", 'Único', GREATEST("stock", 0), 0, true, NOW(), NOW() FROM "Productos";`, t
      );
      await qi.removeColumn('Productos', 'stock', t);

      await qi.createTable('Pedidos', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        token: { type: S.UUID, allowNull: false, unique: true },
        estado: {
          type: S.ENUM('pendiente_pago', 'pagado', 'en_preparacion', 'listo_para_retirar', 'enviado', 'entregado', 'cancelado'),
          allowNull: false, defaultValue: 'pendiente_pago',
        },
        nombre: { type: S.STRING, allowNull: false },
        email: { type: S.STRING, allowNull: false },
        telefono: { type: S.STRING, allowNull: false },
        dni: { type: S.STRING },
        tipoEntrega: { type: S.ENUM('retiro', 'envio'), allowNull: false },
        direccion: { type: S.STRING },
        ciudad: { type: S.STRING },
        provincia: { type: S.STRING },
        codigoPostal: { type: S.STRING },
        notas: { type: S.TEXT },
        notasInternas: { type: S.TEXT },
        subtotal: { type: S.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        costoEnvio: { type: S.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        total: { type: S.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        metodoPago: { type: S.ENUM('mercadopago', 'transferencia'), allowNull: false },
        mpPreferenceId: { type: S.STRING },
        mpPaymentId: { type: S.STRING, unique: true },
        mpEstado: { type: S.STRING },
        venceAt: { type: S.DATE },
        pagadoAt: { type: S.DATE },
        canceladoAt: { type: S.DATE },
        motivoCancelacion: { type: S.STRING },
        ...timestamps(S),
      }, t);
      await qi.addIndex('Pedidos', ['estado', 'venceAt'], { name: 'pedidos_estado_vence', ...t });
      await qi.addIndex('Pedidos', ['createdAt'], { name: 'pedidos_creado', ...t });

      await qi.createTable('PedidoItems', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        pedidoId: {
          type: S.INTEGER, allowNull: false,
          references: { model: 'Pedidos', key: 'id' }, onDelete: 'CASCADE',
        },
        // Sin FK estricta: si se borra el producto, el pedido conserva la foto del ítem
        productoId: { type: S.INTEGER },
        varianteId: { type: S.INTEGER },
        nombreProducto: { type: S.STRING, allowNull: false },
        colegio: { type: S.STRING },
        talle: { type: S.STRING(30), allowNull: false },
        cantidad: { type: S.INTEGER, allowNull: false },
        precioUnitario: { type: S.DECIMAL(12, 2), allowNull: false },
        subtotal: { type: S.DECIMAL(12, 2), allowNull: false },
        ...timestamps(S),
      }, t);
      await qi.addIndex('PedidoItems', ['pedidoId'], { name: 'pedido_items_pedido', ...t });
    });
  },

  async down(qi, S) {
    await qi.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      await qi.dropTable('PedidoItems', t);
      await qi.dropTable('Pedidos', t);
      await qi.sequelize.query('DROP TYPE IF EXISTS "enum_Pedidos_estado"; DROP TYPE IF EXISTS "enum_Pedidos_tipoEntrega"; DROP TYPE IF EXISTS "enum_Pedidos_metodoPago";', t);
      await qi.addColumn('Productos', 'stock', { type: S.INTEGER, allowNull: false, defaultValue: 0 }, t);
      await qi.sequelize.query(
        `UPDATE "Productos" p SET "stock" = COALESCE((SELECT SUM(v."stock") FROM "Variantes" v WHERE v."productoId" = p."id"), 0);`, t
      );
      await qi.dropTable('Variantes', t);
    });
  },
};
