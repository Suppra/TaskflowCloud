import { createServer } from 'http';
import path from 'path';
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

// ── Proxy ──────────────────────────────────────────────────
// Detrás del ALB (un único proxy de confianza). Sin esto, express-rate-limit
// y req.ip ven la IP del balanceador → toda la base de usuarios compartiría el
// mismo cubo de rate limit (auto-DoS). Confiar solo en 1 salto evita spoofing
// de X-Forwarded-For desde el cliente.
app.set('trust proxy', 1);

// ── Seguridad ──────────────────────────────────────────────
app.use(
  helmet({
    // En Learner Lab el entrypoint actual es ALB HTTP (sin 443).
    // Evitamos que el navegador fuerce HTTPS y rompa la carga del SPA.
    hsts: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        upgradeInsecureRequests: null,
      },
    },
  })
);
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(',').map(o => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  })
);

// Rate limit global — keyed por IP real del cliente (gracias a 'trust proxy').
// 600/15min cubre una SPA con polling (dashboard, notificaciones) sin throttlear
// a un usuario activo legítimo; el límite anti-brute-force de /auth sigue estricto.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
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

const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Fallback SPA para rutas no-API.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

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
  if (env.GROQ_API_KEY) {
    logger.info(`  IA (Groq / LLaMA 3.3): habilitada`);
  } else {
    logger.info(`  IA (Groq / LLaMA 3.3): deshabilitada — configura GROQ_API_KEY para activar (gratis en console.groq.com)`);
  }
});

export default app;
