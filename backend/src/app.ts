import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { logger } from './config/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFound } from './middleware/errorHandler';
import router from './routes';

const app = express();

// ── Seguridad ──────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(',').map(o => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Demasiadas solicitudes, intenta más tarde' },
  })
);

// ── Body parsing ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ────────────────────────────────────────────────
app.use(requestLogger);

// ── Rutas ──────────────────────────────────────────────────
app.use('/api/v1', router);

// ── Error handling ─────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────
const PORT = parseInt(env.PORT, 10);
app.listen(PORT, () => {
  logger.info(`🚀 TaskFlow Backend corriendo en http://localhost:${PORT}`);
  logger.info(`   Entorno: ${env.NODE_ENV}`);
});

export default app;
