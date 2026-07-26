'use client';

import { useSocketContext, SocketContextValue } from '../contexts/socket.context';

export const useSocket = (): SocketContextValue => {
  return useSocketContext();
};
