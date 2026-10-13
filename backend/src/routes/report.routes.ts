import { Router } from 'express';
import multer from 'multer';
import { reportController } from '../controllers/report.controller.js';
import { authController } from '../controllers/auth.controller.js';
import { authenticateUser, optionalUser, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Authentication endpoints
router.post('/auth/register', (req, res) => authController.register(req, res));
router.post('/auth/login', (req, res) => authController.login(req, res));
router.get('/auth/me', authenticateUser, (req, res) => authController.getMe(req, res));
router.post('/auth/logout', (req, res) => authController.logout(req, res));

// Dashboard stats (dynamic calculation from DB, optionalUser to calculate user-specific counts if logged in)
router.get('/dashboard', optionalUser, (req, res) => reportController.getDashboard(req, res));

// List and search reports
router.get('/reports', optionalUser, (req, res) => reportController.getReports(req, res));

// Single report details
router.get('/reports/:id', optionalUser, (req, res) => reportController.getReportById(req, res));

// AI image analysis
router.post('/reports/analyze', optionalUser, upload.single('image'), (req, res) =>
  reportController.analyzeReportImage(req, res)
);

// Create new report (Public / optionalUser - citizen or guest)
router.post('/reports', optionalUser, upload.single('image'), (req, res) =>
  reportController.createReport(req, res)
);

// Update status (Public / optionalUser)
router.patch('/reports/:id/status', optionalUser, (req, res) =>
  reportController.updateStatus(req, res)
);

export default router;
