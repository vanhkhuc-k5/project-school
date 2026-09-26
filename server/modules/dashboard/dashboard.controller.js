// =============================================================================
// Dashboard Controller — HTTP Handlers
// G31 — Admin Dashboard Real Operational Metrics
// =============================================================================
import { dashboardService } from './dashboard.service.js';

/**
 * GET /api/dashboard/metrics
 * Get comprehensive dashboard metrics
 */
export async function getDashboardMetrics(req, res, next) {
  try {
    const schoolId = req.user?.schoolId || req.schoolId || 'sch_bacau';
    const { academicYearId, period } = req.query;

    const metrics = await dashboardService.getDashboardMetrics({
      schoolId,
      academicYearId: academicYearId || null,
      period: period || 'today',
    });

    res.json({
      success: true,
      data: metrics,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/attendance-trends
 * Get attendance trends for a period
 */
export async function getAttendanceTrends(req, res, next) {
  try {
    const schoolId = req.user?.schoolId || req.schoolId || 'sch_bacau';
    const { period } = req.query;

    const trends = await dashboardService.getAttendanceTrends({
      schoolId,
      period: period || 'this_week',
    });

    res.json({
      success: true,
      data: trends,
    });
  } catch (err) {
    next(err);
  }
}
