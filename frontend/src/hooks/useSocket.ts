/**
 * useSocket — hook para conectarse al servidor Socket.io
 * y unirse automáticamente a la room de un proyecto.
 *
 * Uso:
 *   const { isConnected } = useSocket(projectId);
 *
 * El hook:
 * 1. Crea la conexión una sola vez (singleton por sesión)
 * 2. Envía el JWT de Zustand en el handshake
 * 3. Emite "join:project" al montar y "leave:project" al desmontar
 * 4. Expone la instancia del socket para suscribirse a eventos
 */

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

// Singleton global — una sola conexión para toda la app
let _socket: Socket | null = null;

/**
 * En desarrollo (Vite en :5173) el backend corre en :3001.
 * En producción (mismo dominio) usamos window.location.origin.
 * La variable VITE_SOCKET_URL permite sobreescribir desde el .env del frontend.
 */
const SOCKET_URL: string =
  (import.meta.env.VITE_SOCKET_URL as string | undefined) ??
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

function getSocket(token: string): Socket {
  if (!_socket || !_socket.connected) {
    _socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return _socket;
}

export function useSocket(projectId?: string) {
  const token = useAuthStore(s => s.accessToken);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);
    socketRef.current = socket;

    const onConnect    = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) setIsConnected(true);

    // Unirse a la room del proyecto cuando se especifica
    if (projectId) {
      socket.emit('join:project', projectId);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      if (projectId) {
        socket.emit('leave:project', projectId);
      }
    };
  }, [token, projectId]);

  return {
    socket: socketRef.current,
    isConnected,
  };
}
