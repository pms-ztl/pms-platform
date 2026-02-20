import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import type { AuthenticatedRequest } from '../../types';

const router = Router();

router.use(authenticate);

// GET /mentoring/matches
router.get('/matches', (req, res) => {
  res.json({ data: [], meta: { total: 0 } });
});

// GET /mentoring/my-mentorships
router.get('/my-mentorships', (req, res) => {
  res.json({ data: [] });
});

// GET /mentoring/learning-path
router.get('/learning-path', (req, res) => {
  res.json({ data: [] });
});

// GET /mentoring/sessions — alias used by some frontend pages
router.get('/sessions', (req, res) => {
  res.json({ data: [] });
});

// POST /mentoring/request
router.post('/request', (req, res) => {
  const authReq = req as AuthenticatedRequest;
  res.status(201).json({
    data: {
      id: `mentorship-${Date.now()}`,
      mentorId: req.body.mentorId,
      menteeId: authReq.user?.id,
      focusAreas: req.body.focusAreas || [],
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    },
  });
});

export { router as mentoringRoutes };
