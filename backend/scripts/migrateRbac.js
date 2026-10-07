import 'dotenv/config';
import { Usuario, sequelize } from '../models/index.js';
import { migrateRbacSchema } from './rbacSchema.js';

// Actualiza el esquema de usuarios y asigna el rol de administrador a la cuenta
// ya existente indicada por configuración; no crea cuentas ni toca contraseñas.
const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

try {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) || adminEmail.length > 254) {
    throw new Error('Configura un ADMIN_EMAIL válido en .env.');
  }

  await Usuario.sync();
  await migrateRbacSchema(sequelize, adminEmail);

  const admin = await Usuario.findOne({ where: { email: adminEmail } });
  if (!admin) {
    throw new Error('No se encontró el ADMIN_EMAIL configurado; ejecuta npm run seed:admin.');
  }

  console.log('Esquema RBAC actualizado y administrador asignado.');
} catch (error) {
  console.error('No se pudo aplicar la migración RBAC:', error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
