import { Router } from 'express';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../services/jwtService';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT || '30', 10),
  message: { error: 'Too many authentication attempts, please try again in 15 minutes' }
});

const router = Router();

router.post('/register', authLimiter, logAudit('REGISTER'), async (req, res) => {
  try {
    const { email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email in use' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashedPassword });
    res.status(201).json({ message: 'User created' });
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/login', authLimiter, logAudit('LOGIN'), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    user.refreshTokens.push(refreshToken);
    await user.save();

    res.json({ accessToken, refreshToken });
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/refresh', logAudit('TOKEN_REFRESH'), async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Missing token' });

    let payload: any;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await User.findById(payload.userId);
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Rotate
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
    const newAccessToken = generateAccessToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id, user.role);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/logout', requireAuth, logAudit('LOGOUT'), async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = await User.findById((req as any).user.userId);
    if (user) {
      user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
      await user.save();
    }
    res.json({ message: 'Logged out' });
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById((req as any).user.userId).select('-password -refreshTokens');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
