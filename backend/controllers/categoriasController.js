import { Categoria } from '../models/index.js';

/** Valida y normaliza el nombre antes de insertar una categoría nueva. */
export async function crearCategoria(req, res) {
  const { nombre } = req.body ?? {};

  if (typeof nombre !== 'string' || nombre.trim().length === 0 || nombre.trim().length > 255) {
    return res.status(400).json({
      error: 'El nombre de la categoría es obligatorio y no puede superar 255 caracteres.'
    });
  }

  try {
    const categoria = await Categoria.create({ nombre: nombre.trim() });
    return res.status(201).json(categoria);
  } catch (error) {
    console.error('No se pudo crear la categoría:', error);
    return res.status(500).json({ error: 'No se pudo crear la categoría.' });
  }
}

/** Ordena el catálogo establemente para llenar selectores y formularios. */
export async function listarCategorias(req, res) {
  try {
    const categorias = await Categoria.findAll({
      order: [['id', 'ASC']]
    });

    return res.json(categorias);
  } catch (error) {
    console.error('No se pudieron listar las categorías:', error);
    return res.status(500).json({ error: 'No se pudieron listar las categorías.' });
  }
}

/** Actualiza el nombre de una categoría existente. */
export async function actualizarCategoria(req, res) {
  const categoriaId = Number(req.params.id);
  const { nombre } = req.body ?? {};

  if (
    !Number.isSafeInteger(categoriaId) ||
    categoriaId <= 0 ||
    typeof nombre !== 'string' ||
    nombre.trim().length === 0 ||
    nombre.trim().length > 255
  ) {
    return res.status(400).json({
      error: 'Envía un id y un nombre de categoría válidos.'
    });
  }

  try {
    const categoria = await Categoria.findByPk(categoriaId);
    if (!categoria) {
      return res.status(404).json({ error: 'La categoría solicitada no existe.' });
    }

    await categoria.update({ nombre: nombre.trim() });
    return res.json(categoria);
  } catch (error) {
    console.error('No se pudo actualizar la categoría:', error);
    return res.status(500).json({ error: 'No se pudo actualizar la categoría.' });
  }
}

/** Conserva la integridad referencial al impedir bajas de categorías en uso. */
export async function eliminarCategoria(req, res) {
  const categoriaId = Number(req.params.id);

  if (!Number.isSafeInteger(categoriaId) || categoriaId <= 0) {
    return res.status(400).json({ error: 'El id de la categoría no es válido.' });
  }

  try {
    const eliminadas = await Categoria.destroy({ where: { id: categoriaId } });
    if (eliminadas === 0) {
      return res.status(404).json({ error: 'La categoría solicitada no existe.' });
    }

    return res.status(204).end();
  } catch (error) {
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        error: 'No se puede eliminar una categoría que tiene productos asociados.'
      });
    }

    console.error('No se pudo eliminar la categoría:', error);
    return res.status(500).json({ error: 'No se pudo eliminar la categoría.' });
  }
}
