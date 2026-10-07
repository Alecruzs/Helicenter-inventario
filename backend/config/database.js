import 'dotenv/config';
import { Sequelize } from 'sequelize';

// Las cuatro variables obligatorias separan credenciales/configuración de la
// aplicación. Se falla temprano en vez de iniciar con una conexión incompleta.
const requiredEnvironmentVariables = ['DB_NAME', 'DB_USER', 'DB_PASS', 'DB_HOST'];
const missingEnvironmentVariables = requiredEnvironmentVariables.filter(
  (variable) => !process.env[variable]
);

if (missingEnvironmentVariables.length > 0) {
  throw new Error(
    `Faltan variables de entorno para PostgreSQL: ${missingEnvironmentVariables.join(', ')}`
  );
}

// PostgreSQL es el motor esperado por las migraciones y por las restricciones
// referenciales que protegen el historial de inventario.
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres'
  }
);

export default sequelize;
