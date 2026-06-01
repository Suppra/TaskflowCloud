import { Router } from 'express';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDB } from '../config/aws';
import authRouter from './auth';
import projectRouter from './projects';
import metricsRouter from './metrics';
import notificationRouter from './notifications';
import reportRouter from './reports';

const router = Router();

// Health check real: valida conectividad con DynamoDB
// ECS/ALB marcarán el task como unhealthy si este endpoint retorna != 2xx
router.get('/health', async (_req, res) => {
  try {
    // Intenta GetItem con una key que no existe: solo verifica que DynamoDB responde
    await dynamoDB.send(
      new GetCommand({ TableName: 'taskflow-users', Key: { userId: '__health_probe__' } })
    );
    res.json({
      status: 'ok',
      dynamodb: 'connected',
      timestamp: new Date().toISOString(),
      service: 'taskflow-backend',
    });
  } catch {
    res.status(503).json({
      status: 'unhealthy',
      dynamodb: 'unreachable',
      timestamp: new Date().toISOString(),
      service: 'taskflow-backend',
    });
  }
});

router.use('/auth', authRouter);
router.use('/projects', projectRouter);
router.use('/metrics', metricsRouter);
router.use('/notifications', notificationRouter);
router.use('/reports', reportRouter);

export default router;
