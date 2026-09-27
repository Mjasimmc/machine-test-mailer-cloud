export const SOCKET_EVENTS = {
  USER_SUSPENDED: 'user:suspended',
  TENANT_NOTIFICATION: 'tenant:notification',
} as const;

export type SocketEventType = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
