import { Router } from 'express';
import {
  checkIn,
  checkOut,
  getUserAttendance,

  getAttendanceByDate,
  getAttendanceSummary,
  updateAttendance,
  deleteAttendance
} from '../controllers/attendance.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/user/:userId', getUserAttendance);

router.get('/date/:date', checkPermission('attendance', 'view'), getAttendanceByDate);
router.get('/summary/:userId', checkPermission('attendance', 'view', { selfAccessIdParam: 'userId' }), getAttendanceSummary);
router.put('/:id', checkPermission('attendance', 'edit'), updateAttendance);
router.delete('/:id', checkPermission('attendance', 'delete'), deleteAttendance);

export default router;
