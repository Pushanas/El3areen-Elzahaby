process.env.VERCEL = process.env.VERCEL || '1';

import type { Request, Response } from 'express';
import { app } from '../server.ts';

export default function handler(req: Request, res: Response) {
  return app(req, res);
}
