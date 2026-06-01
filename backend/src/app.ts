import { createServer } from 'http';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { logger } from './config/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFound } from './middleware/errorHandler';
import { swaggerSpec } from './config/swagger';
import { initSocket } from './config/socket';
import router from './routes';

const app = express();

// ── Seguridad ──────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(',').map(o => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  })
);

// Rate limit global
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Demasiadas solicitudes, intenta más tarde' },
  })
);

// Rate limit estricto para endpoints de autenticación (anti-brute-force)
// express-rate-limit v8: sin keyGenerator personalizado para evitar el warning de IPv6;
// usa el comportamiento por defecto que ya normaliza IPv4/IPv6.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 intentos por IP cada 15 minutos
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiados intentos de autenticación, espera 15 minutos' },
});

app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/refresh', authLimiter);

// ── Body parsing ───────────────────────────────────────────
// 100kb es suficiente para una API Kanban; uploads van por S3 presigned URLs
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// ── Logging ────────────────────────────────────────────────
app.use(requestLogger);

// ── Swagger UI ────────────────────────────────────────────
// Helmet bloquea los inline scripts de Swagger → CSP relajado solo para /docs
app.use(
  '/api/v1/docs',
  (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
    );
    next();
  },
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'TaskFlow Cloud API Docs',
    swaggerOptions: {
      persistAuthorization: true,   // conserva el Bearer token al recargar
      displayRequestDuration: true,
      filter: true,
    },
  })
);

// Spec JSON en crudo — importable en Postman / Insomnia
app.get('/api/v1/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ── Rutas ──────────────────────────────────────────────────
app.use('/api/v1', router);

// ── Error handling ─────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── HTTP Server + Socket.io ────────────────────────────────
// Se usa createServer() en lugar de app.listen() para que Socket.io
// comparta el mismo puerto que la API REST.
const httpServer = createServer(app);
initSocket(httpServer);

// ── Start ──────────────────────────────────────────────────
const PORT = parseInt(env.PORT, 10);
httpServer.listen(PORT, () => {
  logger.info(`TaskFlow Backend corriendo en http://localhost:${PORT}`);
  logger.info(`  Entorno: ${env.NODE_ENV}`);
  logger.info(`  WebSockets: habilitados`);
  if (env.GEMINI_API_KEY) {
    logger.info(`  IA (Google Gemini): habilitada`);
  } else {
    logger.info(`  IA (Google Gemini): deshabilitada — configura GEMINI_API_KEY para activar (gratis en ai.google.dev)`);
  }
});

export default app;
