import 'dotenv/config';
import { QueryTypes } from 'sequelize';
import sequelize from '../config/database.js';

// La consulta al catálogo permite que el script sea idempotente: identifica
// tanto instalaciones nuevas como restricciones generadas con nombres previos.
const tableAvailabilityQuery = `
  SELECT
    to_regclass('movimientos') IS NOT NULL AS movimientos_existe,
    to_regclass('productos') IS NOT NULL AS productos_existe
`;

const productMovementForeignKeysQuery = `
  SELECT
    constraint_row.conname AS nombre,
    constraint_row.confdeltype AS regla_borrado
  FROM pg_constraint AS constraint_row
  WHERE constraint_row.contype = 'f'
    AND constraint_row.conrelid = to_regclass('movimientos')
    AND constraint_row.confrelid = to_regclass('productos')
    AND constraint_row.conkey = ARRAY[
      (
        SELECT attribute.attnum
        FROM pg_attribute AS attribute
        WHERE attribute.attrelid = to_regclass('movimientos')
          AND attribute.attname = 'producto_id'
          AND NOT attribute.attisdropped
      )
    ]::smallint[]
`;

/**
 * Asegura que no se puedan borrar productos referenciados por movimientos.
 * Devuelve true si sustituyó restricciones y false si RESTRICT ya estaba activo.
 */
async function protegerHistorialDeProductos() {
  // Consulta de metadatos y modificación de la FK forman una única transacción,
  // evitando una ventana donde los movimientos puedan quedar sin protección.
  return sequelize.transaction(async (transaction) => {
    const [tables] = await sequelize.query(tableAvailabilityQuery, {
      type: QueryTypes.SELECT,
      transaction
    });

    if (!tables?.movimientos_existe || !tables?.productos_existe) {
      throw new Error(
        'No se encontraron las tablas movimientos y productos en el esquema actual.'
      );
    }

    const constraints = await sequelize.query(productMovementForeignKeysQuery, {
      type: QueryTypes.SELECT,
      transaction
    });

    if (
      constraints.length === 1 &&
      constraints[0].regla_borrado === 'r'
    ) {
      return false;
    }

    const queryInterface = sequelize.getQueryInterface();
    // Los identificadores de las restricciones pueden variar; quoteIdentifier
    // evita formar SQL inseguro al retirar las relaciones encontradas.
    for (const constraint of constraints) {
      const quotedName = queryInterface.quoteIdentifier(constraint.nombre);
      await sequelize.query(
        `ALTER TABLE "movimientos" DROP CONSTRAINT ${quotedName}`,
        { transaction }
      );
    }

    await sequelize.query(
      `ALTER TABLE "movimientos"
       ADD CONSTRAINT "movimientos_producto_id_fkey"
       FOREIGN KEY ("producto_id")
       REFERENCES "productos" ("id")
       ON UPDATE CASCADE
       ON DELETE RESTRICT`,
      { transaction }
    );

    return true;
  });
}

try {
  const actualizada = await protegerHistorialDeProductos();
  console.log(
    actualizada
      ? 'Integridad del historial aplicada: los productos con movimientos no se pueden eliminar.'
      : 'La restricción de integridad del historial ya estaba aplicada.'
  );
} catch (error) {
  console.error('No se pudo proteger el historial de inventario:', error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
