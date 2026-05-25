import { Router } from 'express';
import authRouter from './auth';
import projectRouter from './projects';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'taskflow-backend' });
});

router.use('/auth', authRouter);
router.use('/projects', projectRouter);

export default router;
