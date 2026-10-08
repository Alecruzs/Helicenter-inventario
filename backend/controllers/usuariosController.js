import bcrypt from 'bcrypt';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Usuario } from '../models/index.js';

function escaparHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

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
 * Crea una cuenta con rol permitido, normaliza el correo,
 * genera una contraseña temporal segura, almacena un hash bcrypt
 * y notifica al usuario por correo electrónico.
 */
export async function crearUsuario(req, res) {
  const { nombre, email, rol } = req.body ?? {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!['admin', 'almacenista', 'mecanico'].includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }

  if (
    typeof nombre !== 'string' ||
    nombre.trim().length === 0 ||
    nombre.trim().length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    normalizedEmail.length > 254
  ) {
    return res.status(400).json({
      error: 'Envía un nombre y correo electrónico válidos.'
    });
  }

  const smtpHost = process.env.SMTP_HOST || 'mail.helicenter.com.ve';
  const smtpUser = process.env.SMTP_USER || 'web@helicenter.com.ve';
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  if (!smtpPass || !Number.isInteger(smtpPort) || smtpPort < 1) {
    console.error('Falta configurar SMTP_PASS o un SMTP_PORT válido para crear usuarios.');
    return res.status(503).json({
      error: 'El servicio de correo no está disponible; no se creó el usuario.'
    });
  }

  try {
    const passwordTemporal = crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(passwordTemporal, 12);
    const usuario = await Usuario.create({
      nombre: nombre.trim(),
      email: normalizedEmail,
      password: passwordHash,
      rol
    });

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE === 'true'
        : smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass }
    });

    try {
      await transporter.sendMail({
        from: `"Sistema Helicenter" <${smtpUser}>`,
        to: normalizedEmail,
        subject: 'Tu cuenta en Helicenter ha sido creada',
        text: `Bienvenido a Helicenter, ${usuario.nombre}.\nUsuario: ${usuario.email}\nContraseña temporal: ${passwordTemporal}\n\nPor seguridad, no compartas estas credenciales.`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto;">
            <h2 style="color: #0d6efd;">Bienvenido a Helicenter, ${escaparHtml(usuario.nombre)}</h2>
            <p>Tu cuenta de acceso al sistema de inventario ha sido creada exitosamente.</p>
            <p>A continuación, tus credenciales de acceso:</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Usuario:</strong> ${escaparHtml(usuario.email)}</p>
              <p style="margin: 5px 0;"><strong>Contraseña Temporal:</strong> ${passwordTemporal}</p>
            </div>
            <p><i>Nota: Esta es una contraseña generada automáticamente por el sistema. Por seguridad, no la compartas con nadie.</i></p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Error al enviar el correo con Nodemailer:', emailError);
      try {
        await usuario.destroy();
      } catch (cleanupError) {
        console.error('No se pudo eliminar la cuenta cuyo correo de acceso falló:', cleanupError);
        return res.status(500).json({
          error: 'Falló el correo y no se pudo revertir la creación de la cuenta.'
        });
      }

      return res.status(502).json({
        error: 'No se pudo enviar el correo; no se creó el usuario.'
      });
    }

    return res.status(201).json({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      mensaje: 'Usuario creado y correo enviado con éxito.'
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