/**
 * Socket.io — configuración y singleton
 *
 * Patrón: se inicializa UNA vez en app.ts con el httpServer,
 * luego cualquier módulo puede importar getIO() para emitir eventos.
 *
 * Autenticación: el cliente envía el JWT en socket.handshake.auth.token.
 * Si no es válido, la conexión se rechaza antes de establecerse.
 *
 * Rooms: cada proyecto tiene su room "project:{projectId}".
 * El cliente hace socket.emit("join:project", projectId) al montar el tablero.
 */

import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { verify } from 'jsonwebtoken';
import { env } from './env';
import { logger } from './logger';
import { projectService } from '../services/projectService';

let _io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  _io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS.split(',').map(o => o.trim()),
      credentials: true,
      methods: ['GET', 'POST'],
    },
    // Útil en AWS con ALB + sticky sessions
    transports: ['websocket', 'polling'],
  });

  // ── Middleware de autenticación ───────────────────────────────────────────
  _io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('Token requerido'));
    }
    try {
      const payload = verify(token, env.JWT_SECRET) as { userId: string };
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error('Token inválido o expirado'));
    }
  });

  // ── Eventos de conexión ───────────────────────────────────────────────────
  _io.on('connection', (socket) => {
    logger.info({ message: 'Socket conectado', userId: socket.data.userId, id: socket.id });

    // El cliente se une a la room de un proyecto al abrir un tablero.
    // AUTORIZACIÓN: solo se permite unirse si el usuario es miembro del proyecto.
    // Sin esto, cualquier usuario autenticado podría escuchar eventos en tiempo
    // real de proyectos ajenos (IDOR sobre el canal WebSocket).
    socket.on('join:project', async (projectId: string) => {
      try {
        await projectService.assertMember(projectId, socket.data.userId);
        socket.join(`project:${projectId}`);
        logger.info({ message: 'Socket unido a proyecto', userId: socket.data.userId, projectId });
      } catch {
        logger.warn({ message: 'Socket rechazado en join:project (no miembro)', userId: socket.data.userId, projectId });
        socket.emit('error', { message: 'No autorizado para este proyecto' });
      }
    });

    // El cliente sale de la room al cerrar el tablero
    socket.on('leave:project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info({ message: 'Socket desconectado', userId: socket.data.userId, reason });
    });
  });

  logger.info('Socket.io inicializado');
  return _io;
}

/**
 * Retorna la instancia de Socket.io.
 * Lanza Error si se llama antes de initSocket() — no debería ocurrir en flujo normal.
 */
export function getIO(): Server {
  if (!_io) {
    // En tests o durante el arranque puede no estar listo aún — no crashear
    throw new Error('Socket.io no inicializado — llama initSocket(httpServer) primero');
  }
  return _io;
}
