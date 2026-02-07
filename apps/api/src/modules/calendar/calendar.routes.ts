import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { calendarController } from './calendar.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Calendar Event CRUD
router.post(
  '/',
  (req, res, next) => calendarController.create(req, res, next)
);

router.get(
  '/',
  (req, res, next) => calendarController.list(req, res, next)
);

router.get(
  '/:id',
  (req, res, next) => calendarController.getById(req, res, next)
);

router.put(
  '/:id',
  (req, res, next) => calendarController.update(req, res, next)
);

router.delete(
  '/:id',
  (req, res, next) => calendarController.delete(req, res, next)
);

export { router as calendarRoutes };
