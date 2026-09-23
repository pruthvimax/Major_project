import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Authenticates server-to-server calls from Agri Agent.
 *
 * Accepts the shared secret AGRI_AGENT_API_KEY in either header:
 *   x-api-key: <key>
 *   Authorization: Bearer <key>
 *
 * Comparison is constant-time. If the key is not configured the endpoint is
 * closed (503) rather than open.
 */
const digest = (value: string) => crypto.createHash('sha256').update(value, 'utf8').digest();

export const verifyLogisticsWebhook = (req: Request, res: Response, next: NextFunction): void => {
  const expected = process.env.AGRI_AGENT_API_KEY || '';
  if (!expected) {
    res.status(503).json({ success: false, message: 'Logistics integration is not configured' });
    return;
  }

  const headerKey = req.headers['x-api-key'];
  const auth = req.headers.authorization || '';
  const provided =
    (typeof headerKey === 'string' && headerKey) ||
    (auth.startsWith('Bearer ') ? auth.slice(7).trim() : '');

  if (!provided || !crypto.timingSafeEqual(digest(provided), digest(expected))) {
    console.warn(`[Logistics] Rejected webhook from ${req.ip}: invalid or missing API key`);
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  next();
};

export default verifyLogisticsWebhook;
