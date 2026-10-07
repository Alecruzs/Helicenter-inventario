import { Movimiento, Producto, sequelize } from '../models/index.js';

/** Devuelve el historial más reciente primero e incluye el nombre del producto. */
export async function listarMovimientos(req, res) {
  try {
    const movimientos = await Movimiento.findAll({
      include: [{ model: Producto, as: 'producto' }],
      order: [['createdAt', 'DESC']]
    });

    return res.json(movimientos);
  } catch (error) {
    console.error('No se pudieron listar los movimientos:', error);
    return res.status(500).json({ error: 'No se pudieron listar los movimientos.' });
  }
}

function esEnteroPositivo(valor) {
  // Se admiten números JSON y cadenas numéricas no vacías, pero nunca decimales,
  // valores no seguros o cantidades nulas/negativas.
  return (
    (typeof valor === 'number' || (typeof valor === 'string' && valor.trim() !== '')) &&
    Number.isSafeInteger(Number(valor)) &&
    Number(valor) > 0
  );
}

function crearErrorHttp(status, message) {
  return Object.assign(new Error(message), { status });
}

/**
 * Registra el evento y recalcula stock dentro de una transacción única. El
 * bloqueo de fila serializa movimientos concurrentes sobre el mismo producto,
 * evitando salidas que sobrepasen la existencia disponible.
 */
export async function crearMovimiento(req, res) {
  const { productoId, tipo, cantidad, responsable_proveedor } = req.body ?? {};
  const idProducto = Number(productoId);

  if (
    !Number.isSafeInteger(idProducto) ||
    idProducto <= 0 ||
    !['ENTRADA', 'SALIDA'].includes(tipo) ||
    !esEnteroPositivo(cantidad) ||
    typeof responsable_proveedor !== 'string' ||
    responsable_proveedor.trim().length === 0 ||
    responsable_proveedor.trim().length > 255
  ) {
    return res.status(400).json({
      error: 'Envía productoId, tipo (ENTRADA o SALIDA), cantidad positiva y responsable_proveedor válidos.'
    });
  }

  try {
    // El callback confirma si todas las escrituras terminan; cualquier error
    // (incluido stock insuficiente) provoca rollback del movimiento y del stock.
    const resultado = await sequelize.transaction(async (transaction) => {
      const producto = await Producto.findByPk(idProducto, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!producto) {
        throw crearErrorHttp(404, 'El producto indicado no existe.');
      }

      const unidades = Number(cantidad);
      const nuevoStock =
        tipo === 'ENTRADA'
          ? producto.stock_actual + unidades
          : producto.stock_actual - unidades;

      if (!Number.isSafeInteger(nuevoStock)) {
        throw crearErrorHttp(400, 'El stock resultante excede el rango permitido.');
      }

      if (nuevoStock < 0) {
        throw crearErrorHttp(409, 'No hay stock suficiente para registrar esta salida.');
      }

      const movimiento = await Movimiento.create(
        {
          tipo,
          cantidad: unidades,
          responsable_proveedor: responsable_proveedor.trim(),
          producto_id: producto.id
        },
        { transaction }
      );

      await producto.update({ stock_actual: nuevoStock }, { transaction });

      return { movimiento, stock_actual: nuevoStock };
    });

    return res.status(201).json(resultado);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }

    console.error('No se pudo registrar el movimiento:', error);
    return res.status(500).json({ error: 'No se pudo registrar el movimiento.' });
  }
}
