import { Router } from 'express';
import authRoutes from './auth.js';
import categoriasRoutes from './categorias.js';
import productosRoutes from './productos.js';
import movimientosRoutes from './movimientos.js';
import usuariosRoutes from './usuarios.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// Login y logout quedan disponibles sin sesión previa. A partir de aquí todas
// las rutas funcionales requieren una identidad autenticada.
router.use(authRoutes);
router.use(requireAuth);
router.use('/categorias', categoriasRoutes);
router.use('/productos', productosRoutes);
router.use('/movimientos', movimientosRoutes);
router.use('/usuarios', usuariosRoutes);

export default router;
