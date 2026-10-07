import { Categoria, Producto } from '../models/index.js';

// Se conserva una validación estricta de enteros para que los stocks no puedan
// contener fracciones, NaN ni valores fuera del rango seguro de JavaScript.
function esEnteroNoNegativo(valor) {
  return (
    (typeof valor === 'number' || (typeof valor === 'string' && valor.trim() !== '')) &&
    Number.isSafeInteger(Number(valor)) &&
    Number(valor) >= 0
  );
}

/** Lista el catálogo con la categoría asociada para la tabla de inventario. */
export async function listarProductos(req, res) {
  try {
    const productos = await Producto.findAll({
      include: [{ model: Categoria, as: 'categoria' }],
      order: [['id', 'ASC']]
    });

    return res.json(productos);
  } catch (error) {
    console.error('No se pudieron listar los productos:', error);
    return res.status(500).json({ error: 'No se pudieron listar los productos.' });
  }
}

/** Crea un producto; la existencia inicial puede omitirse y parte de cero. */
export async function crearProducto(req, res) {
  const { nombre, stock_actual, stock_minimo, categoria_id } = req.body ?? {};
  const categoriaId = Number(categoria_id);

  if (
    typeof nombre !== 'string' ||
    nombre.trim().length === 0 ||
    nombre.trim().length > 255 ||
    !esEnteroNoNegativo(stock_minimo) ||
    (stock_actual !== undefined && !esEnteroNoNegativo(stock_actual)) ||
    !Number.isSafeInteger(categoriaId) ||
    categoriaId <= 0
  ) {
    return res.status(400).json({
      error: 'Envía nombre, stock_minimo y categoria_id válidos; stock_actual es opcional.'
    });
  }

  try {
    const producto = await Producto.create({
      nombre: nombre.trim(),
      stock_minimo: Number(stock_minimo),
      ...(stock_actual !== undefined && { stock_actual: Number(stock_actual) }),
      categoria_id: categoriaId
    });

    const productoConCategoria = await Producto.findByPk(producto.id, {
      include: [{ model: Categoria, as: 'categoria' }]
    });

    return res.status(201).json(productoConCategoria);
  } catch (error) {
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ error: 'La categoría indicada no existe.' });
    }

    console.error('No se pudo crear el producto:', error);
    return res.status(500).json({ error: 'No se pudo crear el producto.' });
  }
}

/**
 * Actualiza únicamente datos descriptivos y el umbral. El stock no se edita aquí:
 * sus variaciones se registran como movimientos para conservar trazabilidad.
 */
export async function actualizarProducto(req, res) {
  const productoId = Number(req.params.id);
  const { nombre, stock_minimo, categoria_id } = req.body ?? {};
  const categoriaId = Number(categoria_id);

  if (
    !Number.isSafeInteger(productoId) ||
    productoId <= 0 ||
    typeof nombre !== 'string' ||
    nombre.trim().length === 0 ||
    nombre.trim().length > 255 ||
    !esEnteroNoNegativo(stock_minimo) ||
    !Number.isSafeInteger(categoriaId) ||
    categoriaId <= 0
  ) {
    return res.status(400).json({
      error: 'Envía un id, nombre, stock_minimo y categoria_id válidos.'
    });
  }

  try {
    const producto = await Producto.findByPk(productoId);
    if (!producto) {
      return res.status(404).json({ error: 'El producto solicitado no existe.' });
    }

    await producto.update({
      nombre: nombre.trim(),
      stock_minimo: Number(stock_minimo),
      categoria_id: categoriaId
    });

    const productoActualizado = await Producto.findByPk(productoId, {
      include: [{ model: Categoria, as: 'categoria' }]
    });

    return res.json(productoActualizado);
  } catch (error) {
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ error: 'La categoría indicada no existe.' });
    }

    console.error('No se pudo actualizar el producto:', error);
    return res.status(500).json({ error: 'No se pudo actualizar el producto.' });
  }
}

/**
 * Elimina solo productos sin movimientos asociados; la FK RESTRICT es la última
 * defensa ante una carrera entre la consulta de interfaz y la eliminación.
 */
export async function eliminarProducto(req, res) {
  const productoId = Number(req.params.id);

  if (!Number.isSafeInteger(productoId) || productoId <= 0) {
    return res.status(400).json({ error: 'El id del producto no es válido.' });
  }

  try {
    const eliminados = await Producto.destroy({ where: { id: productoId } });
    if (eliminados === 0) {
      return res.status(404).json({ error: 'El producto solicitado no existe.' });
    }

    return res.status(204).end();
  } catch (error) {
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      // La clave foránea RESTRICT protege la trazabilidad: una eliminación no
      // debe borrar ni dejar huérfano el historial asociado.
      return res.status(400).json({
        error: 'No se puede eliminar un producto que ya tiene historial de movimientos'
      });
    }

    console.error('No se pudo eliminar el producto:', error);
    return res.status(500).json({ error: 'No se pudo eliminar el producto.' });
  }
}
