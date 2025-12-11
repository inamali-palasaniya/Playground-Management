import { Router } from 'express';
import {
  checkIn,
  checkOut,
  getUserAttendance,

  getAttendanceByDate,
  getAttendanceSummary,
} from '../controllers/attendance.controller.js';

const router = Router();

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/user/:userId', getUserAttendance);

router.get('/date/:date', getAttendanceByDate);
router.get('/summary/:userId', getAttendanceSummary);

export default router;
