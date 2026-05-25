import { Router } from 'express';
import { boardController } from '../controllers/boardController';
import { authenticate } from '../middleware/auth';
import taskRouter from './tasks';

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/', boardController.listByProject);
router.post('/', boardController.create);
router.get('/:boardId', boardController.getById);
router.delete('/:boardId', boardController.delete);

// Columnas
router.post('/:boardId/columns', boardController.addColumn);
router.patch('/:boardId/columns/:columnId', boardController.updateColumn);
router.delete('/:boardId/columns/:columnId', boardController.deleteColumn);

// Tasks anidadas bajo board
router.use('/:boardId/tasks', taskRouter);

export default router;
