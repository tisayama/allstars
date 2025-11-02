/**
 * Express app entry point for Firebase Cloud Functions
 * Initializes routes and middleware
 */

import express from 'express';
import { errorHandler } from './middleware/errorHandler';
import adminRoutes from './routes/admin';
import participantRoutes from './routes/participant';
import hostRoutes from './routes/host';

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
app.use('/host', hostRoutes);

// Global error handler (must be last)
app.use(errorHandler);

export { app };
