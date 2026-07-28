import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { connectDB } from './config/db';
import { swaggerSpec } from './config/swagger';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import employeeRoutes from './routes/employeeRoutes';
import settingsRoutes from './routes/settingsRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import leaveRoutes from './routes/leaveRoutes';
import holidayRoutes from './routes/holidayRoutes';
import roleRoutes from './routes/roleRoutes';
import { errorHandler } from './middleware/errorMiddleware';

dotenv.config();

// Connect to MongoDB Database
connectDB();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// ─── Security Middlewares ────────────────────────────────────────────────────
// Helmet sets various HTTP headers for security (CSP, X-Frame-Options, etc.)
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false, // Disable CSP in dev for Swagger UI
  crossOriginEmbedderPolicy: false,
}));

// CORS — restrict origins in production
const corsOptions: cors.CorsOptions = {
  origin: isProduction
    ? (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim())
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Request body size limits to prevent payload abuse
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Rate Limiting ───────────────────────────────────────────────────────────
// Aggressive rate limit on authentication endpoints to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 15, // Max 15 attempts per window
  message: { message: 'Too many attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // 300 requests per 15 min
  message: { message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter);

// Swagger Documentation Route (disable in production if desired)
if (!isProduction) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/roles', roleRoutes);

// Root Endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Attendance System API is running.', environment: process.env.NODE_ENV || 'development' });
});

// Global Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}] Server running on port ${PORT}`);
  if (!isProduction) {
    console.log(`Swagger Docs available at http://localhost:${PORT}/api-docs`);
  }
});