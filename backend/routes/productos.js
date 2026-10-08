import { Router } from 'express';
import {
  actualizarProducto,
  crearProducto,
  eliminarProducto,
  listarProductos
} from '../controllers/productosController.js';
import { verificarAdmin } from '../middleware/verificarAdmin.js';
import { verificarGestorInventario } from '../middleware/verificarGestorInventario.js';

const router = Router();

// Lectura para el equipo operativo; solo admin y almacenista pueden modificar
// el catálogo. Cada escritura aplica la autorización en el servidor.
router.get('/', listarProductos);
router.post('/', verificarGestorInventario, crearProducto);
router.put('/:id', verificarGestorInventario, actualizarProducto);
router.delete('/:id', verificarAdmin, eliminarProducto);

export default router;
