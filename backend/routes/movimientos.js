import { Router } from 'express';
import {
  crearMovimiento,
  listarMovimientos
} from '../controllers/movimientosController.js';

const router = Router();

// El personal autenticado puede consultar el historial y registrar operaciones;
// la consistencia del saldo se resuelve en el controlador transaccional.
// Ambas rutas requieren sesión por el montaje en api.js; solo el POST modifica
// existencias y delega su consistencia al controlador.
router.get('/', listarMovimientos);
router.post('/', crearMovimiento);

export default router;
