import { Router } from 'express';
import { metricsController } from '../controllers/metricsController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/dashboard', metricsController.getDashboard);
router.get('/projects/:projectId', metricsController.getProjectMetrics);

export default router;
