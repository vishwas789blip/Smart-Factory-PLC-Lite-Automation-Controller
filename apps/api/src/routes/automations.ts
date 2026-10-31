import { Router } from 'express';
import { Automation } from '../models/Automation';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const automations = await Automation.find();
  res.json(automations);
});

router.post('/', requireAuth, requireRole(['ENGINEER', 'ADMIN']), async (req, res) => {
  const auto = await Automation.create(req.body);
  res.status(201).json(auto);
});

router.patch('/:id', requireAuth, requireRole(['ENGINEER', 'ADMIN']), async (req, res) => {
  const auto = await Automation.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(auto);
});

router.delete('/:id', requireAuth, requireRole(['ENGINEER', 'ADMIN']), async (req, res) => {
  await Automation.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

router.post('/:id/enable', requireAuth, requireRole(['ENGINEER', 'ADMIN']), async (req, res) => {
  const auto = await Automation.findByIdAndUpdate(req.params.id, { enabled: true }, { new: true });
  res.json(auto);
});

router.post('/:id/disable', requireAuth, requireRole(['ENGINEER', 'ADMIN']), async (req, res) => {
  const auto = await Automation.findByIdAndUpdate(req.params.id, { enabled: false }, { new: true });
  res.json(auto);
});

export default router;
