import { Router } from 'express';
import { reportController } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET  /reports/projects/:projectId       → listar reportes de un proyecto
// POST /reports/projects/:projectId       → generar reporte
// GET  /reports/:reportId/download        → presigned URL de descarga
router.get('/projects/:projectId', reportController.list);
router.post('/projects/:projectId', reportController.generate);
router.get('/:reportId/download', reportController.download);

export default router;
