import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Usuario } from '../models/index.js';
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_CLEAR_OPTIONS,
  AUTH_COOKIE_OPTIONS,
  AUTH_TOKEN_TTL_SECONDS,
  JWT_SECRET
} from '../config/auth.js';

/**
 * Autentica por correo normalizado, compara el hash de contraseña y establece
 * una cookie firmada. Los datos de entrada se validan antes de consultar la BD.
 */
export async function login(req, res) {
  const { email, password } = req.body ?? {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    normalizedEmail.length > 254 ||
    typeof password !== 'string' ||
    password.length === 0
  ) {
    return res.status(400).json({ error: 'Correo electrónico y contraseña válidos son obligatorios.' });
  }

  try {
    const user = await Usuario.findOne({
      where: { email: normalizedEmail }
    });
    const passwordMatches = user
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!user || !passwordMatches) {
      return res.status(401).json({ error: 'Correo electrónico o contraseña incorrectos.' });
    }

    const token = jwt.sign(
      { email: user.email, rol: user.rol },
      JWT_SECRET,
      {
        subject: String(user.id),
        expiresIn: AUTH_TOKEN_TTL_SECONDS
      }
    );

    res.cookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);
    return res.json({ ok: true, email: user.email, rol: user.rol });
  } catch (error) {
    console.error('No se pudo iniciar sesión:', error);
    return res.status(500).json({ error: 'No se pudo iniciar sesión.' });
  }
}

/** Finaliza la sesión borrando la cookie con el mismo ámbito con que se creó. */
export function logout(req, res) {
  // La cookie se invalida usando las mismas opciones de ámbito con que se creó.
  res.clearCookie(AUTH_COOKIE_NAME, AUTH_COOKIE_CLEAR_OPTIONS);
  return res.json({ ok: true, message: 'Sesión cerrada correctamente.' });
}
