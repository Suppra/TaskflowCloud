import { Router } from 'express';
import { taskController } from '../controllers/taskController';
import { authenticate } from '../middleware/auth';

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/', taskController.listByBoard);
router.post('/', taskController.create);
router.get('/:taskId', taskController.getById);
router.patch('/:taskId', taskController.update);
router.delete('/:taskId', taskController.delete);

// Subtareas
router.post('/:taskId/subtasks', taskController.addSubtask);
router.patch('/:taskId/subtasks/:subtaskId/toggle', taskController.toggleSubtask);

// Comentarios
router.get('/:taskId/comments', taskController.getComments);
router.post('/:taskId/comments', taskController.addComment);

// Presigned URL para adjuntos S3 (con validación de mimeType en el controller)
router.post('/:taskId/attachments/presign', taskController.getPresignedUrl);

export default router;
