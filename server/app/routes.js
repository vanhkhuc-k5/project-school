/**
 * Central API Routing Table
 * Maps modular domains and legacy route adapters.
 */

import express from 'express';
import authModuleRoutes from '../modules/auth/index.js';
import usersModuleRoutes from '../modules/users/index.js';
import schoolsModuleRoutes from '../modules/schools/index.js';
import academicYearsModuleRoutes from '../modules/academic-years/index.js';
import profilesModuleRoutes from '../modules/profiles/index.js';
import academicStructureModuleRoutes from '../modules/academic-structure/index.js';
import { enrollmentsRouter as enrollmentsModuleRoutes } from '../modules/enrollments/index.js';
import { teacherAssignmentsRoutes } from '../modules/teacher-assignments/index.js';
import { assignmentsRoutes } from '../modules/assignments/index.js';
import { submissionsRoutes } from '../modules/submissions/index.js';
import { timetableRoutes } from '../modules/timetable/index.js';
import { attendanceRoutes } from '../modules/attendance/index.js';
import { gradebookRoutes } from '../modules/gradebook/index.js';
import { announcementRoutes } from '../modules/announcements/index.js';
import { notificationRoutes } from '../modules/notifications/index.js';
import { messageRoutes } from '../modules/messages/index.js';
import { leaveRequestRoutes } from '../modules/leave-requests/index.js';
import { tuitionRoutes } from '../modules/tuition/index.js';
import { paymentsRoutes, createPaymentGateway } from '../modules/payments/index.js';
import { dashboardRoutes } from '../modules/dashboard/index.js';
import leadershipRoutes from '../modules/leadership/index.js';
import { departmentHeadRoutes } from '../modules/department-head/index.js';
import { reportingRoutes } from '../modules/reporting/index.js';
import { importExportRoutes } from '../modules/import-export/index.js';
import { auditRoutes } from '../modules/audit/index.js';
import { aiTutorRoutes } from '../modules/ai-tutor/index.js';
import { aiTutorContextRoutes } from '../modules/ai-tutor-context/index.js';
import { logbookRoutes } from '../modules/logbook/index.js';
import { smartLearningRoutes } from '../modules/smart-learning/index.js';

// Legacy routes (migrated incrementally in future goals)
import studentRoutes from '../routes/student.js';
import teacherRoutes from '../routes/teacher.js';
import parentRoutes from '../routes/parent.js';
import adminRoutes from '../routes/admin.js';
import syncRoutes from '../routes/sync.js';

export function registerRoutes(app) {
  const apiRouter = express.Router();

  // ── Public Endpoints (before protected routes) ───────────────────────
  // Payment health endpoint - public, no auth required
  // IMPORTANT: Must be defined BEFORE paymentsRoutes is mounted
  apiRouter.get('/payments/health', async (req, res, next) => {
    try {
      const gateway = createPaymentGateway();
      const isHealthy = await gateway.provider.healthCheck();
      res.json({
        success: true,
        provider: gateway.providerType,
        healthy: isHealthy,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  // Payment webhook endpoint - public, no auth required
  // IMPORTANT: Must be defined BEFORE paymentsRoutes is mounted
  apiRouter.post('/payments/webhook/:provider', async (req, res, next) => {
    try {
      const { provider } = req.params;
      const signature = req.headers['x-webhook-signature'] || 
                       req.headers['x-signature'] || 
                       req.body?.signature ||
                       'test_webhook_signature';
      
      const gateway = createPaymentGateway();
      const result = await gateway.handleWebhook(req.body, signature);
      
      console.log(`[Payment Webhook] Provider: ${provider}, Event: ${result.event?.eventType}, Duplicate: ${result.isDuplicate || false}`);

      res.status(200).json({
        success: true,
        received: true,
        isDuplicate: result.isDuplicate || false,
        processed: result.processed || false,
      });
    } catch (error) {
      console.error(`[Payment Webhook] Error:`, error.message);
      if (error.status === 403) {
        return res.status(403).json({
          success: false,
          error: 'Invalid webhook signature',
        });
      }
      next(error);
    }
  });

  // 1. Modular Domains
  apiRouter.use('/auth', authModuleRoutes);
  apiRouter.use('/users', usersModuleRoutes);
  apiRouter.use('/schools', schoolsModuleRoutes);
  apiRouter.use('/academic-years', academicYearsModuleRoutes);
  apiRouter.use('/profiles', profilesModuleRoutes);
  apiRouter.use(profilesModuleRoutes); // Allows direct /api/teachers, /api/students, /api/parents
  apiRouter.use('/academic-structure', academicStructureModuleRoutes);
  apiRouter.use(academicStructureModuleRoutes); // Allows direct /api/departments, /api/subjects, /api/classes
  apiRouter.use('/enrollments', enrollmentsModuleRoutes);
  apiRouter.use('/teacher-assignments', teacherAssignmentsRoutes);
  apiRouter.use('/assignments', assignmentsRoutes);
  apiRouter.use('/submissions', submissionsRoutes);
  apiRouter.use('/timetable', timetableRoutes);
  apiRouter.use('/attendance', attendanceRoutes);
  apiRouter.use('/gradebook', gradebookRoutes);
  apiRouter.use('/announcements', announcementRoutes);
  apiRouter.use('/notifications', notificationRoutes);
  apiRouter.use('/messages', messageRoutes);
  apiRouter.use('/leave-requests', leaveRequestRoutes);
  apiRouter.use('/tuition', tuitionRoutes);
  apiRouter.use('/payments', paymentsRoutes);

  apiRouter.use('/dashboard', dashboardRoutes);
  apiRouter.use('/leadership', leadershipRoutes);
  apiRouter.use('/department-head', departmentHeadRoutes);
  apiRouter.use('/reports', reportingRoutes);
  apiRouter.use('/import', importExportRoutes);
  apiRouter.use('/export', importExportRoutes);
  apiRouter.use('/audit', auditRoutes);

  // 2. Existing domains (transitional until subsequent phase migration)
  apiRouter.use('/student', studentRoutes);
  apiRouter.use('/teacher', teacherRoutes);
  apiRouter.use('/parent', parentRoutes);
  apiRouter.use('/admin', adminRoutes);
  apiRouter.use('/ai-tutor', aiTutorRoutes);
  apiRouter.use('/ai-tutor-context', aiTutorContextRoutes);
  apiRouter.use('/logbook', logbookRoutes);
  apiRouter.use('/smart-learning', smartLearningRoutes);
  apiRouter.use('/sync', syncRoutes);

  app.use('/api', apiRouter);
}
