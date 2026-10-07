import 'dotenv/config';
import bcrypt from 'bcrypt';
import { Usuario, sequelize } from '../models/index.js';
import { migrateRbacSchema } from './rbacSchema.js';

// Crea la cuenta administrativa inicial o promueve la existente. La ruta
// idempotente preserva la contraseña cuando el usuario ya estaba registrado.
const email = (process.env.ADMIN_EMAIL || 'admin@helicenter.com').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password || password.length < 12) {
  console.error(
    'Configura un ADMIN_EMAIL válido y un ADMIN_PASSWORD de al menos 12 caracteres en .env.'
  );
  process.exitCode = 1;
} else {
  try {
    await Usuario.sync();
    await migrateRbacSchema(sequelize, email);

    const existingUser = await Usuario.findOne({ where: { email } });
    if (existingUser) {
      await existingUser.update({ rol: 'admin' });
      console.log(`El usuario administrador "${email}" ya existe; se confirmó el rol admin sin cambiar su contraseña.`);
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
      await Usuario.create({
        nombre: 'Administrador',
        email,
        password: passwordHash,
        rol: 'admin'
      });
      console.log(`Usuario administrador "${email}" creado.`);
    }
  } catch (error) {
    console.error('No se pudo crear el usuario administrador:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}
