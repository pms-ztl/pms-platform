import { Router } from 'express';
import multer from 'multer';

import { authenticate } from '../../middleware/authenticate';
import { requireRoles } from '../../middleware/authorize';
import { uploadRateLimiter } from '../../middleware';
import * as ctrl from './excel-upload.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
    }
  },
});

const router = Router();

// All routes require authentication
router.use(authenticate);

// HR Admin / Tenant Admin / Super Admin only
const adminOnly = requireRoles('HR Admin', 'Tenant Admin', 'Super Admin');

// Template download (read-only — managers may also download)
router.get('/template', requireRoles('HR Admin', 'Tenant Admin', 'Super Admin', 'Manager'), ctrl.downloadTemplate);

// Two-phase upload flow (AI-enhanced)
router.post('/analyze', adminOnly, uploadRateLimiter, upload.single('file'), ctrl.analyzeUpload);
router.post('/:id/confirm', adminOnly, uploadRateLimiter, ctrl.confirmUpload);
router.get('/:id/progress', adminOnly, ctrl.getProgress);

// Legacy single-step upload (backward compatible)
router.post('/upload', adminOnly, uploadRateLimiter, upload.single('file'), ctrl.uploadExcel);

// History & errors
router.get('/history', adminOnly, ctrl.getUploadHistory);
router.get('/:id/errors', adminOnly, ctrl.getUploadErrors);

export { router as excelUploadRoutes };
