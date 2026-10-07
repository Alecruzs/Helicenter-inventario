// Punto de entrada HTTP: prepara Express, sirve las vistas estáticas y concentra
// el formulario público de contacto. Las rutas de inventario pasan por la API;
// las vistas privadas se protegen por separado antes de enviar el HTML.
import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import apiRoutes from './backend/routes/api.js';
import { requireAuth } from './backend/middleware/requireAuth.js';

const app = express();
const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.join(projectRoot, 'frontend');
const viewsRoot = path.join(frontendRoot, 'views');
const port = process.env.PORT || 4173;

// Limita el tamaño de las solicitudes para evitar aceptar cuerpos innecesariamente
// grandes y convierte cookies/JSON antes de que los controladores los consuman.
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use('/api', apiRoutes);
// Las rutas protegidas se registran antes del middleware estático: así un acceso
// directo al HTML privado no puede saltarse el control de sesión.
app.get('/login', (req, res) => {
  res.sendFile(path.join(viewsRoot, 'login.html'));
});
app.get('/inventario', requireAuth, (req, res) => {
  res.sendFile(path.join(viewsRoot, 'inventario.html'));
});
app.get('/inventario.html', requireAuth, (req, res) => {
  res.sendFile(path.join(viewsRoot, 'inventario.html'));
});
app.get('/views/inventario.html', requireAuth, (req, res) => {
  res.sendFile(path.join(viewsRoot, 'inventario.html'));
});
app.use(express.static(frontendRoot));

/** Escapa caracteres de marcado para insertar datos de contacto en HTML seguro. */
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

app.post('/enviar-correo', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const company = String(req.body.company || '').trim();
  const email = String(req.body.email || '').trim();
  const countryCode = String(req.body.countryCode || '').trim();
  const phoneNumber = String(req.body.phone || '').trim();
  const phone = String(req.body.phoneFull || `${countryCode} ${phoneNumber}`).trim();
  const message = String(req.body.message || '').trim();
  // El mismo endpoint admite formularios tradicionales y clientes que esperan
  // JSON, sin reflejar el contenido enviado por el usuario en la respuesta.
  const redirectWithStatus = (status) => res.redirect(303, `/?contacto=${status}#contacto-formulario`);
  const respond = (status, ok, text) => {
    if (req.get('accept')?.includes('application/json')) {
      return res.status(status).json({ ok, message: text });
    }
    return redirectWithStatus(ok ? 'enviado' : 'error');
  };

  // Validación de formato y límites previa a SMTP; cada campo se normaliza a
  // texto para no confiar en tipos arbitrarios recibidos en el cuerpo.
  if (
    !name || name.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
    !company || company.length > 160 ||
    !/^\+\d{1,4}$/.test(countryCode) ||
    !phoneNumber || phoneNumber.replace(/\D/g, '').length < 7 || phoneNumber.replace(/\D/g, '').length > 15 ||
    phone.length > 40 ||
    !message || message.length > 5000
  ) {
    return respond(400, false, 'Completa todos los campos e ingresa un correo y teléfono válidos.');
  }

  const smtpHost = process.env.SMTP_HOST || 'mail.helicenter.com.ve';
  const smtpUser = process.env.SMTP_USER || 'web@helicenter.com.ve';
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  if (!smtpPass || !Number.isInteger(smtpPort) || smtpPort < 1) {
    console.error('Falta configurar SMTP_PASS o un SMTP_PORT válido.');
    return respond(503, false, 'El servicio de correo no está disponible. Inténtalo más tarde.');
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass }
  });

  try {
    await transporter.sendMail({
      from: `"Formulario Heli Center" <${smtpUser}>`,
      to: 'helicentersupport@gmail.com',
      replyTo: email,
      subject: 'Nueva consulta desde Helicenter',
      text: `Nombre: ${name}\nCompañía: ${company || 'No indicada'}\nCorreo: ${email}\nTeléfono: ${phone || 'No indicado'}\n\nMensaje:\n${message}`,
      // Los valores interpolados se escapan antes de generar HTML para que una
      // entrada con etiquetas no se convierta en contenido ejecutable del correo.
      html: `<h2>Nueva consulta desde Helicenter</h2><p><strong>Nombre:</strong> ${escapeHtml(name)}</p><p><strong>Compañía:</strong> ${escapeHtml(company || 'No indicada')}</p><p><strong>Correo:</strong> ${escapeHtml(email)}</p><p><strong>Teléfono:</strong> ${escapeHtml(phone || 'No indicado')}</p><p><strong>Mensaje:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`
    });
    return respond(200, true, 'Tu consulta fue enviada correctamente.');
  } catch (error) {
    console.error('No se pudo enviar el correo:', error.message);
    return respond(502, false, 'No se pudo enviar tu consulta. Inténtalo de nuevo más tarde.');
  }
});

app.get('/', (req, res) => {
  res.redirect(303, '/login');
});

// Escucha en todas las interfaces disponibles; el puerto puede inyectarse en el
// entorno de ejecución, con un valor local predeterminado para desarrollo.
app.listen(port, () => {
  console.log(`Helicenter disponible en http://localhost:${port}`);
});
