import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
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
import { errorHandler } from './middleware/errorMiddleware';

dotenv.config();

// Connect to MongoDB Database
connectDB();

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Swagger Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/holidays', holidayRoutes);

// Root Endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Attendance System API is running. Visit /api-docs for Documentation.' });
});

// Global Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger Docs available at http://localhost:${PORT}/api-docs`);
});