/**
 * Añade y normaliza columnas RBAC para esquemas existentes en una transacción.
 * Los registros sin nombre toman el correo y los roles desconocidos pasan a
 * empleado; si se indica un correo administrativo, se promueve esa cuenta.
 */
export async function migrateRbacSchema(sequelize, adminEmail) {
  const transaction = await sequelize.transaction();
  try {
    await sequelize.query(
      'ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "nombre" VARCHAR(255)',
      { transaction }
    );
    await sequelize.query(
      'UPDATE "usuarios" SET "nombre" = "email" WHERE "nombre" IS NULL OR btrim("nombre") = \'\'',
      { transaction }
    );
    await sequelize.query(
      'ALTER TABLE "usuarios" ALTER COLUMN "nombre" SET NOT NULL',
      { transaction }
    );
    await sequelize.query(
      'ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "rol" VARCHAR(32) DEFAULT \'empleado\'',
      { transaction }
    );
    await sequelize.query(
      'UPDATE "usuarios" SET "rol" = \'empleado\' WHERE "rol" IS NULL OR "rol" NOT IN (\'admin\', \'empleado\')',
      { transaction }
    );
    await sequelize.query(
      'ALTER TABLE "usuarios" ALTER COLUMN "rol" SET DEFAULT \'empleado\'',
      { transaction }
    );
    await sequelize.query(
      'ALTER TABLE "usuarios" ALTER COLUMN "rol" SET NOT NULL',
      { transaction }
    );

    if (adminEmail) {
      await sequelize.query(
        'UPDATE "usuarios" SET "rol" = \'admin\' WHERE lower("email") = :email',
        {
          replacements: { email: adminEmail.trim().toLowerCase() },
          transaction
        }
      );
    }

    // Confirma el conjunto completo de cambios; un fallo en cualquier ALTER o
    // UPDATE revierte también los pasos anteriores.
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
