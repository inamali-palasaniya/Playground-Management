import { Router } from 'express';
import {
  checkIn,
  getUserAttendance,
  getAttendanceByDate,
  getAttendanceSummary,
} from '../controllers/attendance.controller';

const router = Router();

router.post('/check-in', checkIn);
router.get('/user/:userId', getUserAttendance);
router.get('/date/:date', getAttendanceByDate);
router.get('/summary/:userId', getAttendanceSummary);

export default router;
