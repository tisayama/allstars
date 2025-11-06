/**
 * Socket server entry point
 * Initializes Firebase Admin SDK, Socket.io server, and starts listening
 */
import * as admin from 'firebase-admin';
import { httpServer, io } from './server';
import { logger } from './utils/logger';
import { setupGameStateListener } from './listeners/firestoreListener';

const PORT = process.env.PORT || 8080;

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebase(): void {
  if (admin.apps.length === 0) {
    const config: admin.AppOptions = {
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'allstars-dev',
    };

    admin.initializeApp(config);

    // Connect to Firestore emulator if FIRESTORE_EMULATOR_HOST is set
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
      admin.firestore().settings({
        host: `${host}:${port}`,
        ssl: false,
      });
      logger.info(`Connected to Firestore emulator at ${host}:${port}`);
    }

    logger.info('Firebase Admin SDK initialized');
  }
}

/**
 * Start the HTTP and Socket.io server
 */
function startServer(): void {
  httpServer.listen(PORT, () => {
    logger.info(`Socket server listening on port ${PORT}`);
    logger.info(`Health check available at http://localhost:${PORT}/healthz`);
  });
}

/**
 * Graceful shutdown handler
 */
function setupGracefulShutdown(): void {
  const shutdown = (signal: string): void => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    httpServer.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * Main initialization
 */
function main(): void {
  try {
    initializeFirebase();
    setupGracefulShutdown();

    // Set up Firestore listener for game state changes
    const unsubscribe = setupGameStateListener(io);
    logger.info('Firestore gameState listener initialized');

    // Add cleanup for listener on shutdown
    process.on('SIGTERM', () => {
      logger.info('Unsubscribing from Firestore listener');
      unsubscribe();
    });

    startServer();
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Start the application
main();
