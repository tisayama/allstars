/**
 * Express app entry point for Firebase Cloud Functions
 * Initializes routes and middleware
 */

import express from 'express';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Body parsing middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// TODO: Register route handlers here as they are implemented
// app.use('/admin', adminRoutes);
// app.use('/host', hostRoutes);
// app.use('/participant', participantRoutes);

// Global error handler (must be last)
app.use(errorHandler);

export { app };
