import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Públicas
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

// Protegidas
router.use(authenticate);
router.post('/logout', authController.logout);
router.get('/me', authController.me);
router.patch('/me', authController.updateProfile);

export default router;
