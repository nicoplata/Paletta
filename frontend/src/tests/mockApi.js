// Factory para vi.mock('../lib/api'): conserva mensajeError y TOKEN_KEY reales
// y reemplaza el cliente por funciones mock. No importa nada de la app (evita ciclos).
export default async function mockApi(importOriginal) {
  const real = await importOriginal();
  return {
    ...real,
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
}
