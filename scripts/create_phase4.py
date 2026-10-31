import os

api_dir = r"C:\Users\vishw\.gemini\antigravity\scratch\smart-factory\apps\api\src"

files = {
    "services/jwtService.ts": """import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret';

export const generateAccessToken = (userId: string, role: string) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (userId: string, role: string) => {
  return jwt.sign({ userId, role }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};
""",
    "middleware/auth.ts": """import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/jwtService';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    (req as any).user = payload;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
""",
    "middleware/audit.ts": """import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog';

export const logAudit = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    res.send = function (body) {
      res.send = originalSend;
      const user = (req as any).user;
      const userId = user?.userId;
      const role = user?.role;
      
      const log = new AuditLog({
        userId,
        role,
        action,
        resource: req.originalUrl,
        result: res.statusCode < 400 ? 'SUCCESS' : 'FAILURE',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      log.save().catch(console.error);
      
      return res.send(body);
    };
    next();
  };
};
""",
    "routes/auth.ts": """import { Router } from 'express';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../services/jwtService';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../middleware/audit';

const router = Router();

router.post('/register', logAudit('REGISTER'), async (req, res) => {
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

router.post('/login', logAudit('LOGIN'), async (req, res) => {
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
"""
}

for path, content in files.items():
    full_path = os.path.join(api_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w") as f:
        f.write(content)

print("Generated Phase 4 files")
