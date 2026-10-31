import { Router } from 'express';
import { Factory } from '../models/Factory';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const factories = await Factory.find();
    res.json(factories);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const factory = await Factory.create(req.body);
    res.status(201).json(factory);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const factory = await Factory.findById(req.params.id);
    if (!factory) return res.status(404).json({ error: 'Factory not found' });
    res.json(factory);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.patch('/:id', requireAuth, requireRole(['ENGINEER', 'ADMIN']), async (req, res) => {
  try {
    const factory = await Factory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(factory);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.delete('/:id', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    await Factory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
