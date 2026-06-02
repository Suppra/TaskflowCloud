import { Router } from 'express';
import { reportController } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET  /reports/projects/:projectId       → listar reportes de un proyecto
// POST /reports/projects/:projectId       → generar reporte
// GET  /reports/:reportId/download        → URL de descarga (S3 presigned en prod, local en dev)
// GET  /reports/:reportId/file            → descarga directa desde disco (solo dev)
router.get('/projects/:projectId', reportController.list);
router.post('/projects/:projectId', reportController.generate);
router.get('/:reportId/download', reportController.download);
router.delete('/:reportId', reportController.deleteReport);
router.get('/:reportId/file', reportController.serveFile);

export default router;
