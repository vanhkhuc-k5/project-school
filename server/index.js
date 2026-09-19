import express from 'express';
import cors from 'cors';
import { seedDatabase } from './seed.js';

// Import route modules
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/student.js';
import teacherRoutes from './routes/teacher.js';
import parentRoutes from './routes/parent.js';
import adminRoutes from './routes/admin.js';
import aiTutorRoutes from './routes/aiTutor.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Initialize database schema and initial seed data
seedDatabase();

// Mount API endpoints
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai-tutor', aiTutorRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'EduPortal Real Backend Server', time: new Date().toISOString() });
});

// Start listening
app.listen(PORT, '0.0.0.0', () => {
  console.log(`EduPortal Real Backend Server running on http://127.0.0.1:${PORT}`);
});
