import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { GameState } from './gameData';

interface SSEContextType {
  isConnected: boolean;
  gameState: GameState | null;
  lastUpdated: string | null;
}

const SSEContext = createContext<SSEContextType>({
  isConnected: false,
  gameState: null,
  lastUpdated: null,
});

export const useSSE = () => {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSE must be used within an SSEProvider');
  }
  return context;
};

interface SSEProviderProps {
  children: React.ReactNode;
  initialGameState?: GameState;
}

export const SSEProvider: React.FC<SSEProviderProps> = ({ 
  children, 
  initialGameState 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(initialGameState || null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const params = lastUpdated ? `?lastUpdate=${encodeURIComponent(lastUpdated)}` : '';
    const eventSource = new EventSource(`/api/events${params}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connection opened');
      setIsConnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setIsConnected(false);
      
      if (eventSource.readyState === EventSource.CLOSED) {
        // Attempt to reconnect after 2 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect SSE...');
          connect();
        }, 2000);
      }
    };

    eventSource.addEventListener('gameStateUpdate', (event) => {
      try {
        const newGameState: GameState = JSON.parse(event.data);
        setGameState(newGameState);
        setLastUpdated(newGameState.lastUpdated);
      } catch (error) {
        console.error('Error parsing game state update:', error);
      }
    });

    eventSource.addEventListener('heartbeat', () => {
      // Keep connection alive
      console.log('SSE heartbeat received');
    });

    eventSource.addEventListener('error', (event) => {
      console.error('SSE error event:', event);
    });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      connect();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: SSEContextType = {
    isConnected,
    gameState,
    lastUpdated,
  };

  return (
    <SSEContext.Provider value={value}>
      {children}
    </SSEContext.Provider>
  );
};

export const ConnectionStatus: React.FC = () => {
  const { isConnected } = useSSE();

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800/80 backdrop-blur-sm rounded-lg p-3 text-sm text-gray-400">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
        <span>{isConnected ? 'Live Updates' : 'Reconnecting...'}</span>
      </div>
    </div>
  );
};