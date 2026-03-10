import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';

import { logger } from './lib/logger';
import { globalRateLimit } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import authRouter from './routes/auth';
import profileRouter from './routes/profile';
import jobsRouter from './routes/jobs';
import applicationsRouter from './routes/applications';
import automationRouter from './routes/automation';
import healthRouter from './routes/health';

const app = express();
const PORT = parseInt(process.env.PORT ?? '4000', 10);

// ── Upload dir ────────────────────────────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ── Security & parsing ────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }),
);

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use(globalRateLimit);

// ── Static uploads ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(uploadDir));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/automation', automationRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`Backend running on http://localhost:${PORT}`);
});

export default app;
