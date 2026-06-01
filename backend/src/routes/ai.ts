import { Router } from 'express';
import { aiController } from '../controllers/aiController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate); // solo usuarios autenticados

router.post('/suggest-tasks', aiController.suggestTasks);

export default router;
