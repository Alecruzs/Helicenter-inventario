import { Router } from 'express';
import {
  actualizarProducto,
  crearProducto,
  eliminarProducto,
  listarProductos
} from '../controllers/productosController.js';
import { verificarAdmin } from '../middleware/verificarAdmin.js';

const router = Router();

// Lectura para el equipo operativo; el mantenimiento del catálogo queda reservado
// al rol administrador en cada operación de escritura.
router.get('/', listarProductos);
router.post('/', verificarAdmin, crearProducto);
router.put('/:id', verificarAdmin, actualizarProducto);
router.delete('/:id', verificarAdmin, eliminarProducto);

export default router;
