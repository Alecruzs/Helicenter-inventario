import jwt from 'jsonwebtoken';
import {
  AUTH_COOKIE_NAME,
  JWT_SECRET
} from '../config/auth.js';

/**
 * Verifica la cookie firmada antes de permitir el acceso a una ruta privada.
 * Además de validar la firma y expiración, restringe la forma y el rol del
 * payload para exponer a los controladores únicamente una identidad confiable.
 */
export function requireAuth(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    return denyRequest(req, res);
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    if (
      typeof payload !== 'object' ||
      typeof payload.sub !== 'string' ||
      !['admin', 'empleado', 'almacenista', 'mecanico'].includes(payload.rol)
    ) {
      return denyRequest(req, res);
    }

    req.auth = {
      userId: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : '',
      rol: payload.rol
    };
    return next();
  } catch {
    return denyRequest(req, res);
  }
}

/** Responde según el recurso solicitado cuando no hay sesión válida. */
function denyRequest(req, res) {
  // Las llamadas de API reciben un error legible por el cliente; las solicitudes
  // de páginas se redirigen al formulario de acceso.
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ error: 'Autenticación requerida.' });
  }

  return res.redirect(303, '/login');
}
