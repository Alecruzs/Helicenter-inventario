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
