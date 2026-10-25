import { useState, useEffect, useRef } from 'react';
import WebSocketService from '@services/websocket/socket';

export const useWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<WebSocketService | null>(null);

  useEffect(() => {
    wsRef.current = new WebSocketService({
      url,
      onConnect: () => setIsConnected(true),
      onDisconnect: () => setIsConnected(false),
      onError: (err) => setError(err),
    });

    wsRef.current.connect();

    return () => {
      wsRef.current?.disconnect();
    };
  }, [url]);

  const emit = (event: string, data: any) => {
    wsRef.current?.emit(event, data);
  };

  const on = (event: string, callback: (data: any) => void) => {
    wsRef.current?.on(event, callback);
  };

  const off = (event: string, callback?: (data: any) => void) => {
    wsRef.current?.off(event, callback);
  };

  return { isConnected, error, emit, on, off };
};