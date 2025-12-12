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

const router = Router();

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/user/:userId', getUserAttendance);

router.get('/date/:date', getAttendanceByDate);
router.get('/summary/:userId', getAttendanceSummary);
router.put('/:id', updateAttendance);
router.delete('/:id', deleteAttendance);

export default router;
