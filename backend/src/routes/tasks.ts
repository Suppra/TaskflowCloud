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

// Adjuntos S3
router.post('/:taskId/attachments/presign', taskController.getPresignedUrl);          // 1) pedir URL de subida
router.post('/:taskId/attachments', taskController.addAttachment);                    // 2) registrar tras subir
router.get('/:taskId/attachments/:attachmentId/download', taskController.getAttachmentDownloadUrl);
router.delete('/:taskId/attachments/:attachmentId', taskController.removeAttachment);

export default router;
