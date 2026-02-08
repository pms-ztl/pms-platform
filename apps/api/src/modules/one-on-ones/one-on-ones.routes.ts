import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { oneOnOnesController } from './one-on-ones.controller';

const router = Router();

router.use(authenticate);

// Create a 1-on-1 meeting
router.post('/', (req, res, next) => oneOnOnesController.create(req, res, next));

// List my meetings
router.get('/', (req, res, next) => oneOnOnesController.list(req, res, next));

// Get upcoming meetings (before /:id to avoid collision)
router.get('/upcoming', (req, res, next) => oneOnOnesController.getUpcoming(req, res, next));

// Get meeting by ID
router.get('/:id', (req, res, next) => oneOnOnesController.getById(req, res, next));

// Update meeting
router.put('/:id', (req, res, next) => oneOnOnesController.update(req, res, next));

// Start meeting
router.post('/:id/start', (req, res, next) => oneOnOnesController.start(req, res, next));

// Complete meeting
router.post('/:id/complete', (req, res, next) => oneOnOnesController.complete(req, res, next));

// Cancel meeting
router.post('/:id/cancel', (req, res, next) => oneOnOnesController.cancel(req, res, next));

export { router as oneOnOneRoutes };
