/**
 * Permite cambios de inventario únicamente a administradores y almacenistas.
 * La sesión ya debe haber sido validada por requireAuth.
 */
export function verificarGestorInventario(req, res, next) {
  if (!['admin', 'almacenista'].includes(req.auth?.rol)) {
    return res.status(403).json({
      error: 'Permisos de administrador o almacenista requeridos.'
    });
  }

  return next();
}
