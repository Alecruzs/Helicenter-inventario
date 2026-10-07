import 'dotenv/config';

// El secreto se valida al arrancar para impedir que la aplicación emita o acepte
// tokens con una clave ausente o demasiado corta para firmar credenciales.
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || Buffer.byteLength(jwtSecret, 'utf8') < 32) {
  throw new Error('JWT_SECRET debe estar configurado y tener al menos 32 bytes aleatorios.');
}

export const AUTH_COOKIE_NAME = 'auth_token';
export const AUTH_TOKEN_TTL_SECONDS = 8 * 60 * 60;
// La cookie no es legible desde JavaScript, limita el envío entre sitios y solo
// usa Secure al operar sobre HTTPS en producción. Las opciones de borrado deben
// conservar atributos de ámbito para eliminar exactamente la misma cookie.
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: AUTH_TOKEN_TTL_SECONDS * 1000
};
export const AUTH_COOKIE_CLEAR_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/'
};
export const JWT_SECRET = jwtSecret;
