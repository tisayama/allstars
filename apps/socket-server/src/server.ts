/**
 * Express and Socket.io server setup
 */
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
} from '@allstars/types';
import { logger } from './utils/logger';
import { setupAuthenticationFlow } from './middleware/authMiddleware';
import { register } from 'prom-client';

// Create Express app
export const app = express();

// Create HTTP server
export const httpServer = createServer(app);

// Create Socket.io server with type safety
export const io: SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
> = new SocketIOServer(httpServer, {
  cors: {
    origin: '*', // TODO: Restrict to specific origins in production
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

/**
 * Socket.io connection handler
 * Set up authentication flow for each new connection
 */
io.on('connection', (socket) => {
  logger.debug(`New socket connection: ${socket.id}`);
  setupAuthenticationFlow(socket);
});

/**
 * Health check endpoint for Cloud Run
 */
app.get('/healthz', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

/**
 * Health check endpoint (alias for E2E tests)
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

/**
 * Prometheus metrics endpoint (OR-001 through OR-004)
 * Exposes connection count, auth failures, broadcast latency, and listener status
 */
app.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  } catch (error) {
    logger.error('Failed to generate metrics', error as Error);
    res.status(500).send('Failed to generate metrics');
  }
});

/**
 * Root endpoint
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'socket-server',
    version: '1.0.0',
    description: 'Real-time game state synchronization server',
  });
});

logger.info('Server setup complete');
