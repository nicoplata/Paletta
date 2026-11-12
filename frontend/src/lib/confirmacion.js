// Confirmación con contraseña para acciones sensibles.
// El backend responde 428 { requiereConfirmacion } → se pide la contraseña (modal del panel),
// se obtiene un permiso de 10 minutos y se reintenta la misma acción con el header X-Confirmacion.
let pedirPassword = null; // lo registra <ConfirmacionModal /> (null fuera del panel)
let permiso = null; // { token, vence }

export const registrarPedidoPassword = (fn) => { pedirPassword = fn; };
export const permisoVigente = () => (permiso && permiso.vence > Date.now() ? permiso.token : null);
export const guardarPermiso = (token, minutos) => { permiso = { token, vence: Date.now() + (minutos * 60 - 15) * 1000 }; };
export const olvidarPermiso = () => { permiso = null; };
export const pedirConfirmacion = (mensaje) => (pedirPassword ? pedirPassword(mensaje) : Promise.resolve(false));
