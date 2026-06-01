import { Router } from 'express';
import { projectController } from '../controllers/projectController';
import { authenticate } from '../middleware/auth';
import boardRouter from './boards';

const router = Router();
router.use(authenticate);

router.get('/', projectController.list);
router.post('/', projectController.create);
router.get('/:projectId', projectController.getById);
router.patch('/:projectId', projectController.update);
router.patch('/:projectId/archive', projectController.archive);
router.delete('/:projectId', projectController.delete);
router.get('/:projectId/members', projectController.listMembers);
router.post('/:projectId/members', projectController.inviteMember);
router.patch('/:projectId/members/:memberId', projectController.updateMemberRole);
router.delete('/:projectId/members/:memberId', projectController.removeMember);

// Boards anidados bajo proyecto
router.use('/:projectId/boards', boardRouter);

export default router;
