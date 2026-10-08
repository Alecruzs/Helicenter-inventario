import { Router } from 'express';
import {
  actualizarCategoria,
  crearCategoria,
  eliminarCategoria,
  listarCategorias
} from '../controllers/categoriasController.js';
import { verificarAdmin } from '../middleware/verificarAdmin.js';
import { verificarGestorInventario } from '../middleware/verificarGestorInventario.js';

const router = Router();

// La lectura está disponible para cualquier usuario autenticado; las escrituras
// requieren rol administrador o almacenista.
router.get('/', listarCategorias);
router.post('/', verificarGestorInventario, crearCategoria);
router.put('/:id', verificarGestorInventario, actualizarCategoria);
router.delete('/:id', verificarAdmin, eliminarCategoria);

export default router;
