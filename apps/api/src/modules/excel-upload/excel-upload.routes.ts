import { Router } from 'express';
import multer from 'multer';

import { authenticate } from '../../middleware/authenticate';
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

router.get('/template', ctrl.downloadTemplate);
router.post('/upload', uploadRateLimiter, upload.single('file'), ctrl.uploadExcel);
router.get('/history', ctrl.getUploadHistory);
router.get('/:id/errors', ctrl.getUploadErrors);

export { router as excelUploadRoutes };
