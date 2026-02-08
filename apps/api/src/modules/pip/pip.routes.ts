import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { pipController } from './pip.controller';

const router = Router();

router.use(authenticate);

// Create PIP (managers / HR)
router.post('/',
  authorize(
    { resource: 'pip', action: 'create', scope: 'team' },
    { resource: 'pip', action: 'create', scope: 'all' }
  ),
  (req, res, next) => pipController.create(req, res, next)
);

// List PIPs
router.get('/', (req, res, next) => pipController.list(req, res, next));

// Get PIP detail
router.get('/:id', (req, res, next) => pipController.getById(req, res, next));

// HR approve PIP
router.post('/:id/approve',
  authorize({ resource: 'pip', action: 'update', scope: 'all' }),
  (req, res, next) => pipController.approve(req, res, next)
);

// Add check-in
router.post('/:id/check-ins',
  authorize(
    { resource: 'pip', action: 'update', scope: 'team' },
    { resource: 'pip', action: 'update', scope: 'all' }
  ),
  (req, res, next) => pipController.addCheckIn(req, res, next)
);

// Add milestone
router.post('/:id/milestones',
  authorize(
    { resource: 'pip', action: 'update', scope: 'team' },
    { resource: 'pip', action: 'update', scope: 'all' }
  ),
  (req, res, next) => pipController.addMilestone(req, res, next)
);

// Update milestone
router.put('/milestones/:id',
  authorize(
    { resource: 'pip', action: 'update', scope: 'team' },
    { resource: 'pip', action: 'update', scope: 'all' }
  ),
  (req, res, next) => pipController.updateMilestone(req, res, next)
);

// Close PIP
router.post('/:id/close',
  authorize(
    { resource: 'pip', action: 'update', scope: 'team' },
    { resource: 'pip', action: 'update', scope: 'all' }
  ),
  (req, res, next) => pipController.close(req, res, next)
);

// Employee acknowledge PIP
router.post('/:id/acknowledge', (req, res, next) => pipController.acknowledge(req, res, next));

export { router as pipRoutes };
