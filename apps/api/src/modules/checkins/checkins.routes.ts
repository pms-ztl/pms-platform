import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.use(authenticate);

// GET /checkins/my — current user's check-ins
router.get('/my', (_req, res) => {
  res.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
});

// GET /checkins/templates — available check-in templates
router.get('/templates', (_req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'weekly', name: 'Weekly Check-in', description: 'How was your week?', fields: ['mood', 'wins', 'blockers', 'priorities'] },
      { id: 'monthly', name: 'Monthly Reflection', description: 'Monthly progress review', fields: ['mood', 'achievements', 'goals', 'development'] },
      { id: 'goal-update', name: 'Goal Progress Update', description: 'Quick goal status check', fields: ['mood', 'goalProgress', 'blockers'] },
    ],
  });
});

// GET /checkins/upcoming
router.get('/upcoming', (_req, res) => {
  res.json({ success: true, data: [] });
});

// GET /checkins/history
router.get('/history', (_req, res) => {
  res.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
});

// GET /checkins
router.get('/', (_req, res) => {
  res.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
});

// POST /checkins
router.post('/', (req, res) => {
  res.status(201).json({
    success: true,
    data: {
      id: `checkin-${Date.now()}`,
      mood: req.body.mood,
      notes: req.body.notes,
      createdAt: new Date().toISOString(),
    },
  });
});

export { router as checkinsRoutes };
