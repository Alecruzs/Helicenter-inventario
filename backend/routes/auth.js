import { Router } from 'express';
import { login, logout } from '../controllers/authController.js';

const router = Router();

// Solo estas dos operaciones de sesión son públicas dentro del router de API.
router.post('/login', login);
router.post('/logout', logout);

export default router;
