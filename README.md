# Helicenter · Inventario

Aplicación web de gestión de inventario construida con Node.js, Express,
Sequelize, PostgreSQL y Bootstrap. Incluye autenticación por cookie JWT,
permisos por roles, catálogo de productos, movimientos transaccionales de
stock y un historial de operaciones.

## Requisitos

- Node.js 20 o posterior
- npm
- PostgreSQL

## Instalación

1. Instala las dependencias:

   ```powershell
   npm install
   ```

2. Crea tu archivo local de configuración copiando la plantilla:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Edita `.env` con los datos locales de PostgreSQL y credenciales seguras.
   No publiques este archivo ni reutilices credenciales de producción en
   entornos de desarrollo.

4. Crea la base de datos indicada por `DB_NAME` en PostgreSQL.

5. Prepara las tablas de usuarios, el rol de administrador y la regla que
   conserva el historial al borrar productos:

   ```powershell
   npm run migrate:rbac
   npm run seed:admin
   npm run migrate:inventory-integrity
   ```

   `ADMIN_EMAIL` y `ADMIN_PASSWORD` deben estar definidos en `.env`.
   La contraseña inicial debe tener al menos 12 caracteres. El script de
   administración no cambia la contraseña de una cuenta existente.

6. Inicia el servidor:

   ```powershell
   npm run dev
   ```

   Abre `http://localhost:4173/login`.

## Scripts disponibles

| Comando | Propósito |
| --- | --- |
| `npm run dev` | Inicia el servidor con reinicio automático para desarrollo. |
| `npm start` | Inicia el servidor en primer plano. |
| `npm run migrate:rbac` | Añade y completa los campos `nombre` y `rol` de usuarios existentes. |
| `npm run seed:admin` | Crea al administrador configurado o confirma su rol sin cambiar su contraseña. |
| `npm run migrate:inventory-integrity` | Impide borrar productos que tengan movimientos asociados. |

## Roles

- **Administrador:** puede mantener categorías y productos, y gestionar
  cuentas de empleados.
- **Empleado:** puede consultar el catálogo y registrar movimientos.

La interfaz adapta los controles al rol para facilitar su uso. La autorización
real se valida también en el servidor; ocultar un control en el navegador no
concede permisos.

## Configuración y seguridad

- `.env` contiene credenciales locales y está excluido de Git.
- Usa un `JWT_SECRET` aleatorio y de al menos 32 bytes.
- La cookie de autenticación es `HttpOnly`, `SameSite=Strict` y usa el atributo
  `Secure` en producción.
- Las contraseñas se guardan con bcrypt, nunca como texto plano.
- Para producción, configura HTTPS y credenciales exclusivas para ese entorno.
