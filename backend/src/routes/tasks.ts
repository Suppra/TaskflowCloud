import { Router } from 'express';
import { taskController } from '../controllers/taskController';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import { uploadService } from '../services/uploadService';
import { sendSuccess } from '../utils/response';

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

// Presigned URL para adjuntos S3
router.post('/:taskId/attachments/presign', async (req, res) => {
  const { filename, mimeType } = z.object({
    filename: z.string().min(1),
    mimeType: z.string().min(1),
  }).parse(req.body);
  const result = await uploadService.getPresignedUploadUrl(filename, mimeType, req.params.taskId);
  return sendSuccess(res, result);
});

export default router;
