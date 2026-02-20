import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.use(authenticate);

// GET /checkins/upcoming
router.get('/upcoming', (req, res) => {
  res.json({ data: [] });
});

// GET /checkins/history
router.get('/history', (req, res) => {
  res.json({ data: [] });
});

// GET /checkins
router.get('/', (req, res) => {
  res.json({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
});

// POST /checkins
router.post('/', (req, res) => {
  res.status(201).json({
    data: {
      id: `checkin-${Date.now()}`,
      mood: req.body.mood,
      notes: req.body.notes,
      createdAt: new Date().toISOString(),
    },
  });
});

export { router as checkinsRoutes };
