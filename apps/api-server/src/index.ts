/**
 * Express app entry point for Firebase Cloud Functions
 * Initializes routes and middleware
 */

import express from 'express';
import { errorHandler } from './middleware/errorHandler';
import adminRoutes from './routes/admin';
import participantRoutes from './routes/participant';

const app = express();

// Body parsing middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register route handlers
app.use('/admin', adminRoutes);
app.use('/participant', participantRoutes);
// TODO: Register host routes as they are implemented
// app.use('/host', hostRoutes);

// Global error handler (must be last)
app.use(errorHandler);

export { app };
