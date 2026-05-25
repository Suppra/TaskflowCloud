import { Router } from 'express';
import authRouter from './auth';
import projectRouter from './projects';
import metricsRouter from './metrics';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'taskflow-backend' });
});

router.use('/auth', authRouter);
router.use('/projects', projectRouter);
router.use('/metrics', metricsRouter);

export default router;
