/**
 * Aplica la autorización RBAC después de requireAuth; no sustituye la validación
 * de identidad, sino que restringe la ruta al rol administrativo.
 */
export function verificarAdmin(req, res, next) {
  if (req.auth?.rol !== 'admin') {
    return res.status(403).json({ error: 'Permisos de administrador requeridos.' });
  }

  return next();
}
