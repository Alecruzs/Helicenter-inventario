import { Router } from 'express';
import {
  crearCategoria,
  listarCategorias
} from '../controllers/categoriasController.js';
import { verificarAdmin } from '../middleware/verificarAdmin.js';

const router = Router();

// La lectura alimenta los selectores para cualquier usuario autenticado; solo
// un administrador puede ampliar el catálogo de categorías.
// La creación está separada por rol, aunque lectura y escritura compartan recurso.
router.get('/', listarCategorias);
router.post('/', verificarAdmin, crearCategoria);

export default router;
