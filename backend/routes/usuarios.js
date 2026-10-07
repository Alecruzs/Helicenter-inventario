import { Router } from 'express';
import {
  crearUsuario,
  eliminarUsuario,
  listarUsuarios
} from '../controllers/usuariosController.js';
import { verificarAdmin } from '../middleware/verificarAdmin.js';

const router = Router();

// Se aplica la autorización a toda la colección para que listado, creación y
// eliminación compartan una sola política de acceso, sin rutas olvidadas.
router.use(verificarAdmin);
router.get('/', listarUsuarios);
router.post('/', crearUsuario);
router.delete('/:id', eliminarUsuario);

export default router;
