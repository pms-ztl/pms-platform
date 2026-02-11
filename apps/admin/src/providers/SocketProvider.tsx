import { createContext, useContext } from 'react';

import { useSocket } from '../hooks/useSocket';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface SocketContextValue {
  status: ConnectionStatus;
}

const SocketContext = createContext<SocketContextValue>({ status: 'disconnected' });

export function useSocketStatus() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSocket();

  return (
    <SocketContext.Provider value={{ status }}>
      {children}
    </SocketContext.Provider>
  );
}
