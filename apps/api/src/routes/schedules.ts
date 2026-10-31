import { Router } from 'express';
import { Schedule } from '../models/Schedule';
import { requireAuth, requireRole } from '../middleware/auth';
import { scheduleJob, deleteJob } from '../services/scheduleService';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const schedules = await Schedule.find();
  res.json(schedules);
});

router.post('/', requireAuth, requireRole(['ENGINEER', 'ADMIN']), async (req, res) => {
  const schedule = await Schedule.create(req.body);
  scheduleJob(schedule);
  res.status(201).json(schedule);
});

router.patch('/:id', requireAuth, requireRole(['ENGINEER', 'ADMIN']), async (req, res) => {
  const schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (schedule) scheduleJob(schedule);
  res.json(schedule);
});

router.delete('/:id', requireAuth, requireRole(['ENGINEER', 'ADMIN']), async (req, res) => {
  await Schedule.findByIdAndDelete(req.params.id);
  deleteJob(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
