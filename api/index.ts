process.env.VERCEL = process.env.VERCEL || '1';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

import type { Request, Response } from 'express';
import { app } from '../server.ts';

export default function handler(req: Request, res: Response) {
  // Set standard CORS headers for Vercel Serverless
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, x-visitor-id');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Normalize URL: ensure req.url starts with /api if stripped by rewrite rule
  if (req.url) {
    const [pathPart, queryPart] = req.url.split('?');
    if (!pathPart.startsWith('/api')) {
      req.url = '/api' + (pathPart.startsWith('/') ? pathPart : '/' + pathPart) + (queryPart ? `?${queryPart}` : '');
    }
  }

  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Handler Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'خطأ غير متوقع في معالجة طلب الخادم',
      details: process.env.NODE_ENV === 'development' ? err?.message : undefined,
    });
  }
}
