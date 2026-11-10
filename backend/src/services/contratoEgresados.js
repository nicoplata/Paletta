// Contrato de la promo: cláusulas editables desde el panel + datos de la promo para imprimirlo.
const { Configuracion } = require('../models');

const CLAVE = 'egresados.contrato';

const CLAUSULAS_BASE = `1. OBJETO. Paletta confecciona las prendas detalladas en este contrato para los alumnos del curso, con el diseño aprobado por la comisión.
2. PEDIDO INDIVIDUAL. Cada familia carga en Mi promo (egresados.paletta.com.ar/mi-promo) los datos del alumno, las prendas, los talles y el texto del bordado antes de la fecha de cierre. Después de esa fecha no se aceptan cambios, salvo acuerdo con Paletta.
3. PRECIOS Y PAGO. Los precios por prenda y los planes de pago son los indicados en este contrato. Cada familia elige su plan y paga sus cuotas en efectivo en el local o por transferencia, informando el comprobante en Mi promo. Las cuotas pagadas fuera de término pueden tener el recargo indicado.
4. DISEÑO. La comisión aprueba el diseño final desde Mi curso. Con el diseño aprobado y la carga completa comienza la producción; los cambios posteriores pueden modificar el precio y el plazo de entrega.
5. ENTREGA. La fecha de entrega es estimada y depende de que la carga de pedidos, la aprobación del diseño y el pago de la primera cuota se completen a tiempo. Las prendas se entregan a la comisión en el local o en el colegio, según se acuerde.
6. TALLES Y GARANTÍA. Los talles se eligen con la guía de talles de Paletta. Las prendas con fallas de confección se reparan o reemplazan sin cargo. Los cambios de talle quedan sujetos a disponibilidad y pueden tener costo.
7. DATOS PERSONALES. Los datos cargados se usan solo para producir y entregar el pedido y para la cobranza, según la política de privacidad publicada en egresados.paletta.com.ar.`;

async function clausulas() {
  const fila = await Configuracion.findByPk(CLAVE);
  return fila?.valor?.clausulas || CLAUSULAS_BASE;
}

async function guardarClausulas(texto) {
  await Configuracion.upsert({ clave: CLAVE, valor: { clausulas: texto } });
  return clausulas();
}

module.exports = { clausulas, guardarClausulas, CLAUSULAS_BASE };
