import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getBackendUrl } from '../config/api';

export const useWebSocket = (url: string = getBackendUrl()) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(url, {
      transports: ['websocket', 'polling'],
    });
    
    socketRef.current.on('connect', () => {
      setIsConnected(true);
      setError(null);
    });
    
    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });
    
    socketRef.current.on('error', (err: Error) => {
      setError(err);
    });
    
    return () => {
      socketRef.current?.disconnect();
    };
  }, [url]);

  const emit = (event: string, data: any) => {
    socketRef.current?.emit(event, data);
  };

  const on = (event: string, callback: (data: any) => void) => {
    socketRef.current?.on(event, callback);
  };

  const off = (event: string, callback?: (data: any) => void) => {
    socketRef.current?.off(event, callback);
  };

  return { isConnected, error, emit, on, off };
};