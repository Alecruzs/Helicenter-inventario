import bcrypt from 'bcrypt';
import { Usuario } from '../models/index.js';

/** Devuelve datos de directorio sin seleccionar ni exponer hashes de contraseña. */
export async function listarUsuarios(req, res) {
  try {
    const usuarios = await Usuario.findAll({
      attributes: ['id', 'nombre', 'email', 'rol', 'createdAt'],
      order: [['id', 'ASC']]
    });

    return res.json(usuarios.map((usuario) => ({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      esActual: String(usuario.id) === req.auth.userId
    })));
  } catch (error) {
    console.error('No se pudieron listar los usuarios:', error);
    return res.status(500).json({ error: 'No se pudieron listar los usuarios.' });
  }
}

/**
 * Crea exclusivamente cuentas de empleado, normaliza el correo y almacena un
 * hash bcrypt. La creación no permite que el cliente se otorgue privilegios.
 */
export async function crearUsuario(req, res) {
  const { nombre, email, password } = req.body ?? {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (
    typeof nombre !== 'string' ||
    nombre.trim().length === 0 ||
    nombre.trim().length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    normalizedEmail.length > 254 ||
    typeof password !== 'string' ||
    password.length < 12 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).json({
      error: 'Envía un nombre, correo válido y una contraseña de al menos 12 caracteres compatible con bcrypt.'
    });
  }

  try {
    // El costo de bcrypt dificulta ataques offline; el límite de bytes previo
    // respeta el máximo de entrada que bcrypt procesa de forma efectiva.
    const passwordHash = await bcrypt.hash(password, 12);
    const usuario = await Usuario.create({
      nombre: nombre.trim(),
      email: normalizedEmail,
      password: passwordHash,
      rol: 'empleado'
    });

    return res.status(201).json({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo electrónico.' });
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: 'Los datos del usuario no son válidos.' });
    }

    console.error('No se pudo crear el usuario:', error);
    return res.status(500).json({ error: 'No se pudo crear el usuario.' });
  }
}

/** Elimina una cuenta distinta de la identidad autenticada que hizo la petición. */
export async function eliminarUsuario(req, res) {
  const usuarioId = Number(req.params.id);

  if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
    return res.status(400).json({ error: 'El id del usuario no es válido.' });
  }

  if (String(usuarioId) === req.auth.userId) {
    // Defensa en profundidad: la interfaz también oculta esta acción, pero la
    // regla se aplica en servidor porque el cliente no es una frontera segura.
    return res.status(403).json({ error: 'No puedes eliminar tu propia cuenta.' });
  }

  try {
    const eliminados = await Usuario.destroy({ where: { id: usuarioId } });
    if (eliminados === 0) {
      return res.status(404).json({ error: 'El usuario solicitado no existe.' });
    }

    return res.status(204).end();
  } catch (error) {
    console.error('No se pudo eliminar el usuario:', error);
    return res.status(500).json({ error: 'No se pudo eliminar el usuario.' });
  }
}
