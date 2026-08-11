import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

const SocketContext = createContext(null);

/**
 * SocketProvider
 * 
 * Creates a single authenticated socket connection.
 * Passes JWT token during handshake.
 * Automatically reconnects on disconnect.
 * Cleans up on unmount.
 */
export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Create socket with auth token in handshake
    const socket = io(SOCKET_URL, {
      auth: {
        token: token
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('[SocketContext] Connected:', socket.id);
      setIsConnected(true);
      setSocketId(socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[SocketContext] Disconnected:', reason);
      setIsConnected(false);
      setSocketId(null);
    });

    socket.on('connect_error', (err) => {
      console.error('[SocketContext] Connection error:', err.message);
      setIsConnected(false);
    });

    socketRef.current = socket;

    return () => {
      console.log('[SocketContext] Cleaning up socket');
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setSocketId(null);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, socketId }}>
      {children}
    </SocketContext.Provider>
  );
}

/**
 * Hook to access the socket instance.
 * Returns { socket, isConnected, socketId }
 */
export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export default SocketContext;