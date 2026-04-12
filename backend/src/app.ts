import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/env';

// Import routes
import userRoutes from './modules/user/user.routes';
import materialRoutes from './modules/material/material.routes';
import materialTypeRoutes from './modules/material-type/material-type.routes';
import locationRoutes from './modules/location/location.routes';
import movementTypeRoutes from './modules/movement-type/movement-type.routes';
import movementLogRoutes from './modules/movement-log/movement-log.routes';
import documentRoutes from './modules/document/document.routes';
import mtoRoutes from './modules/mto/mto.routes';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/material', materialRoutes);
app.use('/api/material-type', materialTypeRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/movement-types', movementTypeRoutes);
app.use('/api/movement-log', movementLogRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/mto', mtoRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    statusCode: 404,
  });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    statusCode: err.statusCode || 500,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
});

export default app;
