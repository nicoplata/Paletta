import { describe, expect, it } from 'vitest';
import { diasHasta, fecha, formatearDni, nombrePlan, previsualizarPlan } from '../portal/utils';

describe('Portal de egresados: utilidades', () => {
  it('previsualiza los planes igual que el servidor', () => {
    expect(previsualizarPlan(90000, 3, 10)).toEqual({ total: 90000, descuento: 0, cuota: 30000, ultima: 30000 });
    expect(previsualizarPlan(90000, 1, 10)).toEqual({ total: 81000, descuento: 9000, cuota: 81000, ultima: 81000 });
    expect(previsualizarPlan(100000, 6, 10)).toMatchObject({ cuota: 16666, ultima: 16670 });
  });

  it('formatea fechas, DNI y planes', () => {
    expect(fecha('2027-03-10')).toBe('10/03/2027');
    expect(formatearDni('45123456')).toBe('45.123.456');
    expect(formatearDni('7123456')).toBe('7.123.456');
    expect(nombrePlan(1, 10)).toBe('Contado en efectivo (10% off)');
    expect(nombrePlan(6, 10)).toBe('6 cuotas');
  });

  it('cuenta los días hasta una fecha', () => {
    const hoy = new Date(2027, 2, 1);
    expect(diasHasta('2027-03-10', hoy)).toBe(9);
    expect(diasHasta('2027-02-28', hoy)).toBe(-1);
    expect(diasHasta(null, hoy)).toBeNull();
  });
});
